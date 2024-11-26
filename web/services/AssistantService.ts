import type { OpenAIService } from "./OpenAIService";
import type { ChatCompletionMessageParam, ChatCompletion } from "openai/resources/chat/completions";
import { prompt as understandPrompt } from '../prompts/assistant/understand';
import { prompt as processPrompt } from '../prompts/assistant/process';
import { prompt as answerPrompt } from '../prompts/assistant/answer';
import { prompt as writePrompt } from '../prompts/assistant/write';
import type { DatabaseService } from "./DatabaseService";
import type { FileService } from "./FileService";
import type { WebSearchService } from "./WebSearch";
import type { DocumentService } from "./DocumentService";
import type { TextService } from "./TextService";
import { v4 as uuidv4 } from 'uuid';
import type { IAssistantTools, IDoc, IPlan } from "../types/types";
import { generateMetadata } from '../utils/metadata';

export class AssistantService {
    private readonly openaiService: OpenAIService;
    private readonly fileService: FileService;
    private readonly databaseService: DatabaseService;
    private readonly webSearchService: WebSearchService;
    private readonly documentService: DocumentService;
    private readonly textService: TextService;
    
    constructor(openaiService: OpenAIService, fileService: FileService, databaseService: DatabaseService, webSearchService: WebSearchService, documentService: DocumentService, textService: TextService) {
        this.openaiService = openaiService;
        this.fileService = fileService;
        this.databaseService = databaseService;
        this.webSearchService = webSearchService;
        this.documentService = documentService;
        this.textService = textService;
    }

    async understand(messages: ChatCompletionMessageParam[], tools: IAssistantTools[]): Promise<IPlan> {
        const understanding = await this.openaiService.completion({
            model: 'gpt-4o',
            jsonMode: true,
            messages: [
                { role: 'system', content: understandPrompt({ tools }) },
                ...messages
            ]
        }) as ChatCompletion;

        return JSON.parse(understanding.choices[0].message.content as string) as IPlan;
    }

    async answer(query: string, messages: ChatCompletionMessageParam[], context: IDoc[], uploads: string) {
        // unwrap placeholders before answering
        const unwrappedContext = context.map(doc => this.textService.restorePlaceholders(doc));

        const response = await this.openaiService.completion({
            messages: [
                { role: 'system', content: answerPrompt({ context: unwrappedContext, uploads, query }) },
                ...messages
            ],
            model: 'gpt-4o',
            jsonMode: false
        }) as ChatCompletion;

        return response.choices[0].message.content as string;
    }

    async websearch(query: string, conversation_uuid: string): Promise<IDoc[]> {
        // Search the web & optionally load contents of some of the results
        const webSearchResults = await this.webSearchService.search(query, conversation_uuid);
        Promise.all(webSearchResults.map(async (doc) => {
            await this.databaseService.insertDocument(doc);
        }));
        return webSearchResults;
    }

    async process(query: string, processors: any, documents: IDoc[]) {
        const process = await this.openaiService.completion({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: processPrompt({ processors, documents }) },
                { role: 'user', content: query }
            ],
            jsonMode: true
        }) as ChatCompletion;

        console.log(process.choices[0].message.content);

        return JSON.parse(process.choices[0].message.content as string);
    }

    async write(query: string, context: IDoc[], conversation_uuid?: string): Promise<IDoc> {
        // Unwrap placeholders before writing
        const unwrappedContext = context.map(doc => this.textService.restorePlaceholders(doc));

        const document = await this.openaiService.completion({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: writePrompt({ documents: unwrappedContext }) },
                { role: 'user', content: query }
            ],
            jsonMode: true
        }) as ChatCompletion;

        const { name, content } = JSON.parse(document.choices[0].message.content as string);

        // Use unwrappedContext here instead of context
        const contentWithContext = content.replace(/\[\[([^\]]+)\]\]/g, (match: string, p1: string) => {
            const doc = unwrappedContext.find(doc => doc.metadata.uuid === p1);
            if (doc) {
                return doc.text;
            }
            return match;
        });

        return this.textService.document(contentWithContext, 'gpt-4o', {
            uuid: uuidv4(),
            conversation_uuid,
            name,
            description: `This is a result of a writing operation for the query: "${query}".`
        });
    }

    async upload(doc: IDoc) {
        // Unwrap placeholders before saving
        await this.databaseService.insertDocument(doc);
        return this.fileService.saveDocsToFile([doc], doc.metadata.name || 'file.md');
    }

    async processDocument(processActions: any[], context: IDoc[], conversation_uuid: string): Promise<IDoc[]> {
        const results: IDoc[] = [];

        for (const action of processActions) {
            const source = action.url || action.path;
            if (!source) {
                throw new Error('Invalid action: missing url or path');
            }

            const chunkSize = ['translate', 'synthesize'].includes(action.type) ? 3500 : undefined;

            let documents: IDoc[] = source.startsWith('[[') && source.endsWith(']]')
                ? context.filter(doc => doc.metadata.uuid === source.slice(2, -2))
                : (await this.fileService.process(source, chunkSize, conversation_uuid)).docs;

            let result: IDoc[];
            switch (action.type) {
                case 'translate':
                    result = await this.documentService.translate(documents, action.original_language, action.target_language);
                    break;
                case 'summarize':
                    result = [await this.documentService.summarize(documents)];
                    break;
                case 'synthesize':
                    result = [await this.documentService.synthesize(action.query, documents)];
                    break;
                case 'extract':
                    result = await this.documentService.extract(documents, action.extraction_type, action.description);
                    break;
                case 'answer':
                    result = [await this.documentService.answer(action.question, documents)];
                    break;
                default:
                    throw new Error(`Unknown process type: ${action.type}`);
            }

            // Standardize metadata for each result document
            const standardizedResults = result.map(doc => {
                const standardizedMetadata = generateMetadata({
                    source: doc.metadata.source,
                    name: doc.metadata.name,
                    mimeType: doc.metadata.mimeType,
                    conversation_uuid: conversation_uuid,
                    description: doc.metadata.description,
                    additional: {
                        uuid: doc.metadata.uuid,
                        source_uuid: doc.metadata.source_uuid,
                        ...doc.metadata,
                    },
                });

                return {
                    ...doc,
                    metadata: standardizedMetadata,
                };
            });

            await Promise.all(standardizedResults.map(async (doc) => {
                await this.databaseService.insertDocument(doc, true);
            }));

            results.push(...standardizedResults);
        }

        return results;
    }
}
