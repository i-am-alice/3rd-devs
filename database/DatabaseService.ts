import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

// Define the messages table
const messages = sqliteTable('messages', {
  id: integer('id').primaryKey(),
  uuid: text('uuid').notNull(),
  conversation_id: text('conversation_id').notNull(),
  content: text('content').notNull(),
  name: text('name'),
  role: text('role').notNull(),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export class DatabaseService {
  private db;

  constructor(dbPath: string = 'database/database.db') {
    const sqlite = new Database(dbPath);
    this.db = drizzle(sqlite);
    this.initializeDatabase();
  }

  private initializeDatabase() {
    this.db.run(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        content TEXT NOT NULL,
        name TEXT,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async insertMessage(message: {
    uuid: string;
    conversation_id: string;
    content: string;
    name?: string;
    role: string;
  }) {
    return this.db.insert(messages).values(message).run();
  }

  async getMessagesByConversationId(conversation_id: string) {
    return this.db.select().from(messages).where(sql`conversation_id = ${conversation_id}`).all();
  }

  async getMessageByUuid(uuid: string) {
    return this.db.select().from(messages).where(sql`uuid = ${uuid}`).get();
  }

  async updateMessage(uuid: string, content: string) {
    return this.db.update(messages)
      .set({ content, updated_at: sql`CURRENT_TIMESTAMP` })
      .where(sql`uuid = ${uuid}`)
      .run();
  }

  async deleteMessage(uuid: string) {
    return this.db.delete(messages).where(sql`uuid = ${uuid}`).run();
  }
}
