import type { OpenAIService } from "./OpenAIService";
import { v4 as uuidv4 } from 'uuid';
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { LangfuseTraceClient } from 'langfuse';
import type { LangfuseService } from "./LangfuseService";

export interface ParsingError {
    error: string;
    result: boolean;
}

// Update the ShouldLearnResponse interface
export interface ShouldLearnResponse {
    _thinking: string;
    add?: string[];
    update?: {
        uuid: string;
        content: string;
    }[];
}

export class AssistantService {
    private openaiService: OpenAIService;
    private langfuseService: LangfuseService;

    constructor(openaiService: OpenAIService, langfuseService: LangfuseService) {
        this.openaiService = openaiService;
        this.langfuseService = langfuseService;
    }

    async answer(config: {
        messages: ChatCompletionMessageParam[],
        model?: string,
        stream?: boolean,
        jsonMode?: boolean,
        maxTokens?: number,
        memories?: string,
        knowledge?: string,
        learnings?: string
      }, trace: LangfuseTraceClient) {
        const { messages, ...restConfig } = config;

        const generation = this.langfuseService.createGeneration(trace, "Answer", { messages, ...restConfig });

        try {
            const completion = await this.openaiService.completion({
                ...restConfig,
                messages
            }) as ChatCompletion;

            this.langfuseService.finalizeGeneration(generation, completion.choices[0].message, completion.model, {
                promptTokens: completion.usage?.prompt_tokens,
                completionTokens: completion.usage?.completion_tokens,
                totalTokens: completion.usage?.total_tokens
            });
            return completion;
        } catch (error) {
            this.langfuseService.finalizeGeneration(generation, { error: error instanceof Error ? error.message : String(error) }, "unknown");
            throw error;
        }
    }

    async getRelevantContext(query: string): Promise<string> {
        const similarMemories = await this.memoryService.searchSimilarMemories(query);
        return similarMemories.map(memory => memory.content.text).join('\n\n');
    }

}
