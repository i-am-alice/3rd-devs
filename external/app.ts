import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OpenAIService } from './OpenAIService';
import type { ChatCompletion } from "openai/resources/chat/completions";
import { chatLimiter, authMiddleware, errorHandler, validationMiddleware } from './middlewares';

const app = express();
const port = 3000;
const openaiService = new OpenAIService();

// Middleware
app.use(express.json());
app.use(errorHandler);

// Server initialization
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));

app.get('/', (req, res) => {
  res.send('Hello World');
});

// Routes
app.post('/api/chat', chatLimiter, authMiddleware, validationMiddleware, async (req, res, next) => {
  const { messages, conversation_id = uuidv4() } = req.body;

  try {
    const answer = await openaiService.completion({ messages }) as ChatCompletion;
    res.json({ ...answer, conversation_id });
  } catch (error) {
    next(error);
  }
});
