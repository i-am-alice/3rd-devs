import express from 'express';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';
import { verificationPrompt } from './prompts';
import type OpenAI from 'openai';

/*
Start Express server
*/
const app = express();
const port = 3000;
app.use(express.json());
app.listen(port, () => console.log(`Server running at http://localhost:${port}. Listening for POST /api/chat requests`));

const openAIService = new OpenAIService();

app.post('/api/chat', async (req, res) => {
  const { messages = [], model = "gpt-4o" } = req.body;

  if (messages.length === 0 || !messages[messages.length - 1]?.content) {
    return res.status(400).json({ error: 'Valid message content is required' });
  }

  const lastMessage = messages[messages.length - 1];
  
  try {

    const verificationResponse = await openAIService.completion({
        messages: [
            { role: "system", content: verificationPrompt },
            { role: "user", content: typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content) }
        ],
        model,
        stream: false
    }) as OpenAI.Chat.Completions.ChatCompletion;

    if (verificationResponse.choices[0].message.content !== 'pass') {
      return res.status(400).json({ error: 'Message is not in Polish' });
    }

    const fullResponse = await openAIService.completion({
      messages,
      model,
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