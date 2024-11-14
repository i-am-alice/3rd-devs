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

let markmapSyntax = '';

async function generateMarkmapSyntax(messages: ChatCompletionMessageParam[], trace: any): Promise<string> {
  const response = await assistantService.answer({
    messages: [
      { role: "system", content: `This input is a transcription from dictated audio and may contain imperfections. Convert it into a comprehensive mindmap using markmap syntax in English. Focus on the key concepts mentioned by the user, maintaining their original structure and hierarchy. Correct any obvious transcription errors, but do not add information unless explicitly requested (e.g., "please help me with that" or "suggest some..."). You are strictly forbidden to add any information by yourself that is not mentioned in the transcription.

Begin your response with a *thinking* block to outline your approach to structuring the mindmap. Then, use <final_result> tags to enclose the markmap syntax without any additional formatting.

Follow these guidelines for creating effective mindmaps:
0. When the user doesn't mention the mindmap but just speaks casually, create a mindmap with a single node 'let's play'
1. Use a central topic as the root node
2. Create main branches for primary topics
3. Add sub-branches for subtopics and details
4. Keep node text concise (1-3 words when possible)
5. Use hierarchical structure to show relationships
6. Employ consistent formatting for each level
7. Balance the map visually if possible

Start the markmap content immediately after the opening <final_result> tag, beginning with the root node using a single hashtag (#). Use increasing numbers of hashtags for each sublevel (##, ###, etc.). Ensure proper indentation for clarity.

Critical rules:
1. The mindmap MUST be valid markmap syntax at all times.
2. Update the current_markmap ONLY with changes described by the user, without any additional modifications.
3. Always rewrite the entire mindmap from start to end when modifying.
4. Do not add, remove, or modify any information unless explicitly instructed by the user.

Remember: The mindmap must strictly follow the user's input without adding extra information unless specifically requested.

<current_markmap name="Modify the existing mindmap, but always rewrite entirely from start to end">${markmapSyntax || 'No mindmap yet'}</current_markmap>

Note: ALWAYS SPEAK IN ENGLISH` },
      ...messages
    ],
    model: "gpt-4o",
  }, trace);

  if (openaiService.isStreamResponse(response)) {
    throw new Error("Unexpected streaming response");
  }

  return response.choices[0].message.content || '';
}

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
    const markmapSyntaxRaw = await generateMarkmapSyntax(messages || '', trace);
    const markmapSyntax = markmapSyntaxRaw.match(/<final_result>([\s\S]*?)<\/final_result>/)?.[1] || 'No mindmap';

    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: `You're Alice and you're speaking with Adam right and you're allowed to use your voice. You're in the call center and you're helping him with his request.
      
      The system may generate a mindmap in the following structure. If the user speaks about it, you should help him with shaping it. Just act as if you were updated it.
      <mindmap>${markmapSyntax}</mindmap>

      The system visualises the mindmap for the user so there is no need to describe it for him and even there is no need to mention this fact.

      Speak like Lex Fridman using fewest words possible, speak fluent polish and remember that you're Alice (female).
      Keep in mind that the polish language is sometimes very different from the english language and you should speak it like a native. Pay attention to forms, grammar, endings, vocabulary etc.
      
      `,
    };
    const answer = await assistantService.answer({ messages: [systemMessage, ...messages] }, trace);

    await langfuseService.finalizeTrace(trace, messages, answer.choices[0].message);
    await langfuseService.flushAsync();
    return res.json({...answer, conversation_id, markmapSyntax});
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