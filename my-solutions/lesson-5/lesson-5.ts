import fetch from 'node-fetch';
import { OpenAiService } from '../lib/OpenAiService';


async function fetchTextFromUrl(url: string): Promise<string> {
    console.log(`Fetching text from: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    console.log('Successfully fetched the data');
    return await response.text();
}
async function anonymizeWithOpenAi(text: string): Promise<string> {
    console.log('Anonymizing data with OpenAI...');
    console.log('Text: ', text);

    // Prompt for OpenAI
    const systemPrompt = `Zanonimizuj podany tekst zamieniając dane wrazliwe na słowo "CENZURA":

Zamień następujące informacje na słowo "CENZURA":
    *   Imię i nazwisko (razem, np. "Jan Nowak" -> "CENZURA").
    *   Wiek (np. "32" -> "CENZURA").
    *   Miasto (np. "Wrocław" -> "CENZURA").
    *   Ulica i numer domu (razem, np. "ul. Szeroka 18" -> "ul. CENZURA").

NIE zmieniaj niczego poza wyzej wymienionymi danymi.`;

    try {
        const openai = new OpenAiService();
        const result = await openai.askGpt41Nano(systemPrompt, text);
        console.log(`Text successfully anonymized by OpenAI: \n${result}`);
        return result;
    } catch (err) {
        console.error('Error while anonymizing with OpenAI:', err);
        throw err;
    }
}

async function sendAnonymizedContent(anonymizedContent: string): Promise<any> {
    const endpoint = 'https://centrala.ag3nts.org/report';
    const apiKey = '7bc70191-381b-4d32-bab4-ae2cdbc6c2bc';

    console.log(`Sending anonymized content to: ${endpoint}`);

    const payload = {
        apikey: apiKey,
        task: 'CENZURA',
        answer: anonymizedContent
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Failed to send data: ${response.status} ${JSON.stringify(response.json(), null, 2)}}`);
    }

    console.log('Successfully sent anonymized content');
    return await response.json();
}

const main = async () => {
    try {
        console.log('Starting anonymization process...');

        // 1. Fetch text from URL
        const url = 'https://centrala.ag3nts.org/data/7bc70191-381b-4d32-bab4-ae2cdbc6c2bc/cenzura.txt';
        const textContent = await fetchTextFromUrl(url);

        // 2. Anonymize the data using OpenAI
        const anonymizedContent = await anonymizeWithOpenAi(textContent);

        // 3. Send the anonymized content to the endpoint
        const response = await sendAnonymizedContent(anonymizedContent);

        console.log('Process completed successfully!');
        console.log('Response:', response);

        return response;
    } catch (error) {
        console.error('Error in the main process:', error);
        throw error; // Re-throw to allow proper handling at a higher level if needed
    }
};

main();