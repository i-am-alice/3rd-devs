/**
 * 1. Use the content of the files in 'transkrypcje' directory in the context of a prompt
 * 2. The prompt should have 1 objective which is to answer the question: "Na jakiej ulicy znajduje się uczelnia na której wykłada Andrzej Maj?"
 * * Some of the informations may be inconsistent and misleading.
 * * Use your internal knowledge to supplement the information and respond to the question correctly and concisely.
 */

import fs from 'fs';
import path from 'path';
import { OpenAiService } from '../lib/OpenAiService';

async function main() {
    const transcriptionDir = 'transkrypcje';
    let combinedTranscriptions = '';

    try {
        // Check if directory exists
        if (!fs.existsSync(transcriptionDir)) {
            console.error(`Directory '${transcriptionDir}' not found`);
            return;
        }

        // Read all transcription files
        const files = fs.readdirSync(transcriptionDir);

        // Combine content from all files
        for (const file of files) {
            if (file.endsWith('.md')) {
                const filePath = path.join(transcriptionDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                combinedTranscriptions += `\n--- Transcription from ${file} ---\n${content}\n`;
            }
        }

        if (combinedTranscriptions === '') {
            console.error('No transcription files found');
            return;
        }

        // Create system prompt with transcription context
        const systemPrompt = `You are given transcriptions of conversations that may contain information about Andrzej Maj and where he teaches. Use this information to answer the question.

Here are the transcriptions:
${combinedTranscriptions}

Some information may be inconsistent or misleading. Use your judgment to determine the most likely correct answer.

Use all your knowledge to respond to the question correctly and concisely. Dobn't limit yourself to the content of the transcriptions but rather use your whole knowledge to answer the question.
Before answering to the question, list out all the information you have on the topic,
then summarize how they relate each other,
as a next step you will ask yourself what else you could do to answer the given question
then you will do everything possible to answer the question.
`;

        // Question to ask
        const question = "Na jakiej ulicy znajduje się uczelnia na której wykłada Andrzej Maj?";

        // Check for API key from environment or prompt user
        const apiKey = process.env.OPENAI_API_KEY || process.argv[2];

        if (!apiKey) {
            console.error('Error: OpenAI API key is required');
            console.log('Usage: npx ts-node answer.ts YOUR_API_KEY');
            return;
        }

        // Initialize OpenAI service with the provided API key
        const openAiService = new OpenAiService({ apiKey });

        // Send the prompt and get the response
        const answer = await openAiService.askGpt41Nano(systemPrompt, question, 2048);

        // Print the answer
        console.log('\nAnswer:');
        console.log(answer);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Execute the main function
main().catch(console.error);