import fs from 'fs';
import path from 'path';

const REPORTS_DIR = path.join(__dirname, 'output', 'structured-reports');
const FACTS_DIR = path.join(__dirname, 'output', 'structured-facts');

function readJsonFiles(dir: string): Array<{ file: string; data: any }> {
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
            return { file: f, data };
        });
}

function getAllFilesWithKeywords() {
    const reports = readJsonFiles(REPORTS_DIR);
    const facts = readJsonFiles(FACTS_DIR);
    return [
        ...reports.map(r => ({ ...r, type: 'report' })),
        ...facts.map(f => ({ ...f, type: 'fact' })),
    ];
}

function findRelatedKeywords(baseKeywords: string[], files: Array<{ file: string; data: any }>) {
    const relatedKeywords = new Set<string>(baseKeywords);
    for (const { data } of files) {
        if (!Array.isArray(data.keywords)) continue;
        if (data.keywords.some((k: string) => baseKeywords.includes(k))) {
            data.keywords.forEach((k: string) => relatedKeywords.add(k));
        }
    }
    return Array.from(relatedKeywords);
}

async function main() {
    const reports = readJsonFiles(REPORTS_DIR);
    const allFiles = getAllFilesWithKeywords();
    const answer: Record<string, string> = {};

    for (const { file, data } of reports) {
        if (!Array.isArray(data.keywords)) continue;
        const related = findRelatedKeywords(data.keywords, allFiles);
        answer[data.sourceFile] = related.join(',');
    }
    if (Object.keys(answer).length > 0) {
        const payload = {
            answer,
            apikey: "7bc70191-381b-4d32-bab4-ae2cdbc6c2bc",
            task: "dokumenty"
        };
        try {
            const resp = await fetch('https://centrala.ag3nts.org/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await resp.text();
            console.log('Report sent. Response:', result);
        } catch (e) {
            console.error('Failed to send report:', e);
        }
    }
}

main();