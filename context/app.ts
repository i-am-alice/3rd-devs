import { join } from "path";
import fs from 'fs/promises';
import { OpenAIService } from "./OpenAIService";
import type { ChatCompletion } from "openai/resources/chat/completions";

const openAIService = new OpenAIService();

const path = join(__dirname, 'long_context.md');
const content = await fs.readFile(path, 'utf8');
const content_uuid = '0398cf2c-110e-4b7f-ac8a-88ec6ae6f248';

const query = 'Show me the list of available documents.'

const documents = {
  [content_uuid]: content,
};

const completion = await openAIService.completion({
  messages: [
    {role: 'system', content: `As an AI assistant, you can use the following documents in your responses by referencing them with the placeholder: [[uuid]] (double square brackets).

    <rule>
    - Placeholder is double square brackets. Make sure to use it correctly and carefully rewrite uuid of the document.
    - Documents are long forms of text, so use them naturally within the text, like "here's your file: \n\n [[uuid]] \n\n".
    </rule>

    <available_documents>
    Lesson 0302 — Wyszukiwanie hybrydowe:${content_uuid}
    </available_documents>`},
    {role: 'user', content: query}
  ]
}) as ChatCompletion;

const answer = completion.choices[0].message.content?.replace(/\[\[([^\]]+)\]\]/g, (match, uuid) => documents[uuid] || match) || '';

console.log(answer);