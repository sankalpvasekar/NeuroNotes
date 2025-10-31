import React, { useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph } from "docx";

const App = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sourceInfo, setSourceInfo] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [targetLang, setTargetLang] = useState("hi"); // hi=Hindi, mr=Marathi

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };



  const handleVideoFileChange = (event) => {
    setVideoFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsLoading(true);
      setSourceInfo(`Image file: ${selectedFile.name}`);
      const response = await axios.post("http://127.0.0.1:5000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setExtractedText(response.data.text);
      setTranslatedText("");
      setQuiz([]);
      setErrorMsg("");
    } catch (error) {
      console.error("Error uploading file", error);
      const msg = error?.response?.data?.error || "Failed to process image";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadVideo = async () => {
    if (!videoFile) {
      alert("Please select a video file first");
      return;
    }
    const formData = new FormData();
    formData.append("file", videoFile);
    try {
      setIsLoading(true);
      setSourceInfo(`Video file: ${videoFile.name}`);
      const { data } = await axios.post("http://127.0.0.1:5000/upload_video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setExtractedText(data.text || "");
      setTranslatedText("");
      setQuiz([]);
      setErrorMsg("");
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || "Failed to process video";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoFromUrl = async () => {
    if (!videoUrl.trim()) {
      alert("Enter a video URL first");
      return;
    }
    try {
      setIsLoading(true);
      setSourceInfo(`Video URL: ${videoUrl.trim()}`);
      const { data } = await axios.post("http://127.0.0.1:5000/video_from_url", { url: videoUrl.trim() });
      setExtractedText(data.text || "");
      setTranslatedText("");
      setQuiz([]);
      setErrorMsg("");
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || "Failed to fetch/process video from URL";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const escapeHtml = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const getHighlightedHtml = () => {
    const baseText = translatedText || extractedText;
    const safe = escapeHtml(baseText);
    if (!keyword.trim()) return safe.replace(/\n/g, "<br/>");
    const pattern = new RegExp(`(${keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    return safe.replace(pattern, '<span style="background:#fff0a6; padding:0 2px; border-radius:3px;">$1</span>').replace(/\n/g, "<br/>");
  };

  const handleDownloadPDF = () => {
    const textToUse = translatedText || extractedText || "";
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const maxWidth = 515; // A4 width (595) - margins
    const lines = doc.splitTextToSize(textToUse, maxWidth);
    doc.text(lines, margin, margin);
    doc.save(translatedText ? "translated_text.pdf" : "extracted_text.pdf");
  };

  const handleDownloadDocx = async () => {
    const textToUse = translatedText || extractedText || "";
    const paragraphs = textToUse.split("\n").map((line) => new Paragraph(line));
    const doc = new Document({ sections: [{ properties: {}, children: paragraphs.length ? paragraphs : [new Paragraph("")] }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = translatedText ? "translated_text.docx" : "extracted_text.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(translatedText || extractedText || "");
      alert("Text copied to clipboard");
    } catch (e) {
      alert("Failed to copy");
    }
  };

  const clearAll = () => {
    setSelectedFile(null);
    setExtractedText("");
    setTranslatedText("");
    setKeyword("");
    setQuiz([]);
    setShowAnswers(false);
    setVideoFile(null);
    setVideoUrl("");
    setErrorMsg("");
    setSourceInfo("");
    setTargetLang("hi");
  };

  const generateQuiz = () => {
    const text = (extractedText || "").replace(/\s+/g, " ").trim();
    if (!text) {
      alert("No text to generate quiz from");
      return;
    }
    const sentences = text
      .split(/(?<=[\.!?])\s+/)
      .filter((s) => s.split(" ").length >= 5);
    const items = [];
    for (let i = 0; i < sentences.length && items.length < 5; i++) {
      const words = sentences[i].match(/[A-Za-z][A-Za-z\-']{3,}/g) || [];
      if (!words.length) continue;
      const target = words.sort((a, b) => b.length - a.length)[0];
      const blanked = sentences[i].replace(new RegExp(target.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "i"), "_____");
      items.push({ q: blanked, a: target });
    }
    if (!items.length) {
      alert("Could not generate quiz from the text provided");
      return;
    }
    setQuiz(items);
    setShowAnswers(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)" }}>
        <div style={{ padding: 24, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg, #ffffff 0%, #f2f6ff 100%)" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>NeuroNotes</div>
          </div>
          <div>
            <button onClick={clearAll} style={{ background: "var(--danger)", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}>Clear</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, padding: 24 }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 16, background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)" }}>
            {errorMsg && (
              <div style={{ marginBottom: 12, color: "var(--danger)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", padding: 8, borderRadius: 8 }}>
                {errorMsg}
              </div>
            )}
            <div style={{ fontWeight: 600, marginBottom: 12, color: "var(--primary)" }}>Upload</div>
            <input type="file" onChange={handleFileChange} style={{ display: "block", marginBottom: 12 }} />
            <button onClick={handleUpload} style={{ background: "var(--primary)", color: "var(--primary-contrast)", border: "none", padding: "10px 14px", borderRadius: 8, cursor: "pointer" }}>Upload & Process</button>



            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--info)" }}>Video</div>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <input type="file" accept="video/*" onChange={handleVideoFileChange} style={{ display: "block", marginBottom: 8 }} />
                  <button onClick={handleUploadVideo} style={{ background: "var(--info)", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}>Process Video File</button>
                </div>
                <div>
                  <input
                    type="url"
                    placeholder="Paste video URL (direct link)"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 6px 10px 10px", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 8, marginRight: 2 }}
                  />
                  <button onClick={handleVideoFromUrl} style={{ background: "var(--success)", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}>Process Video URL</button>
                </div>
                {/* Audio-based extraction is default on the backend; checkbox removed as requested */}
              </div>
            </div>

            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--warning)" }}>Translate</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "10px 6px 10px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                </select>
                <button
                  onClick={async () => {
                    const baseText = extractedText?.trim();
                    if (!baseText) {
                      alert("No extracted text to translate");
                      return;
                    }
                    try {
                      setIsLoading(true);
                      setErrorMsg("");
                      const { data } = await axios.post("http://127.0.0.1:5000/translate", { text: baseText, target: targetLang });
                      setTranslatedText(data.text || "");
                    } catch (e) {
                      console.error(e);
                      const msg = e?.response?.data?.error || "Failed to translate";
                      setErrorMsg(msg);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  style={{ background: "var(--warning)", color: "#fff", border: "none", padding: "10px 12px", borderRadius: 8, cursor: "pointer" }}
                >
                  Translate
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--accent)" }}>Highlight</div>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Type keyword to highlight"
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 6px 10px 10px", borderRadius: 8, border: "1px solid var(--border)", marginRight: 2 }}
              />
            </div>

            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--success)" }}>Downloads</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={handleDownloadPDF} disabled={!extractedText} style={{ background: extractedText ? "#111827" : "#9ca3af", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8, cursor: extractedText ? "pointer" : "not-allowed" }}>Download PDF</button>
                <button onClick={handleDownloadDocx} disabled={!extractedText} style={{ background: extractedText ? "var(--success)" : "#9ca3af", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8, cursor: extractedText ? "pointer" : "not-allowed" }}>Download DOCX</button>
                <button onClick={copyToClipboard} disabled={!extractedText} style={{ background: extractedText ? "var(--neutral)" : "#9ca3af", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8, cursor: extractedText ? "pointer" : "not-allowed" }}>Copy Text</button>
              </div>
            </div>

            <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>Quiz</div>
                <div>
                  <button onClick={generateQuiz} disabled={!extractedText} style={{ background: extractedText ? "var(--accent)" : "#9ca3af", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: extractedText ? "pointer" : "not-allowed" }}>Generate Quiz</button>
                  <button onClick={() => setShowAnswers((s) => !s)} disabled={!quiz.length} style={{ marginLeft: 8, background: quiz.length ? "var(--warning)" : "#9ca3af", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: quiz.length ? "pointer" : "not-allowed" }}>{showAnswers ? "Hide Answers" : "Show Answers"}</button>
                </div>
              </div>
              {!!quiz.length && (
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  {quiz.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: 10 }}>
                      <div style={{ marginBottom: 6 }}>{item.q}</div>
                      {showAnswers && <div style={{ color: "#059669", fontWeight: 600 }}>Answer: {item.a}</div>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)" }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Extracted Text</div>
            {sourceInfo && (
              <div style={{ color: "var(--muted)", marginBottom: 8, fontSize: 12 }}>Source: {sourceInfo}</div>
            )}
            <div style={{ flex: 1, border: "1px dashed var(--border)", borderRadius: 8, padding: 12, background: "#f7fbff", maxHeight: 420, overflow: "auto", lineHeight: 1.6 }}>
              {isLoading ? (
                <div style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="spinner" style={{ width: 14, height: 14, border: "2px solid var(--border)", borderTopColor: "var(--muted)", borderRadius: "50%", display: "inline-block", animation: "spin 1s linear infinite" }} />
                  Processing…
                </div>
              ) : (translatedText || extractedText) ? (
                <div dangerouslySetInnerHTML={{ __html: getHighlightedHtml() }} />
              ) : (
                <div style={{ color: "var(--muted)", opacity: 0.8, pointerEvents: "none", userSelect: "none" }}>No text yet. Upload an image or process a video.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;