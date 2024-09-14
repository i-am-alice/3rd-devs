import express from 'express';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';

/*
Start Express server
*/
const app = express();
const port = 3000;
app.use(express.json());
app.listen(port, () => console.log(`Server running at http://localhost:${port}. Listening for POST /api/chat requests`));

const openAIService = new OpenAIService();

app.post('/api/chat', async (req, res) => {
  const { messages, model }: { messages: ChatCompletionMessageParam[], model?: string } = req.body;

  try {
    const tokenCount = await openAIService.countTokens(messages, model);

    console.log(`Token count for model ${model || 'gpt-4o'}: ${tokenCount}`);

    res.json({ tokenCount, model: model || 'gpt-4o' });
  } catch (error) {
    console.error('Error in token counting:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});