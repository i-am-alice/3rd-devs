import path from 'path';
import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { existsSync } from 'fs';
import { SearchService } from './SearchService';
import { VectorService } from './VectorService';
import type { IDoc } from './TextService';

const documents = sqliteTable('documents', {
  id: integer('id').primaryKey(),
  uuid: text('uuid').notNull().unique(),
  source_uuid: text('source_uuid').notNull(),
  text: text('text').notNull(),
  metadata: text('metadata').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export class DatabaseService {
  private db;
  private searchService: SearchService;
  private vectorService: VectorService;

  constructor(
    dbPath: string = 'hybrid/database.db',
    searchService: SearchService,
    vectorService: VectorService
  ) {
    const absolutePath = path.resolve(dbPath);
    console.log(`Using database at: ${absolutePath}`);

    const dbExists = existsSync(absolutePath);
    const sqlite = new Database(absolutePath);
    this.db = drizzle(sqlite);

    this.searchService = searchService;
    this.vectorService = vectorService;

    if (!dbExists) {
      console.log('Database does not exist. Initializing...');
      this.initializeDatabase();
    } else {
      console.log('Database already exists. Checking for updates...');
      this.initializeDatabase();
    }
  }

  private initializeDatabase() {
    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        source_uuid TEXT NOT NULL,
        text TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create full-text search virtual table
    this.db.run(sql`
      CREATE VIRTUAL TABLE IF NOT EXISTS documents_search USING fts5(
        text, metadata,
        tokenize='porter unicode61'
      );
    `);

    // Create triggers to keep the search index updated
    this.db.run(sql`
      CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
        INSERT INTO documents_search(rowid, text, metadata)
        VALUES (new.id, new.text, new.metadata);
      END;
    `);

    this.db.run(sql`
      CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
        DELETE FROM documents_search WHERE rowid = old.id;
      END;
    `);

    this.db.run(sql`
      CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
        UPDATE documents_search
        SET text = new.text,
            metadata = new.metadata
        WHERE rowid = old.id;
      END;
    `);
  }

  async insertDocument(document: IDoc, forSearch: boolean = false) {
    const result = await this.db
      .insert(documents)
      .values({
        uuid: document?.metadata?.uuid || '',
        source_uuid: document?.metadata?.source_uuid || '',
        text: document.text,
        metadata: JSON.stringify(document.metadata),
        created_at: sql`CURRENT_TIMESTAMP`,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .run();

    if (forSearch) {
      // Sync to Algolia
      await this.searchService.saveObject('documents', {
        objectID: document.metadata.uuid,
        text: document.text,
        ...document.metadata,
      });

      // Sync to Qdrant
      await this.vectorService.addPoints('documents', [
        {
          id: document.metadata.uuid,
          text: document.text,
          metadata: { text: document.text, ...document.metadata },
        },
      ]);
    }

    return result;
  }

  async updateDocument(uuid: string, document: Partial<IDoc>) {
    const result = await this.db
      .update(documents)
      .set({
        uuid: document?.metadata?.uuid,
        text: document.text,
        metadata: document.metadata ? JSON.stringify(document.metadata) : undefined,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where(sql`uuid = ${uuid}`)
      .run();

    // Sync to Algolia
    if (document.text || document.metadata) {
      await this.searchService.partialUpdateObject('documents', uuid, {
        text: document.text,
        ...document.metadata,
      });
    }

    // Sync to Qdrant
    await this.vectorService.addPoints('documents', [
      {
        id: document?.metadata?.uuid,
        text: document.text || 'no text',
        metadata: { text: document.text || 'no text', ...document.metadata },
      },
    ]);

    return result;
  }

  async deleteDocument(uuid: string) {
    const result = await this.db.delete(documents).where(sql`uuid = ${uuid}`).run();
    // Sync to Algolia
    await this.searchService.deleteObject('documents', uuid);
    // Sync to Qdrant
    await this.vectorService.deletePoint('documents', uuid);

    return result;
  }

  async getDocumentByUuid(uuid: string): Promise<IDoc | undefined> {
    const result = await this.db.select().from(documents).where(sql`uuid = ${uuid}`).get();
    if (result) {
      return {
        text: result.text,
        metadata: JSON.parse(result.metadata),
      };
    }
    return undefined;
  }

  async getDocumentsBySourceUuid(sourceUuid: string): Promise<IDoc[]> {
    const results = await this.db.select().from(documents).where(sql`source_uuid = ${sourceUuid}`).all();
    return results.map(result => ({
      uuid: result.uuid,
      text: result.text,
      metadata: JSON.parse(result.metadata),
    }));
  }

  async getAllDocuments(): Promise<IDoc[]> {
    console.log('Fetching all documents');
    const results = await this.db.select().from(documents).all();
    console.log(`Found ${results.length} documents`);
    return results.map(result => ({
      uuid: result.uuid,
      text: result.text,
      metadata: JSON.parse(result.metadata),
    }));
  }

  async hybridSearch(
    vectorSearch: { query: string; filter?: Record<string, any> },
    fulltextSearch: { query: string; filter?: Record<string, any> }
  ) {
    // Perform vector search
    const vectorResults = await this.vectorService.performSearch(
      'documents',
      vectorSearch.query,
      vectorSearch.filter,
      15
    );

    // Perform full-text search (Algolia)
    const algoliaResults = await this.searchService.searchSingleIndex(
      'documents',
      fulltextSearch.query,
      fulltextSearch.filter
    );

    // Calculate RRF scores
    const rrf = this.calculateRRF(vectorResults, algoliaResults);
    const avgScore = rrf.reduce((sum, item) => sum + item.score, 0) / rrf.length;
    const filteredRrf = rrf.filter(item => item.score >= avgScore);

    // Restructure the results
    return filteredRrf.map(({ score, vectorRank, algoliaRank, ...rest }) => ({
      ...rest,
      metadata: {
        uuid: rest.uuid,
        source_uuid: rest.source_uuid,
        ...rest.metadata
      }
    }));
  }

  private calculateRRF(vectorResults: any[], algoliaResults: any[]) {
    const resultMap = new Map();

    // Process vector results
    vectorResults.forEach((result, index) => {
      const uuid = result.uuid || result.objectID;
      resultMap.set(uuid, {
        ...result,
        vectorRank: index + 1,
        algoliaRank: Infinity,
      });
    });

    // Process Algolia results
    algoliaResults.forEach((result, index) => {
      const uuid = result.uuid || result.objectID;
      if (resultMap.has(uuid)) {
        resultMap.get(uuid).algoliaRank = index + 1;
      } else {
        resultMap.set(uuid, {
          ...result,
          vectorRank: Infinity,
          algoliaRank: index + 1,
        });
      }
    });

    // Calculate RRF scores and sort
    return Array.from(resultMap.values())
      .map((data) => ({
        ...data,
        score: (data.vectorRank !== Infinity ? 1 / (data.vectorRank + 60) : 0) +
               (data.algoliaRank !== Infinity ? 1 / (data.algoliaRank + 60) : 0),
      }))
      .sort((a, b) => b.score - a.score);
  }
}
