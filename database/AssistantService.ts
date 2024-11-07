import type { OpenAIService } from "./OpenAIService";
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { LangfuseService } from './LangfuseService';
import { LangfuseTraceClient } from 'langfuse';
import type { DatabaseService } from "./DatabaseService";
import { v4 as uuidv4 } from 'uuid';

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
    private databaseService: DatabaseService;
    private openaiService: OpenAIService;
    private langfuseService: LangfuseService;

    constructor(databaseService: DatabaseService, openaiService: OpenAIService, langfuseService: LangfuseService) {
        this.databaseService = databaseService;
        this.openaiService = openaiService;
        this.langfuseService = langfuseService;
    }

    async answer(config: {
        conversation_id: string,
        messages: ChatCompletionMessageParam[],
        model?: string,
        stream?: boolean,
        jsonMode?: boolean,
        maxTokens?: number,
      }, trace: LangfuseTraceClient) {
        const { messages, conversation_id, ...restConfig } = config;

        const userMessage = messages.at(-1)?.content || 'No content';
        await this.databaseService.insertMessage({
            uuid: uuidv4(),
            conversation_id: conversation_id,
            content: userMessage as string,
            role: 'user'
        });

        const prompt = await this.langfuseService.getPrompt('Answer', 1);
        const [systemMessage] = prompt.compile();
        const thread = [systemMessage, ...messages.filter(msg => msg.role !== 'system')];

        const generation = this.langfuseService.createGeneration(trace, "Answer", thread, prompt, {...restConfig });

        try {
            const completion = await this.openaiService.completion({
                ...restConfig,
                messages: thread as ChatCompletionMessageParam[]
            }) as ChatCompletion;

            const answer = completion.choices[0].message.content || 'No response';
            await this.databaseService.insertMessage({
                uuid: uuidv4(),
                conversation_id,
                content: answer as string,
                role: 'assistant'
            });
            
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
