import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ChatService } from './ChatService';
import { LangfuseService } from './LangfuseService';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const port = 3000;
app.use(express.json());

const chatService = new ChatService();
const langfuseService = new LangfuseService();

app.post('/api/chat', async (req, res, next) => {
  const { messages, conversation_id = uuidv4() } = req.body;
  const trace = langfuseService.createTrace({ 
    id: uuidv4(), 
    name: "Chat", 
    sessionId: conversation_id 
  });

  try {
    const allMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: "You are a helpful assistant.", name: 'Alice' },
      ...messages
    ];
    
    const generatedMessages: ChatCompletionMessageParam[] = [];

    // Main Completion - Answer user's question
    const mainSpan = langfuseService.createSpan(trace, "Main Completion", allMessages);
    const mainCompletion = await chatService.completion(allMessages, "gpt-4o");
    langfuseService.finalizeSpan(mainSpan, "Main Completion", allMessages, mainCompletion);
    const mainMessage = mainCompletion.choices[0].message;
    allMessages.push(mainMessage);
    generatedMessages.push(mainMessage);

    // Secondary Completion - Custom message
    const secondaryMessages: ChatCompletionMessageParam[] = [{ role: 'user', content: "Please say 'completion 2'" }];
    const secondarySpan = langfuseService.createSpan(trace, "Secondary Completion", secondaryMessages);
    const secondaryCompletion = await chatService.completion(secondaryMessages, "gpt-4o");
    langfuseService.finalizeSpan(secondarySpan, "Secondary Completion", secondaryMessages, secondaryCompletion);
    const secondaryMessage = secondaryCompletion.choices[0].message;
    generatedMessages.push(secondaryMessage);

    // Third Completion - Another custom message
    const thirdMessages: ChatCompletionMessageParam[] = [{ role: 'user', content: "Please say 'completion 3'" }];
    const thirdSpan = langfuseService.createSpan(trace, "Third Completion", thirdMessages);
    const thirdCompletion = await chatService.completion(thirdMessages, "gpt-4o");
    langfuseService.finalizeSpan(thirdSpan, "Third Completion", thirdMessages, thirdCompletion);
    const thirdMessage = thirdCompletion.choices[0].message;
    generatedMessages.push(thirdMessage);

    // Finalize trace
    await langfuseService.finalizeTrace(trace, messages, generatedMessages);

    res.json({ 
      completion: mainCompletion.choices[0].message.content, 
      completion2: secondaryCompletion.choices[0].message.content, 
      completion3: thirdCompletion.choices[0].message.content, 
      conversation_id 
    });
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));

process.on('SIGINT', async () => {
  await langfuseService.shutdownAsync();
  process.exit(0);
});