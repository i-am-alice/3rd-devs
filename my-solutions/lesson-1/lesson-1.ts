import { OpenAiService } from "../lib/OpenAiService";
const openAiService = new OpenAiService();

async function fetchHtml(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch HTML: ${res.status}`);
    return await res.text();
}

function extractHumanQuestion(html: string): string | null {
    // Simple regex-based extraction for p#human-question
    const match = html.match(/<p[^>]*id=["']human-question["'][^>]*>([\s\S]*?)<\/p>/i);
    return match ? match[1].trim() : null;
}

async function postAnswer(answer: string) {
    const res = await fetch('https://xyz.ag3nts.org/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ answer, username: 'tester', password: "574e112a" })
    });
    if (!res.ok) throw new Error(`POST failed: ${res.status}`);
    return await res.text();
}

export async function main() {
    try {
        const html = await fetchHtml('https://xyz.ag3nts.org');
        const question = extractHumanQuestion(html);
        if (!question) throw new Error('No <p id="human-question"> found.');
        console.log('Extracted question:', question);
        const answer = await openAiService.askGpt41Nano('You are a helpful assistant. Respond with just a short and concise answer. Don`t add any additional text or explanation.', question);
        console.log('Generated answer:', answer);
        const postResult = await postAnswer(answer);
        console.log('All steps completed. Server response:', postResult);
    } catch (err) {
        console.error('Error:', err);
    }
}

// If running directly, execute main()
if (require.main === module) {
    main();
}
