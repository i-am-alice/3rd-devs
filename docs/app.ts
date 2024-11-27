import { SearchService } from './SearchService';
import { DatabaseService } from "./DatabaseService";
import { OpenAIService } from "./OpenAIService";
import { VectorService } from "./VectorService";
import { DocumentService } from './DocumentService';
import { TextService } from './TextService';
import { FileService } from './FileService';
import { join } from 'path';
import fs from 'fs/promises';
const fileService = new FileService();
const textService = new TextService();
const openaiService = new OpenAIService();
const vectorService = new VectorService(openaiService);
const searchService = new SearchService(String(process.env.ALGOLIA_APP_ID), String(process.env.ALGOLIA_API_KEY));
const databaseService = new DatabaseService('docs/database.db', searchService, vectorService);
const documentService = new DocumentService(openaiService, databaseService, textService);

const { docs } = await fileService.process('https://cloud.overment.com/S04E03-1732688101.md', 4500);
for (const doc of docs) {
    await databaseService.insertDocument(doc, true);
}

// // ANSWER QUESTION USING HYBRID SEARCH
// const tokenizer = await documentService.answer('What is tokenizer?', docs);
// console.log(tokenizer);

// // // EXTRACTION 
// const extractedLinks = await documentService.extract(docs, 'topics', 'A bullet list (- topic: concise description) of general topics and concepts mentioned in the article.');
// const mergedContent = extractedLinks.map(doc => doc.text.trim()).join('\n');
// console.log(mergedContent);

// // // TRANSLATION
const translatedDocs = await documentService.translate(docs, 'Polish', 'English');
const mergedTranslation = translatedDocs
    .map(doc => textService.restorePlaceholders(doc).text.trim())
    .join('\n');

await fs.writeFile(join(__dirname, 'result.md'), mergedTranslation, 'utf8');

// // SUMMARY
// const summary = await documentService.summarize(docs, 'Document is a fragment of AI_devs 3 course lesson about generative AI');
// save to __dirname/result.md
// console.log(summary);

// // SYNTHESIS
// const synthesis = await documentService.synthesize('Jakie są obecne ograniczenia dużych modeli językowych?', docs);
// console.log(synthesis);