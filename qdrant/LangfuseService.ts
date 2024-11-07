import { Langfuse, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse';
import type { LangfusePromptClient, TextPromptClient, ChatPromptClient, CreateChatPromptBody } from "langfuse-core";

// Define a new type that's compatible with both Langfuse and OpenAI
type CompatibleChatMessage = Omit<{ role: string; content: string }, "externalId" | "traceIdType">;

export class LangfuseService {
  public langfuse: Langfuse;

  constructor() {
    this.langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_HOST
    });

    this.langfuse.on("error", (error: Error) => {
      console.error("Langfuse error:", error);
    });

    if (process.env.NODE_ENV === 'development') {
      this.langfuse.debug();
    }
  }

  flushAsync(): Promise<void> {
    return this.langfuse.flushAsync();
  }

  createTrace(options: { id: string, name: string, sessionId: string, userId: string }): LangfuseTraceClient {
    return this.langfuse.trace(options);
  }

  createSpan(trace: LangfuseTraceClient, name: string, input?: any): LangfuseSpanClient {
    return trace.span({ name, input: input ? input : undefined });
  }

  finalizeSpan(span: LangfuseSpanClient, name: string, input: any, output: any): void {
    span.update({
      name,
      output,
    });
    span.end();
  }

  async finalizeTrace(trace: LangfuseTraceClient, input: any, output: any): Promise<void> {
    await trace.update({ 
      input,
      output,
    });
    await this.langfuse.flushAsync();
  }

  async shutdownAsync(): Promise<void> {
    await this.langfuse.shutdownAsync();
  }

  createGeneration(trace: LangfuseTraceClient, name: string, input: any, prompt?: LangfusePromptClient, config?: any): LangfuseGenerationClient {
    return trace.generation({
      name,
      input,
      prompt,
      ...config
    });
  }

  createEvent(trace: LangfuseTraceClient, name: string, input?: any, output?: any): void {
    trace.event({
      name,
      input: input ? JSON.stringify(input) : undefined,
      output: output ? JSON.stringify(output) : undefined,
    });
  }

  finalizeGeneration(generation: LangfuseGenerationClient, output: any, model: string, usage?: { promptTokens?: number, completionTokens?: number, totalTokens?: number }): void {
    generation.update({
      output,
      model,
      usage,
    });
    generation.end();
  }

  async createPrompt(body: CreateChatPromptBody): Promise<ChatPromptClient> {
    return this.langfuse.createPrompt(body);
  }

  async getPrompt(
    name: string,
    version?: number,
    options?: {
      label?: string;
      cacheTtlSeconds?: number;
      fallback?: string;
      maxRetries?: number;
      type?: "text";
      fetchTimeoutMs?: number;
    }
  ): Promise<TextPromptClient>;

  async getPrompt(
    name: string,
    version?: number,
    options?: {
      label?: string;
      cacheTtlSeconds?: number;
      fallback?: Omit<{ role: string; content: string }, "externalId" | "traceIdType">[];
      maxRetries?: number;
      type: "chat";
      fetchTimeoutMs?: number;
    }
  ): Promise<ChatPromptClient>;
  
  async getPrompt(
    name: string,
    version?: number,
    options?: any
  ): Promise<TextPromptClient | ChatPromptClient> {
    return this.langfuse.getPrompt(name, version, options);
  }

  compilePrompt(prompt: TextPromptClient | ChatPromptClient, variables: Record<string, any>): string | CompatibleChatMessage[] {
    const compiled = prompt.compile(variables);
    if (typeof compiled === 'string') {
      return compiled;
    } else if (Array.isArray(compiled)) {
      return compiled.map(message => ({
        role: message.role,
        content: message.content
      }));
    } else {
      throw new Error('Unexpected prompt compilation result');
    }
  }

  async preFetchPrompts(promptNames: string[]): Promise<void> {
    await Promise.all(promptNames.map(name => this.getPrompt(name)));
  }

  // Remove the finalizeEvent method as it's not needed for LangfuseEventClient
}