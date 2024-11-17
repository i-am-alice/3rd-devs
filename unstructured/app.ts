import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { TextSplitter, type IDoc } from './TextService';
import { OpenAIService } from "./OpenAIService";
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Initialize services
const splitter = new TextSplitter();
const openaiService = new OpenAIService();

// Constants
const SOURCE_FILE = 'source.md';
const OUTPUT_FILE = 'tools.json';
const MAX_CHUNK_SIZE = 500;

// Main function to orchestrate the process
async function main() {
  try {
    const sourceContent = await loadSourceFile(__dirname);
    const extractedTools = await extractTools(sourceContent);
    const splitDocs = await splitContent(extractedTools);
    await saveOutput(splitDocs);
    console.log('Process completed successfully. Check tools.json for results.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// New splitContent function
async function splitContent(content: string): Promise<IDoc[]> {
  const chunks = content.split('\n\n');
  const docs = await Promise.all(chunks.map(chunk => splitter.document(chunk)));
  return docs;
}

// ALTERNATIVE SPLITTING 
// async function splitContent(content: string): Promise<IDoc[]> {
//     return await splitter.split(content, MAX_CHUNK_SIZE);
// }

// Load the source file
async function loadSourceFile(dirname: string): Promise<string> {
  const filePath = join(dirname, SOURCE_FILE);
  return await readFile(filePath, 'utf-8');
}

// Extract tools information using OpenAI
async function extractTools(fileContent: string): Promise<string> {
  const userMessage: ChatCompletionMessageParam = {
    role: 'user',
    content: [{
      type: "text",
      text: `<document>${fileContent}</document>
      
      Please extract all the information from the article's content related to tools, apps, or software, including links and descriptions in markdown format. Ensure the list items are unique. Always separate each tool with a double line break. Respond only with the concise content and nothing else.`
    }]
  };

  const response = await openaiService.completion([userMessage], 'o1-mini', false) as ChatCompletion;
  const content = response.choices[0].message.content || '';

  return content;
}

// Save the output to a JSON file
async function saveOutput(docs: IDoc[]) {
  const outputPath = join(__dirname, OUTPUT_FILE);
  await writeFile(outputPath, JSON.stringify(docs, null, 2), 'utf-8');
}

// Run the main function
main();