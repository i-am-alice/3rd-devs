import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OpenAIService } from './OpenAIService';
import { ContextService } from './ContextService';
import { AssistantService } from './AssistantService';
import type { ChatCompletionMessageParam } from 'ai/prompts';

const app = express();
const port = 3000;
app.use(express.json());
app.listen(port, () => console.log(`Server running at http://localhost:${port}. Listening for POST /api/chat requests`));

const openaiService = new OpenAIService();
const contextService = new ContextService('./files/context', openaiService);
const assistantService = new AssistantService(openaiService);

app.post('/api/chat', async (req, res) => {
  const { messages, conversation_id = uuidv4() } = req.body;
  try {
    // load messages from the memory file or use the messages passed in the request
    let thread = messages.filter((m: ChatCompletionMessageParam) => m.role !== 'system').length > 1 
                ? messages 
                : [...await contextService.getExistingMessages(conversation_id), 
                  messages.at(-1)];
    
    const latestUserMessage = thread.at(-1);
    if (!latestUserMessage) {
      return res.status(400).json({ error: 'No user message provided' });
    }
    console.log(latestUserMessage);
    // Create embedding for the latest user message
    const latestMessageEmbedding = await openaiService.createEmbedding(latestUserMessage.content);
    
    // Search for similar messages and memories
    const [similarMessages, similarMemories] = await Promise.all([
      contextService.searchSimilarMessages(latestMessageEmbedding, 3),
      contextService.searchSimilarMemories(latestMessageEmbedding, 3)
    ]);

    // Find relevant contexts across messages and stored memories
    const relevantContexts = await contextService.getRelevantContexts(similarMessages, similarMemories);
    thread = assistantService.addSystemMessage(thread, relevantContexts);

    // Generate a response from the assistant
    const assistantContent = await assistantService.answer({ messages: thread });

    // Save the conversation and its embedding
    const updatedMessages = [...thread, { role: 'assistant', content: assistantContent }];

    // Learn from the conversation and get a memory object
    const memory = await assistantService.learn(updatedMessages);

    // Save the conversation without the memory
    const saved_conversation_id = await contextService.saveConversation({
      messages: updatedMessages,
      keywords: typeof memory === 'object' ? memory.keywords || [] : [],
      conversation_uuid: conversation_id,
    });

    // Save the memory separately
    if (memory) {
      await contextService.saveMemoryForConversation(memory, saved_conversation_id);
    }

    return res.json({ choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: assistantContent
        },
        finish_reason: 'stop'
      }
    ]});
  } catch (error) {
    console.error('Error in chat processing:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

