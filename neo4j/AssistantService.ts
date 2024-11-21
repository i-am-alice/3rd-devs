import { OpenAIService } from "./OpenAIService";
import { extractTagContent } from "./utils";
import { memorizeSystemPrompt, recallSystemPrompt, thinkingSystemPrompt } from "./prompts";
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class AssistantService {
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.openAIService = openAIService;
  }

  async think(query: string): Promise<string> {
    const systemPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: thinkingSystemPrompt,
    };
    const userPrompt: ChatCompletionMessageParam = {
      role: "user",
      content: query,
    };
    const response = await this.openAIService.completion({
      messages: [systemPrompt, userPrompt],
      model: "gpt-4o",
      stream: false,
    }) as ChatCompletion;

    return extractTagContent(response.choices[0].message.content ?? "", "decision") ?? "ANSWER";
  }

  async getRecallJson(query: string): Promise<any> {
    const systemPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: recallSystemPrompt,
    };
    const userPrompt: ChatCompletionMessageParam = {
      role: "user",
      content: query,
    };

    const response = await this.openAIService.completion({
      messages: [systemPrompt, userPrompt],
      model: "gpt-4o",
    }) as ChatCompletion;

    const content = response.choices[0].message.content ?? "";
    return JSON.parse(extractTagContent(content, "recall") ?? "{}");
  }

  async describe(query: string): Promise<string> {
    const systemPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: memorizeSystemPrompt,
    };
    const userPrompt: ChatCompletionMessageParam = {
      role: "user",
      content: query,
    };

    const response = await this.openAIService.completion({
      messages: [systemPrompt, userPrompt],
      model: "gpt-4o",
    }) as ChatCompletion;

    return extractTagContent(response.choices[0].message.content ?? "", "resource") ?? "";
  }

  async generateAnswer(query: string, context: string): Promise<string> {
    const systemPrompt: ChatCompletionMessageParam = {
      role: "system",
      content: `As AI Agent, answer the user's query based on the provided context. \n\n 
        <context>${context}</context> 
        
    You can speak freely. When context says about a resource which were just added, simply confirm the action as if you were taken.
    Use markdown to format your response including links (but use them only if they're available within the context).`,
    };
    const userPrompt: ChatCompletionMessageParam = {
      role: "user",
      content: query,
    };
    const response = await this.openAIService.completion({
      messages: [systemPrompt, userPrompt],
      model: "gpt-4o",
      stream: false,
    }) as ChatCompletion;
    return response.choices[0].message.content ?? "No response...";
  }
}