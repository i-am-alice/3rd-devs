import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LangfuseService } from './LangfuseService';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';
import { AssistantService } from './AssistantService';
import { DatabaseService } from './DatabaseService';

const app = express();
const port = 3000;
app.use(express.json());

const databaseService = new DatabaseService();
const langfuseService = new LangfuseService();
const openaiService = new OpenAIService();
const assistantService = new AssistantService(databaseService, openaiService, langfuseService);

app.post('/api/chat', async (req, res) => {
  let { messages, conversation_id = uuidv4() } = req.body;

  messages = messages.filter((msg: ChatCompletionMessageParam) => msg.role !== 'system');
  const trace = langfuseService.createTrace({ id: uuidv4(), name: (messages.at(-1)?.content || '').slice(0, 45), sessionId: conversation_id, userId: 'test-user' });

  try {
    const answer = await assistantService.answer({ messages, conversation_id }, trace);

    await langfuseService.finalizeTrace(trace, messages, answer.choices[0].message);
    await langfuseService.flushAsync();
    return res.json({...answer, conversation_id});
  } catch (error) {
    await langfuseService.finalizeTrace(trace, req.body, { error: 'An error occurred while processing your request' });
    console.error('Error in chat processing:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));

process.on('SIGINT', async () => {
  await langfuseService.shutdownAsync();
  process.exit(0);
});