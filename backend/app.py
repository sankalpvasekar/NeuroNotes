import os
import cv2
import pytesseract
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Set the correct Tesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def preprocess_image(image_path):
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    _, processed_image = cv2.threshold(image, 150, 255, cv2.THRESH_BINARY_INV)
    return processed_image

@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)
    
    processed_image = preprocess_image(file_path)
    extracted_text = pytesseract.image_to_string(processed_image)
    
    return jsonify({"text": extracted_text})

@app.route("/uploads/<filename>", methods=["GET"])
def get_uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == "__main__":
    app.run(debug=True)
