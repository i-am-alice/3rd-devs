import fs from 'fs';
import path from 'path';
import { OpenAiService } from '../lib/OpenAiService';

const INPUT_DIRS = [
    { input: path.join(__dirname, 'input', 'reports'), output: path.join(__dirname, 'output', 'structured-reports') },
    { input: path.join(__dirname, 'input', 'facts'), output: path.join(__dirname, 'output', 'structured-facts') }
];

async function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function readTxtFiles(dir: string): Promise<string[]> {
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.txt'))
        .map(f => path.join(dir, f));
}

async function readFileContent(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf8');
}

async function generateKeywordsPolish(openAi: OpenAiService, content: string): Promise<string[]> {
    const systemPrompt = 'Jesteś asystentem AI. Twoim zadaniem jest wygenerować listę najważniejszych słów kluczowych z podanego tekstu. Odpowiadaj tylko listą słów kluczowych w języku polskim, oddzielonych przecinkami.';
    const keywordsRaw = await openAi.askGpt41Nano(systemPrompt, content, 500);
    return keywordsRaw.split(',').map(k => k.trim()).filter(Boolean);
}

async function processFile(openAi: OpenAiService, inputFile: string, outputDir: string) {
    const content = await readFileContent(inputFile);
    const keywords = await generateKeywordsPolish(openAi, content);
    const output = {
        content,
        keywords,
        sourceFile: path.basename(inputFile)
    };
    const baseName = path.basename(inputFile, '.txt');
    const outputFile = path.join(outputDir, baseName + '.json');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');
}

async function main() {
    const openAi = new OpenAiService();
    for (const { input, output } of INPUT_DIRS) {
        await ensureDir(output);
        const files = await readTxtFiles(input);
        for (const file of files) {
            await processFile(openAi, file, output);
        }
    }
}

main();