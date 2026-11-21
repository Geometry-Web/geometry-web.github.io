// SQLite database setup (node:sqlite, synchronous). Schema + migration hook.

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function openDb(dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'gdr.db')) {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      stars INTEGER NOT NULL DEFAULT 0,
      diamonds INTEGER NOT NULL DEFAULT 0,
      user_coins INTEGER NOT NULL DEFAULT 0,
      creator_points INTEGER NOT NULL DEFAULT 0,
      icon INTEGER NOT NULL DEFAULT 1,
      color1 INTEGER NOT NULL DEFAULT 0,
      color2 INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS levels (
      id TEXT PRIMARY KEY,
      owner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL DEFAULT 'normal',
      visibility TEXT NOT NULL DEFAULT 'private',
      data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      downloads INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS level_permissions (
      level_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      can_view INTEGER NOT NULL DEFAULT 0,
      can_play INTEGER NOT NULL DEFAULT 0,
      can_comment INTEGER NOT NULL DEFAULT 0,
      can_copy INTEGER NOT NULL DEFAULT 0,
      can_edit INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (level_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS share_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id TEXT NOT NULL,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      permissions TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}
