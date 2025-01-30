import React, { useState } from "react";
import axios from "axios";

const App = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post("http://127.0.0.1:5000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setExtractedText(response.data.text);
    } catch (error) {
      console.error("Error uploading file", error);
      alert("Failed to process image");
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>AI Handwriting Recognition</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload & Process</button>
      {extractedText && (
        <div>
          <h2>Extracted Text:</h2>
          <p>{extractedText}</p>
        </div>
      )}
    </div>
  );
};

export default App;