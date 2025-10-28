import { useState } from 'react';
import './App.css';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      // Call backend API
      const response = await fetch(`${API_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: text }),
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

  return (
    <div className="app">
      <div className="container">
        <h1>📞 Call Center Summary Tool</h1>
        <p className="subtitle">Upload a call recording or paste a transcript to get an AI-powered summary</p>

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
            {file && <p className="file-name">Selected: {file.name}</p>}
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

          <button
            onClick={handleSubmit}
            disabled={loading || (!file && !transcript.trim())}
            className="submit-button"
          >
            {loading ? '⏳ Processing...' : '✨ Generate Summary'}
          </button>

          {error && (
            <div className="error-box">
              ❌ {error}
            </div>
          )}
        </div>

        {summary && (
          <div className="summary-section">
            <h2>📊 Call Summary</h2>
            <div className="summary-content">
              <pre>{summary}</pre>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(summary);
                alert('Summary copied to clipboard!');
              }}
              className="copy-button"
            >
              📋 Copy Summary
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;