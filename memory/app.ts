import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OpenAIService } from './OpenAIService';
import { MemoryService } from './MemoryService';
import { AssistantService } from './AssistantService';
import { defaultKnowledge as knowledge } from './prompts';
import { LangfuseService } from './LangfuseService';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { execSync } from 'child_process';
import path from 'path';

const app = express();
const port = 3000;
app.use(express.json());

const langfuseService = new LangfuseService();
const openaiService = new OpenAIService();
const memoryService = new MemoryService('memory/memories', openaiService, langfuseService);
const assistantService = new AssistantService(openaiService, memoryService, langfuseService);

app.post('/api/chat', async (req, res) => {
  let { messages, conversation_id = uuidv4() } = req.body;

  messages = messages.filter((msg: ChatCompletionMessageParam) => msg.role !== 'system');
  const trace = langfuseService.createTrace({ id: uuidv4(), name: (messages.at(-1)?.content || '').slice(0, 45), sessionId: conversation_id });

  try {
    const queries = await assistantService.extractQueries(messages, trace);
    const memories = await memoryService.recall(queries, trace);
    const shouldLearn = await assistantService.shouldLearn(messages, memories, trace);
    const learnings = await assistantService.learn(messages, shouldLearn, memories, trace);
    const answer = await assistantService.answer({ messages, memories, knowledge, learnings }, trace);

    await langfuseService.finalizeTrace(trace, messages, answer.choices[0].message);
    await langfuseService.flushAsync();
    return res.json({...answer, conversation_id});
  } catch (error) {
    await langfuseService.finalizeTrace(trace, req.body, { error: 'An error occurred while processing your request' });
    console.error('Error in chat processing:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.post('/api/sync', async (req, res) => {
  const trace = langfuseService.createTrace({ id: uuidv4(), name: 'Sync Memories', sessionId: uuidv4() });

  try {
    const changes = await memoryService.syncMemories(trace);
    await langfuseService.finalizeTrace(trace, {}, changes);
    await langfuseService.flushAsync();
    return res.json(changes);
  } catch (error) {
    await langfuseService.finalizeTrace(trace, {}, { error: 'An error occurred while syncing memories' });
    console.error('Error in memory synchronization:', error);
    res.status(500).json({ error: 'An error occurred while syncing memories' });
  }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));

process.on('SIGINT', async () => {
  await langfuseService.shutdownAsync();
  process.exit(0);
});