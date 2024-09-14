import { IndexFlatIP } from 'faiss-node';
import fs from 'fs/promises';
import path from 'path';

export class VectorStore {
  private index: IndexFlatIP;
  private metadata: Map<number, string>;
  private indexPath: string;
  private metadataPath: string;
  private storagePath: string;

  constructor(dimension: number, storagePath: string) {
    this.index = new IndexFlatIP(dimension);
    this.metadata = new Map();
    this.storagePath = storagePath;
    this.indexPath = path.join(storagePath, 'vector_index.faiss');
    this.metadataPath = path.join(storagePath, 'vector_metadata.json');
    this.ensureStorageDirectory().catch(console.error);
  }

  private async ensureStorageDirectory(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  async add(vector: number[], id: string): Promise<void> {
    try {
      const normalizedVector = this.normalizeVector(vector);
      const index = this.index.ntotal();
      this.index.add(normalizedVector);
      this.metadata.set(index, id);
      await this.save();
    } catch (error) {
      console.error('Error adding vector:', error);
      throw error;
    }
  }

  async search(vector: number[], k: number): Promise<string[]> {
    try {
      const normalizedVector = this.normalizeVector(vector);
      const totalVectors = this.index.ntotal();
      if (totalVectors === 0) {
        return [];
      }
      const actualK = Math.min(k, totalVectors);
      const { labels } = this.index.search(normalizedVector, actualK);
      return labels.map(label => this.metadata.get(label) || '');
    } catch (error) {
      console.error('Error searching vectors:', error);
      return [];
    }
  }

  private async save(): Promise<void> {
    try {
      await this.index.write(this.indexPath);
      await fs.writeFile(this.metadataPath, JSON.stringify(Array.from(this.metadata.entries())));
    } catch (error) {
      console.error('Error saving index and metadata:', error);
      throw error;
    }
  }

  async load(): Promise<void> {
    try {
      await this.ensureStorageDirectory();
      if (await fs.access(this.indexPath).then(() => true).catch(() => false)) {
        this.index = await IndexFlatIP.read(this.indexPath);
        const metadataContent = await fs.readFile(this.metadataPath, 'utf-8');
        this.metadata = new Map(JSON.parse(metadataContent));
      }
    } catch (error) {
      console.error('Error loading index and metadata:', error);
      throw error;
    }
  }


  update(embedding: number[], id: string): void {
    const index = this.ids.indexOf(id);
    if (index !== -1) {
      this.embeddings[index] = embedding;
    } else {
      this.add(embedding, id);
    }
  }
}