import type { ChatCompletionMessageParam, ChatCompletion } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';

export class ChatService {
  private openaiService: OpenAIService;
  constructor() {
    this.openaiService = new OpenAIService();
  }
  async completion(messages: ChatCompletionMessageParam[], model: string): Promise<ChatCompletion> {
    return this.openaiService.completion({
      messages,
      model,
      stream: false,
      jsonMode: false,
    });
  }
}

