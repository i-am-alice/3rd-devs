import OpenAI, { toFile } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import fs from 'fs/promises';
import type { CreateEmbeddingResponse } from 'openai/resources/embeddings';

export interface ImageProcessingResult {
  description: string;
  source: string;
}

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(config: {
    messages: ChatCompletionMessageParam[],
    model?: string,
    stream?: boolean,
    jsonMode?: boolean,
    maxTokens?: number
  }): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const { messages, model = "gpt-4o", stream = false, jsonMode = false, maxTokens = 4096 } = config;
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
}