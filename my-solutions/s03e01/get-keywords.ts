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

function main() {
    const reports = readJsonFiles(REPORTS_DIR);
    const allFiles = getAllFilesWithKeywords();
    for (const { file, data } of reports) {
        if (!Array.isArray(data.keywords)) continue;
        const related = findRelatedKeywords(data.keywords, allFiles);
        console.log(`File: ${data.sourceFile}`);
        console.log('Combined Keywords:', related.join(', '));
        console.log('---');
    }
}

main();
