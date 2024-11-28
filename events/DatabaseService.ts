import path from 'path';
import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { existsSync } from 'fs';
import { SearchService } from './SearchService';
import { VectorService } from './VectorService';
import type { IDoc } from './types/types';
import { generateMetadata } from './utils/metadata';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc, isNotNull, asc } from 'drizzle-orm';

const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  source_uuid: text('source_uuid').notNull(),
  conversation_uuid: text('conversation_uuid').notNull(),
  text: text('text').notNull(),
  metadata: text('metadata').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Define schema
const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  userId: text('user_id'),
  name: text('name'),
  status: text('status').default('active'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  conversation_uuid: text('conversation_uuid').notNull(), // Changed from conversation_id
  role: text('role').notNull(),
  content: text('content').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  conversation_uuid: text('conversation_uuid').references(() => conversations.uuid), // Only conversation reference
  type: text('type').notNull(),
  status: text('status').default('pending'),
  description: text('description'),
  scheduled_for: text('scheduled_for'),
  completed_at: text('completed_at'),
  result: text('result'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

const actions = sqliteTable('actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  task_uuid: text('task_uuid').references(() => tasks.uuid),  // Proper reference
  tool_uuid: text('tool_uuid').notNull().references(() => tools.uuid),  // Add proper reference
  type: text('type').notNull(),
  parameters: text('parameters'),
  sequence: integer('sequence'),
  status: text('status').default('pending'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

const tools = sqliteTable('tools', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  instruction: text('instruction'),
  parameters: text('parameters'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// New junction tables for many-to-many relationships
const actionDocuments = sqliteTable('action_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action_uuid: text('action_uuid').notNull(),
  document_uuid: text('document_uuid').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

const conversationDocuments = sqliteTable('conversation_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversation_uuid: text('conversation_uuid').notNull(),
  document_uuid: text('document_uuid').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

const messageDocuments = sqliteTable('message_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  message_uuid: text('message_uuid').notNull(),
  document_uuid: text('document_uuid').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export class DatabaseService {
  private db;
  private searchService: SearchService;
  private vectorService: VectorService;

  constructor(
    dbPath: string = 'web/database.db',
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
        conversation_uuid TEXT NOT NULL,
        text TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        user_id TEXT,
        name TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        conversation_uuid TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_uuid) REFERENCES conversations(uuid)
      )
    `);

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        conversation_uuid TEXT,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        description TEXT,
        scheduled_for TEXT,
        completed_at TEXT,
        result TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_uuid) REFERENCES conversations(uuid)
      )
    `);

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        task_uuid TEXT,
        tool_uuid TEXT NOT NULL,
        type TEXT NOT NULL,
        parameters TEXT,
        sequence INTEGER,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_uuid) REFERENCES tasks(uuid),
        FOREIGN KEY (tool_uuid) REFERENCES tools(uuid)
      )
    `);

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS tools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        instruction TEXT,
        parameters TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS action_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_uuid TEXT NOT NULL,
        document_uuid TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (action_uuid) REFERENCES actions(uuid),
        FOREIGN KEY (document_uuid) REFERENCES documents(uuid)
      )
    `);

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS conversation_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_uuid TEXT NOT NULL,
        document_uuid TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_uuid) REFERENCES conversations(uuid),
        FOREIGN KEY (document_uuid) REFERENCES documents(uuid)
      )
    `);

    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS message_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_uuid TEXT NOT NULL,
        document_uuid TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_uuid) REFERENCES messages(uuid),
        FOREIGN KEY (document_uuid) REFERENCES documents(uuid)
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

  async insertDocument(document: IDoc, forSearch: boolean = false): Promise<void> {
    const metadata = document.metadata;

    // Ensure metadata consistency
    const standardizedMetadata = generateMetadata({
      source: metadata.source || '',
      name: metadata.name || '',
      mimeType: metadata.mimeType || '',
      description: metadata.description || '',
      conversation_uuid: metadata.conversation_uuid || '',
      additional: {
        uuid: metadata.uuid,
        source_uuid: metadata.source_uuid,
        ...metadata,
      },
    });

    await this.db
      .insert(documents)
      .values({
        uuid: standardizedMetadata.uuid,
        source_uuid: standardizedMetadata.source_uuid,
        conversation_uuid: standardizedMetadata.conversation_uuid,
        text: document.text,
        metadata: JSON.stringify(standardizedMetadata),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .run();

    if (forSearch) {
      // Sync to Algolia
      await this.searchService.saveObject('documents', {
        uuid: standardizedMetadata.uuid,
        text: document.text,
        metadata: standardizedMetadata,
      });

      // Sync to Qdrant
      await this.vectorService.addPoints('documents', [{
        text: document.text,
        metadata: standardizedMetadata,
      }]);
    }
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

  async insertDocuments(documents: IDoc[], forSearch: boolean = false): Promise<void> {
    const existingDocs = await Promise.all(
      documents.map(doc => this.getDocumentByUuid(doc.metadata.uuid || ''))
    );

    const newDocs = documents.filter((doc, index) => !existingDocs[index]);

    if (newDocs.length === 0) {
      console.log('No new documents to insert');
      return;
    }

    const insertPromises = newDocs.map(doc => this.insertDocument(doc, forSearch));
    await Promise.all(insertPromises);

    console.log(`Inserted ${newDocs.length} new documents`);
  }

  async createConversation(userId: string, name: string): Promise<string> {
    const uuid = uuidv4();
    await this.db.insert(conversations).values({ uuid, userId, name }).run();
    return uuid;
  }

  async addMessage(conversationUuid: string, role: string, content: string): Promise<string> {
    const uuid = uuidv4();
    await this.db.insert(messages).values({ 
      uuid, 
      conversation_uuid: conversationUuid, // Changed from conversationId
      role, 
      content,
      // timestamp will be set automatically by SQLite
    }).run();
    return uuid;
  }

  async createTask(task: { 
    uuid: string; 
    conversation_uuid: string; 
    type: 'async' | 'sync'; 
    description: string 
  }): Promise<void> {
    await this.db.insert(tasks).values({ 
      ...task,
      status: 'pending'
    }).run();
  }

  async updateTaskStatus(taskUuid: string, status: 'pending' | 'in_progress' | 'completed' | 'failed', result?: string): Promise<void> {
    await this.db.update(tasks)
      .set({ 
        status, 
        result,
        completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(tasks.uuid, taskUuid))
      .run();
  }

  async addAction(action: { 
    uuid: string; 
    task_uuid: string;
    tool_uuid: string; // Added tool_uuid requirement
    type: string; 
    parameters: string;
  }): Promise<void> {
    await this.db.insert(actions).values({
      ...action,
      status: 'pending'
    }).run();
  }

  async updateAction(actionUuid: string, status: 'pending' | 'completed' | 'failed'): Promise<void> {
    await this.db.update(actions)
      .set({ 
        status,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(actions.uuid, actionUuid))
      .run();
  }

  async getPendingTasks(): Promise<any[]> {
    return this.db.select().from(tasks)
      .where(eq(tasks.status, 'pending'))
      .orderBy(desc(tasks.created_at))
      .all();
  }

  async getTaskActions(taskUuid: string): Promise<any[]> {
    return this.db.select().from(actions)
      .where(eq(actions.task_uuid, taskUuid))
      .orderBy(actions.sequence)
      .all();
  }

  async getConversationMessages(conversationUuid: string): Promise<any[]> {
    return await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversation_uuid, conversationUuid))
      .orderBy(asc(messages.created_at))
      .all();
  }

  async getToolById(toolId: string): Promise<any> {
    return this.db.select().from(tools)
      .where(eq(tools.id, toolId))
      .get();
  }

  async createTool(tool: { uuid: string; name: string; description: string; instruction: string; parameters: string }): Promise<void> {
    await this.db.insert(tools).values(tool).run();
  }

  async getToolByUuid(uuid: string): Promise<any> {
    return this.db.select().from(tools)
      .where(eq(tools.uuid, uuid))
      .get();
  }

  async getTaskByUuid(uuid: string): Promise<any> {
    const task = await this.db.select()
      .from(tasks)
      .where(eq(tasks.uuid, uuid))
      .get();

    if (task) {
      let tool = null;
      if (task.tool_uuid) {
        tool = await this.db.select()
          .from(tools)
          .where(eq(tools.uuid, task.tool_uuid))
          .get();
      }

      const taskActions = await this.db.select()
        .from(actions)
        .where(eq(actions.task_uuid, task.uuid))
        .all();

      return {
        ...task,
        tool,
        actions: taskActions
      };
    }

    return null;
  }

  // New methods for handling document relationships
  async linkDocumentToAction(actionUuid: string, documentUuid: string): Promise<void> {
    await this.db.insert(actionDocuments)
      .values({ action_uuid: actionUuid, document_uuid: documentUuid })
      .run();
  }

  async linkDocumentToConversation(conversationUuid: string, documentUuid: string): Promise<void> {
    await this.db.insert(conversationDocuments)
      .values({ conversation_uuid: conversationUuid, document_uuid: documentUuid })
      .run();
  }

  async linkDocumentToMessage(messageUuid: string, documentUuid: string): Promise<void> {
    await this.db.insert(messageDocuments)
      .values({ message_uuid: messageUuid, document_uuid: documentUuid })
      .run();
  }
}
