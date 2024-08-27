import express from 'express';
import { OpenAIService } from './OpenAIService';
import type { ChatCompletionMessageParam, ChatCompletionChunk } from "openai/resources/chat/completions";
import { isValidMessage } from './helpers';
import { v4 } from 'uuid';

/*
Start Express server
*/
const app = express();
const port = 3000;
app.use(express.json());
app.listen(port, () => console.log(`Server running at http://localhost:${port}. Listening for POST /api/chat requests`));

const openaiService = new OpenAIService();

// Chat endpoint POST /api/chat
app.post('/api/chat', _validateMessages, async (req, res) => {
  const { messages, stream = false } = req.body;

  const systemPrompt: ChatCompletionMessageParam = { 
    role: "system", 
    content: "You are a helpful assistant who speaks using as fewest words as possible." 
  };

  try {
    await completion([systemPrompt, ...messages], res, stream);
    
  } catch (error) {
    console.error('Error in OpenAI completion:', JSON.stringify(error));
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

async function completion(messages: ChatCompletionMessageParam[], res: express.Response, stream: boolean) {
  const conversationUUID = v4();
  res.setHeader('x-conversation-uuid', conversationUUID);

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {

      // THIS IS AN EXAMPLE CHUNK
      const startingChunk: ChatCompletionChunk = { 
        id: "chatcmpl-" + Date.now(), 
        object: "chat.completion.chunk", 
        created: Math.floor(Date.now() / 1000), 
        model: "gpt-4-0613", 
        system_fingerprint: "fp_" + Math.random().toString(36).substring(2, 15), 
        choices: [{ index: 0, delta: { role: "assistant", content: "starting response" }, 
        logprobs: null, 
        finish_reason: null }] };

      res.write(`data: ${JSON.stringify(startingChunk)}\n\n`);

      const result = await openaiService.completion(messages, "gpt-4", true) as AsyncIterable<ChatCompletionChunk>;

      for await (const chunk of result) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.end();
    } catch (error) {
      console.error('Error in streaming response:', error);
      const errorChunk: ChatCompletionChunk = {
        id: "chatcmpl-" + Date.now(),
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-4-0613",
        system_fingerprint: "fp_" + Math.random().toString(36).substring(2, 15),
        choices: [{ 
          index: 0, 
          delta: { content: "An error occurred during streaming" },
          logprobs: null,
          finish_reason: "stop"
        }]
      };
      res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
      res.end();
    }
  } else {
    const answer = await openaiService.completion(messages);
    res.json({ ...answer, conversationUUID });
  }
}

// Middleware to validate messages
function _validateMessages(req: express.Request, res: express.Response, next: express.NextFunction) {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid or missing messages in request body' });
  }

  if (!messages.every(isValidMessage)) {
    return res.status(400).json({ error: 'Invalid message format in request body' });
  }

  next();
}