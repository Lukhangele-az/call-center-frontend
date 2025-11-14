// Simplified without Call History
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import './App.css';
import { translations } from './translations';
import { supabase } from './supabaseClient';
import Auth from './Auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [summaryFormat, setSummaryFormat] = useState('detailed');
  const [language, setLanguage] = useState('en');

  const t = translations[language];

  // Check if user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

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
      const reader = new FileReader();
      const base64Audio = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioFile);
      });

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
    setProcessing(true);

    try {
      let textToSummarize = transcript;

      if (file) {
        textToSummarize = await transcribeAudio(file);
        setTranscript(textToSummarize);
      }

      if (!textToSummarize.trim()) {
        throw new Error(t.error);
      }

      const summaryResult = await generateSummary(textToSummarize);
      setSummary(summaryResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('AW Call Centre Summary', margin, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 30);
    doc.text(`User: ${user.email}`, margin, 36);
    
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(summary, maxWidth);
    doc.text(lines, margin, 46);
    
    doc.save(`aw-call-summary-${Date.now()}.pdf`);
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div className="logo">
            <div className="logo-icon">AW</div>
            <div className="logo-text">
              <h1>{t.title}</h1>
              <p className="subtitle">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="header-actions">
            <div className="user-info">
              <span className="user-email">👤 {user.email}</span>
              <button onClick={handleSignOut} className="signout-button">
                Sign Out
              </button>
            </div>
            
            <div className="language-selector">
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="language-dropdown"
              >
                <option value="en">🇬🇧 English</option>
                <option value="af">🇿🇦 Afrikaans</option>
                <option value="zu">🇿🇦 isiZulu</option>
                <option value="xh">🇿🇦 isiXhosa</option>
              </select>
            </div>
          </div>
        </div>

        <div className="input-section">
          <div className="upload-box">
            <label htmlFor="audio-upload" className="upload-label">
              🎤 {t.uploadLabel}
            </label>
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="file-input"
            />
            {file && <p className="file-name">✅ {t.selectedFile} {file.name}</p>}
          </div>

          <div className="divider">
            <span>{t.or}</span>
          </div>

          <div className="transcript-box">
            <label htmlFor="transcript" className="transcript-label">
              📝 {t.pasteLabel}
            </label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={handleTranscriptChange}
              placeholder={t.placeholder}
              rows="8"
              className="transcript-input"
            />
          </div>

          <div className="format-selector">
            <label className="format-label">📊 {t.formatLabel}</label>
            <div className="format-options">
              <button
                className={`format-btn ${summaryFormat === 'brief' ? 'active' : ''}`}
                onClick={() => setSummaryFormat('brief')}
              >
                {t.brief}
              </button>
              <button
                className={`format-btn ${summaryFormat === 'detailed' ? 'active' : ''}`}
                onClick={() => setSummaryFormat('detailed')}
              >
                {t.detailed}
              </button>
              <button
                className={`format-btn ${summaryFormat === 'bullet' ? 'active' : ''}`}
                onClick={() => setSummaryFormat('bullet')}
              >
                {t.bulletPoints}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={processing || (!file && !transcript.trim())}
            className="submit-button"
          >
            {processing ? (
              <span className="loading-text">
                <span className="spinner"></span>
                {t.processing}
              </span>
            ) : (
              `✨ ${t.generateButton}`
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
              <h2>📊 {t.summaryTitle}</h2>
              <div className="summary-actions">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(summary);
                    alert(`✅ ${t.copiedAlert}`);
                  }}
                  className="action-button"
                >
                  📋 {t.copyButton}
                </button>
                <button
                  onClick={exportToPDF}
                  className="action-button pdf-button"
                >
                  📥 {t.exportButton}
                </button>
              </div>
            </div>
            <div className="summary-content">
              <pre>{summary}</pre>
            </div>
          </div>
        )}

        <footer className="footer">
          <p>{t.footer}</p>
        </footer>
      </div>
    </div>
  );
}

export default App;