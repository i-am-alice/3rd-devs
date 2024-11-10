import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OpenAIService } from './OpenAIService';
import { AssistantService } from './AssistantService';
import { LangfuseService } from './LangfuseService';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import multer from 'multer';
import cors from 'cors';
import { Readable } from 'stream';
import { ReadableStream as WebReadableStream } from 'stream/web';

const app = express();
const port = 3000;
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB in bytes
  }
});

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173', // Allow requests from this origin
    methods: ['GET', 'POST'],        // Allowed HTTP methods
    credentials: true,               // Allow credentials if needed
}));

const langfuseService = new LangfuseService();
const openaiService = new OpenAIService();
const assistantService = new AssistantService(openaiService, langfuseService);

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
    const audioFile = req.file;
    if (!audioFile) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        // Pass the file buffer to the transcription service
        const transcription = await openaiService.transcribeGroq(audioFile.buffer);
        return res.json({ transcription });
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: 'An error occurred during transcription' });
    }
});

app.post('/api/chat', async (req, res) => {
  let { messages, conversation_id = uuidv4() } = req.body;

  const systemMessage: ChatCompletionMessageParam = {
    role: 'system',
    content: `You're Alice and you're speaking with Adam right and you're allowed to use your voice. You're in the call center and you're helping him with his request.`,
  };
  const trace = langfuseService.createTrace({ id: uuidv4(), name: (messages.at(-1)?.content || '').slice(0, 45), sessionId: conversation_id });

  try {
    const answer = await assistantService.answer({ messages: [systemMessage, ...messages] }, trace);

    await langfuseService.finalizeTrace(trace, messages, answer.choices[0].message);
    await langfuseService.flushAsync();
    return res.json({...answer, conversation_id});
  } catch (error) {
    await langfuseService.finalizeTrace(trace, req.body, { error: 'An error occurred while processing your request' });
    console.error('Error in chat processing:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.post('/api/speak', async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'No text provided' });
    }
    try {
        const audioStream = await openaiService.speak(text);
        if (!audioStream) {
            return res.status(500).json({ error: 'No audio stream returned' });
        }

        const nodeReadable = Readable.fromWeb(audioStream as unknown as WebReadableStream);

        res.setHeader('Content-Type', 'audio/mpeg');
        nodeReadable.pipe(res);
    } catch (error) {
        console.error('Speak API error:', error);
        res.status(500).json({ error: 'An error occurred during speech synthesis' });
    }
});


app.post('/api/speakEleven', async (req, res) => {
  try {
    const { text } = req.body;
    const audioGenerator = await openaiService.speak(text);

    if (!audioGenerator) {
      return res.status(500).json({ error: 'No audio stream returned' });
    }

    res.set('Content-Type', 'audio/mpeg');

    // Convert the AsyncGenerator to a Node.js Readable stream
    const nodeStream = Readable.from(audioGenerator);

    // Pipe the stream to the response
    nodeStream.pipe(res);
  } catch (error) {
    console.error('Speak API error:', error);
    res.status(500).json({ error: 'Speech generation failed' });
  }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));

process.on('SIGINT', async () => {
  await langfuseService.shutdownAsync();
  process.exit(0);
});