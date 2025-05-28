import fs from 'fs';
import path from 'path';
import { OpenAiService } from '../lib/OpenAiService';

const inputDir = path.join(__dirname, 'input/i');
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const service = new OpenAiService();

async function processHtmlFile() {
    const htmlPath = path.join(__dirname, 'input', 'index.html');
    const outputMdPath = path.join(outputDir, 'index.md');
    if (!fs.existsSync(htmlPath)) {
        console.error('index.html not found:', htmlPath);
        return;
    }
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Replace media tags with [file: ...]
    htmlContent = htmlContent.replace(/<(img|audio|video)[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, tag, src) => {
        return `\n[file: ${src}]\n`;
    });

    // Use OpenAiService to convert HTML to markdown
    const systemPrompt = 'You are a professional content converter. Convert the following HTML content to pure markdown. Do not include any HTML tags. For any media, use the format [file: relative-path].';
    const question = `Convert this HTML to markdown, keeping only text content and [file: ...] tags.\n\n${htmlContent}`;
    try {
        const markdown = await service.askGpt41Nano(systemPrompt, question);
        fs.writeFileSync(outputMdPath, markdown);
        console.log(`Converted index.html to ${outputMdPath}`);
    } catch (err) {
        console.error('Error processing index.html:', err);
    }
}

async function processFiles() {
    const files = fs.readdirSync(inputDir);

    // Prepare for batch mp3 transcription
    const mp3Files = files.filter(f => f.toLowerCase().endsWith('.mp3'));
    if (mp3Files.length > 0) {
        // Use transcribeAudio for all mp3s in one go
        await service.transcribeAudio(inputDir, outputDir, /\.mp3$/i);
    }

    // Read index.html for webp context extraction
    const htmlPath = path.join(__dirname, 'input', 'index.html');
    let htmlContent = '';
    if (fs.existsSync(htmlPath)) {
        htmlContent = fs.readFileSync(htmlPath, 'utf8');
    }

    // Read index.md for context
    const indexMdPath = path.join(outputDir, 'index.md');
    let indexMdContent = '';
    if (fs.existsSync(indexMdPath)) {
        indexMdContent = fs.readFileSync(indexMdPath, 'utf8');
    }

    // Process webp files one by one
    for (const file of files) {
        if (file.toLowerCase().endsWith('.webp')) {
            const inputFilePath = path.join(inputDir, file);
            const outputFilePath = path.join(outputDir, path.parse(file).name + '.md');
            const imageBuffer = fs.readFileSync(inputFilePath);
            // System prompt and question in Polish, now including context from index.md
            const systemPrompt = `Jesteś profesjonalnym analitykiem treści. Otrzymujesz obraz oraz kontekstowy fragment dokumentu naukowego. Wygeneruj wyczerpujący, szczegółowy i dobrze sformatowany opis w języku polskim w formacie markdown, uwzględniając zawartość, styl oraz istotne cechy obrazu. Jeśli to możliwe, wykorzystaj kontekst dokumentu. Skup się jedynie na konkretach oraz tym, co przedstawia obraz. Użyj swojej aktualnej wiedzy, żeby dokonać asumpcji, które mogą być pomocne w opisaniu obrazu.\n\nKontekst dokumentu:\n${indexMdContent}`;
            let question = 'Opisz obraz szczegółowo po polsku.';
            try {
                const markdown = await service.askGptO4Mini(systemPrompt, question, 512, imageBuffer, 'webp');
                fs.writeFileSync(outputFilePath, markdown);
                console.log(`Described ${inputFilePath} to ${outputFilePath}`);
            } catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        }
    }
}


// processHtmlFile();
processFiles();