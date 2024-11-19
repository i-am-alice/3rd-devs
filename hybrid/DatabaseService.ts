import path from 'path';
import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { existsSync } from 'fs';
import { AlgoliaService } from './AlgoliaService';
import { VectorService } from './VectorService';
import { v4 as uuidv4 } from 'uuid';

const documents = sqliteTable('documents', {
  id: integer('id').primaryKey(),
  uuid: text('uuid').notNull().unique(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  source: text('source').notNull(),
  indexed: integer('indexed').notNull(),
  conversation_uuid: text('conversation_uuid').notNull(),
  type: text('type').notNull(),
  description: text('description'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export class DatabaseService {
  private db;
  private algoliaService: AlgoliaService;
  private vectorService: VectorService;

  constructor(
    dbPath: string = 'hybrid/database.db',
    algoliaService: AlgoliaService,
    vectorService: VectorService
  ) {
    const absolutePath = path.resolve(dbPath);
    console.log(`Using database at: ${absolutePath}`);

    const dbExists = existsSync(absolutePath);
    const sqlite = new Database(absolutePath);
    this.db = drizzle(sqlite);

    this.algoliaService = algoliaService;
    this.vectorService = vectorService;

    if (!dbExists) {
      console.log('Database does not exist. Initializing...');
      this.initializeDatabase();
    } else {
      console.log('Database already exists. Checking for updates...');
      this.initializeDatabase(); // This will add the uuid column if it doesn't exist
    }
  }

  private initializeDatabase() {

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        isbn TEXT,
        indexed INTEGER NOT NULL DEFAULT 0,
        conversation_uuid TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if uuid column exists
    try {
      this.db.get(sql`SELECT uuid FROM documents LIMIT 1`);
      console.log('UUID column already exists');
    } catch (error) {
      console.log('UUID column does not exist. Adding it now...');
      this.db.run(sql`ALTER TABLE documents ADD COLUMN uuid TEXT NOT NULL DEFAULT ''`);
    }

    // Create a unique index on the uuid column
    this.db.run(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_uuid ON documents(uuid);
    `);

    // Create full-text search virtual table
    this.db.run(sql`
      CREATE VIRTUAL TABLE IF NOT EXISTS documents_search USING fts5(
        name, content, conversation_uuid, source, type, description,
        tokenize='porter unicode61'
      );
    `);

    // Create triggers to keep the search index updated
    this.db.run(sql`
      CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
        INSERT INTO documents_search(rowid, name, content, conversation_uuid, source, type, description)
        VALUES (new.id, new.name, new.content, new.conversation_uuid, new.source, new.type, new.description);
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
        SET name = new.name,
            content = new.content,
            conversation_uuid = new.conversation_uuid,
            source = new.source,
            type = new.type,
            description = new.description
        WHERE rowid = old.id;
      END;
    `);
  }

  async insertDocument(document: {
    uuid: string;
    name: string;
    content: string;
    source: string;
    isbn?: string; // Make isbn optional
    conversation_uuid: string;
    type: string;
    description?: string;
    indexed?: boolean;
  }) {
    const { indexed = false, uuid, ...rest } = document;
    const result = await this.db
      .insert(documents)
      .values({
        ...rest,
        uuid,
        indexed: indexed ? 1 : 0,
        created_at: sql`CURRENT_TIMESTAMP`,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .run();

    // Sync to Algolia
    await this.algoliaService.saveObject('documents', {
      ...document,
      objectID: uuid,
    });

    // Sync to Qdrant
    await this.vectorService.addPoints('documents', [
      {
        id: uuid,
        text: `${document.name} (${document.isbn}): ${document.content}`,
        metadata: { ...document, uuid },
      },
    ]);

    return result;
  }

  async updateDocument(
    uuid: string,
    document: Partial<{
      name: string;
      content: string;
      source: string;
      isbn?: string; // Make isbn optional
      conversation_uuid: string;
      type: 'websearch' | 'scrapped' | 'book';
      description?: string;
      indexed?: boolean;
    }>
  ) {
    const result = await this.db
      .update(documents)
      .set({
        ...document,
        updated_at: sql`CURRENT_TIMESTAMP`,
        indexed: document.indexed ? 1 : 0,
      })
      .where(sql`uuid = ${uuid}`)
      .run();

    // Sync to Algolia
    await this.algoliaService.partialUpdateObject('documents', uuid, document);

    // Sync to Qdrant
    const updatedDoc = await this.getDocumentByUuid(uuid);
    if (updatedDoc) {
      await this.vectorService.updatePoint('documents', {
        id: uuid,
        text: `${updatedDoc.name} (${updatedDoc.isbn}): ${updatedDoc.content}`,
        metadata: updatedDoc,
      });
    }

    return result;
  }

  async deleteDocument(uuid: string) {
    const result = await this.db.delete(documents).where(sql`uuid = ${uuid}`).run();
    // Sync to Algolia
    await this.algoliaService.deleteObject('documents', uuid);
    // Sync to Qdrant
    await this.vectorService.deletePoint('documents', uuid);

    return result;
  }

  async getDocumentByUuid(uuid: string) {
    return this.db.select().from(documents).where(sql`uuid = ${uuid}`).get();
  }

  async getAllDocuments() {
    console.log('Fetching all documents');
    const result = await this.db.select().from(documents).all();
    console.log(`Found ${result.length} documents`);
    return result;
  }
}