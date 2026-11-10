import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
import { logger } from "../observability/logger.js";

export interface StatementSync {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown | undefined;
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
}

export interface DatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): StatementSync;
  close?(): void;
}

const require = createRequire(import.meta.url);
const { DatabaseSync: SQLiteDatabase } = require("node:sqlite") as {
  DatabaseSync: new (path: string) => DatabaseSync;
};

let dbInstance: DatabaseSync | null = null;

export const initDb = (dbPath: string = env.DATABASE_PATH): DatabaseSync => {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new SQLiteDatabase(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  const migrationPath = path.join(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
    "migrations",
    "001_init.sql"
  );

  let migrationSql = "";
  if (fs.existsSync(migrationPath)) {
    migrationSql = fs.readFileSync(migrationPath, "utf-8");
  } else {
    const altPath = path.resolve(process.cwd(), "server/src/repos/migrations/001_init.sql");
    migrationSql = fs.readFileSync(altPath, "utf-8");
  }

  db.exec(migrationSql);
  logger.info({ dbPath }, "Native Node SQLite database initialized with migrations");
  dbInstance = db;
  return db;
};

export const getDb = (): DatabaseSync => {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
};
