import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { projectAssignmentPrompt } from './prompts';

interface ProjectAssignment {
  _thoughts: string;
  name: string;
  id: string;
}

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  /**
   * Handles OpenAI API interactions for chat completions and embeddings.
   * Uses OpenAI's chat.completions and embeddings APIs.
   * Supports streaming, JSON mode, and different models.
   * Logs interactions to a prompt.md file for debugging.
   */
  async completion(
    messages: ChatCompletionMessageParam[],
    model: string = "gpt-4o",
    stream: boolean = false,
    jsonMode: boolean = false
  ): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
        stream,
        response_format: jsonMode ? { type: "json_object" } : { type: "text" }
      });

      if (stream) {
        return chatCompletion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
      } else {
        return chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
      }
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }

  /**
   * Creates an embedding for the given input using OpenAI's text-embedding-3-large model.
   * @param input - A string or array of strings to create embeddings for.
   * @returns A Promise resolving to an array of numbers representing the embedding.
   * @throws Error if there's an issue creating the embedding.
   */
  async createEmbedding(input: string | string[]): Promise<number[]> {
    console.log(input)
    try {
      const embedding = await this.openai.embeddings.create({
        model: "text-embedding-3-large",
        input: input,
        encoding_format: "float",
      });

      // Return the embedding vector
      return embedding.data[0].embedding;
    } catch (error) {
      console.error("Error in creating embedding:", error);
      throw error;
    }
  }

  async assignProjectToTask(title: string, description: string): Promise<ProjectAssignment> {
    const prompt = `Please assign this task to the project:
Title: ${title}
Description: ${description}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: projectAssignmentPrompt },
      { role: "user", content: prompt }
    ];

    try {
      const completion = await this.completion(messages, "gpt-4o", false, true);
      if ('choices' in completion && completion.choices[0].message.content) {
        const result: ProjectAssignment = JSON.parse(completion.choices[0].message.content);
        return result;
      } else {
        throw new Error("Unexpected response format from OpenAI");
      }
    } catch (error) {
      console.error("Error in assigning project to task:", error);
      throw error;
    }
  }
}