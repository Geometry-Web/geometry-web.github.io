// Persistence: localStorage for settings, IndexedDB for levels.

import { type LevelData } from '../levels/Level';

const DB_NAME = 'gdr-storage';
const LEVELS_STORE = 'levels';

export class Storage {
  private prefix: string;

  constructor(prefix = 'gdr:') {
    this.prefix = prefix;
  }

  // ---- settings (synchronous, localStorage) ----

  getSetting<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  setSetting<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      // storage full or unavailable — ignore
    }
  }

  removeSetting(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      // ignore
    }
  }

  // ---- levels (asynchronous, IndexedDB) ----

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(LEVELS_STORE)) {
          db.createObjectStore(LEVELS_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveLevel(level: LevelData): Promise<void> {
    const db = await this.openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(LEVELS_STORE, 'readwrite');
        tx.objectStore(LEVELS_STORE).put(level);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  async loadLevel(id: string): Promise<LevelData | null> {
    const db = await this.openDb();
    try {
      return await new Promise<LevelData | null>((resolve, reject) => {
        const tx = db.transaction(LEVELS_STORE, 'readonly');
        const req = tx.objectStore(LEVELS_STORE).get(id);
        req.onsuccess = () => resolve((req.result as LevelData) ?? null);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  }

  async listLevels(): Promise<LevelData[]> {
    const db = await this.openDb();
    try {
      return await new Promise<LevelData[]>((resolve, reject) => {
        const tx = db.transaction(LEVELS_STORE, 'readonly');
        const req = tx.objectStore(LEVELS_STORE).getAll();
        req.onsuccess = () => resolve(req.result as LevelData[]);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  }

  async deleteLevel(id: string): Promise<void> {
    const db = await this.openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(LEVELS_STORE, 'readwrite');
        tx.objectStore(LEVELS_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }
}
