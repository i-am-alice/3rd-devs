import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { v4 as uuidv4 } from 'uuid';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';
import { IndexFlatIP } from 'faiss-node';
import { appendFile } from 'fs/promises';
import yaml from 'js-yaml';

export class ContextService {
  private rootDir: string;
  private openaiService: OpenAIService;
  private messageIndex!: IndexFlatIP;
  private memoryIndex!: IndexFlatIP;
  private memoryIndexMap: Map<string, { fileName: string, uuid: string }>;

  constructor(rootDir: string, openaiService: OpenAIService) {
    this.rootDir = rootDir;
    this.openaiService = openaiService;
    this.memoryIndexMap = new Map();
    this.initialize();
  }

  private async initialize() {
    await this.ensureDirectories();
    await this.initializeIndexes();
    await this.initializeMemoryIndex();
  }

  private async ensureDirectories() {
    await fs.mkdir(path.join(this.rootDir, 'threads'), { recursive: true });
    await fs.mkdir(path.join(this.rootDir, 'embeddings'), { recursive: true });
    await fs.mkdir(path.join(this.rootDir, 'memories'), { recursive: true });
  }

  private async initializeIndexes() {
    await this.ensureDirectories();
    const messageIndexPath = path.join(this.rootDir, 'embeddings', 'message_faiss.index');
    const memoryIndexPath = path.join(this.rootDir, 'embeddings', 'memory_faiss.index');

    try {
      this.messageIndex = await IndexFlatIP.read(messageIndexPath);
      this.memoryIndex = await IndexFlatIP.read(memoryIndexPath);
    } catch (error) {
      console.log('Creating new FAISS indexes');
      this.messageIndex = new IndexFlatIP(3072);
      this.memoryIndex = new IndexFlatIP(3072);
      await this.messageIndex.write(messageIndexPath);
      await this.memoryIndex.write(memoryIndexPath);
    }
  }

  private async initializeMemoryIndex() {
    const memoriesDir = path.join(this.rootDir, 'memories');
    const files = await fs.readdir(memoriesDir, { withFileTypes: true });

    for (const file of files) {
      if (file.isFile() && path.extname(file.name) === '.md') {
        const filePath = path.join(memoriesDir, file.name);
        const content = await fs.readFile(filePath, 'utf-8');
        const customYamlParser = this.createCustomYamlParser();
        const { data } = matter(content, { engines: { yaml: customYamlParser } });
        if (data.uuid) {
          this.memoryIndexMap.set(data.uuid, { fileName: file.name, uuid: data.uuid });
          this.memoryIndexMap.set(file.name, { fileName: file.name, uuid: data.uuid });
        }
      }
    }

    // Rebuild the FAISS index to ensure consistency
    await this.rebuildMemoryIndex();
  }

  private async rebuildMemoryIndex() {
    this.memoryIndex = new IndexFlatIP(3072);
    const metadataPath = path.join(this.rootDir, 'embeddings', 'memory_metadata.jsonl');
    await fs.writeFile(metadataPath, ''); // Clear existing metadata

    for (const [uuid, { fileName }] of this.memoryIndexMap.entries()) {
      if (uuid === fileName) continue; // Skip duplicate entries

      const filePath = path.join(this.rootDir, 'memories', fileName);
      const content = await fs.readFile(filePath, 'utf-8');
      const customYamlParser = this.createCustomYamlParser();
      const { data, content: memoryContent } = matter(content, { engines: { yaml: customYamlParser } });
      
      const embedding = await this.openaiService.createEmbedding(memoryContent + ' ' + (data.keywords || []).join(' '));
      const normalizedEmbedding = this.normalizeVector(embedding);
      
      this.memoryIndex.add(normalizedEmbedding);
      
      await appendFile(metadataPath, JSON.stringify({ uuid, filename: fileName }) + '\n');
    }

    const indexPath = path.join(this.rootDir, 'embeddings', 'memory_faiss.index');
    await this.memoryIndex.write(indexPath);
  }

  private getFullPath(filePath: string): string {
    // Check if the filePath already includes the rootDir
    if (filePath.startsWith(this.rootDir)) {
      return filePath;
    }
    return path.join(this.rootDir, 'threads', filePath);
  }

  private getDateBasedPath(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  async getRelevantContexts(similarMessages: Array<{ uuid: string }>, similarMemories: Array<{ uuid: string }>) {
    const messageContexts = await Promise.all(
      similarMessages.map(async (similar) => {
        const message = await this.getMessage(similar.uuid);
        return message ? {
          type: 'message',
          content: this.truncateText(`${message.role}: ${message.content}`, 10000)
        } : null;
      })
    );

    const memoryContexts = await Promise.all(
      similarMemories.map(async (similar) => {
        const memory = await this.getMemory(similar.uuid);
        return memory ? {
          type: 'memory',
          content: this.truncateText(memory.content, 10000)
        } : null;
      })
    );

    return [...messageContexts, ...memoryContexts].filter(context => context !== null);
  }

  async saveConversation(config: {
    messages: ChatCompletionMessageParam[],
    keywords: string[],
    conversation_uuid?: string,
  }): Promise<string> {
    const { messages, keywords, conversation_uuid } = config;
    const id = conversation_uuid || uuidv4();
    const datePath = this.getDateBasedPath();
    const filePath = path.join(datePath, `${id}.md`);
    const fullPath = this.getFullPath(filePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    const latestMessages = messages.slice(-2);
    
    const cleanMessages = latestMessages.map((msg: ChatCompletionMessageParam) => ({
      uuid: uuidv4(),
      role: msg.role || 'user',
      content: typeof msg.content === 'string' ? msg.content : '',
    }));

    try {
      let existingContent = '';
      try {
        existingContent = await fs.readFile(fullPath, 'utf-8');
      } catch (error) {
        // File doesn't exist yet, which is fine for new conversations
      }

      const customYamlParser = this.createCustomYamlParser();
      const { data: existingData, content: existingBody } = matter(existingContent, { engines: { yaml: customYamlParser } });
      
      const updatedMessages = [...(existingData.messages || []), ...cleanMessages];

      const updatedData = {
        ...existingData,
        messages: updatedMessages,
        keywords: Array.from(new Set([...(existingData.keywords || []), ...keywords])).join(', '),
        conversation_uuid: id
      };

      // Use yaml.dump instead of matter.stringify
      const yamlContent = `---\n${yaml.dump(updatedData)}---\n${existingBody}`;
      await fs.writeFile(fullPath, yamlContent);

    } catch (error) {
      console.error('Error updating or writing YAML:', error);
      throw error;
    }

    const latestMessage = cleanMessages[cleanMessages.length - 1];
    const latestMessageEmbedding = await this.openaiService.createEmbedding(latestMessage.content);
    
    await this.addEmbeddingToIndex(latestMessageEmbedding, {
      uuid: latestMessage.uuid,
      role: latestMessage.role,
      filename: `${id}.md`
    }, false);

    return id;
  }

  async saveMemoryForConversation(memory: { title: string, content: string, keywords: string[] } | null, conversation_uuid: string) {
    if (!memory || !memory.content) return;

    const fileName = `${this.sanitizeFileName(memory.title)}.md`;
    const memoryPath = path.join(this.rootDir, 'memories', fileName);

    let memoryUuid: string;
    let existingContent = '';

    try {
      existingContent = await fs.readFile(memoryPath, 'utf-8');
      const customYamlParser = this.createCustomYamlParser();
      const { data } = matter(existingContent, { engines: { yaml: customYamlParser } });
      memoryUuid = data.uuid;
    } catch (error) {
      // File doesn't exist, create a new UUID
      memoryUuid = uuidv4();
    }

    const frontMatter = {
      title: memory.title,
      conversation_uuid,
      uuid: memoryUuid
    };

    // Use yaml.dump for the front matter
    let content = `---\n${yaml.dump(frontMatter)}---\n${memory.content}`;
    
    // Add hashtags at the end of the file
    const hashtags = memory.keywords.map(keyword => `#${keyword.replace(/\s+/g, '_')}`).join(' ');
    content += `\n\n${hashtags}`;

    await fs.writeFile(memoryPath, content);

    // Update the memory index
    this.memoryIndexMap.set(memoryUuid, { fileName, uuid: memoryUuid });
    this.memoryIndexMap.set(fileName, { fileName, uuid: memoryUuid });

    // Update the conversation file to include the memory reference
    const datePath = this.getDateBasedPath();
    const conversationFilePath = path.join(datePath, `${conversation_uuid}.md`);
    const fullConversationPath = this.getFullPath(conversationFilePath);

    try {
      const existingContent = await fs.readFile(fullConversationPath, 'utf-8');
      const customYamlParser = this.createCustomYamlParser();
      const { data: existingData, content: existingBody } = matter(existingContent, { engines: { yaml: customYamlParser } });

      const updatedData = {
        ...existingData,
        memory: { title: memory.title, keywords: memory.keywords }
      };

      // Use yaml.dump for the conversation file as well
      const yamlContent = `---\n${yaml.dump(updatedData)}---\n${existingBody}`;
      await fs.writeFile(fullConversationPath, yamlContent);
    } catch (error) {
      console.error('Error updating conversation file with memory reference:', error);
      throw error;
    }

    const memoryEmbedding = await this.openaiService.createEmbedding(memory.content + ' ' + memory.keywords.join(' '));
    await this.addEmbeddingToIndex(memoryEmbedding, {
      uuid: memoryUuid,
      filename: fileName
    }, true);

    return memoryUuid; // Return the UUID of the saved memory
  }

  sanitizeFileName(title: string): string {
    return title.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  }

  async getMemory(identifier: string): Promise<{ title: string, content: string, keywords: string[] } | null> {
    const memoryInfo = this.memoryIndexMap.get(identifier);
    if (!memoryInfo) {
      console.error(`No file found for memory identifier: ${identifier}`);
      return null;
    }

    const filePath = path.join(this.rootDir, 'memories', memoryInfo.fileName);
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const customYamlParser = this.createCustomYamlParser();
      const { data, content } = matter(fileContent, { engines: { yaml: customYamlParser } });
      
      // Extract hashtags from the end of the content
      const contentParts = content.trim().split('\n\n');
      const mainContent = contentParts.slice(0, -1).join('\n\n');
      const hashtagString = contentParts[contentParts.length - 1];
      const keywords = hashtagString.split(' ').map(tag => tag.replace('#', '').replace(/_/g, ' '));

      return { title: data.title, content: mainContent, keywords };
    } catch (error) {
      console.error(`Error reading memory file: ${filePath}`, error);
      return null;
    }
  }

  async getAllMemories(): Promise<Array<{ title: string, content: string, keywords: string[], conversation_uuid: string, uuid: string }>> {
    const memories = [];
    const memoriesDir = path.join(this.rootDir, 'memories');
    const files = await fs.readdir(memoriesDir, { withFileTypes: true });

    for (const file of files) {
      if (file.isFile() && path.extname(file.name) === '.md') {
        const filePath = path.join(memoriesDir, file.name);
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const customYamlParser = this.createCustomYamlParser();
          const { data, content } = matter(fileContent, { engines: { yaml: customYamlParser } });
          
          // Extract hashtags from the end of the content
          const contentParts = content.trim().split('\n\n');
          const mainContent = contentParts.slice(0, -1).join('\n\n');
          const hashtagString = contentParts[contentParts.length - 1];
          const keywords = hashtagString.split(' ').map(tag => tag.replace('#', '').replace(/_/g, ' '));

          memories.push({
            title: data.title,
            content: mainContent,
            keywords,
            conversation_uuid: data.conversation_uuid,
            uuid: data.uuid
          });
        } catch (error) {
          console.error(`Error reading memory file: ${filePath}`, error);
        }
      }
    }
    return memories;
  }

  async searchSimilarMessages(embedding: number[], k: number = 5): Promise<Array<{ uuid: string; role: string; similarity: number }>> {
    return this.searchSimilar(embedding, k, this.messageIndex, 'message_metadata.jsonl');
  }

  async searchSimilarMemories(embedding: number[], k: number = 5): Promise<Array<{ uuid: string; similarity: number }>> {
    return this.searchSimilar(embedding, k, this.memoryIndex, 'memory_metadata.jsonl');
  }

  private async searchSimilar(embedding: number[], k: number, index: IndexFlatIP, metadataFile: string): Promise<Array<any>> {
    if (index.ntotal() === 0) {
      console.log(`The ${metadataFile.split('_')[0]} index is empty. No similar items found.`);
      return [];
    }

    const adjustedK = Math.min(k, index.ntotal());
    const { distances, labels } = index.search(this.normalizeVector(embedding), adjustedK);

    console.log(`FAISS search results for ${metadataFile}:`, { distances, labels });

    const metadata = (await fs.readFile(path.join(this.rootDir, 'embeddings', metadataFile), 'utf-8')).split('\n').filter(Boolean);

    const labelsArray = Array.isArray(labels) ? labels : [labels];
    const distancesArray = Array.isArray(distances) ? distances : [distances];

    return labelsArray.flatMap((label, index) => {
      try {
        const parsedMetadata = JSON.parse(metadata[label]);
        return {
          ...parsedMetadata,
          similarity: distancesArray[index] || 0
        };
      } catch (error) {
        console.error(`Error parsing metadata for label ${label} in ${metadataFile}:`, error);
        return [];
      }
    });
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  async getConversation(conversation_uuid: string): Promise<ChatCompletionMessageParam[] | null> {
    try {
      const threadsDir = path.join(this.rootDir, 'threads');
      const directories = await fs.readdir(threadsDir, { withFileTypes: true });

      for (const entry of directories) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === '.obsidian') {
          continue; // Skip non-directories, hidden files/directories, and .obsidian folder
        }
        
        const filePath = path.join(threadsDir, entry.name, `${conversation_uuid}.md`);
        try {
          const { metadata } = await this.readFile(filePath);
          return metadata.messages;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`Error reading file ${filePath}:`, error);
          }
          // Continue to the next directory if file not found
        }
      }
  
      return null;
    } catch (error) {
      console.error('Error in getConversation:', error);
      return null;
    }
  }

  private createCustomYamlParser() {
    return {
      parse: (str: string) => yaml.load(str) as object,
      stringify: (obj: object) => yaml.dump(obj)
    };
  }

  private async readFile(filePath: string): Promise<{ content: string; metadata: any }> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const customYamlParser = this.createCustomYamlParser();
    const { data, content } = matter(fileContent, { engines: { yaml: customYamlParser } });
    return { content, metadata: data };
  }

  async addEmbeddingToIndex(embedding: number[], metadata: { uuid: string, role?: string, filename: string }, isMemory: boolean) {
    const index = isMemory ? this.memoryIndex : this.messageIndex;
    const metadataFile = isMemory ? 'memory_metadata.jsonl' : 'message_metadata.jsonl';
    const metadataPath = path.join(this.rootDir, 'embeddings', metadataFile);

    // Add the embedding to the FAISS index
    const normalizedEmbedding = this.normalizeVector(embedding);
    index.add(normalizedEmbedding);

    // Save the updated index
    const indexPath = path.join(this.rootDir, 'embeddings', isMemory ? 'memory_faiss.index' : 'message_faiss.index');
    await index.write(indexPath);

    // Append metadata to the corresponding metadata file
    const metadataWithFilename = {
      ...metadata,
      filename: metadata.filename,
      uuid: metadata.uuid // Ensure UUID is included in metadata
    };
    await appendFile(metadataPath, JSON.stringify(metadataWithFilename) + '\n');
  }

  async getExistingMessages(conversation_uuid?: string): Promise<ChatCompletionMessageParam[]> {
    if (!conversation_uuid) return [];
    const conversation = await this.getConversation(conversation_uuid);
    return conversation || [];
  }

  async getMessage(uuid: string): Promise<ChatCompletionMessageParam | null> {
    const conversations = await this.getAllConversations();
    for (const conversation of conversations) {
      if (conversation.messages && Array.isArray(conversation.messages)) {
        const message = conversation.messages.find(msg => (msg as any).uuid === uuid);
        if (message) {
          return message;
        }
      }
    }
    return null;
  }

  private async getAllConversations(): Promise<Array<{ conversation_uuid: string, messages: ChatCompletionMessageParam[] }>> {
    const conversations = [];
    const threadsDir = path.join(this.rootDir, 'threads');
    const dateDirs = await fs.readdir(threadsDir, { withFileTypes: true });

    for (const dateDir of dateDirs) {
      if (dateDir.isDirectory()) {
        const datePath = path.join(threadsDir, dateDir.name);
        const files = await fs.readdir(datePath, { withFileTypes: true });

        for (const file of files) {
          if (file.isFile() && path.extname(file.name) === '.md') {
            const filePath = path.join(datePath, file.name);
            try {
              const { metadata } = await this.readFile(filePath);
              if (metadata.conversation_uuid && Array.isArray(metadata.messages)) {
                conversations.push({
                  conversation_uuid: metadata.conversation_uuid,
                  messages: metadata.messages
                });
              }
            } catch (error) {
              console.error(`Error reading conversation file: ${filePath}`, error);
            }
          }
        }
      }
    }
    return conversations;
  }
}
