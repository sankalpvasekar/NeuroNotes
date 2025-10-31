import os
import cv2
import pytesseract
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import tempfile
import shutil
import requests
from typing import Optional
import subprocess
import speech_recognition as sr
from deep_translator import GoogleTranslator

# Configure Tesseract path without hardcoding machine-specific paths
# Priority: env var TESSERACT_CMD > common Windows install > library default
_env_tess = os.environ.get("TESSERACT_CMD", "").strip()
if _env_tess:
    pytesseract.pytesseract.tesseract_cmd = _env_tess
else:
    _win_default = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
    if os.path.exists(_win_default):
        pytesseract.pytesseract.tesseract_cmd = _win_default

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Ensure ffmpeg is available on PATH (useful for yt-dlp merges and OpenCV backends)
_ffmpeg_exe = shutil.which("ffmpeg")
if not _ffmpeg_exe and os.path.exists(r"C:\\ffmpeg\\ffmpeg.exe"):
    os.environ["PATH"] = r"C:\\ffmpeg;" + os.environ.get("PATH", "")

def preprocess_image(image_path=None, image=None):
    if image is None:
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    else:
        if len(image.shape) == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    image = cv2.bilateralFilter(image, 9, 75, 75)
    image = cv2.medianBlur(image, 3)
    image = cv2.adaptiveThreshold(image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                  cv2.THRESH_BINARY, 35, 11)
    kernel = np.ones((2, 2), np.uint8)
    image = cv2.morphologyEx(image, cv2.MORPH_OPEN, kernel)
    return image

def ocr_image(image, lang: str = "eng", psm: str = "6"):
    # Downscale very large images to speed up OCR while preserving readability
    try:
        h, w = image.shape[:2]
        max_dim = max(h, w)
        if max_dim > 2000:
            scale = 2000.0 / max_dim
            image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    except Exception:
        pass
    processed = preprocess_image(image=image)
    config = f"--oem 3 --psm {psm}"
    try:
        text = pytesseract.image_to_string(processed, config=config, lang=lang)
    except Exception:
        text = pytesseract.image_to_string(processed, config=config)
    return text

@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    try:
        file.save(file_path)
        img = cv2.imread(file_path)
        if img is None:
            return jsonify({"error": "Could not read the uploaded image. Please upload a valid image file."}), 422
        lang = (request.args.get("lang") or "eng").strip()
        psm = (request.args.get("psm") or "6").strip()
        extracted_text = (ocr_image(img, lang=lang, psm=psm) or "").strip()
        if not extracted_text:
            return jsonify({"error": "No text could be extracted from this image. Try a clearer image or adjust lighting/contrast."}), 422
        return jsonify({"text": extracted_text})
    except Exception as e:
        return jsonify({"error": f"Failed to process image: {str(e)}"}), 500

@app.route("/uploads/<filename>", methods=["GET"])
def get_uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

def process_video(video_path, frame_interval=15, max_frames=600):
    cap = cv2.VideoCapture(video_path, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        # Retry without explicit backend as fallback
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return ""
    # Validate we can read at least one frame
    ok, _ = cap.read()
    if not ok:
        cap.release()
        return ""
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    texts = []
    frame_count = 0
    grabbed = True
    while grabbed and frame_count < max_frames:
        grabbed, frame = cap.read()
        if not grabbed:
            break
        if frame_count % frame_interval == 0:
            try:
                txt = ocr_image(frame)
                txt = (txt or "").strip()
                if txt:
                    texts.append(txt)
            except Exception:
                pass
        frame_count += 1
    cap.release()
    # Deduplicate while preserving order
    seen = set()
    unique_texts = []
    for t in texts:
        if t not in seen:
            seen.add(t)
            unique_texts.append(t)
    return "\n\n".join(unique_texts)

def _ffmpeg_extract_wav(src_path: str, dst_path: str) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-i", src_path,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-f", "wav",
        dst_path,
    ]
    # Attempt with PATH ffmpeg, fallback to C:\ffmpeg
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except Exception:
        alt = cmd.copy()
        alt[0] = r"C:\\ffmpeg\\ffmpeg.exe"
        subprocess.run(alt, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

def speech_from_video(video_path: str) -> str:
    # Extract audio to temp wav and run STT
    tmp_dir = tempfile.mkdtemp(prefix="aud_")
    try:
        wav_path = os.path.join(tmp_dir, "audio.wav")
        _ffmpeg_extract_wav(video_path, wav_path)
        recognizer = sr.Recognizer()
        # Optional: reduce ambient noise a bit by preloading small segment
        with sr.AudioFile(wav_path) as source:
            audio = recognizer.record(source)  # full file; for very long files consider chunking
        try:
            text = recognizer.recognize_google(audio)
            return text
        except Exception:
            return ""
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

def translate_text(text: str, target: str) -> str:
    target = (target or "").lower()
    if target not in {"hi", "mr"}:
        raise ValueError("Unsupported target language; allowed: hi, mr")
    # Chunk to avoid provider limits
    chunks = []
    buf = []
    count = 0
    # Split by paragraphs to preserve structure
    for para in (text or "").split("\n\n"):
        if count + len(para) > 3900:  # conservative
            chunks.append("\n\n".join(buf))
            buf = [para]
            count = len(para)
        else:
            buf.append(para)
            count += len(para)
    if buf:
        chunks.append("\n\n".join(buf))
    out = []
    for c in chunks:
        if not c.strip():
            continue
        out.append(GoogleTranslator(source="auto", target=target).translate(c))
    return "\n\n".join(out).strip()

@app.route("/translate", methods=["POST"])
def translate_endpoint():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    target = (data.get("target") or "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    try:
        translated = translate_text(text, target)
        if not translated:
            return jsonify({"error": "Translation returned empty text"}), 422
        return jsonify({"text": translated})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to translate: {str(e)}"}), 500

@app.route("/upload_video", methods=["POST"])
def upload_video():
    if "file" not in request.files:
        return jsonify({"error": "No video uploaded"}), 400
    file = request.files["file"]
    temp_dir = tempfile.mkdtemp(prefix="vid_")
    try:
        video_path = os.path.join(temp_dir, file.filename)
        file.save(video_path)
        mode = (request.args.get("mode") or "speech").lower()
        if mode == "speech":
            text = speech_from_video(video_path)
        else:
            text = process_video(video_path)
        if not text:
            return jsonify({"error": "Unable to open or extract text from the uploaded video."}), 422
        return jsonify({"text": text})
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.route("/video_from_url", methods=["POST"])
def video_from_url():
    data = request.get_json(silent=True) or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    temp_dir = tempfile.mkdtemp(prefix="vid_")
    try:
        def try_direct_download(target_path: str) -> Optional[str]:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}
            with requests.get(url, headers=headers, stream=True, timeout=120) as r:
                r.raise_for_status()
                ctype = r.headers.get("Content-Type", "")
                # allow generic octet-stream too
                if not ("video" in ctype or "octet-stream" in ctype):
                    return None
                with open(target_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 16):
                        if chunk:
                            f.write(chunk)
            # quick sanity check that OpenCV can open it
            cap = cv2.VideoCapture(target_path)
            ok = cap.isOpened()
            cap.release()
            if not ok:
                return None
            return target_path

        local_path = os.path.join(temp_dir, "video.mp4")
        path = try_direct_download(local_path)

        if path is None:
            # Fallback to yt-dlp for pages like YouTube/Drive/etc.
            try:
                import yt_dlp  # type: ignore

                # Prefer single progressive MP4 to avoid ffmpeg merge dependency
                ydl_opts_primary = {
                    "outtmpl": os.path.join(temp_dir, "%(title)s.%(ext)s"),
                    "quiet": True,
                    "noprogress": True,
                    "format": "best[ext=mp4]/mp4",
                }
                # Fallback allowing merge if necessary (may require ffmpeg)
                ydl_opts_fallback = {
                    "outtmpl": os.path.join(temp_dir, "%(title)s.%(ext)s"),
                    "quiet": True,
                    "noprogress": True,
                    "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best",
                    "merge_output_format": "mp4",
                }

                def dl(opts):
                    with yt_dlp.YoutubeDL(opts) as ydl:
                        info = ydl.extract_info(url, download=True)
                        return ydl.prepare_filename(info)

                try:
                    path = dl(ydl_opts_primary)
                except Exception:
                    path = dl(ydl_opts_fallback)

                # Verify with OpenCV and first frame
                cap = cv2.VideoCapture(path, cv2.CAP_FFMPEG)
                if not cap.isOpened():
                    cap = cv2.VideoCapture(path)
                ok, _ = cap.read()
                cap.release()
                if not ok:
                    return jsonify({"error": "Downloaded file is not a valid or readable video for OpenCV."}), 422
            except Exception as e:
                return jsonify({"error": f"Failed to download/process video URL: {str(e)}"}), 400

        mode = (request.args.get("mode") or "speech").lower()
        if mode == "speech":
            text = speech_from_video(path)
        else:
            text = process_video(path)
        if not text:
            return jsonify({"error": "Unable to extract text from the provided video."}), 422
        return jsonify({"text": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    app.run(debug=True)
