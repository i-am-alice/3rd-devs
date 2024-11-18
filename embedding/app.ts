import { OpenAIService } from "./OpenAIService";
import { TextSplitter } from "./TextService";
import { VectorService } from './VectorService';

const data = [
  'Apple (Consumer Electronics)',
  'Tesla (Automotive)',
  'Microsoft (Software)',
  'Google (Internet Services)',
  'Nvidia (Semiconductors)',
  'Meta (Social Media)',
  'X Corp (Social Media)',
  'Tech•sistence (Newsletter)'
];
const queries = [ 'Car company', 'Macbooks', 'Facebook', 'Newsletter' ];


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
        vectorService.performSearch(COLLECTION_NAME, query, 3)
    ));

    queries.forEach((query, index) => {
        console.log(`Query: ${query}`);
        searchResults[index].forEach((result, resultIndex) => {
            console.log(`  ${resultIndex + 1}. ${result.payload.text} (Score: ${result.score})`);
        });
        console.log();
    });
}

main().catch(console.error);