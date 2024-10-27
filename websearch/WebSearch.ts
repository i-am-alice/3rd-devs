import FirecrawlApp from '@mendable/firecrawl-js';
import type { ScrapeResponse } from '@mendable/firecrawl-js';
import type OpenAI from 'openai';
import { OpenAIService } from './OpenAIService';
import { useSearchPrompt, extractKeywordsPrompt, askDomainsPrompt, scoreResultsPrompt, selectResourcesToLoadPrompt } from './prompts';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// New type definition
type SearchNecessityResponse = 0 | 1;

export class WebSearchService {
  private openaiService: OpenAIService;
  private allowedDomains: { name: string, url: string, scrappable: boolean }[];
  private apiKey: string;
  private firecrawlApp: FirecrawlApp;

  constructor(allowedDomains: { name: string, url: string, scrappable: boolean }[]) {
    this.openaiService = new OpenAIService();
    this.allowedDomains = allowedDomains;
    this.apiKey = process.env.FIRECRAWL_API_KEY || '';
    this.firecrawlApp = new FirecrawlApp({ apiKey: this.apiKey });
  }

  async isWebSearchNeeded(userMessage: string): Promise<boolean> {
    console.log('Input (isWebSearchNeeded):', userMessage);
    const systemPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: useSearchPrompt
    };

    const userPrompt: ChatCompletionMessageParam = {
      role: "user",
      content: userMessage
    };

    try {
      const response = await this.openaiService.completion([systemPrompt, userPrompt], 'gpt-4o', false) as OpenAI.Chat.Completions.ChatCompletion;
      if (response.choices[0].message.content) {
        console.log('Is web search needed?', response.choices[0].message.content);
        const result = JSON.parse(response.choices[0].message.content) as SearchNecessityResponse;
        console.log('Output (isWebSearchNeeded):', result === 1);
        return result === 1;
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Error in WebSearchService:', error);
      return false;
    }
  }

  async generateQueries(userMessage: string): Promise<{ queries: { q: string, url: string }[], thoughts: string }> {
    console.log('Input (generateQueries):', userMessage);
    const systemPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: askDomainsPrompt(this.allowedDomains)
    };

    const userPrompt: ChatCompletionMessageParam = {
      role: "user",
      content: userMessage
    };

    try {
      const response = await this.openaiService.completion([systemPrompt, userPrompt], 'gpt-4o', false, true) as OpenAI.Chat.Completions.ChatCompletion;

      if (response.choices[0].message.content) {
        const result = JSON.parse(response.choices[0].message.content);
        // Filter queries to only include allowed domains
        const filteredQueries = result.queries.filter((query: { q: string, url: string }) => 
          this.allowedDomains.some(domain => query.url.includes(domain.url))
        );
        console.log('generated queries:', filteredQueries);
        console.log('Output (generateQueries):', { queries: filteredQueries, thoughts: result._thoughts });
        return { queries: filteredQueries, thoughts: result._thoughts };
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Error generating queries:', error);
      return { queries: [], thoughts: '' };
    }
  }

  async searchWeb(queries: { q: string, url: string }[]): Promise<{ query: string, results: { url: string, title: string, description: string }[] }[]> {
    console.log('Input (searchWeb):', queries);
    const searchResults = await Promise.all(queries.map(async ({ q, url }) => {
      try {
        // Add site: prefix to the query using domain
        const domain = new URL(url.startsWith('https://') ? url : `https://${url}`).hostname;
        const siteQuery = `site:${domain} ${q}`;
        
        const response = await fetch('https://api.firecrawl.dev/v0/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            query: siteQuery,
            searchOptions: {
              limit: 6
            },
            pageOptions: {
              fetchPageContent: false
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        console.log('siteQuery:', siteQuery);
        console.log('result:', result);

        if (result.success && result.data && Array.isArray(result.data)) {
          return {
            query: q,
            results: result.data.map((item: any) => ({
              url: item.url,
              title: item.title,
              description: item.description
            }))
          };
        } else {
          console.warn(`No results found for query: "${siteQuery}"`);
          return { query: q, results: [] };
        }
      } catch (error) {
        console.error(`Error searching for "${q}":`, error);
        return { query: q, results: [] };
      }
    }));

    console.log('Output (searchWeb):', searchResults);
    return searchResults;
  }

  async scoreResults(searchResults: { query: string, results: { url: string, title: string, description: string }[] }[], originalQuery: string): Promise<{ url: string, title: string, description: string }[]> {
    console.log('Input (scoreResults):', { searchResults, originalQuery });
    const scoringPromises = searchResults.flatMap(result =>
      result.results.map(async item => {
        const userMessage = `<context>
        Resource: ${item.url}
        Snippet: ${item.description}
        </context>

        The following is the original user query that we are scoring the resource against. It's super relevant.
        <original_user_query_to_consider>
        ${originalQuery}
        </original_user_query_to_consider>

        The following is the generated query that may be helpful in scoring the resource.
        <query>
        ${result.query}
        </query>`;

        const response = await this.openaiService.completion([
          { role: "system", content: scoreResultsPrompt },
          { role: "user", content: userMessage }
        ], 'gpt-4o-mini', false) as OpenAI.Chat.Completions.ChatCompletion;

        if (response.choices[0].message.content) {
          const scoreResult = JSON.parse(response.choices[0].message.content);
          console.log('Score for', item.url, scoreResult.score);
          console.log('Thoughts:', scoreResult.reason);
          return { ...item, score: scoreResult.score };
        }
        return { ...item, score: 0 };
      })
    );

    const scoredResults = await Promise.all(scoringPromises);
    const sortedResults = scoredResults.sort((a, b) => b.score - a.score);
    const filteredResults = sortedResults.slice(0, 3);

    console.log('Output (scoreResults):', filteredResults);
    return filteredResults;
  }

  async selectResourcesToLoad(
    userMessage: string,
    filteredResults: { url: string, title: string, description: string }[]
  ): Promise<string[]> {
    const systemPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: selectResourcesToLoadPrompt
    };

    const userPrompt: ChatCompletionMessageParam = {
      role: "user",
      content: `Original query: "${userMessage}"
Filtered resources:
${JSON.stringify(filteredResults.map(r => ({ url: r.url, snippet: r.description })), null, 2)}`
    };

    console.log('userPrompt:', userPrompt);

    try {
      const response = await this.openaiService.completion([systemPrompt, userPrompt], 'gpt-4o', false, true) as OpenAI.Chat.Completions.ChatCompletion;

      if (response.choices[0].message.content) {
        console.log('response.choices[0].message.content:', response.choices[0].message.content);
        const result = JSON.parse(response.choices[0].message.content);
        const selectedUrls = result.urls;


        // Filter out URLs that aren't in the filtered results
        const validUrls = selectedUrls.filter((url: string) => 
          filteredResults.some(r => r.url === url)
        );

        return validUrls;
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Error selecting resources to load:', error);
      return [];
    }
  }

  async scrapeUrls(urls: string[]): Promise<{ url: string, content: string }[]> {
    // Filter out URLs that are not scrappable based on allowedDomains
    const scrappableUrls = urls.filter(url => {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      console.log('domain:', domain);
      const allowedDomain = this.allowedDomains.find(d => d.url === domain);
      console.log('allowedDomain:', allowedDomain);
      return allowedDomain && allowedDomain.scrappable;
    });

    console.log('scrappableUrls:', scrappableUrls);

    const scrapePromises = scrappableUrls.map(async (url) => {
      try {
        const scrapeResult = await this.firecrawlApp.scrapeUrl(url, { formats: ['markdown'] });
        
        if (scrapeResult && scrapeResult.markdown) {
            console.log('scrapeResult:', scrapeResult);
          return { url, content: scrapeResult.markdown };
        } else {
          console.warn(`No markdown content found for URL: ${url}`);
          return { url, content: '' };
        }
      } catch (error) {
        console.error(`Error scraping URL ${url}:`, error);
        return { url, content: '' };
      }
    });

    const scrapedResults = await Promise.all(scrapePromises);
    return scrapedResults.filter(result => result.content !== '');
  }
}
