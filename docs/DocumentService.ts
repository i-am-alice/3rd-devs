import type { OpenAIService } from "./OpenAIService";
import type { IDoc, TextService } from "./TextService";
import type { DatabaseService } from "./DatabaseService";
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";

import fs from 'fs/promises';

import { getResult } from "./utils";
import { prompt as extractPrompt } from "./prompts/extract";
import { prompt as translatePrompt } from "./prompts/translate";
import { prompt as queriesPrompt } from "./prompts/queries";
import { prompt as answerPrompt } from "./prompts/answer";
import { prompt as compressPrompt } from "./prompts/compress";
import { prompt as synthesizePrompt } from "./prompts/synthesize";

export class DocumentService {
    private readonly openAIService: OpenAIService
    private readonly databaseService: DatabaseService;
    private readonly textService: TextService;

    constructor(openAIService: OpenAIService, databaseService: DatabaseService, textService: TextService) {
        this.openAIService = openAIService;
        this.databaseService = databaseService;
        this.textService = textService;
    }

    // Add this helper method to the DocumentService class
    private async ensureDirectoryExists(filePath: string): Promise<void> {
        const dir = filePath.substring(0, filePath.lastIndexOf('/'));
        await fs.mkdir(dir, { recursive: true });
    }

    // Answer a question about the documents using the most relevant information
    async answer(query: string, documents: IDoc[]): Promise<string> {
        if (documents.length === 0) {
            return "No documents found";
        }

        const generatedQueries = await this.openAIService.completion({
            messages: [ { role: "system", content: queriesPrompt() }, { role: "user", content: query } ],
            model: "gpt-4o",
            stream: false,
            jsonMode: true
        }) as ChatCompletion;

        const { queries } = JSON.parse(generatedQueries.choices[0].message.content || "[]");

        if (!queries || queries.length === 0) {
            return "No queries found";
        }

        // Gather unique source_uuids
        const sourceUuids = new Set(documents.map(doc => doc.metadata.source_uuid));

        // Insert documents that DON'T exist in the database
        const insertPromises = documents.map(async doc => {
            if (!doc.metadata.uuid) {
                return;
            }
            const existingDoc = await this.databaseService.getDocumentByUuid(doc.metadata.uuid);
            if (!existingDoc) {
                return this.databaseService.insertDocument(doc, true);
            }
        });
        await Promise.all(insertPromises);

        // Prepare filters for hybrid search
        const vectorFilter = {
            should: Array.from(sourceUuids).map(uuid => ({ key: 'source_uuid', match: { value: uuid } }))
        };
        const fulltextFilter = {
            queryParameters: { filters: Array.from(sourceUuids).map(uuid => `source_uuid:${uuid}`).join(' OR ') }
        };

        // Gather hybrid search results for all queries
        const hybridResults = await Promise.all(queries.map(async (query: { natural: string, search: string }) => {
            const results = await this.databaseService.hybridSearch(
                { 
                    query: query.natural, 
                    filter: vectorFilter
                }, 
                { 
                    query: query.search, 
                    filter: fulltextFilter
                }
            );

            return results.map(doc => ({...doc, metadata: {...doc.metadata, query: query.natural }}));
        }));

        const results = hybridResults.flat().map(doc => this.textService.restorePlaceholders(doc));

        const context = results.map((doc) => 
            `<doc uuid="${doc.metadata.uuid}" source-uuid="${doc.metadata.source_uuid}" name="${doc.metadata.name}" query="${doc.metadata.query}">${doc.text}</doc>`
        ).join('\n');


        const generatedAnswer = await this.openAIService.completion({
            messages: [
                { role: "system", content: answerPrompt({ context }) },
                { role: "user", content: query }
            ],
            model: "gpt-4o",
            stream: false
        }) as ChatCompletion;
        
        const answer = getResult(generatedAnswer.choices[0].message.content || "", "final_answer");

        return answer || "No answer found";
    }

    // Answer a question about the documents using the entire set of information
    async synthesize(query: string, documents: IDoc[]): Promise<string> {
        if (documents.length === 0) {
            return "No documents found";
        }

        const processedDocs = documents.map(doc => this.textService.restorePlaceholders(doc));

        let previousAnswer = "";

        for (const doc of processedDocs) {
            const messages: ChatCompletionMessageParam[] = [
                { role: "system", content: synthesizePrompt({ previousAnswer, originalQuery: query }) },
                { role: "user", content: `Refine your answer using the following information:\n\n${doc.text}` }
            ];

            const completion = await this.openAIService.completion({
                messages,
                model: "gpt-4o",
                stream: false
            }) as ChatCompletion;

            previousAnswer = getResult(completion.choices[0].message.content || "", "final_answer") || "";
        }

        return previousAnswer || "No synthesis generated";
    }

    // Create a summary of the documents
    async summarize(documents: IDoc[], generalContext?: string): Promise<string> {

            // Process all documents in parallel while preserving order
        const compressionPromises = documents.map(async doc => {
            try {
                const completion = await this.openAIService.completion({
                    messages: [
                        { role: "system", content: compressPrompt(generalContext) },
                        { role: "user", content: doc.text }
                    ],
                    model: "gpt-4o",
                    maxTokens: 10000,
                    stream: false
                }) as ChatCompletion;

                const result = completion.choices[0].message.content;
                if (!result) {
                    console.error('Empty completion result for document');
                    return '';
                }
                return result;
            } catch (error) {
                console.error('Error compressing document:', error);
                return '';
            }
        });

        const compressionResults = await Promise.all(compressionPromises);
        
        // Process results while maintaining document order
        const processedDocs = documents.map((doc, index) => {
            const compressedText = compressionResults[index] || '';
            return this.textService.restorePlaceholders({
                ...doc,
                text: compressedText
            });
        });

        // Merge all compressed content
        const mergedContent = processedDocs.map(doc => doc.text).filter(Boolean).join('\n\n');

        if (!mergedContent) {
            console.error('No content generated after compression');
            return 'No content generated';
        }

        try {
            // Save to file
            const compressionPath = __dirname + '/results/compression.md';
            await this.ensureDirectoryExists(compressionPath);
            await fs.writeFile(compressionPath, mergedContent, 'utf-8');
            console.log('Content saved to:', compressionPath);
        } catch (error) {
            console.error('Error saving file:', error);
        }

        return mergedContent;
    }

    // Extract information from the documents
    async extract(documents: IDoc[], type: string, description: string, context?: string): Promise<IDoc[]> {
        const batchSize = 5;
        const extractedDocs: IDoc[] = [];

        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const batchPromises = batch.map(async (doc) => {
                const messages: ChatCompletionMessageParam[] = [
                    { role: "system", content: extractPrompt({ type, description, context: context ?? doc.metadata?.name ?? "" }) },
                    { role: "user", content: doc.text }
                ];

                const completion = await this.openAIService.completion({
                    messages,
                    model: "gpt-4o",
                    stream: false
                }) as ChatCompletion;

                const extractedContent = getResult(completion.choices[0].message.content || "", "final_answer");
                return {
                    ...doc,
                    text: extractedContent || "No results",
                    metadata: {
                        ...doc.metadata,
                        extracted_type: type
                    }
                };
            });

            const batchResults = await Promise.all(batchPromises);
            extractedDocs.push(...batchResults);
        }

        return extractedDocs.map(doc => this.textService.restorePlaceholders(doc));
    }

    // Translate documents to a different language
    async translate(documents: IDoc[], source_language: string, target_language: string): Promise<IDoc[]> {
        const batchSize = 5;
        const translatedDocs: IDoc[] = [];

        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const batchPromises = batch.map(async (doc) => {
                const messages: ChatCompletionMessageParam[] = [
                    { role: "system", content: translatePrompt() },
                    { role: "user", content: `Translate the following text from ${source_language} to ${target_language}:\n\n${doc.text}` }
                ];

                const completion = await this.openAIService.completion({
                    messages,
                    model: "gpt-4o",
                    stream: false
                }) as ChatCompletion;

                return {
                    ...doc,
                    text: completion.choices[0].message.content || "",
                    metadata: {
                        ...doc.metadata,
                        translated_from: source_language,
                        translated_to: target_language
                    }
                };
            });

            const batchResults = await Promise.all(batchPromises);
            translatedDocs.push(...batchResults);
        }

        return translatedDocs;
    }
}
