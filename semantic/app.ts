import { OpenAIService } from "./OpenAIService";
import { TextSplitter } from "./TextService";
import { VectorService } from './VectorService';

const data = [
  'Music Player',
  'Todo List',
  'Email Client',
  'Web Browser'
];
const queries = [ 'Play Music', 'Add to my todo-list ...', 'Check my emails', 'Search web for https://example.com' ];


const COLLECTION_NAME = "aidevs";

const openai = new OpenAIService();
const vectorService = new VectorService(openai);
const textSplitter = new TextSplitter();

async function initializeData() {
    const points = await Promise.all(data.map(async text => {
        const doc = await textSplitter.document(text, 'gpt-4', { role: 'embedding-test' });
        return doc;
    }));

    await vectorService.initializeCollectionWithData(COLLECTION_NAME, points);
}

async function main() {
    await initializeData();

    const searchResults = await Promise.all(queries.map(query => 
        vectorService.performSearch(COLLECTION_NAME, query, 1)
    ));

    const tableData = queries.map((query, index) => ({
        Query: query,
        Tool: searchResults[index][0]?.payload?.text || 'N/A',
        Score: searchResults[index][0]?.score?.toFixed(4) || 'N/A'
    }));

    console.table(tableData);
}

main().catch(console.error);