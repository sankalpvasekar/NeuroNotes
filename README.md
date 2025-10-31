<div align="center">

# NeuroNotes

Smart text extraction, translation, and study tools from images and videos.

</div>

## Overview
NeuroNotes is a full‑stack app that extracts text from images and videos, allows quick translation to Hindi or Marathi, highlights keywords, and exports content as PDF or DOCX. It’s designed for clean, fast note digitization with a modern UI.

## Features
- 📷 **Image OCR**: Upload an image and extract text using OpenCV + Tesseract.
- 🎞 **Video → Text**:
  - Upload a video file or provide a URL (YouTube/Drive supported via yt‑dlp fallback).
  - Extracts speech to text by default; frame OCR fallback available in backend.
- 🌐 **Translate**: One‑click translation to Hindi (hi) or Marathi (mr).
- 🔍 **Highlight**: Type a keyword to highlight in extracted/translated text.
- 📥 **Export**: Download as PDF or DOCX. Uses translated content if available.
- 📋 **Copy**: Copy extracted/translated text to clipboard.
- 🧩 **Quiz**: Generate quick fill‑in‑the‑blank questions from the text.

## Architecture
- **Frontend**: React (single page) under `frontend/`
- **Backend**: Flask in `backend/app.py`
  - Image OCR: `/upload`
  - Video file: `/upload_video` (speech mode default)
  - Video URL: `/video_from_url` (speech mode default)
  - Translation: `/translate` (deep‑translator)

## Requirements
- Windows recommended (tested). Python 3.12+, Node 16+.
- Tesseract OCR installed or available on PATH.
  - Optional: set `TESSERACT_CMD` env var to the Tesseract executable.
- FFmpeg on PATH for audio extraction and some video handling.
- Internet access for translation, yt‑dlp URL processing, and Google STT.

## Install

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows PowerShell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Optional: if Tesseract not in default Windows path
# $env:TESSERACT_CMD = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe"

python app.py  # starts http://127.0.0.1:5000
```

### Frontend
```bash
cd frontend
npm install
npm start  # opens http://localhost:3000
```

## Usage
1. In the UI:
   - Choose an image and click “Upload & Process”.
   - Or choose a video file / paste a video URL and process.
2. Optionally select a target language and click “Translate”.
3. Enter keywords to highlight.
4. Download as PDF/DOCX or copy to clipboard.

## API Reference (local dev)
- `POST /upload` (multipart form)
  - field: `file` (image)
  - returns: `{ text }`
- `POST /upload_video` (multipart form)
  - field: `file` (video)
  - query: `mode=speech|ocr` (default: `speech`)
  - returns: `{ text }`
- `POST /video_from_url` (json)
  - body: `{ "url": "https://..." }`
  - query: `mode=speech|ocr` (default: `speech`)
  - returns: `{ text }`
- `POST /translate` (json)
  - body: `{ "text": "...", "target": "hi|mr" }`
  - returns: `{ text }`

## Configuration
- Tesseract path resolution priority in backend:
  1) `TESSERACT_CMD` env var (if set)
  2) Common Windows path `C:\\Program Files\\Tesseract-OCR\\tesseract.exe`
  3) pytesseract defaults
- FFmpeg: ensure available on PATH for audio extraction.

## Troubleshooting
- ModuleNotFoundError for packages: re‑run `pip install -r backend/requirements.txt` with venv activated.
- Tesseract not found: set `TESSERACT_CMD` to the executable path.
- Video URL fails: ensure internet, try a different URL, or install FFmpeg.
- Long videos: processing takes time; watch the “Processing…” indicator.

## Folder Structure
```
NeuroNotes/
  backend/
    app.py
    requirements.txt
    uploads/                # gitignored
  frontend/
    public/
    src/
      App.js
      index.js
    node_modules/           # gitignored
```

## License
MIT

