import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from 'dotenv';
import { OpenAiService } from '../lib/OpenAiService';

config();

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });
const COLLECTION_NAME = 'text-embeddings';
const openaiService = new OpenAiService();

async function main() {
    const query = process.argv[2];
    if (!query) {
        console.error('Please provide a query as the first CLI argument.');
        process.exit(1);
    }
    const embedding = await openaiService.getEmbedding(query);
    const results = await qdrant.search(COLLECTION_NAME, {
        vector: embedding,
        limit: 3,
        with_payload: true,
    });
    console.log('Top 3 results:');
    results.forEach((item: any, idx: number) => {
        console.log(`\n#${idx + 1}`);
        console.log('Score:', item.score);
        console.log('Payload:', item.payload);
    });
}

main().catch(err => {
    console.error('Error during search:', err);
    process.exit(1);
});
