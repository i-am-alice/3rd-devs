import fs from 'fs';
import path from 'path';
import { OpenAiService } from '../lib/OpenAiService';

const INPUT_DIR = path.join(__dirname, './input');
const FACTS_DIR = path.join(INPUT_DIR, 'facts');

// Sends metaDict to the remote reporting endpoint
async function sendMetaDict(metaDict: Record<string, string>) {
    try {
        const response = await fetch('https://centrala.ag3nts.org/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'dokumenty',
                apikey: '7bc70191-381b-4d32-bab4-ae2cdbc6c2bc',
                answer: metaDict
            })
        });
        if (!response.ok) {
            const text = await response.text();
            console.error('Failed to send metaDict:', response.status, text);
        } else {
            const data = await response.json().catch(() => null);
            console.log('metaDict sent successfully:', data);
        }
    } catch (err) {
        console.error('Error sending metaDict:', err);
    }
}

async function generateMetadataForInputFiles() {
    const openai = new OpenAiService();
    // Gather all facts content
    const factFiles = fs.readdirSync(FACTS_DIR).filter(f => f.endsWith('.txt'));
    const factsContent = factFiles.map(f => fs.readFileSync(path.join(FACTS_DIR, f), 'utf-8'));

    // Target .txt files in INPUT_DIR, but NOT in facts/
    const inputFiles = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.txt'));

    const metaDict: Record<string, string> = {};
    for (const file of inputFiles) {
        const filePath = path.join(INPUT_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Polish system and user prompt, facts as context
        // const systemPrompt = 'Jesteś asystentem AI, który generuje krótkie metadane dla plików tekstowych.';
        // const userPrompt = `Na podstawie poniższej treści oraz kontekstu (fakty) wygeneruj listę słów kluczowych dla podanego pliku: tylko rzeczowniki, po przecinku, zwięźle. W liście tagów uwzględnij także tagi dotyczące faktu, który może byc pomocny w interpretacji treści pliku\nFAKTY:\n${factsContent}\n\nTREŚĆ PLIKU:\n${content}`;

        const systemPrompt = `
            Jesteś asystentem AI, który genratuje słowa kluczowe do plików tekstowych zawierających raport na temat wydarzeń. \n \n

            Poniżej znajduje się lista faktów, która będzie bardzo pomocna do generowania listy słów kluczowych: \n
            <facts>\n
                ${factsContent.map(fact => `\n<fact>${fact}</fact>\n`)}
            </facts>\n

            Poniżej znajduje się treść pliku, do którego należy wygenerować listę słów kluczowych: \n
            <file>\n
                ${content}
            </file>\n

            Twoim zadaniem jest: \n
            1. Znalezienie faktu, który najlepiej odnosi się do treści pliku \n
            2. Wygenerowanie listy słów kluczowych do faktu, który odnosi się do pliku \n
            3. Wygenerowanie listy słów kluczowych do treści pliku \n
            4. Zwrócenie listy swszystkich słów kluczowych w jednej liście rzeczowników, oddzielonych przecinkami. Nie zwracaj nic więcej. \n
        `

        try {
            const metadata = await openai.askGptO4Mini(systemPrompt);
            metaDict[file] = metadata.trim();
        } catch (err) {
            console.error(`Failed to generate metadata for ${file}:`, err);
        }
    }
    console.log(JSON.stringify(metaDict));

    // Send metaDict to the remote endpoint
    await sendMetaDict(metaDict);

}


// Run if executed directly
if (require.main === module) {
    generateMetadataForInputFiles();
}