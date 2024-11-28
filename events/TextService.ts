import { createByModelName } from '@microsoft/tiktokenizer';
import { v4 as uuidv4 } from 'uuid';
export interface IDoc {
  text: string;
  metadata: {
    tokens: number;
    type: 'audio' | 'text' | 'image' | 'document';
    content_type: 'chunk' | 'complete';
    source?: string; // url / path 
    mimeType?: string; // mime type
    name?: string; // filename
    description?: string; // description
    source_uuid?: string;
    conversation_uuid?: string;
    uuid?: string;
    duration?: number; // duration in seconds
    headers?: Headers;
    urls?: string[];
    images?: string[];
    screenshots?: string[];
    chunk_index?: number;
    total_chunks?: number;
  };
}

interface Headers {
  [key: string]: string[];
}

export class TextService {
  private tokenizer?: Awaited<ReturnType<typeof createByModelName>>;

  private readonly SPECIAL_TOKENS = new Map<string, number>([
    ['<|im_start|>', 100264],
    ['<|im_end|>', 100265],
    ['<|im_sep|>', 100266],
  ]);

  constructor(private modelName: string = 'gpt-4') {}

  private async initializeTokenizer(model?: string): Promise<void> {
    if (!this.tokenizer || model !== this.modelName) {
      this.modelName = model || this.modelName;
      this.tokenizer = await createByModelName(this.modelName, this.SPECIAL_TOKENS);
    }
  }

  private countTokens(text: string): number {
    if (!this.tokenizer) {
      throw new Error('Tokenizer not initialized');
    }
    const formattedContent = this.formatForTokenization(text);
    const tokens = this.tokenizer.encode(formattedContent, Array.from(this.SPECIAL_TOKENS.keys()));
    return tokens.length;
  }

  private formatForTokenization(text: string): string {
    return `<|im_start|>user\n${text}<|im_end|>\n<|im_start|>assistant<|im_end|>`;
  }

  async split(text: string, limit: number, metadata?: Partial<IDoc['metadata']>): Promise<IDoc[]> {
    console.log
    await this.initializeTokenizer();
    const chunks: IDoc[] = [];
    let position = 0;
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
      console.log(`Chunk exceeds limit with ${tokens + overhead} tokens. Adjusting end position...`);
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
        console.log(`Extending chunk to next newline at position ${extendedEnd}`);
        return extendedEnd;
      }
    }

    // Try reducing to previous newline
    if (prevNewline > start) {
      const reducedEnd = prevNewline + 1;
      const chunkText = text.slice(start, reducedEnd);
      const tokens = this.countTokens(chunkText);
      if (tokens <= limit && tokens >= minChunkTokens) {
        console.log(`Reducing chunk to previous newline at position ${reducedEnd}`);
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

  async document(text: string, model?: string, additionalMetadata?: Record<string, any>): Promise<IDoc> {
    await this.initializeTokenizer(model);
    const tokens = this.countTokens(text);
    const headers = this.extractHeaders(text);
    const { content, urls, images } = this.extractUrlsAndImages(text);
  
    return {
      text: content,
      metadata: {
        uuid: uuidv4(),
        tokens,
        type: 'text',
        content_type: 'complete',
        headers,
        urls,
        images,
        ...additionalMetadata, 
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
