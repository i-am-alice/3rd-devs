import type { Request, Response } from 'express';

import path from 'path';
import multer from 'multer';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { IAssistantTools, IDoc } from './types/types';
import { SearchService } from './services/SearchService';
import { DatabaseService } from "./services/DatabaseService";
import { OpenAIService } from "./services/OpenAIService";
import { VectorService } from "./services/VectorService";
import { DocumentService } from './services/DocumentService';
import { TextService } from './services/TextService';
import { FileService } from './services/FileService';
import { WebSearchService } from './services/WebSearch';
import { AssistantService } from './services/AssistantService';
import { unlink } from 'fs/promises';

const fileService = new FileService();
const textService = new TextService();
const openaiService = new OpenAIService();
const vectorService = new VectorService(openaiService);
const searchService = new SearchService(String(process.env.ALGOLIA_APP_ID), String(process.env.ALGOLIA_API_KEY));
const databaseService = new DatabaseService('web/database.db', searchService, vectorService);
const documentService = new DocumentService(openaiService, databaseService, textService);
const webSearchService = new WebSearchService();
const assistantService = new AssistantService(openaiService, fileService, databaseService, webSearchService, documentService, textService);

const app = express();
const port = 3000;

app.use(express.json());
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export const tools: IAssistantTools[] = [
  { name: 'web_search', description: 'Use only when searching web results or scanning a specific domain (NOT the exact URL / subpage of the page such as /blog). (e.g., "search example.com for apps"). This tool uses Google search to scrape relevant website contents. NEVER use it when the user asks to load specific URLs.' },
  { name: 'file_process', description: 'Use to load and process contents of a file/image from a given URL/path or to process a web search results. Can translate, summarize, synthesize, extract information, or answer questions about the file contents (answering is available for images too). No need to upload files before using this tool.' },
  { name: 'upload', description: 'Use only for creating new files. Allows writing content and uploading it to receive a URL/path to the new file.' },
  { name: 'answer', description: 'MUST be used as the final tool. Use to provide the final answer to the user, communicate results, or inform about limitations, missing data, or inability to complete the task.' },
];


const processors = [
  { name: 'translate', description: 'Use this tool to translate a given URL or path content to the target language. REQUIRED PARAMETERS: url or path, original_language, target_language.' },
  { name: 'summarize', description: 'Use this tool to generate a summary of the given URL or path content. REQUIRED PARAMETERS: \'url or path\'.' },
  { name: 'synthesize', description: 'Use this tool to synthesize the content of the given URL or path content. REQUIRED PARAMETERS: \'url or path\' and \'query\' that describes the synthesis.' },
  { name: 'extract', description: 'Use this tool to extract specific information or content from a given URL or file path. This includes, but is not limited to: links, topics, concepts, article URLs, dates, or any other structured data. REQUIRED PARAMETERS: \'url or path\', \'extraction_type\' (e.g. "links", "recent article URL", "publication dates"), and \'description\' of the extraction.' },
  { name: 'answer', description: 'Use this tool when you need to answer questions based on the content of a given document or image (URL or file path). This tool can interpret and respond to queries about the document\'s subject matter, facts, or visual content. REQUIRED PARAMETERS: \'url or path\', \'question\'.' }
]

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/chat', async (req, res) => {

    let context: IDoc[] = [];
    let uploads = '';
    let { messages, conversation_uuid } = req.body;

    if (messages.some((msg: any) => msg.role === 'system' && msg.content.startsWith('As a copywriter, your job is to provide an ultra-concise name'))) {
      return res.json({ choices: [{ message: { role: 'assistant', content: 'AGI is here...' } }] });
    }
    messages = messages.filter((msg: any) => msg.role !== 'system');
  
    const { plan } = await assistantService.understand(messages, tools);
    console.log('Plan of actions:');
    console.table(plan.map((step: any) => ({ Tool: step.tool, Query: step.query })));

    for (const { tool, query } of plan) {
        if (tool === 'web_search') {
            const webSearchResults = await assistantService.websearch(query, conversation_uuid);
            context = [...context, ...webSearchResults];
        }

        if (tool === 'file_process') {
          console.log(context)
            const { process } = await assistantService.process(query, processors, context);
            const result = await assistantService.processDocument(process, context, conversation_uuid);
            context = [...context, ...result];
        }

        if (tool === 'upload') {
            const file = await assistantService.write(query, context, conversation_uuid);
            const result = await assistantService.upload(file);
            uploads += `<uploaded_file name="${file.metadata.name}" description="${file.metadata.description}">Path: ${result}</uploaded_file>`
        }
    }

    const answer = await assistantService.answer(plan.at(-1)?.query || '', messages, context, uploads);

    // Replace placeholders with the actual content
    const answerWithContext = answer.replace(/\[\[([^\]]+)\]\]/g, (match: string, p1: string) => {
      const doc = context.find(doc => doc.metadata.uuid === p1);
      if (doc) {
        const restoredDoc = textService.restorePlaceholders(doc);
        return restoredDoc.text;
      }
      return match;
    });

    return res.json({ conversation_uuid, choices: [{ message: { role: 'assistant', content: answerWithContext } }] });
});

app.get('/', (req, res) => {
  res.send('AGI is here...');
});

app.get('/api/file/:type/:date/:uuid/:filename', async (req: Request, res: Response) => {
  try {
    const { type, date, uuid, filename } = req.params;
    const filePath = path.join(type, date, uuid, filename);
    
    const { data, mimeType } = await fileService.load(filePath);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(data);
  } catch (error: any) {
    console.error('File retrieval error:', error);
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

const storageDir = path.join(process.cwd(), 'storage');

app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer;
    const fileName = req.file.originalname;
    const fileUUID = uuidv4();
    const conversationUUID = req.body.conversation_uuid;

    // Save the file temporarily
    const tempFilePath = await fileService.writeTempFile(fileContent, fileName);

    // Process the file using FileService
    try {
      const { docs } = await fileService.process(tempFilePath, undefined, conversationUUID);

      await Promise.all(docs.map(async (doc) => {
        // Add conversation_uuid to the document metadata
        doc.metadata.conversation_uuid = conversationUUID;
        await databaseService.insertDocument(doc, true);
      }));

      // Clean up the temporary file
      await unlink(tempFilePath).catch((err: any) => {
        console.error('Error deleting temp file:', err);
      });

      res.json({ 
        success: true, 
        filePath: path.relative(process.cwd(), tempFilePath),
        fileName: fileName,
        fileUUID: fileUUID,
        type: fileService.getFileCategoryFromMimeType(req.file.mimetype),
        docs: docs.map(doc => ({
          text: doc.text,
          metadata: doc.metadata
        }))
      });
    } catch (processError: any) {
      console.error('Error processing file:', processError);
      res.status(500).json({ success: false, error: `Error processing file: ${processError.message}` });
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


