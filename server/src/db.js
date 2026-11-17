/* =====================================================================
 * db.js — the SQLite connection and the small query helpers.
 *
 * node:sqlite ships with Node, so the server has no native dependency to build
 * on a deploy host. Every statement is prepared per call (SQLite caches them
 * internally) and every write that touches more than one row goes through
 * tx(), which is what makes "deduct currency + write a transaction" atomic.
 * ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";
import { SCHEMA, SCHEMA2, SCHEMA3, SCHEMA4 } from "./schema.js";

const file = config.databaseFile;
if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });

export const db = new DatabaseSync(file);

db.exec("PRAGMA foreign_keys = ON");
if (file !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA busy_timeout = 5000");

/* ------------------------------------------------------------------ schema */
db.exec(SCHEMA);
db.exec(SCHEMA2);
db.exec(SCHEMA3);
db.exec(SCHEMA4);

const version = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get();
if (!version) {
    db.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', '1')").run();
}

/* ----------------------------------------------------------------- helpers */
export function all(sql, params = []) {
    return db.prepare(sql).all(...params);
}

export function get(sql, params = []) {
    return db.prepare(sql).get(...params) || null;
}

export function run(sql, params = []) {
    const info = db.prepare(sql).run(...params);
    return { changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) };
}

/* Nested calls are real here: an inner tx() becomes a savepoint, so a module
 * can call another module's transactional helper safely. */
let depth = 0;
export function tx(fn) {
    const savepoint = "sp" + depth;
    db.exec(depth === 0 ? "BEGIN IMMEDIATE" : "SAVEPOINT " + savepoint);
    depth += 1;
    try {
        const result = fn();
        depth -= 1;
        db.exec(depth === 0 ? "COMMIT" : "RELEASE " + savepoint);
        return result;
    } catch (error) {
        depth -= 1;
        try {
            db.exec(depth === 0 ? "ROLLBACK" : "ROLLBACK TO " + savepoint);
            if (depth > 0) db.exec("RELEASE " + savepoint);
        } catch {
            /* the transaction is already gone; the original error matters more */
        }
        throw error;
    }
}

export function meta(key, fallback = null) {
    const row = get("SELECT value FROM meta WHERE key = ?", [key]);
    return row ? row.value : fallback;
}

export function setMeta(key, value) {
    run(
        "INSERT INTO meta (key, value) VALUES (?, ?) " +
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, String(value)]
    );
}

/* ------------------------------------------------------------- seed content
 * The achievement catalogue is part of the game's rules, not user content, so
 * it is seeded once. `stat` names a profiles counter; the claim route compares
 * the two, which is why a client cannot invent an unlocked achievement. */
const ACHIEVEMENTS = [
    ["first_jump", "Jump!", "Jump for the first time.", "jumps", 1, 0, "diamonds", 1],
    ["jump_1000", "Jumping Jack", "Jump 1,000 times.", "jumps", 1000, 5, "diamonds", 5],
    ["attempt_100", "Persistent", "Make 100 attempts.", "attempts", 100, 5, "diamonds", 3],
    ["attempt_1000", "Unstoppable", "Make 1,000 attempts.", "attempts", 1000, 10, "diamonds", 10],
    ["complete_1", "First Steps", "Complete a level.", "levels_completed", 1, 5, "stars", 1],
    ["complete_10", "Getting Somewhere", "Complete 10 levels.", "levels_completed", 10, 10, "stars", 5],
    ["complete_50", "Level Veteran", "Complete 50 levels.", "levels_completed", 50, 20, "stars", 15],
    ["demon_1", "Demon Slayer", "Complete a demon.", "demons_completed", 1, 20, "diamonds", 10],
    ["demon_5", "Demon Hunter", "Complete 5 demons.", "demons_completed", 5, 30, "diamonds", 25],
    ["creator_1", "Creator", "Upload a level.", "levels_uploaded", 1, 5, "diamonds", 5],
    ["creator_5", "Prolific", "Upload 5 levels.", "levels_uploaded", 5, 15, "diamonds", 15],
    ["likes_10", "Well Liked", "Receive 10 likes on your levels.", "likes_received", 10, 10, "diamonds", 10]
];

export function seed() {
    const insert = db.prepare(
        "INSERT OR IGNORE INTO achievements " +
            "(id, name, description, stat, target, points, reward_currency, reward_amount) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    for (const row of ACHIEVEMENTS) insert.run(...row);
}

seed();
