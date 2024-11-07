import type { OpenAIService } from "./OpenAIService";
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { LangfuseService } from './LangfuseService';
import { LangfuseTraceClient } from 'langfuse';

export interface ParsingError {
    error: string;
    result: boolean;
}

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
      }, trace: LangfuseTraceClient) {
        const { messages, ...restConfig } = config;

        const prompt = await this.langfuseService.getPrompt('Answer', 1);
        const [systemMessage] = prompt.compile();
        const thread = [systemMessage, ...messages.filter(msg => msg.role !== 'system')];

        const generation = this.langfuseService.createGeneration(trace, "Answer", thread, prompt, {...restConfig });

        try {
            const completion = await this.openaiService.completion({
                ...restConfig,
                messages: thread as ChatCompletionMessageParam[]
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

}
