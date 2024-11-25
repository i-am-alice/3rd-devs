import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { OpenAIService } from './OpenAIService';

export class VectorService {
  private client: QdrantClient;
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY!,
    });
    this.openAIService = openAIService;
  }

  async ensureCollection(name: string) {
    const collections = await this.client.getCollections();
    if (!collections.collections.some(c => c.name === name)) {
      await this.client.createCollection(name, {
        vectors: { size: 3072, distance: "Cosine" }
      });
    }
  }

  async addPoints(
    collectionName: string,
    points: Array<{
      id?: string;
      text: string;
      metadata?: Record<string, any>;
    }>
  ) {
    await this.ensureCollection(collectionName);

    const pointsToUpsert = await Promise.all(
      points.map(async point => {
        const embedding = await this.openAIService.createEmbedding(point.text);
        return {
          id: point.id || uuidv4(),
          vector: embedding,
          payload: {
            text: point.text,
            ...point.metadata,
          },
        };
      })
    );

    await this.client.upsert(collectionName, {
      wait: true,
      points: pointsToUpsert,
    });
  }

  async updatePoint(
    collectionName: string,
    point: {
      id: string;
      text: string;
      metadata?: Record<string, any>;
    }
  ) {
    await this.addPoints(collectionName, [point]);
  }

  async deletePoint(collectionName: string, id: string) {
    await this.client.delete(collectionName, {
      wait: true,
      points: [id],
    });
  }

  async performSearch(
    collectionName: string,
    query: string,
    filter: Record<string, any> = {},
    limit: number = 5
  ) {
    const queryEmbedding = await this.openAIService.createEmbedding(query);
    const results = await this.client.search(collectionName, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
      filter,
    });

    // Transform Qdrant results to match document structure
    return results.map(result => ({
      text: result.payload?.text,
      metadata: result.payload,
    }));
  }

  async getAllPoints(collectionName: string) {
    const points: any[] = [];
    let hasMore = true;
    let offset = undefined;

    while (hasMore) {
      const response = await this.client.scroll(collectionName, {
        limit: 100,
        offset,
        with_payload: true,
      });

      points.push(...response.points);

      if (response.next_page_offset !== null && response.next_page_offset !== undefined) {
        offset = response.next_page_offset;
      } else {
        hasMore = false;
      }
    }

    return points;
  }
}