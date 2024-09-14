import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletion } from "openai/resources/chat/completions";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(config: {
    messages: ChatCompletionMessageParam[];
    model?: string;
    stream?: boolean;
    jsonMode?: boolean;
  }): Promise<ChatCompletion> {
    const {
      messages,
      model = "gpt-4",
      stream = false,
      jsonMode = false,
    } = config;

    return await this.openai.chat.completions.create({
      messages,
      model,
      stream,
      response_format: jsonMode ? { type: "json_object" } : { type: "text" }
    }) as ChatCompletion;
  }
}