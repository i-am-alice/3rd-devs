import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import yaml from 'js-yaml';
import type { OpenAIService } from './OpenAIService';
import { VectorStore } from './VectorStore';
import { LangfuseService } from './LangfuseService';
import { LangfuseTraceClient } from 'langfuse';
import { execSync } from 'child_process';

export interface Memory {
  uuid: string;
  category: string;
  subcategory: string;
  name: string;
  content: {
    text: string;
    [key: string]: any;
  };
  metadata: {
    confidence?: number;
    location?: {
      city?: string;
      address?: string;
    };
    source?: string;
    urls?: string[];
    tags?: string[];
    priority?: string;
    source_type?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export type LearnMemory = Pick<Memory, 'category' | 'subcategory' | 'name' | 'content'> & {
  metadata: Pick<Memory['metadata'], 'confidence' | 'urls' | 'tags'>;
};

export class MemoryService {
  private baseDir: string;
  private indexFile: string;
  private openaiService: OpenAIService;
  private vectorStore: VectorStore;
  private langfuseService: LangfuseService;

  constructor(baseDir: string = 'memory/memories', openaiService: OpenAIService, langfuseService: LangfuseService) {
    this.openaiService = openaiService;
    this.baseDir = baseDir;
    this.indexFile = path.join(this.baseDir, 'index.jsonl');
    this.vectorStore = new VectorStore(3072, this.baseDir); // Changed to 3072 for text-embedding-3-large
    this.vectorStore.load();
    this.ensureDirectories().catch(console.error);
    this.langfuseService = langfuseService;
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  private async ensureDirectories(): Promise<void> {
    const categories = ['profiles', 'preferences', 'resources', 'events', 'locations', 'environment'];
    const subcategories = {
      profiles: ['basic', 'work', 'development', 'relationships'],
      preferences: ['hobbies', 'interests'],
      resources: ['books', 'movies', 'music', 'videos', 'images', 'apps', 'devices', 'courses', 'articles', 'communities', 'channels', 'documents', 'notepad'],
      events: ['personal', 'professional'],
      locations: ['places', 'favorites'],
      environment: ['current']
    };

    for (const category of categories) {
      await this.ensureDirectoryExists(path.join(this.baseDir, category));
      for (const subcategory of subcategories[category as keyof typeof subcategories]) {
        await this.ensureDirectoryExists(path.join(this.baseDir, category, subcategory));
      }
    }
  }

  private async appendToIndex(memory: Memory): Promise<void> {
    const indexEntry = JSON.stringify(memory) + '\n';
    await fs.appendFile(this.indexFile, indexEntry);
  }

  private jsonToMarkdown(memory: Memory): string {
    const { content, ...frontmatterData } = memory;
    const yamlFrontmatter = yaml.dump(frontmatterData, {
      skipInvalid: true,
      forceQuotes: true,
    });

    let markdownContent = `---\n${yamlFrontmatter}---\n\n${content.text}`;

    // Add hashtags at the end of the file
    if (frontmatterData.metadata?.tags && frontmatterData.metadata.tags.length > 0) {
      markdownContent += '\n\n';
      markdownContent += frontmatterData.metadata.tags.map(tag => `#${tag.replace(/\s/g, '_')}`).join(' ');
    }

    return markdownContent;
  }

  private markdownToJson(markdown: string): Memory {
    const [, frontmatter, content] = markdown.split('---');
    const data = yaml.load(frontmatter.trim()) as Memory;

    // Split content into main text and hashtags
    const [mainContent, ...hashtagParts] = content.trim().split('\n\n');
    const hashtags = hashtagParts.join('\n\n').trim();

    // Ensure tags in metadata match those at the end of the file
    if (hashtags) {
      const tagsFromContent = hashtags.split(' ').map(tag => tag.replace('#', '').replace(/_/g, ' '));
      data.metadata.tags = [...new Set([...(data.metadata.tags || []), ...tagsFromContent])];
    }

    return {
      ...data,
      content: { 
        text: mainContent,
        hashtags: hashtags // Store hashtags separately if needed
      }
    };
  }

  private getMemoryFilePath(memory: Memory): string {
    const slugifiedName = slugify(memory.name, { lower: true, strict: true });
    return path.join(this.baseDir, 
      slugify(memory.category, { lower: true }), 
      slugify(memory.subcategory, { lower: true }),
      `${slugifiedName}.md`
    );
  }

  async createMemory(memory: Omit<Memory, 'uuid' | 'created_at' | 'updated_at'>, trace: LangfuseTraceClient): Promise<Memory> {
    const newMemory: Memory = {
      ...memory,
      uuid: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const embedding = await this.openaiService.createEmbedding(newMemory.content.text);

      // Add the embedding to the vector store
      this.vectorStore.add(embedding, newMemory.uuid);

      const dir = path.join(this.baseDir, 
        slugify(newMemory.category, { lower: true }), 
        slugify(newMemory.subcategory, { lower: true })
      );
      await this.ensureDirectoryExists(dir);

      const filePath = this.getMemoryFilePath(newMemory);
      const markdownContent = this.jsonToMarkdown(newMemory);

      await fs.writeFile(filePath, markdownContent);
      await this.appendToIndex(newMemory);

      this.langfuseService.createEvent(trace, "CreateMemory", memory, newMemory);
      return newMemory;
    } catch (error) {
      throw error;
    }
  }

  async getMemory(uuid: string): Promise<Memory | null> {
    const indexContent = await fs.readFile(this.indexFile, 'utf-8');
    const memories = indexContent
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line));

    const memory = memories.find(m => m.uuid === uuid);
    if (!memory) return null;

    const filePath = this.getMemoryFilePath(memory);

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return this.markdownToJson(fileContent);
    } catch (error) {
      console.error('Error reading memory file:', error);
      return null;
    }
  }

  async updateMemory(memory: Memory, trace: LangfuseTraceClient): Promise<Memory> {
    const updatedMemory = { ...memory, updated_at: new Date().toISOString() };
    const filePath = this.getMemoryFilePath(updatedMemory);

    const markdownContent = this.jsonToMarkdown(updatedMemory);
    await fs.writeFile(filePath, markdownContent);

    // Update the embedding if the content has changed
    const oldMemory = await this.getMemory(memory.uuid);
    if (oldMemory && oldMemory.content.text !== updatedMemory.content.text) {
      const newEmbedding = await this.openaiService.createEmbedding(updatedMemory.content.text);
      this.vectorStore.update(newEmbedding, updatedMemory.uuid);
    }

    // Update index file
    const indexContent = await fs.readFile(this.indexFile, 'utf-8');
    const updatedIndex = indexContent
      .split('\n')
      .map(line => {
        if (line.trim() === '') return line;
        const indexedMemory = JSON.parse(line);
        return indexedMemory.uuid === updatedMemory.uuid ? JSON.stringify(updatedMemory) : line;
      })
      .join('\n');
    await fs.writeFile(this.indexFile, updatedIndex);

    return updatedMemory;
  }

  async searchMemories(query: string): Promise<Memory[]> {
    const indexContent = await fs.readFile(this.indexFile, 'utf-8');
    const memories = indexContent
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line));

    // Simple search implementation; consider using a more advanced search algorithm for production
    return memories.filter(memory => 
      memory.name.toLowerCase().includes(query.toLowerCase()) ||
      memory.content.text.toLowerCase().includes(query.toLowerCase())
    );
  }

  async searchSimilarMemories(query: string, k: number = 15): Promise<Array<Memory & { similarity: number }>> {
    const queryEmbedding = await this.openaiService.createEmbedding(query);
    const similarResults = await this.vectorStore.search(queryEmbedding, k);
    if (similarResults.length === 0) {
      console.log('No similar memories found.');
      return [];
    }
    const memories = await Promise.all(similarResults.map(result => this.getMemory(result.id)));
    return memories.filter((m): m is Memory => m !== null)
      .map((memory, index) => ({
        ...memory,
        similarity: similarResults[index].similarity
      }));
  }

  async deleteMemory(uuid: string): Promise<boolean> {
    const memory = await this.getMemory(uuid);
    if (!memory) return false;

    const filePath = this.getMemoryFilePath(memory);

    try {
      // Delete the memory file
      await fs.unlink(filePath);

      // Update the index file
      const indexContent = await fs.readFile(this.indexFile, 'utf-8');
      const updatedIndex = indexContent
        .split('\n')
        .filter(line => {
          if (line.trim() === '') return false;
          const indexedMemory = JSON.parse(line);
          return indexedMemory.uuid !== uuid;
        })
        .join('\n');
      await fs.writeFile(this.indexFile, updatedIndex);

      return true;
    } catch (error) {
      console.error('Error deleting memory:', error);
      return false;
    }
  }

  async recall(queries: string[], trace: LangfuseTraceClient): Promise<string> {
    try {
      const recalledMemories = await Promise.all(queries.map(query => 
        this.searchSimilarMemories(query)
      ));

      const uniqueMemories = Array.from(
        new Map(recalledMemories.flat().map(memory => [memory.uuid, memory]))
      ).map(([_, memory]) => memory);

      let result = '<recalled_memories>No relevant memories found.</recalled_memories>';

      if (uniqueMemories.length) {
        const formattedMemories = uniqueMemories.map(this.formatMemory).join('\n');
        result = `<recalled_memories>\n${formattedMemories}</recalled_memories>`;
      }

      this.langfuseService.createEvent(trace, "Recall memories", queries, result);
      console.log('Recalled memories:', result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResult = `<recalled_memories>Error: ${errorMessage}</recalled_memories>`;
      
      this.langfuseService.createEvent(trace, "Recalling memories failed", {
        input: queries,
        output: errorResult,
        error: errorMessage
      });
      
      throw error;
    }
  }

  private formatMemory(memory: Memory): string {
    const urls = memory.metadata?.urls && memory.metadata.urls.length > 0 ? `\nURLs: ${memory.metadata.urls.join(', ')}` : '';
    return `<memory uuid="${memory.uuid}" name="${memory.name}" category="${memory.category}" subcategory="${memory.subcategory}" lastmodified="${memory.updated_at}">${memory.content.text}${urls}</memory>`;
  }

  async syncMemories(trace: LangfuseTraceClient): Promise<{ added: string[], modified: string[], deleted: string[] }> {
    const gitDiff = this.getGitDiff();
    const changes = this.parseGitDiff(gitDiff);

    console.log(changes);
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    for (const file of changes.added) {
      const memory = await this.addMemoryFromFile(file);
      if (memory) added.push(memory.uuid);
    }

    for (const file of changes.modified) {
        console.log('Updating file', file)
      const memory = await this.updateMemoryFromFile(file);
      if (memory) modified.push(memory.uuid);
    }

    for (const file of changes.deleted) {
      const success = await this.deleteMemoryByFile(file);
      if (success) deleted.push(file);
    }

    this.langfuseService.createEvent(trace, "SyncMemories", { added, modified, deleted });
    return { added, modified, deleted };
  }

  private getGitDiff(): string {
    const command = 'git diff --name-status HEAD';
    return execSync(command, { cwd: path.join(this.baseDir) }).toString();
  }

  private parseGitDiff(diff: string): { added: string[], modified: string[], deleted: string[] } {
    const lines = diff.split('\n');
    const changes = { added: [], modified: [], deleted: [] };

    for (const line of lines) {
      const [status, file] = line.split('\t');
      if (!file || !file.endsWith('.md')) continue;

      if (status === 'A') changes.added.push(file);
      else if (status === 'M') changes.modified.push(file);
      else if (status === 'D') changes.deleted.push(file);
    }

    return changes;
  }

  private async addMemoryFromFile(file: string): Promise<Memory | null> {
    const filePath = path.join(this.baseDir, 'memories', file);
    const content = await fs.readFile(filePath, 'utf-8');
    const memory = this.markdownToJson(content);
    return this.createMemory(memory, {} as LangfuseTraceClient); // Note: We need to handle the trace properly here
  }

  private async updateMemoryFromFile(file: string): Promise<Memory | null> {
    const filePath = path.join(this.baseDir, 'memories', file);
    const content = await fs.readFile(filePath, 'utf-8');
    const updatedMemory = this.markdownToJson(content);
    return this.updateMemory(updatedMemory, {} as LangfuseTraceClient); // Note: We need to handle the trace properly here
  }

  private async deleteMemoryByFile(file: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, 'memories', file);
    const content = await fs.readFile(filePath, 'utf-8');
    const memory = this.markdownToJson(content);
    return this.deleteMemory(memory.uuid);
  }
}