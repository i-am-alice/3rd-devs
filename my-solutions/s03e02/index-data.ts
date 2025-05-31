import { QdrantClient } from '@qdrant/js-client-rest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { OpenAiService } from '../lib/OpenAiService';

config();

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });
const COLLECTION_NAME = 'text-embeddings';
const openaiService = new OpenAiService();

async function createCollection() {
    const exists = await qdrant.getCollections()
        .then(res => res.collections.some(col => col.name === COLLECTION_NAME));

    if (!exists) {
        await qdrant.createCollection(COLLECTION_NAME, {
            vectors: { size: 1536, distance: 'Cosine' },
        });
        console.log('Collection created');
    }
}

async function indexTextFiles() {
    const files = readdirSync('./data');
    let id = 1;
    const points = [];

    for (const file of files) {
        const content = readFileSync(join('./data', file), 'utf-8');
        const embedding = await openaiService.getEmbedding(content);
        points.push({
            id: id++,
            vector: embedding,
            payload: { filename: file, text: content, date: file.replace('.txt', '').replaceAll('_', '-') },
        });
    }

    if (points.length > 0) {
        await qdrant.upsert(COLLECTION_NAME, { points });
        console.log(`Indexed ${points.length} files.`);
    }
}

(async () => {
    await createCollection();
    await indexTextFiles();
})();