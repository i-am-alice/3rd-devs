import fs from 'fs';
import path from 'path';
import { TextSplitter } from "./TextService";

const splitter = new TextSplitter();

async function processFile(filePath: string) {
    const text = fs.readFileSync(filePath, 'utf-8');
    const docs = await splitter.split(text, 1000);
    const jsonFilePath = path.join(path.dirname(filePath), `${path.basename(filePath, '.md')}.json`);
    fs.writeFileSync(jsonFilePath, JSON.stringify(docs, null, 2));

    const chunkSizes = docs.map(doc => doc.metadata.tokens);
    const avgChunkSize = chunkSizes.reduce((sum, size) => sum + size, 0) / chunkSizes.length;
    const minChunkSize = Math.min(...chunkSizes);
    const maxChunkSize = Math.max(...chunkSizes);
    const medianChunkSize = chunkSizes.sort((a, b) => a - b)[Math.floor(chunkSizes.length / 2)];

    return {
        file: path.basename(filePath),
        avgChunkSize: avgChunkSize.toFixed(2),
        medianChunkSize,
        minChunkSize,
        maxChunkSize,
        totalChunks: chunkSizes.length
    };
}

async function main() {
    // Get all markdown files in the current directory
    const directoryPath = path.join(__dirname);
    const files = fs.readdirSync(directoryPath);
    const reports = [];

    for (const file of files) {
        if (path.extname(file) === '.md') {
            const report = await processFile(path.join(directoryPath, file));
            reports.push(report);
        }
    }

    console.table(reports);
}

main().catch(console.error);