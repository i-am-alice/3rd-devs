import { Langfuse, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient, LangfuseEventClient } from 'langfuse';
import type { ChatCompletionMessageParam, ChatCompletion } from "openai/resources/chat/completions";

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

  createTrace(options: { id: string, name: string, sessionId: string }): LangfuseTraceClient {
    return this.langfuse.trace(options);
  }

  createSpan(trace: LangfuseTraceClient, name: string, input?: any): LangfuseSpanClient {
    return trace.span({ name, input: input ? JSON.stringify(input) : undefined });
  }

  finalizeSpan(span: LangfuseSpanClient, name: string, input: any, output: any): void {
    span.update({
      name,
      output: JSON.stringify(output),
    });
    span.end();
  }

  async finalizeTrace(trace: LangfuseTraceClient, input: any, output: any): Promise<void> {
    await trace.update({ 
      input: JSON.stringify(input),
      output: JSON.stringify(output),
    });
    await this.langfuse.flushAsync();
  }

  async shutdownAsync(): Promise<void> {
    await this.langfuse.shutdownAsync();
  }

  createGeneration(trace: LangfuseTraceClient, name: string, input: any): LangfuseGenerationClient {
    return trace.generation({
      name,
      input: JSON.stringify(input),
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
      output: JSON.stringify(output),
      model,
      usage,
    });
    generation.end();
  }

  // Remove the finalizeEvent method as it's not needed for LangfuseEventClient
}