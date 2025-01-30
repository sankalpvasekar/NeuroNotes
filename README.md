# AI Handwriting Recognition

## Overview

AI-powered **Handwriting Recognition** system that converts handwritten text into digital text. Built using **Flask, OpenCV, Pytesseract, and React.js**, this project enables users to upload images of handwritten notes and extract the text using Optical Character Recognition (OCR).

## Features
- 📄 **Upload Handwritten Images**
- 🧠 **AI-Powered OCR (Pytesseract)**
- 🎨 **Preprocessing with OpenCV**
- 🌍 **REST API with Flask Backend**
- ⚡ **Interactive React.js Frontend**

## What I Learned
### 🔹 Technical Skills:
- Implementing **OCR with Tesseract** for handwritten text extraction.
- **Image preprocessing with OpenCV** (grayscale, thresholding, noise removal).
- Creating a **Flask API** for image processing and text recognition.
- **Frontend development** with React.js for file upload and display.
- Handling **CORS and API requests** between frontend and backend.

### 🛠 Problem-Solving:
- Improving text extraction accuracy with **image preprocessing techniques**.
- Managing large image uploads and optimizing OCR performance.
- Debugging **cross-origin issues (CORS)** in API communication.

## How It Works
1. **User uploads an image** of handwritten text.
2. **Flask backend processes the image** using OpenCV (grayscale, thresholding).
3. **Tesseract OCR extracts text** from the processed image.
4. **Frontend displays extracted text** and allows users to copy it.

## Tech Stack
- **Frontend:** React.js, Axios, Tailwind CSS
- **Backend:** Flask, Pytesseract, OpenCV
- **OCR Engine:** Tesseract-OCR

## Setup & Installation

### 🔹 Backend Setup
1. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Mac/Linux
   venv\Scripts\activate  # Windows
   ```
2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
3. **Run the Flask server**
   ```bash
   python app.py
   ```

### 🔹 Frontend Setup
1. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start React app**
   ```bash
   npm start
   ```

## Future Enhancements
- ✨ Improve text recognition accuracy with **Deep Learning models**.
- 🖋 Support for **multiple handwriting styles**.
- 📜 Allow **exporting recognized text as PDF or DOCX**.

## Conclusion
This project showcases my **AI, OCR, full-stack development, and problem-solving** skills. It bridges the gap between **handwritten and digital text**, making content more accessible and editable. 🚀

---
### Looking for opportunities in AI and Full-Stack Development! ✨

