import Firecrawl from '@mendable/firecrawl-js';

const firecrawl = new Firecrawl({ apiUrl: 'http://localhost:3002' });

export default async function scrapeWebsite(url: string): Promise<{ content: string; links: { url: string; label: string }[] }> {
    const result = await firecrawl.scrapeUrl(url, { formats: ['rawHtml'] });

    if (!result.success) {
        throw new Error(result.error);
    }

    if (!result.rawHtml) {
        throw new Error('HTML content is missing');
    }

    const links = Array.from(result.rawHtml.matchAll(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"(?:[^>]*?)>([^<]*)<\/a>/g)).map((match: any) => ({
        url: match[1],
        label: match[2],
    }));

    return {
        content: result.rawHtml || '',
        links: links
    };
}