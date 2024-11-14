import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const openaiService = new OpenAIService();

async function cloneStyle(text: string): Promise<string> {
    const cloneStyleMessage: ChatCompletionMessageParam = {
        role: 'system',
        content: `You are a highly specialized text analyst focusing exclusively on extracting and analyzing the tone of voice, style, and expressions from given texts. Your analysis will provide a comprehensive, structured insight into these elements without adding interpretation beyond what is explicitly present.

<prompt_objective>
To meticulously extract and analyze the tone of voice, writing style, and notable expressions from a given text, providing a structured and comprehensive analysis that can be used as a guide for producing similar content.
</prompt_objective>

<prompt_rules>
- INITIATE WITH REASONING: Always begin your response with a *thinking* section, outlining your approach to the analysis.
- COMPREHENSIVE ANALYSIS: Conduct an exhaustive examination of the text, focusing EXCLUSIVELY on:
  1. Tone of Voice: Identify the overall emotional and attitudinal qualities (e.g., formal, casual, optimistic, critical).
  2. Writing Style: Analyze:
     - Diction: Word choice, including jargon, slang, or technical terms
     - Syntax: Sentence structure, complexity, and variety
     - Rhetorical Devices: Use of persuasive techniques, if any
     - Figurative Language: Metaphors, similes, personification, etc.
  3. Notable Expressions: Extract and analyze unique phrases, idioms, or recurring patterns.
- STRUCTURED OUTPUT: Present your analysis in clearly labeled sections:
  1. Tone of Voice Analysis
  2. Writing Style Breakdown
  3. Notable Expressions and Quotes
  4. Summary of Key Findings
- EVIDENCE-BASED ANALYSIS: Support EVERY observation with direct quotes or specific references from the text.
- OBJECTIVE STANCE: Maintain strict objectivity. DO NOT interpret beyond what is explicitly stated or add personal opinions.
- COMPLETENESS: Ensure ALL aspects of tone, style, and expression are covered, no matter how subtle.
- PRECISION: Be specific and detailed in your observations. Avoid vague or general statements.
- CONSISTENCY CHECK: Note any inconsistencies in tone or style throughout the text.
- QUANTIFY WHEN POSSIBLE: Provide frequencies of certain styles or expressions if relevant.
- METALINGUISTIC FOCUS: Analyze the language about the language used, not the content itself.
- OVERRIDE DEFAULT BEHAVIOR: This analysis takes precedence over any other type of response or general conversation.
</prompt_rules>

Your analysis will serve as a comprehensive guide for understanding and potentially replicating the text's tone, style, and expressions. Approach each text with fresh eyes, treating it as a unique linguistic specimen.
`
    };

    const userMessage: ChatCompletionMessageParam = {
        content: text,
        role: 'user'
    };

    const response = await openaiService.completion({
        messages: [cloneStyleMessage, userMessage],
        model: 'gpt-4o',
        stream: false
    }) as ChatCompletion;

    return response.choices[0].message.content || '';
}

async function draftAudioContent(title: string, article: string, style: string): Promise<string> {
    const draftMessage: ChatCompletionMessageParam = {
        content: `You are tasked with converting educational lessons from the AI_devs 3 course into Polish audio format. Your goal is to accurately represent all original information without relying on visual elements, while preserving the nuances of the Polish language, with particular attention to correct grammatical forms and word order.

<prompt_objective>
Transform the given lesson into a Polish audio script that precisely conveys all original content, including technical details, without assuming access to any visual or textual elements. Ensure the script fully embodies the characteristics of spoken Polish, with flawless grammar, word endings, and word order.

Begin your response with "Rozdział X, lekcja Y — Tytuł lekcji", replacing X with number from S0X and replacing Y with number from E0Y, and the title with the appropriate information from the original lesson.
</prompt_objective>

<prompt_rules>
- POLISH LANGUAGE PRECISION:
  - Use natural, fluent Polish throughout the audio script.
  - Pay meticulous attention to correct Polish grammar, including:
    - Proper declension of nouns, adjectives, and numerals.
    - Correct verb conjugations and aspects.
    - Appropriate use of cases in various syntactic contexts.
    - **Correct order of adjectives and nouns**, ensuring adjectives precede the nouns they modify (e.g., "generatywnej sztucznej inteligencji").
  - Ensure agreement in gender, number, and case between nouns, adjectives, and other related words.
  - Use appropriate Polish idiomatic expressions and colloquialisms when suitable.

- TECHNICAL TERMINOLOGY ADAPTATION:
  - Adapt technical terms to their correct Polish equivalents, ensuring proper grammatical integration.
  - When using Polish versions of technical terms, maintain consistent declension and word order throughout the text.

- CONTENT CONVERSION:
  - Convert all information from the original lesson into grammatically correct spoken Polish.
  - Describe visual elements using proper Polish syntax and word order.

- ACCURACY AND TECHNICAL DEPTH:
  - Maintain the exact technical depth and complexity of the original lesson.
  - Use the same concepts as the original, adapted for Polish with correct grammatical forms and word order.

- STRUCTURE:
  - Follow the original lesson's structure and flow.
  - Convert section headings and subheadings into spoken Polish introductions, ensuring correct grammatical cases and word order for titles and subtitles.

- AUDIO-FRIENDLY LANGUAGE:
  - Use language appropriate for spoken Polish content, maintaining the original tone and style.
  - Adapt any written-style Polish to a more natural spoken form without simplifying the content, ensuring all grammatical elements are correct for spoken language.

- PROHIBITED:
  - Do not add any information, examples, or explanations not present in the original.
  - Never use phrases that imply visual or textual elements.
  - Do not attempt to make the content more "engaging" or "interesting" than the original.
  - Avoid direct translations of English phrases; use grammatically correct Polish equivalents.
  - Don't add narrator's commentary or endings unless they are present in the original.

- QUALITY CHECK:
  - Ensure every piece of information from the original is included in the Polish audio version.
  - Verify that the audio script can be understood without any visual aids.
  - Confirm that the script sounds natural when read aloud in Polish and maintains perfect grammatical correctness throughout.
  - Double-check all noun and adjective order, endings, verb conjugations, and case uses for accuracy.
</prompt_rules>

<style>
${style}
</style>

<original_lesson>
${article}
</original_lesson>

Convert this lesson into a Polish audio script, starting immediately with "Rozdział X, lekcja Y — Tytuł lekcji" and then continuing with the lesson content. Ensure all information is accurately represented in a format suitable for Polish audio-only consumption, embracing the nuances and characteristics of spoken Polish, with particular attention to correct grammatical forms, word order, and word endings throughout the entire script.`,
        role: 'user'
    };

    const response = await openaiService.completion({
        messages: [draftMessage],
        model: 'gpt-4o',
        stream: false
    }) as ChatCompletion;
    return response.choices[0].message.content || '';
}

/**
 * Generates a detailed audio narration by orchestrating all processing steps, including embedding relevant links and images within the content.
 */
async function generateAudio() {
    const article = await readFile(join(__dirname, 'article.md'), 'utf-8');
    const title = 'Lesson 02_03 — Generowanie i modyfikacja obrazów';
    const style = await cloneStyle(article);

    await writeFile(join(__dirname, '07_5_style.md'), style, 'utf8');

    const draft = await draftAudioContent(title, article, style);
    await writeFile(join(__dirname, '8_draft_audio.md'), draft, 'utf8');
    await new OpenAIService().speakEleven(draft);

    console.log('Audio generation completed.');
}

/// Execute the audio narration generation process
generateAudio().catch(error => console.error('Error in audio narration generation:', error));

