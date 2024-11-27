import FirecrawlApp from '@mendable/firecrawl-js';
import type OpenAI from 'openai';
import { OpenAIService } from './OpenAIService';
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { selectResourcesToLoadPrompt } from '../websearch/prompts';

// New type definition
type SearchNecessityResponse = {
  _thoughts: string;
  shouldSearch: boolean;
};

export class WebSearchService {
  private openaiService: OpenAIService;
  private allowedDomains: { name: string, url: string, scrappable: boolean }[];
  private apiKey: string;
  private firecrawlApp: FirecrawlApp;

  constructor() {
    this.openaiService = new OpenAIService();
    this.allowedDomains = [
      { name: 'Wikipedia', url: 'wikipedia.org', scrappable: true },
      { name: 'easycart', url: 'easycart.pl', scrappable: true },
      { name: 'FS.blog', url: 'fs.blog', scrappable: true },
      { name: 'arXiv', url: 'arxiv.org', scrappable: true },
      { name: 'Instagram', url: 'instagram.com', scrappable: false },
      { name: 'OpenAI', url: 'openai.com', scrappable: true },
      { name: 'Brain overment', url: 'brain.overment.com', scrappable: true },
      { name: 'Reuters', url: 'reuters.com', scrappable: true },
      { name: 'MIT Technology Review', url: 'technologyreview.com', scrappable: true },
      { name: 'Youtube', url: 'youtube.com', scrappable: false },
      { name: 'Mrugalski / UWteam', url: 'mrugalski.pl', scrappable: true },
      { name: 'Hacker News', url: 'news.ycombinator.com', scrappable: true },
    ];
    this.apiKey = process.env.FIRECRAWL_API_KEY || '';
    this.firecrawlApp = new FirecrawlApp({ apiKey: this.apiKey });
  }

  async searchWeb(queries: { q: string, url: string }[], conversation_uuid: string): Promise<{ query: string, domain: string, results: { url: string, title: string, description: string }[] }[]> {
    const searchResults = await Promise.all(queries.map(async ({ q, url }) => {
      try {
        // Add site: prefix to the query using domain
        const domain = new URL(url.startsWith('https://') ? url : `https://${url}`);
        const siteQuery = `site:${domain} ${q}`;
        console.log('siteQuery', siteQuery);
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

        if (result.success && result.data && Array.isArray(result.data)) {

          return {
            query: q,
            domain: domain.href,
            results: result.data.map((item: any) => ({
              url: item.url,
              title: item.title,
              description: item.description
            }))
          };
        } else {
          console.warn(`No results found for query: "${siteQuery}"`);
          return { query: q, domain: domain.href, results: [] }; // Add domain here
        }
      } catch (error) {
        console.error(`Error searching for "${q}":`, error);
        return { query: q, domain: url, results: [] }; // Add domain here
      }
    }));

    return searchResults;
  }

  async selectResourcesToLoad(
    messages: ChatCompletionMessageParam[],
    filteredResults: {
      query: string;
      domain: string;
      results: {
          url: string;
          title: string;
          description: string;
      }[];
  }[]
  ): Promise<string[]> {
    const systemPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: selectResourcesToLoadPrompt(filteredResults)
    };

    try {
      const response = await this.openaiService.completion([systemPrompt, ...messages], 'gpt-4o', false, true) as OpenAI.Chat.Completions.ChatCompletion;

      if (response.choices[0].message.content) {
        const result = JSON.parse(response.choices[0].message.content);
        const selectedUrls = result.urls;

        console.log('selectedUrls', selectedUrls);
        // Filter out URLs that aren't in the filtered results
        const validUrls = selectedUrls.filter((url: string) => 
          filteredResults.some(r => r.results.some(item => item.url === url))
        );

        // Get domains with empty results
        const emptyDomains = filteredResults
          .filter(r => r.results.length === 0)
          .map(r => r.domain);

        // Combine validUrls and emptyDomains
        const combinedUrls = [...validUrls, ...emptyDomains];

        return combinedUrls;
      }

      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('Error selecting resources to load:', error);
      return [];
    }
  }

  async scrapeUrls(urls: string[], conversation_uuid: string): Promise<{ url: string, content: string }[]> {
    console.log('Input (scrapeUrls):', urls);
    
    // Filter out URLs that are not scrappable based on allowedDomains
    const scrappableUrls = urls.filter(url => {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      const allowedDomain = this.allowedDomains.find(d => d.url === domain);
      return allowedDomain && allowedDomain.scrappable;
    });

    const scrapePromises = scrappableUrls.map(async (url) => {
      try {
        url = url.replace(/\/$/, '');

        const scrapeResult = await this.firecrawlApp.scrapeUrl(url, { formats: ['markdown'] });

        
        if (scrapeResult && scrapeResult.markdown) {
          return { url, content: scrapeResult.markdown.trim() };
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
