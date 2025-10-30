// Updated with new features
import { useState } from 'react';
import jsPDF from 'jspdf';
import './App.css';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryFormat, setSummaryFormat] = useState('detailed'); // brief, detailed, bullet

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleTranscriptChange = (e) => {
    setTranscript(e.target.value);
    setError('');
  };

  const transcribeAudio = async (audioFile) => {
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Audio = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioFile);
      });

      // Call backend API
      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioData: base64Audio }),
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      return data.transcript;
    } catch (err) {
      throw new Error('Transcription failed: ' + err.message);
    }
  };

  const generateSummary = async (text) => {
    try {
      let prompt = '';
      
      if (summaryFormat === 'brief') {
        prompt = `Provide a brief 2-3 sentence summary of this call:\n\n${text}`;
      } else if (summaryFormat === 'bullet') {
        prompt = `Analyze this call and provide bullet points covering:
- Main Issue
- Resolution
- Action Items
- Customer Sentiment

Call transcript:
${text}`;
      } else {
        prompt = `Analyze this call center conversation and provide:
- Brief Summary (2-3 sentences)
- Customer Issue
- Resolution/Outcome
- Action Items
- Sentiment (Positive/Neutral/Negative)
- Key Topics

Call transcript:
${text}`;
      }

      // Call backend API
      const response = await fetch(`${API_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: prompt }),
      });

      if (!response.ok) {
        throw new Error('Summary generation failed');
      }

      const data = await response.json();
      return data.summary;
    } catch (err) {
      throw new Error('Summary generation failed: ' + err.message);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSummary(null);
    setLoading(true);

    try {
      let textToSummarize = transcript;

      // If file is uploaded, transcribe it first
      if (file) {
        textToSummarize = await transcribeAudio(file);
        setTranscript(textToSummarize); // Show the transcript
      }

      // Check if we have text to summarize
      if (!textToSummarize.trim()) {
        throw new Error('Please provide either an audio file or paste a transcript');
      }

      // Generate summary
      const summaryResult = await generateSummary(textToSummarize);
      setSummary(summaryResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    
    // Add header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('AW Call Centre Summary', margin, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 30);
    
    // Add summary content
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(summary, maxWidth);
    doc.text(lines, margin, 40);
    
    // Save the PDF
    doc.save(`aw-call-summary-${Date.now()}.pdf`);
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div className="logo">
            <div className="logo-icon">AW</div>
            <div className="logo-text">
              <h1>AW Call Centre Summary Tool</h1>
              <p className="subtitle">AI-powered call analysis and summarization</p>
            </div>
          </div>
        </div>

        <div className="input-section">
          <div className="upload-box">
            <label htmlFor="audio-upload" className="upload-label">
              🎤 Upload Audio Recording
            </label>
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="file-input"
            />
            {file && <p className="file-name">✅ Selected: {file.name}</p>}
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="transcript-box">
            <label htmlFor="transcript" className="transcript-label">
              📝 Paste Call Transcript
            </label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={handleTranscriptChange}
              placeholder="Paste the call transcript here..."
              rows="8"
              className="transcript-input"
            />
          </div>

          <div className="format-selector">
            <label className="format-label">📊 Summary Format:</label>
            <div className="format-options">
              <button
                className={`format-btn ${summaryFormat === 'brief' ? 'active' : ''}`}
                onClick={() => setSummaryFormat('brief')}
              >
                Brief
              </button>
              <button
                className={`format-btn ${summaryFormat === 'detailed' ? 'active' : ''}`}
                onClick={() => setSummaryFormat('detailed')}
              >
                Detailed
              </button>
              <button
                className={`format-btn ${summaryFormat === 'bullet' ? 'active' : ''}`}
                onClick={() => setSummaryFormat('bullet')}
              >
                Bullet Points
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || (!file && !transcript.trim())}
            className="submit-button"
          >
            {loading ? (
              <span className="loading-text">
                <span className="spinner"></span>
                Processing...
              </span>
            ) : (
              '✨ Generate Summary'
            )}
          </button>

          {error && (
            <div className="error-box">
              ❌ {error}
            </div>
          )}
        </div>

        {summary && (
          <div className="summary-section">
            <div className="summary-header">
              <h2>📊 Call Summary</h2>
              <div className="summary-actions">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(summary);
                    alert('✅ Summary copied to clipboard!');
                  }}
                  className="action-button"
                >
                  📋 Copy
                </button>
                <button
                  onClick={exportToPDF}
                  className="action-button pdf-button"
                >
                  📥 Export PDF
                </button>
              </div>
            </div>
            <div className="summary-content">
              <pre>{summary}</pre>
            </div>
          </div>
        )}

        <footer className="footer">
          <p>Powered by AI • Secure & Private • Built for Call Centres</p>
        </footer>
      </div>
    </div>
  );
}

export default App;