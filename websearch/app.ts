import express from 'express';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';
import { WebSearchService } from './WebSearch';
import { answerPrompt } from './prompts';

import { promises as fs } from 'fs';
type Role = 'user' | 'assistant' | 'system';
type Message = Omit<ChatCompletionMessageParam, 'role'> & { role: Role };

interface SearchResult {
  url: string;
  title: string;
  description: string;
  content?: string;
}


const allowedDomains = [
  { name: 'Wikipedia', url: 'en.wikipedia.org', scrappable: true },
  { name: 'easycart', url: 'easycart.pl', scrappable: true },
  { name: 'FS.blog', url: 'fs.blog', scrappable: true },
  { name: 'arXiv', url: 'arxiv.org', scrappable: true },
  { name: 'Instagram', url: 'instagram.com', scrappable: false },
  { name: 'OpenAI', url: 'openai.com', scrappable: true },
  { name: 'Brain overment', url: 'brain.overment.com', scrappable: true },
];

/*
Start Express server
*/
const app = express();
const port = 3000;
app.use(express.json());
app.listen(port, () => console.log(`Server running at http://localhost:${port}. Listening for POST /api/chat requests`));

const webSearchService = new WebSearchService(allowedDomains);
const openaiService = new OpenAIService();

app.post('/api/chat', async (req, res) => {
  console.log('Received request');
  await fs.writeFile('prompt.md', '');
  
  const { messages }: { messages: Message[] } = req.body;

  try {
    const latestUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!latestUserMessage) {
      throw new Error('No user message found');
    }

    const shouldSearch = await webSearchService.isWebSearchNeeded(latestUserMessage.content as string);
    let mergedResults: SearchResult[] = []; 

    if (shouldSearch) {
      const { queries } = await webSearchService.generateQueries(latestUserMessage.content as string);
      if (queries.length > 0) {
        const searchResults = await webSearchService.searchWeb(queries);
        const filteredResults = await webSearchService.scoreResults(searchResults, latestUserMessage.content as string);
        const urlsToLoad = await webSearchService.selectResourcesToLoad(latestUserMessage.content as string, filteredResults);
        const scrapedContent = await webSearchService.scrapeUrls(urlsToLoad);
        mergedResults = filteredResults.map(result => {
          const scrapedItem = scrapedContent.find(item => item.url === result.url);
          return scrapedItem 
            ? { ...result, content: scrapedItem.content }
            : result;
        });
      }
    }

    const promptWithResults = answerPrompt(mergedResults);
    const allMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: promptWithResults, name: 'Alice' },
      ...messages as ChatCompletionMessageParam[]
    ];
    const completion = await openaiService.completion(allMessages, "gpt-4o", false);

    return res.json(completion);
  } catch (error) {
    console.error('Error in chat processing:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.post('/api/chat-dummy', async (req, res) => {
  const { messages }: { messages: Message[] } = req.body;

  try {
    const latestUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!latestUserMessage) {
      throw new Error('No user message found');
    }

    const dummyResponse: ChatCompletionMessageParam = {
      role: 'assistant',
      content: `This is a dummy response to: "${latestUserMessage.content}"`
    };

    const completion = {
      id: 'dummy-completion-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'dummy-model',
      choices: [
        {
          index: 0,
          message: dummyResponse,
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };

    return res.json(completion);
  } catch (error) {
    console.error('Error in chat processing:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});