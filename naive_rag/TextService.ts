import { createByModelName } from '@microsoft/tiktokenizer';

export interface IDoc {
  text: string;
  metadata: {
    tokens: number;
    headers: Headers;
    urls: string[];
    images: string[];
  };
}

interface Headers {
  [key: string]: string[];
}

export class TextSplitter {
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

  async split(text: string, limit: number): Promise<IDoc[]> {
    console.log(`Starting split process with limit: ${limit} tokens`);
    await this.initializeTokenizer();
    const chunks: IDoc[] = [];
    let position = 0;
    const totalLength = text.length;
    const currentHeaders: Headers = {};

    while (position < totalLength) {
      console.log(`Processing chunk starting at position: ${position}`);
      const { chunkText, chunkEnd } = this.getChunk(text, position, limit);
      const tokens = this.countTokens(chunkText);
      console.log(`Chunk tokens: ${tokens}`);

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
        },
      });

      console.log(`Chunk processed. New position: ${chunkEnd}`);
      position = chunkEnd;
    }

    console.log(`Split process completed. Total chunks: ${chunks.length}`);
    return chunks;
  }

  private getChunk(text: string, start: number, limit: number): { chunkText: string; chunkEnd: number } {
    console.log(`Getting chunk starting at ${start} with limit ${limit}`);
    
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
    console.log(`Final chunk end: ${end}`);
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
        urls.push(url);
        return `[${linkText}]({{$url${urlIndex++}}})`;
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
        tokens,
        headers,
        urls,
        images,
        ...additionalMetadata, 
      },
    };
  }
}