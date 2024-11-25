import OpenAI, { toFile } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import fs from 'fs/promises';
import { TextService, type IDoc } from "./TextService";
import type { CreateEmbeddingResponse } from 'openai/resources/embeddings';

export interface ImageProcessingResult {
  description: string;
  source: string;
}

export class OpenAIService {
  private openai: OpenAI;
  private textService: TextService;

  constructor() {
    this.openai = new OpenAI();
    this.textService = new TextService();
  }

  async completion(config: {
    messages: ChatCompletionMessageParam[],
    model?: string,
    stream?: boolean,
    jsonMode?: boolean,
    maxTokens?: number
  }): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const { messages, model = "gpt-4o", stream = false, jsonMode = false, maxTokens = 8096 } = config;
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
        ...(model !== 'o1-mini' && model !== 'o1-preview' && {
          stream,
          max_tokens: maxTokens,
          response_format: jsonMode ? { type: "json_object" } : { type: "text" }
        })
      });
      
      return stream
        ? chatCompletion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
        : chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }

  async processImage(imagePath: string): Promise<ImageProcessingResult> {
    try {
      const image = await fs.readFile(imagePath);
      const base64Image = image.toString('base64');

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this image in detail." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            ],
          },
        ],
      });

      return {
        description: response.choices[0].message.content || "No description available.",
        source: imagePath,
      };
    } catch (error) {
      console.error(`Error processing image ${imagePath}:`, error);
      throw error;
    }
  }

  async processImages(imagePaths: string[]): Promise<ImageProcessingResult[]> {
    try {
      const results = await Promise.all(imagePaths.map(path => this.processImage(path)));
      return results;
    } catch (error) {
      console.error("Error processing multiple images:", error);
      throw error;
    }
  }

  async transcribeBuffer(audioBuffer: Buffer, config: { language: string, prompt?: string } = { language: 'en', prompt: '' } ): Promise<string> {
    console.log("Transcribing audio...");
    
    const transcription = await this.openai.audio.transcriptions.create({
      file: await toFile(audioBuffer, 'speech.ogg'),
      language: config.language,
      model: 'whisper-1',
      prompt: config.prompt,
  });
    return transcription.text;
  }

  async transcribe(audioFiles: string[], config: { language: string, prompt?: string, fileName: string } = { language: 'pl', prompt: '', fileName: 'transcription.md' }): Promise<IDoc[]> {
    console.log("Transcribing multiple audio files...");
    const results = await Promise.all(audioFiles.map(async (filePath) => {
      const buffer = await fs.readFile(filePath);
      const transcription = await this.transcribeBuffer(buffer, { language: config.language, prompt: config.prompt });

      const doc = await this.textService.document(transcription, 'gpt-4o', { source: filePath, name: config.fileName });
      return doc;
    }));

    return results;
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response: CreateEmbeddingResponse = await this.openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error("Error creating embedding:", error);
      throw error;
    }
  }

  async createJinaEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.jina.ai/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.JINA_API_KEY}`
        },
        body: JSON.stringify({
          model: 'jina-embeddings-v3',
          task: 'text-matching',
          dimensions: 1024,
          late_chunking: false,
          embedding_type: 'float',
          input: [text]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("Error creating Jina embedding:", error);
      throw error;
    }
  }
}