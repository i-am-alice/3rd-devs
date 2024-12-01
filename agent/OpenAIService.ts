import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

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
}