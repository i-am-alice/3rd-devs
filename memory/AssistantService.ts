import type { LearnMemory, Memory, MemoryService } from "./MemoryService";
import type { OpenAIService } from "./OpenAIService";
import { v4 as uuidv4 } from 'uuid';
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { defaultKnowledge, extractSearchQueriesPrompt, learnPrompt, memoryStructure, shouldLearnPrompt, updateMemoryPrompt } from "./prompts";
import { LangfuseService } from './LangfuseService';
import { LangfuseTraceClient } from 'langfuse';

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
    private memoryService: MemoryService;
    private langfuseService: LangfuseService;

    constructor(openaiService: OpenAIService, memoryService: MemoryService, langfuseService: LangfuseService) {
        this.openaiService = openaiService;
        this.memoryService = memoryService;
        this.langfuseService = langfuseService;
    }

    async extractQueries(messages: ChatCompletionMessageParam[], trace: LangfuseTraceClient): Promise<string[]> {
        const generation = this.langfuseService.createGeneration(trace, "Extract queries", messages);
        
        try {
            const thread: ChatCompletionMessageParam[] = [
                { role: "system", content: extractSearchQueriesPrompt({memoryStructure, knowledge: defaultKnowledge}) },
                ...messages
            ];

            const thinking = await this.openaiService.completion({ messages: thread, jsonMode: true }) as ChatCompletion;
            const result = this.openaiService.parseJsonResponse<{q: string[]}>(thinking);

            this.langfuseService.finalizeGeneration(generation, result, thinking.model, {
                promptTokens: thinking.usage?.prompt_tokens,
                completionTokens: thinking.usage?.completion_tokens,
                totalTokens: thinking.usage?.total_tokens
            });

            if ('error' in result) {
                throw new Error(result.error);
            }

            return result.q;

        } catch (error: any) {
            this.langfuseService.finalizeGeneration(generation, { error: error.message }, "unknown");
            throw error;
        }
    }

    async shouldLearn(messages: ChatCompletionMessageParam[], memories: string, trace: LangfuseTraceClient): Promise<ShouldLearnResponse | ParsingError> {
        const thread: ChatCompletionMessageParam[] = [
            { role: "system", content: shouldLearnPrompt({memoryStructure, knowledge: defaultKnowledge, memories}) },
            ...messages
        ];
        const generation = this.langfuseService.createGeneration(trace, "Should learn?", thread);
        try {
            const thinking = await this.openaiService.completion({ messages: thread, jsonMode: true }) as ChatCompletion;
            const result = this.openaiService.parseJsonResponse<ShouldLearnResponse>(thinking);

            this.langfuseService.finalizeGeneration(generation, result, thinking.model, {
                promptTokens: thinking.usage?.prompt_tokens,
                completionTokens: thinking.usage?.completion_tokens,
                totalTokens: thinking.usage?.total_tokens
            });

            return result;
        } catch (error: any) {
            this.langfuseService.finalizeGeneration(generation, { error: error.message }, "unknown");
            throw error;
        }
    }

    async learn(messages: ChatCompletionMessageParam[], shouldLearnResult: ShouldLearnResponse | ParsingError, memories: string, trace: LangfuseTraceClient): Promise<string> {
        if ('error' in shouldLearnResult || (!shouldLearnResult.add?.length && !shouldLearnResult.update?.length)) {
            return '<memory_modifications>\n<no_changes>No memories were added, updated, or deleted.</no_changes>\n</memory_modifications>';
        }

        const span = this.langfuseService.createSpan(trace, "Learning", { messages, shouldLearnResult, memories });
        try {
            const addResults = await this.addMemories(shouldLearnResult.add, memories, span);
            const updateResults = await this.updateMemories(shouldLearnResult.update, memories, span);
            const memoryModifications = this.formatMemoryModifications(addResults, updateResults);

            this.langfuseService.finalizeSpan(span, "Learn", { messages, shouldLearnResult, memories }, memoryModifications);
            return memoryModifications;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.langfuseService.finalizeSpan(span, "Learn", { messages, shouldLearnResult, memories }, { error: errorMessage });
            throw error;
        }
    }

    private async addMemories(memoriesToAdd: string[] | undefined, memories: string, span: LangfuseTraceClient): Promise<Array<{ status: string; name?: string; uuid?: string; content: string }>> {
        if (!memoriesToAdd || memoriesToAdd.length === 0) return [];

        const results = await Promise.all(memoriesToAdd.map(async (memoryContent) => {
            const thread: ChatCompletionMessageParam[] = [
                { role: "system", content: learnPrompt({
                    memoryStructure,
                    knowledge: defaultKnowledge,
                    memories
                })},
                { role: "user", content: `Please remember this: ${memoryContent}. Make sure to store it all and organize well in your knowledge structure.` }
            ];
            const addGeneration = this.langfuseService.createGeneration(span, "Add memory", thread);
            try {
                const thinking = await this.openaiService.completion({
                    messages: thread,
                    jsonMode: true
                }) as ChatCompletion;

                const result = this.openaiService.parseJsonResponse<LearnMemory>(thinking);

                console.log('Learn memory:', result);

                if ('error' in result) {
                    console.error('Error learning from conversation:', result.error);
                    this.langfuseService.finalizeGeneration(addGeneration, { error: result.error }, thinking.model, {
                        promptTokens: thinking.usage?.prompt_tokens,
                        completionTokens: thinking.usage?.completion_tokens,
                        totalTokens: thinking.usage?.total_tokens
                    });
                    return { status: 'failed', content: memoryContent };
                }

                const memory: Memory = {
                    ...result,
                    metadata: {
                        ...result.metadata,
                    },
                    uuid: uuidv4(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                await this.memoryService.createMemory(memory, span);
                this.langfuseService.finalizeGeneration(addGeneration, memory, thinking.model, {
                    promptTokens: thinking.usage?.prompt_tokens,
                    completionTokens: thinking.usage?.completion_tokens,
                    totalTokens: thinking.usage?.total_tokens
                });
                return { status: 'success', name: memory.name, uuid: memory.uuid, content: memoryContent };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.langfuseService.finalizeGeneration(addGeneration, { error: errorMessage }, "unknown");
                return { status: 'failed', content: memoryContent };
            }
        }));

        return results;
    }

    private async updateMemories(memoriesToUpdate: { uuid: string; content: string }[] | undefined, memories: string, span: LangfuseTraceClient): Promise<Array<{ status: string; name?: string; uuid?: string; content?: string; uuids?: string[] }>> {
        if (!memoriesToUpdate || memoriesToUpdate.length === 0) return [];

        const results = await Promise.all(memoriesToUpdate.map(async (updateMemory) => {
            const thread: ChatCompletionMessageParam[] = [
                { role: "system", content: updateMemoryPrompt({
                    memoryStructure,
                    knowledge: defaultKnowledge,
                    memories
                })},
                { role: "user", content: `Please update this memory: ${JSON.stringify(updateMemory)}` }
            ];
            const updateGeneration = this.langfuseService.createGeneration(span, "Update memory", thread);
            try {
                const thinking = await this.openaiService.completion({
                    messages: thread,
                    jsonMode: true
                }) as ChatCompletion;

                const result = this.openaiService.parseJsonResponse<{
                    updating: boolean;
                    memory?: Memory;
                    delete?: string[];
                }>(thinking);

                console.log('Update memory:', result);

                if ('error' in result) {
                    console.error('Error updating memory:', result.error);
                    this.langfuseService.finalizeGeneration(updateGeneration, { error: result.error }, thinking.model, {
                        promptTokens: thinking.usage?.prompt_tokens,
                        completionTokens: thinking.usage?.completion_tokens,
                        totalTokens: thinking.usage?.total_tokens
                    });
                    return { status: 'failed', content: JSON.stringify(updateMemory) };
                }

                if (result.updating && result.memory) {
                    await this.memoryService.updateMemory(result.memory, span);
                    this.langfuseService.finalizeGeneration(updateGeneration, result.memory, thinking.model, {
                        promptTokens: thinking.usage?.prompt_tokens,
                        completionTokens: thinking.usage?.completion_tokens,
                        totalTokens: thinking.usage?.total_tokens
                    });
                    return { status: 'success', name: result.memory.name, uuid: result.memory.uuid, content: result.memory.content.text };
                }

                if (result.delete && result.delete.length > 0) {
                    for (const uuidToDelete of result.delete) {
                        await this.memoryService.deleteMemory(uuidToDelete);
                    }
                    this.langfuseService.finalizeGeneration(updateGeneration, { deleted: result.delete }, thinking.model, {
                        promptTokens: thinking.usage?.prompt_tokens,
                        completionTokens: thinking.usage?.completion_tokens,
                        totalTokens: thinking.usage?.total_tokens
                    });
                    return { status: 'deleted', uuids: result.delete };
                }

                this.langfuseService.finalizeGeneration(updateGeneration, { no_action: true }, thinking.model, {
                    promptTokens: thinking.usage?.prompt_tokens,
                    completionTokens: thinking.usage?.completion_tokens,
                    totalTokens: thinking.usage?.total_tokens
                });
                return { status: 'no_action', content: JSON.stringify(updateMemory) };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.langfuseService.finalizeGeneration(updateGeneration, { error: errorMessage }, "unknown");
                return { status: 'failed', content: JSON.stringify(updateMemory) };
            }
        }));

        return results;
    }

    private formatMemoryModifications(addResults: Array<{ status: string; name?: string; uuid?: string; content: string }>, updateResults: Array<{ status: string; name?: string; uuid?: string; content?: string; uuids?: string[] }>): string {
        let memoryModifications = "<memory_modifications>\n";

        for (const result of addResults) {
            memoryModifications += `<added status="${result.status}" name="${result.name || ''}" uuid="${result.uuid || ''}">${result.content}</added>\n`;
        }

        for (const result of updateResults) {
            if (result.status === 'success') {
                memoryModifications += `<updated status="${result.status}" name="${result.name}" uuid="${result.uuid}">${result.content}</updated>\n`;
            } else if (result.status === 'deleted') {
                memoryModifications += `<deleted uuids="${result.uuids?.join(',') || ''}" />\n`;
            } else {
                memoryModifications += `<update_failed content="${result.content || ''}" />\n`;
            }
        }

        memoryModifications += "</memory_modifications>";

        if (memoryModifications === "<memory_modifications>\n</memory_modifications>") {
            memoryModifications = "<memory_modifications>\n<no_changes>No memories were added, updated, or deleted.</no_changes>\n</memory_modifications>";
        }

        return memoryModifications;
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
        const { messages, memories = '', knowledge = defaultKnowledge, learnings = '', ...restConfig } = config;
        const systemMessage: ChatCompletionMessageParam = { role: 'system', content: `As Alice, you're speaking to Adam. Answer based on the following memories:\n${memories} and general knowledge:\n${knowledge}. Learnings from the conversation:\n${learnings}` };
        const messagesWithSystem = [systemMessage, ...messages.filter(msg => msg.role !== 'system')];

        const generation = this.langfuseService.createGeneration(trace, "Answer", { messages: messagesWithSystem, ...restConfig });

        try {
            const completion = await this.openaiService.completion({
                ...restConfig,
                messages: messagesWithSystem
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
