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

async function generateKeywordsPolish(openAi: OpenAiService, content: string, filename: string): Promise<string[]> {
    const systemPrompt = 'Jesteś asystentem AI. Twoim zadaniem jest wygenerować wyczerpującą listę słów kluczowych z podanego tekstu, zawierającą przede wszystkim nazwy własne. Odpowiadaj tylko listą słów kluczowych w języku polskim, oddzielonych przecinkami.\n Jednym z elementów tablicy powinno być oznaczenie sektoru, którego dotyczy raport, uzyskany na podstawie nazwy pliku. \n' +
        'Przykład: \n' +
        '2024-11-12_report-07-sektor_C4.txt \n' +
        'Odpowiedź: sektor C4, ...reszta tagów \n' +
        `Nazwa pliku do wzięcia pod uwagę: ${filename} \n`;
    const keywordsRaw = await openAi.askGpt41Nano(systemPrompt, content, 500);
    return keywordsRaw.split(',').map(k => k.trim()).filter(Boolean);
}

async function processFile(openAi: OpenAiService, inputFile: string, outputDir: string) {
    const content = await readFileContent(inputFile);
    const keywords = await generateKeywordsPolish(openAi, content, path.basename(inputFile));
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