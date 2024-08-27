import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(messages: ChatCompletionMessageParam[], model: string = "gpt-4o") {
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
      });
      return chatCompletion;
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }
}