import * as fs from 'fs';
import * as path from 'path';

async function prepareFinetuningData() {
    const dataDir = path.join(__dirname, 'data');
    const outputFile = path.join(__dirname, 'fine-tuning-data.jsonl');

    // Read the contents of both files
    const correctLines = fs.readFileSync(path.join(dataDir, 'correct.txt'), 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);
    const incorrectLines = fs.readFileSync(path.join(dataDir, 'incorect.txt'), 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

    // Create the JSON structure
    const finetuningData = [
        ...correctLines.map(line => ({
            messages: [
                { role: "user", content: line },
                { role: "assistant", content: "1" }
            ]
        })),
        ...incorrectLines.map(line => ({
            messages: [
                { role: "user", content: line },
                { role: "assistant", content: "0" }
            ]
        }))
    ];

    // Write the output file in JSONL format (one JSON object per line)
    const jsonlContent = finetuningData.map(item => JSON.stringify(item)).join('\n');
    fs.writeFileSync(outputFile, jsonlContent);
    console.log(`Fine-tuning data has been written to ${outputFile}`);
}

prepareFinetuningData().catch(console.error);
