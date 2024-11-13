import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const openaiService = new OpenAIService();

/**
 * Extracts the content within XML-like tags.
 * 
 * @param content - The string containing XML-like tags.
 * @param tagName - The name of the tag to extract content from.
 * @returns The content within the specified tags, or null if not found.
 */
function getResult(content: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
}
/**
 * Extracts information of a specified type from the provided text.
 * 
 * @param title - The title of the article.
 * @param text - The input text from which to extract information.
 * @param extractionType - The type of information to extract.
 * @param description - The description of the extraction type.
 * @returns A string containing the extracted information.
 */
async function extractInformation(title: string, text: string, extractionType: string, description: string): Promise<string> {
    const extractionMessage: ChatCompletionMessageParam = {
        content: `Extract ${extractionType}: ${description} from user message under the context of “${title}”. 
        Transform the content into clear, structured yet simple bullet points without formatting except links and images. 

        Format link like so: - name: brief description with images and links if the original message contains them.
        
        Keep full accuracy of the original message.`,
        role: 'system'
    };

    const userMessage: ChatCompletionMessageParam = {
        content: `Here's the articles you need to extract information from: ${text}`,
        role: 'user'
    };

    const response = await openaiService.completion([extractionMessage, userMessage], 'gpt-4o', false) as ChatCompletion;
    return response.choices[0].message.content || '';
}

async function draftSummary(title: string, article: string, context: string, entities: string, links: string, topics: string, takeaways: string): Promise<string> {
    const draftMessage: ChatCompletionMessageParam = {
        content: `As a copywriter, create a standalone, fully detailed article based on "${title}" that can be understood without reading the original. Write in markdown format, incorporating all images within the content. The article must:

Write in Polish, ensuring every crucial element from the original is included while:
- Stay driven and motivated, ensuring you never miss the details needed to understand the article
- NEVER reference to the original article
- Always preserve original headers and subheaders
- Mimic the original author's writing style, tone, expressions and voice
- Presenting ALL main points with complete context and explanation
- Following the original structure and flow without omitting any details
- Including every topic, subtopic, and insight comprehensively
- Preserving the author's writing characteristics and perspective
- Ensuring readers can fully grasp the subject matter without prior knowledge
- Use title: "${title}" as the title of the article you create. Follow all other headers and subheaders from the original article
- Include cover image

Before writing, examine the original to capture:
* Writing style elements
* All images, links and vimeo videos from the original article
* Include examples, quotes and keypoints from the original article
* Language patterns and tone
* Rhetorical approaches
* Argument presentation methods

Note: You're forbidden to use high-emotional language such as "revolutionary", "innovative", "powerful", "amazing", "game-changer", "breakthrough", "dive in", "delve in", "dive deeper" etc.

Reference and integrate ALL of the following elements in markdown format:

<context>${context}</context>
<entities>${entities}</entities>
<links>${links}</links>
<topics>${topics}</topics>
<key_insights>${takeaways}</key_insights>

<original_article>${article}</original_article>

Create the new article within <final_answer> tags. The final text must stand alone as a complete work, containing all necessary information, context, and explanations from the original article. No detail should be left unexplained or assumed as prior knowledge.`,
        role: 'user'
    };

    const response = await openaiService.completion([draftMessage], 'gpt-4o', false) as ChatCompletion;
    return response.choices[0].message.content || '';
}

async function critiqueSummary(summary: string, article: string, context: string): Promise<string> {
    const critiqueMessage: ChatCompletionMessageParam = {
        content: `Analyze the provided compressed version of the article critically, focusing solely on its factual accuracy, structure and comprehensiveness in relation to the given context.

<analysis_parameters>
PRIMARY OBJECTIVE: Compare compressed version against original content with 100% precision requirement.

VERIFICATION PROTOCOL:
- Each statement must match source material precisely
- Every concept requires direct source validation
- No interpretations or assumptions permitted
- Markdown formatting must be exactly preserved
- All technical information must maintain complete accuracy

CRITICAL EVALUATION POINTS:
1. Statement-level verification against source
2. Technical accuracy assessment
3. Format compliance check
4. Link and reference validation
5. Image placement verification
6. Conceptual completeness check

<original_article>${article}</original_article>

<context desc="It may help you to understand the article better.">${context}</context>

<compressed_version>${summary}</compressed_version>

RESPONSE REQUIREMENTS:
- Identify ALL deviations, regardless of scale
- Report exact location of each discrepancy
- Provide specific correction requirements
- Document missing elements precisely
- Mark any unauthorized additions

Your task: Execute comprehensive analysis of compressed version against source material. Document every deviation. No exceptions permitted.`,
        role: 'system'
    };

    const response = await openaiService.completion([critiqueMessage], 'gpt-4o', false) as ChatCompletion;
    return response.choices[0].message.content || '';
}

async function createFinalSummary(refinedDraft: string, topics: string, takeaways: string, critique: string, context: string): Promise<string> {
    const summarizeMessage: ChatCompletionMessageParam = {
        content: `Create a final compressed version of the article that starts with an initial concise overview, then covers all the key topics using available knowledge in a condensed manner, and concludes with essential insights and final remarks. 
        Consider the critique provided and address any issues it raises. 

Important: Include relevant links and images from the context in markdown format. Do NOT include any links or images that are not explicitly mentioned in the context.
Note: You're forbidden to use high-emotional language such as "revolutionary", "innovative", "powerful", "amazing", "game-changer", "breakthrough", "dive in", "delve in", "dive deeper" etc.

Requirement: Use Polish language.

Guidelines for compression:
- Maintain the core message and key points of the original article
- Always preserve original headers and subheaders
- Ensure that images, links and videos are present in your response
- Eliminate redundancies and non-essential details
- Use concise language and sentence structures
- Preserve the original article's tone and style in a condensed form

Provide the final compressed version within <final_answer> tags.

<refined_draft>${refinedDraft}</refined_draft>
<topics>${topics}</topics>
<key_insights>${takeaways}</key_insights>
<critique note="This is important, as it was created based on the initial draft of the compressed version. Consider it before you start writing the final compressed version">${critique}</critique>
<context>${context}</context>

Let's start.`,
        role: 'user'
    };

    const response = await openaiService.completion([summarizeMessage], 'o1-preview', false) as ChatCompletion;
    return response.choices[0].message.content || '';
}

/**
 * Generates a detailed summary by orchestrating all processing steps, including embedding relevant links and images within the content.
 */
async function generateDetailedSummary() {
    const articlePath = join(__dirname, 'article.md');
    const article = await readFile(articlePath, 'utf-8');
    const title = 'AI_devs 3, Lekcja 1, Moduł 1 — Interakcja z dużym modelem językowym';

    const extractionTypes = [
        { key: 'topics', description: 'Main subjects covered in the article. Focus here on the headers and all specific topics discussed in the article.' },
        { key: 'entities', description: 'Mentioned people, places, or things mentioned in the article. Skip the links and images.' },
        { key: 'keywords', description: 'Key terms and phrases from the content. You can think of them as hastags that increase searchability of the content for the reader. Example of keyword: OpenAI, Large Language Model, API, Agent, etc.' },
        { key: 'links', description: 'Complete list of the links and images mentioned with their 1-sentence description.' },
        { key: 'resources', description: 'Tools, platforms, resources mentioned in the article. Include context of how the resource can be used, what the problem it solves or any note that helps the reader to understand the context of the resource.' },
        { key: 'takeaways', description: 'Main points and valuable lessons learned. Focus here on the key takeaways from the article that by themself provide value to the reader (avoid vague and general statements like "it\s really important" but provide specific examples and context). You may also present the takeaway in broader context of the article.' },
        { key: 'context', description: 'Background information and setting. Focus here on the general context of the article as if you were explaining it to someone who didn\'t read the article.' }
    ];

    // Run all extractions concurrently
    const extractionPromises = extractionTypes.map(({ key, description }) => 
        extractInformation(title, article, key, description)
            .then(result => {
                return {
                    type: key,
                    description,
                    content: result || `No ${key} found`
                }
            })
    );

    const extractedResults = await Promise.all(extractionPromises);
    const extractedData: Record<string, string> = {};

    // Process results and write to files
    await Promise.all(extractedResults.map(async ({ type, content }, index) => {
        extractedData[type] = content;
        await writeFile(join(__dirname, `${index + 1}_${type}.md`), content, 'utf8');
    }));

    // // Draft summary can start as soon as we have context, topics, and takeaways
    const draftPromise = draftSummary(title, article, extractedData.context, extractedData.entities, extractedData.links, extractedData.topics, extractedData.takeaways);

    // // Wait for draft and write it to file
    const draft = await draftPromise;
    const draftContent = getResult(draft, 'final_answer') || '';
    await writeFile(join(__dirname, '8_draft_summary.md'), draftContent, 'utf8');
    
    // Generate critique first
    const critique = await critiqueSummary(draft, article, Object.values(extractedData).join('\n\n'));
    await writeFile(join(__dirname, '9_summary_critique.md'), critique, 'utf8');

    // Use critique and context in final summary generation
    const finalSummary = await createFinalSummary(draft, extractedData.topics, extractedData.takeaways, critique, extractedData.context);
    const finalSummaryContent = getResult(finalSummary, 'final_answer') || '';
    await writeFile(join(__dirname, '10_final_summary.md'), finalSummaryContent, 'utf8');

    console.log('All steps completed and saved to separate files.');
}

// Execute the summary generation process
generateDetailedSummary().catch(error => console.error('Error in summary generation:', error));