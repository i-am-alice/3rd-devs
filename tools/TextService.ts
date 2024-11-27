import { createByModelName } from '@microsoft/tiktokenizer';
import type { IDoc, Headers } from './types/types';
import { generateMetadata } from './utils/metadata';
import { marked, Lexer } from 'marked';

export class TextService {
  private tokenizer?: Awaited<ReturnType<typeof createByModelName>>;

  constructor(private modelName: string = 'gpt-4o') {}

  private readonly SPECIAL_TOKENS = new Map<string, number>([
    ['<|im_start|>', 100264],
    ['<|im_end|>', 100265],
    ['<|im_sep|>', 100266],
  ]);

  private formatForTokenization(text: string): string {
    return `<|im_start|>user\n${text}<|im_end|>\n<|im_start|>assistant<|im_end|>`;
  }

  private countTokens(text: string): number {
    if (!this.tokenizer) {
      throw new Error('Tokenizer not initialized');
    }
    const formattedContent = this.formatForTokenization(text);
    const tokens = this.tokenizer.encode(formattedContent, Array.from(this.SPECIAL_TOKENS.keys()));
    return tokens.length;
  }

  private async initializeTokenizer(model?: string): Promise<void> {
    if (!this.tokenizer || model !== this.modelName) {
      this.modelName = model || this.modelName;
      this.tokenizer = await createByModelName(this.modelName, this.SPECIAL_TOKENS);
    }
  }

  async markdownToHtml(markdown: string): Promise<string> {
    try {
      const html = marked.parse(markdown);
      return html;
    } catch (error) {
      console.error('Error converting Markdown to HTML:', error);
      throw new Error('Failed to convert Markdown to HTML');
    }
  }
  
  async htmlToMarkdown(html: string): Promise<string> {
    try {
      const lexer = new Lexer();
      const tokens = lexer.lex(html);
      const markdown = marked.parser(tokens);
      return markdown;
    } catch (error) {
      console.error('Error converting HTML to Markdown:', error);
      throw new Error('Failed to convert HTML to Markdown');
    }
  }

  async split(text: string, limit: number, metadata?: Partial<IDoc['metadata']>): Promise<IDoc[]> {
    await this.initializeTokenizer();
    
    let position = 0;
    const chunks: IDoc[] = [];
    const totalLength = text.length;
    const currentHeaders: Headers = {};

    while (position < totalLength) {
      const { chunkText, chunkEnd } = this.getChunk(text, position, limit);
      const tokens = this.countTokens(chunkText);

      const headersInChunk = this.extractHeaders(chunkText);
      this.updateCurrentHeaders(currentHeaders, headersInChunk);

      const { content, urls, images } = this.extractUrlsAndImages(chunkText);

      chunks.push({
        text: content,
        metadata: {
          tokens,
          headers: { ...currentHeaders },
          urls,
          images,
          type: metadata?.type || 'text',
          content_type: metadata?.content_type || 'chunk',
          ...metadata,
        },
      });

      position = chunkEnd;
    }

    return chunks;
  }

  private getChunk(text: string, start: number, limit: number): { chunkText: string; chunkEnd: number } {
    
    // Account for token overhead due to formatting
    const overhead = this.countTokens(this.formatForTokenization('')) - this.countTokens('');
    
    // Initial tentative end position
    let end = Math.min(start + Math.floor((text.length - start) * limit / this.countTokens(text.slice(start))), text.length);
    
    // Adjust end to avoid exceeding token limit
    let chunkText = text.slice(start, end);
    let tokens = this.countTokens(chunkText);
    
    while (tokens + overhead > limit && end > start) {
      end = this.findNewChunkEnd(text, start, end);
      chunkText = text.slice(start, end);
      tokens = this.countTokens(chunkText);
    }

    // Adjust chunk end to align with newlines without significantly reducing size
    end = this.adjustChunkEnd(text, start, end, tokens + overhead, limit);

    chunkText = text.slice(start, end);
    tokens = this.countTokens(chunkText);
    return { chunkText, chunkEnd: end };
  }

  private adjustChunkEnd(text: string, start: number, end: number, currentTokens: number, limit: number): number {
    const minChunkTokens = limit * 0.8; // Minimum chunk size is 80% of limit

    const nextNewline = text.indexOf('\n', end);
    const prevNewline = text.lastIndexOf('\n', end);

    // Try extending to next newline
    if (nextNewline !== -1 && nextNewline < text.length) {
      const extendedEnd = nextNewline + 1;
      const chunkText = text.slice(start, extendedEnd);
      const tokens = this.countTokens(chunkText);
      if (tokens <= limit && tokens >= minChunkTokens) {
        return extendedEnd;
      }
    }

    // Try reducing to previous newline
    if (prevNewline > start) {
      const reducedEnd = prevNewline + 1;
      const chunkText = text.slice(start, reducedEnd);
      const tokens = this.countTokens(chunkText);
      if (tokens <= limit && tokens >= minChunkTokens) {
        return reducedEnd;
      }
    }

    // Return original end if adjustments aren't suitable
    return end;
  }

  private findNewChunkEnd(text: string, start: number, end: number): number {
    // Reduce end position to try to fit within token limit
    let newEnd = end - Math.floor((end - start) / 10); // Reduce by 10% each iteration
    if (newEnd <= start) {
      newEnd = start + 1; // Ensure at least one character is included
    }
    return newEnd;
  }

  private extractHeaders(text: string): Headers {
    const headers: Headers = {};
    const headerRegex = /(^|\n)(#{1,6})\s+(.*)/g;
    let match;

    while ((match = headerRegex.exec(text)) !== null) {
      const level = match[2].length;
      const content = match[3].trim();
      const key = `h${level}`;
      headers[key] = headers[key] || [];
      headers[key].push(content);
    }

    return headers;
  }

  private updateCurrentHeaders(current: Headers, extracted: Headers): void {
    for (let level = 1; level <= 6; level++) {
      const key = `h${level}`;
      if (extracted[key]) {
        current[key] = extracted[key];
        this.clearLowerHeaders(current, level);
      }
    }
  }

  private clearLowerHeaders(headers: Headers, level: number): void {
    for (let l = level + 1; l <= 6; l++) {
      delete headers[`h${l}`];
    }
  }

  private extractUrlsAndImages(text: string): { content: string; urls: string[]; images: string[] } {
    const urls: string[] = [];
    const images: string[] = [];
    let urlIndex = 0;
    let imageIndex = 0;

    const content = text
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, altText, url) => {
        images.push(url);
        return `![${altText}]({{$img${imageIndex++}}})`;
      })
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
        if (!url.startsWith('{{$img')) {
          urls.push(url);
          return `[${linkText}]({{$url${urlIndex++}}})`;
        }
        return _match; // Keep image placeholders unchanged
      });

    return { content, urls, images };
  }

  async document(content: string, modelName?: string, metadataOverrides?: Record<string, any>): Promise<IDoc> {
    const baseMetadata = generateMetadata({
      source: metadataOverrides?.source || 'generated',
      name: metadataOverrides?.name || 'Generated Document',
      mimeType: metadataOverrides?.mimeType || 'text/plain',
      conversation_uuid: metadataOverrides?.conversation_uuid,
      additional: metadataOverrides?.additional || {},
    });

    return {
      text: content,
      metadata: {
        ...baseMetadata,
        ...metadataOverrides,
      },
    };
  }

  restorePlaceholders(idoc: IDoc): IDoc {
    const { text, metadata } = idoc;
    let restoredText = text;

    // Replace image placeholders with actual URLs
    if (metadata?.images) {
      metadata.images.forEach((url, index) => {
        const regex = new RegExp(`\\!\\[([^\\]]*)\\]\\(\\{\\{\\$img${index}\\}\\}\\)`, 'g');
        restoredText = restoredText.replace(regex, `![$1](${url})`);
      });
    }

    // Replace URL placeholders with actual URLs
    if (metadata?.urls) {
      metadata.urls.forEach((url, index) => {
        const regex = new RegExp(`\\[([^\\]]*)\\]\\(\\{\\{\\$url${index}\\}\\}\\)`, 'g');
        restoredText = restoredText.replace(regex, (match, p1) => {
          // Escape underscores in the link text
          const escapedText = p1.replace(/_/g, '\\_');
          return `[${escapedText}](${url})`;
        });
      });
    }

    return {
      text: restoredText,
      metadata: { ...metadata },
    };
  }
}
