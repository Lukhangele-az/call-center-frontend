const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Call Center API is running!' });
});

// Transcribe audio endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData } = req.body;
    
    // Convert base64 to buffer
    const buffer = Buffer.from(audioData, 'base64');
    
    // Create a file object for OpenAI
    const file = new File([buffer], 'audio.mp3', { type: 'audio/mpeg' });
    
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
    });
    
    res.json({ transcript: transcription.text });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate summary endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    const { transcript } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a call center analyst. Analyze call transcripts and provide structured summaries.'
        },
        {
          role: 'user',
          content: `Analyze this call center conversation and provide:
- Brief Summary (2-3 sentences)
- Customer Issue
- Resolution/Outcome
- Action Items
- Sentiment (Positive/Neutral/Negative)
- Key Topics

Call transcript:
${transcript}`
        }
      ],
    });
    
    res.json({ summary: completion.choices[0].message.content });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});