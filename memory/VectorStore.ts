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

  async search(vector: number[], k: number): Promise<Array<{ id: string; similarity: number }>> {
    try {
      const normalizedVector = this.normalizeVector(vector);
      const totalVectors = this.index.ntotal();
      if (totalVectors === 0) {
        return [];
      }
      const actualK = Math.min(k, totalVectors);
      const { distances, labels } = this.index.search(normalizedVector, actualK);
      
      const results = labels.map((label, index) => ({
        id: this.metadata.get(label) || '',
        similarity: distances[index]
      }));


      console.log(`Total results: ${results.length}`);

      // Calculate average similarity
      const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;

      // Filter results with at least 80% of average similarity
      const threshold = avgSimilarity * 0.8;
      const filteredResults = results.filter(r => r.similarity >= threshold);

      console.log(`Filtered results: ${filteredResults.length}`);

      return filteredResults;
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
    const normalizedEmbedding = this.normalizeVector(embedding);
    const existingIndex = Array.from(this.metadata.entries()).find(([_, value]) => value === id)?.[0];
    if (existingIndex !== undefined) {
      // Remove the existing vector
      this.index.removeIds([existingIndex]); // Changed from remove_ids to removeIds
      // Add the new vector
      this.index.add(normalizedEmbedding);
      // Update the metadata
      this.metadata.set(this.index.ntotal() - 1, id);
    } else {
      this.add(normalizedEmbedding, id);
    }
  }
}