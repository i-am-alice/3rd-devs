import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LangfuseService } from './LangfuseService';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';
import { AssistantService } from './AssistantService';
import { VectorService } from './VectorService';

const app = express();
const port = 3000;
app.use(express.json());

const langfuseService = new LangfuseService();
const openaiService = new OpenAIService();
const assistantService = new AssistantService(openaiService, langfuseService);
const vectorService = new VectorService(openaiService);

const COLLECTION_NAME = "aidevs";

app.post('/api/chat', async (req, res) => {
  let { messages, conversation_id = uuidv4() } = req.body;

  messages = messages.filter((msg: ChatCompletionMessageParam) => msg.role !== 'system');
  const trace = langfuseService.createTrace({ id: uuidv4(), name: (messages.at(-1)?.content || '').slice(0, 45), sessionId: conversation_id, userId: 'test-user' });

  try {
    await vectorService.ensureCollection(COLLECTION_NAME);

    // Search for similar messages
    const lastMessage = messages[messages.length - 1];
    const similarMessages = await vectorService.performSearch(COLLECTION_NAME, lastMessage.content, 10);

    // Add similar messages to the context (you might want to adjust this based on your needs)
    const context = similarMessages.map(result => {
      const role = result?.payload?.role === 'user' ? 'Adam' : 'Alice';
      return `${role}: ${result?.payload?.text}`;
    }).join('\n');

    const answer = await assistantService.answer({ messages, context }, trace);

    // Save the new message and the completion to the vector store
    await vectorService.addPoints(COLLECTION_NAME, [
      { id: uuidv4(), text: lastMessage.content, role: lastMessage.role },
      { id: uuidv4(), text: answer.choices[0].message.content, role: 'assistant' }
    ]);

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