import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema";

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
  globalForDb.__tddDb = db;
  return db;
}
