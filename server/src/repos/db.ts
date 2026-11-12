import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.join(currentDir, "migrations", "001_init.sql"),
    path.resolve(currentDir, "../../../src/repos/migrations/001_init.sql"),
    path.resolve(process.cwd(), "server/src/repos/migrations/001_init.sql"),
    path.resolve(process.cwd(), "src/repos/migrations/001_init.sql")
  ];

  const migrationPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!migrationPath) {
    throw new Error(`Migration 001_init.sql not found in candidate paths: ${candidatePaths.join(", ")}`);
  }
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

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
