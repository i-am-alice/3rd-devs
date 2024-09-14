import { Langfuse, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse';
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

  createTrace(options: { id: string, name: string, sessionId: string }): LangfuseTraceClient {
    return this.langfuse.trace(options);
  }

  createSpan(trace: LangfuseTraceClient, name: string, input?: any): LangfuseSpanClient {
    return trace.span({ name, input: input ? JSON.stringify(input) : undefined });
  }

  finalizeSpan(span: LangfuseSpanClient, name: string, input: ChatCompletionMessageParam[], output: ChatCompletion): void {
    span.update({
      name,
      output: JSON.stringify(output.choices[0].message),
    });

    const generation: LangfuseGenerationClient = span.generation({
      name,
      model: output.model,
      modelParameters: {
        temperature: 0.7, // Add other parameters if available
      },
      input: input,
      output: output,
      usage: {
        promptTokens: output.usage?.prompt_tokens,
        completionTokens: output.usage?.completion_tokens,
        totalTokens: output.usage?.total_tokens,
      },
    });
    generation.end();
    span.end();
  }

  async finalizeTrace(trace: LangfuseTraceClient, originalMessages: ChatCompletionMessageParam[], generatedMessages: ChatCompletionMessageParam[]): Promise<void> {
    const inputMessages = originalMessages.filter(msg => msg.role !== 'system');
    await trace.update({ 
      input: JSON.stringify(inputMessages),
      output: JSON.stringify(generatedMessages),
    });
    await this.langfuse.flushAsync();
  }

  async shutdownAsync(): Promise<void> {
    await this.langfuse.shutdownAsync();
  }
}