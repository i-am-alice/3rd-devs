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
  const { messages, model = "gpt-4o" }: { messages: ChatCompletionMessageParam[], model?: string } = req.body;

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  try {
    const modelContextLength = 128000;
    const maxOutputTokens = 50;
    const inputTokens = await openAIService.countTokens(messages, model);

    if (inputTokens + maxOutputTokens > modelContextLength) {
      return res.status(400).json({ error: `No space left for response. Input tokens: ${inputTokens}, Context length: ${modelContextLength}` });
    }

    console.log(`Input tokens: ${inputTokens}, Max tokens: ${maxOutputTokens}, Model context length: ${modelContextLength}, Tokens left: ${modelContextLength - (inputTokens + maxOutputTokens)}`);

    const fullResponse = await openAIService.continuousCompletion({
      messages,
      model,
      maxTokens: maxOutputTokens
    });

    res.json({ 
      role: "assistant",
      content: fullResponse
    });
  } catch (error) {
    console.error('Error:', JSON.stringify(error, null, 2));
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});