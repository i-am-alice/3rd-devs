import express from 'express';
import type OpenAI from 'openai';
import { OpenAIService } from './OpenAIService';
import multer from 'multer';
import { Readable } from 'stream';

/*
Start Express server
*/
const app = express();
const port = 3000;
app.use(express.json());

// Add index route
app.get('/', (req, res) => {
  res.render('index', { message: 'Hello' });
});

const openAIService = new OpenAIService();
let conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Add transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('Received audio file:', req.file);
    console.log('File mimetype:', req.file.mimetype);
    console.log('File size:', req.file.size);
    console.log('File buffer length:', req.file.buffer.length);

    // Implement the actual transcription logic here
    const transcription = await openAIService.transcribeAudio(req.file.buffer);
    res.json({ transcription });

  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ 
      error: 'An error occurred while transcribing the audio', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Add text-to-speech endpoint
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const audioBuffer = await openAIService.textToSpeech(text);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while generating speech' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { messages = [] } = req.body;

  if (messages.length === 0 || !messages[messages.length - 1]?.content) {
    return res.status(400).json({ error: 'Valid message content is required' });
  }

  if (messages.length === 1) {
    messages.unshift({
      role: 'system',
      content: 'The assistant should speak concisely in a style of Lex Fridman.'
    });
  }

  try {
    const fullMessages = [...conversationHistory, ...messages];
    const response = await openAIService.completion({
      messages: fullMessages,
      model: "gpt-4o",
      stream: false
    }) as OpenAI.Chat.Completions.ChatCompletion;

    const assistantMessage = response.choices[0].message;
    conversationHistory.push(...messages, assistantMessage);

    res.json(assistantMessage);
  } catch (error) {
    console.error('Error:', JSON.stringify(error, null, 2));
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.post('/api/clear-conversation', (req, res) => {
  conversationHistory = [];
  res.json({ message: 'Conversation history cleared' });
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}. Listening for POST /api/chat requests`));