import OpenAI from 'openai';
import { config } from 'dotenv';
import { answerPrompt, answerPromptTemplate, linkLabelPrompt, linkLabelPromptTemplate } from './prompts';

config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function askGpt(prompt: string, content: string) {
    const system = answerPrompt;
    const user = answerPromptTemplate(prompt, content);
    const res = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
        ],
        max_tokens: 100
    });
    return res.choices[0]?.message.content?.trim() || '';
}

export async function askGptLinkLabel(prompt: string, label: string) {
    const system = linkLabelPrompt;
    const user = linkLabelPromptTemplate(prompt, label);
    const res = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
        ],
        max_tokens: 3
    });
    const answer = res.choices[0]?.message.content?.trim().toUpperCase();
    return answer === 'TAK';
}
