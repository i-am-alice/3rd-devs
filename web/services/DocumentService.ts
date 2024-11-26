import type { OpenAIService } from "./OpenAIService";
import type { IDoc, TextService } from "./TextService";
import type { DatabaseService } from "./DatabaseService";
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

import { getResult } from "../utils/utils";
import { prompt as extractPrompt } from "../prompts/documents/extract";
import { prompt as translatePrompt } from "../prompts/documents/translate";
import { prompt as queriesPrompt } from "../prompts/documents/queries";
import { prompt as answerPrompt } from "../prompts/documents/answer";
import { prompt as summaryDraftPrompt } from "../prompts/documents/summaryDraft";
import { prompt as summaryReviewPrompt } from "../prompts/documents/summaryReview";
import { prompt as summarizePrompt } from "../prompts/documents/summarize";
import { prompt as synthesizePrompt } from "../prompts/documents/synthesize";
import { v4 } from "uuid";
import { generateMetadata } from '../utils/metadata';

export class DocumentService {
  private readonly openAIService: OpenAIService;
  private readonly databaseService: DatabaseService;
  private readonly textService: TextService;

  constructor(
    openAIService: OpenAIService,
    databaseService: DatabaseService,
    textService: TextService
  ) {
    this.openAIService = openAIService;
    this.databaseService = databaseService;
    this.textService = textService;
  }

  // Answer a question about the documents using the most relevant information
  async answer(query: string, documents: IDoc[]): Promise<IDoc> {
    if (documents.length === 0) {
      return this.textService.document("No documents found");
    }

    const generatedQueries = (await this.openAIService.completion({
      messages: [
        { role: "system", content: queriesPrompt() },
        { role: "user", content: query },
      ],
      model: "gpt-4o",
      jsonMode: true,
    })) as ChatCompletion;

    const { queries } = JSON.parse(
      generatedQueries.choices[0].message.content || "[]"
    );

    if (!queries || queries.length === 0) {
      return this.textService.document("No queries found");
    }

    // Insert documents that don't exist in the database
    await this.databaseService.insertDocuments(documents, true);

    // Gather hybrid search results for all queries
    const hybridResults = await Promise.all(
      queries.map(async (query: { natural: string; search: string }) => {
        const results = await this.databaseService.hybridSearch(
          { query: query.natural },
          { query: query.search }
        );

        return results.map((doc) => ({
          ...doc,
          metadata: { ...doc.metadata, description: `This document was found by searching for the query: "${query.natural}"` },
        }));
      })
    );

    const results = hybridResults
      .flat()
      .map((doc) => this.textService.restorePlaceholders(doc));

    const context = results
      .map(
        (doc) =>
          `<doc uuid="${doc.metadata.uuid}" source-uuid="${doc.metadata.source_uuid}" name="${doc.metadata.name}" query="${doc.metadata.description}">${doc.text}</doc>`
      )
      .join("\n");

    const generatedAnswer = (await this.openAIService.completion({
      messages: [
        { role: "system", content: answerPrompt({ context }) },
        { role: "user", content: query },
      ],
      model: "gpt-4o",
    })) as ChatCompletion;

    const answer = getResult(
      generatedAnswer.choices[0].message.content || "",
      "final_answer"
    );
    
    const answerDoc = await this.textService.document(
      answer || "No answer found",
      "gpt-4o",
      {
        uuid: v4(),
        name: "Answer",
        source: "Answer",
        description: `This document contains an answer generated for the query: "${query}" from documents: ${results
          .map((doc) => doc.metadata.name)
          .join(", ")}.`,
      }
    );
    
    return answerDoc;
  }

  // Answer a question about the documents using the entire set of information
  async synthesize(query: string, documents: IDoc[]): Promise<IDoc> {
    if (documents.length === 0) {
      return this.textService.document("No documents found");
    }

    const processedDocs = documents.map((doc) =>
      this.textService.restorePlaceholders(doc)
    );

    let previousAnswer = "";

    for (const doc of processedDocs) {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: synthesizePrompt({ previousAnswer, originalQuery: query }),
        },
        {
          role: "user",
          content: `Refine your answer using the following information:\n\n${doc.text}`,
        },
      ];

      const completion = (await this.openAIService.completion({
        messages,
        model: "gpt-4o",
        stream: false,
      })) as ChatCompletion;

      previousAnswer =
        getResult(
          completion.choices[0].message.content || "",
          "final_answer"
        ) || "";
    }

    const synthesizedDoc = await this.textService.document(
      previousAnswer || "No synthesis generated"
    );
    synthesizedDoc.metadata.description = `This document is a synthesis of information for the query: "${query}" from documents: ${processedDocs
      .map((doc) => doc.metadata.name)
      .join(", ")}.`;
    return synthesizedDoc;
  }

  // Create a summary of the documents
  async summarize(documents: IDoc[]): Promise<IDoc> {
    const entireContent = documents
      .map((doc) => this.textService.restorePlaceholders(doc))
      .map((doc) => doc.text)
      .join("\n");
    const singleChunk = await this.textService.document(
      entireContent,
      "gpt-4o"
    );
    const document = this.textService.restorePlaceholders(singleChunk);
    const title = documents[0]?.metadata?.name || "Untitled Document";

    const extractionTypes = [
      {
        key: "topics",
        description:
          "Main subjects covered in the article. Focus here on the headers and all specific topics discussed in the article.",
      },
      {
        key: "entities",
        description:
          "Mentioned people, places, or things mentioned in the article. Skip the links and images.",
      },
      {
        key: "keywords",
        description:
          "Key terms and phrases from the content. You can think of them as hastags that increase searchability of the content for the reader.",
      },
      {
        key: "links",
        description:
          "Complete list of the links and images mentioned with their 1-sentence description.",
      },
      {
        key: "resources",
        description:
          "Tools, platforms, resources mentioned in the article. Include context of how the resource can be used, what the problem it solves or any note that helps the reader to understand the context of the resource.",
      },
      {
        key: "takeaways",
        description:
          'Main points and valuable lessons learned. Focus here on the key takeaways from the article that by themself provide value to the reader (avoid vague and general statements like "its really important" but provide specific examples and context). You may also present the takeaway in broader context of the article.',
      },
      {
        key: "context",
        description:
          "Background information and setting. Focus here on the general context of the article as if you were explaining it to someone who didn't read the article.",
      },
    ];

    const extractionPromises = extractionTypes.map(({ key, description }) =>
      this.extract([document], key, description)
    );

    const extractedResults = await Promise.all(extractionPromises);

    const extractedData = extractionTypes.reduce((acc, { key }, index) => {
      acc[key] = extractedResults[index].map((doc) => doc.text).join("\n");
      return acc;
    }, {} as Record<string, string>);

    const draftSummary = (await this.openAIService.completion({
      messages: [
        {
          role: "system",
          content: summaryDraftPrompt({
            title,
            context: extractedData.context,
            entities: extractedData.entities,
            links: extractedData.links,
            topics: extractedData.topics,
            takeaways: extractedData.takeaways,
            article: document.text,
          }),
        },
      ],
      model: "gpt-4o",
      stream: false,
    })) as ChatCompletion;

    const draftContent =
      draftSummary.choices[0].message.content || "No draft summary generated";

    // Step 2: Review the draft
    const critique = (await this.openAIService.completion({
      messages: [
        {
          role: "system",
          content: summaryReviewPrompt({
            summary: draftContent,
            context: extractedData.context,
            article: document.text,
          }),
        },
      ],
      model: "gpt-4o",
      stream: false,
    })) as ChatCompletion;

    const critiqueContent =
      getResult(critique.choices[0].message.content || "", "final_answer") ??
      "No critique generated";

    // Step 3: Create final summary
    const finalSummary = (await this.openAIService.completion({
      messages: [
        {
          role: "user",
          content: summarizePrompt({
            refinedDraft: draftContent,
            context: document.text,
            critique: critiqueContent,
            topics: extractedData.topics,
            takeaways: extractedData.takeaways,
          }),
        },
      ],
      model: "gpt-4o",
      stream: false,
    })) as ChatCompletion;

    const finalSummaryContent =
      getResult(
        finalSummary.choices[0].message.content || "",
        "final_answer"
      ) ?? "No final summary generated";

    const finalSummaryDoc = await this.textService.document(
      finalSummaryContent,
      "gpt-4o",
      { name: title }
    );
    finalSummaryDoc.metadata.description = `This document is a summary generated from documents: ${documents
      .map((doc) => doc.metadata.name + "(" + doc.metadata.uuid + ")")
      .join(", ")}.`;
    return finalSummaryDoc;
  }

  // Extract information from the documents
  async extract(
    documents: IDoc[],
    type: string,
    description: string,
    context?: string
  ): Promise<IDoc[]> {
    const batchSize = 5;
    const extractedDocs: IDoc[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchPromises = batch.map(async (doc) => {
        const messages: ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: extractPrompt({
              type,
              description,
              context: context ?? doc.metadata?.name ?? "",
            }),
          },
          { role: "user", content: doc.text },
        ];

        const completion = (await this.openAIService.completion({
          messages,
          model: "gpt-4o",
          stream: false,
        })) as ChatCompletion;

        const extractedContent = getResult(
          completion.choices[0].message.content || "",
          "final_answer"
        );
        return {
          ...doc,
          text: extractedContent || "No results",
          metadata: {
            ...doc.metadata,
            source: doc.metadata.source,
            name: doc.metadata.name,
            extracted_type: type,
            description: `This is a result of an extraction of type '${type}' based on description: '${description}' from document: ${doc.metadata.name}.`,
          },
        };
      });

      const batchResults = await Promise.all(batchPromises);
      extractedDocs.push(...batchResults);
    }

    return extractedDocs.map((doc) =>
      this.textService.restorePlaceholders(doc)
    );
  }

  // Translate documents to a different language
  async translate(documents: IDoc[], source_language: string, target_language: string): Promise<IDoc[]> {
    const translatedDocs: IDoc[] = [];

    for (const doc of documents) {
      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: translatePrompt() },
        {
          role: "user",
          content: `Translate the following text from ${source_language} to ${target_language}:\n\n${doc.text}`,
        },
      ];

      const completion = (await this.openAIService.completion({
        messages,
        model: "gpt-4o",
        stream: false,
      })) as ChatCompletion;

      const translatedText = completion.choices[0].message.content || "";
      const translatedDocWithPlaceholders = this.textService.restorePlaceholders({
        ...doc,
        text: translatedText,
        metadata: {
          ...doc.metadata,
          description: `This document was translated from ${source_language} to ${target_language}.`,
        },
      });

      const standardizedMetadata = generateMetadata({
        source: translatedDocWithPlaceholders.metadata.source,
        name: translatedDocWithPlaceholders.metadata.name,
        mimeType: translatedDocWithPlaceholders.metadata.mimeType,
        conversation_uuid: translatedDocWithPlaceholders.metadata.conversation_uuid,
        additional: {
          uuid: translatedDocWithPlaceholders.metadata.uuid,
          source_uuid: translatedDocWithPlaceholders.metadata.source_uuid,
          ...translatedDocWithPlaceholders.metadata,
        },
      });

      translatedDocs.push({
        ...translatedDocWithPlaceholders,
        metadata: standardizedMetadata,
      });
    }

    // Insert translated documents into the database
    await this.databaseService.insertDocuments(translatedDocs, true);

    return translatedDocs;
  }
}
