import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { MIGRATIONS, SCHEMA } from "./schema";

const globalForDb = globalThis as unknown as { __tddDb?: DatabaseSync };

/** Одно соединение на процесс. В dev переживает hot reload через globalThis. */
export function getDb(): DatabaseSync {
  if (globalForDb.__tddDb) return globalForDb.__tddDb;
  const dbPath =
    process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  migrate(db);
  globalForDb.__tddDb = db;
  return db;
}

function hasColumn(db: DatabaseSync, table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === column);
}

/** Применяет миграции, которых ещё нет в таблице migrations. Колоночные миграции пропускаются,
 *  если колонка уже есть (база создана свежей схемой). */
function migrate(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const applied = new Set((db.prepare("SELECT name FROM migrations").all() as { name: string }[]).map((r) => r.name));
  for (const m of MIGRATIONS) {
    if (applied.has(m.name)) continue;
    const alter = /ALTER TABLE (\w+) ADD COLUMN (\w+)/.exec(m.sql);
    const alreadyThere = alter ? hasColumn(db, alter[1], alter[2]) : m.name === "flashcards_card_index" && hasColumn(db, "flashcards", "card_index");
    if (!alreadyThere) db.exec(m.sql);
    db.prepare("INSERT INTO migrations (name, applied_at) VALUES (?, ?)").run(m.name, new Date().toISOString());
  }
}
