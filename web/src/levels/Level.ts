import { ObjId } from '../gameplay/GameModes';

// Versioned level data model and schema validation.
// A level is plain JSON so it can be saved/loaded/imported/exported and stored
// in IndexedDB or on the server without code changes.

export interface LevelObject {
  /** Object type id (see ObjId). */
  id: number;
  x: number;
  y: number;
  /** Rotation in degrees, clockwise. */
  rotation?: number;
  layer?: number;
  /** Uniform scale (default 1). */
  scale?: number;
  /** Group ids (reserved for triggers). */
  groups?: number[];
  /** Arbitrary extra properties (colors, trigger params, etc.). */
  props?: Record<string, string | number>;
}

export type Difficulty = 'easy' | 'normal' | 'hard' | 'insane' | 'demon';

export interface LevelData {
  /** Format version, for future migrations. */
  schemaVersion: 1;
  /** Globally unique id (server) or local id. */
  id: string;
  name: string;
  description: string;
  creator: string;
  difficulty: Difficulty;
  /** Starting speed multiplier index (default 1 = normal). */
  startSpeed: number;
  /** Optional song id. */
  songId?: string;
  objects: LevelObject[];
  /** Timestamps (ms epoch). */
  createdAt: number;
  updatedAt: number;
}

export const LEVEL_SCHEMA_VERSION = 1;

export function createEmptyLevel(name: string, creator: string): LevelData {
  const now = Date.now();
  return {
    schemaVersion: LEVEL_SCHEMA_VERSION,
    id: `local-${now.toString(36)}`,
    name,
    description: '',
    creator,
    difficulty: 'normal',
    startSpeed: 1,
    objects: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validates a parsed level and returns a list of human-readable problems.
 * An empty array means the level is valid.
 */
export function validateLevel(data: unknown): string[] {
  const problems: string[] = [];
  if (typeof data !== 'object' || data === null) {
    return ['level is not an object'];
  }
  const l = data as Partial<LevelData>;

  if (l.schemaVersion !== LEVEL_SCHEMA_VERSION) {
    problems.push(`unsupported schemaVersion: ${l.schemaVersion}`);
  }
  if (typeof l.name !== 'string' || l.name.trim().length === 0) {
    problems.push('name is required');
  }
  if (typeof l.id !== 'string' || !l.id.trim()) problems.push('id is required');
  if (typeof l.startSpeed !== 'number' || !Number.isFinite(l.startSpeed) || l.startSpeed <= 0 || l.startSpeed > 5) problems.push('startSpeed must be between 0 and 5');
  if (!Array.isArray(l.objects)) {
    problems.push('objects must be an array');
    return problems;
  }
  for (let i = 0; i < l.objects.length; i++) {
    const o = l.objects[i];
    if (typeof o !== 'object' || o === null) {
      problems.push(`objects[${i}] is not an object`);
      continue;
    }
    if (!Number.isInteger(o.id) || !ObjId[o.id]) problems.push('Unknown object type at index ' + i);
    if (o.scale !== undefined && (!Number.isFinite(o.scale) || o.scale <= 0 || o.scale > 100)) problems.push('Invalid scale at index ' + i);
    if (o.layer !== undefined && (!Number.isInteger(o.layer) || o.layer < 0)) problems.push('Invalid layer at index ' + i);
    if (o.rotation !== undefined && !Number.isFinite(o.rotation)) problems.push('Invalid rotation at index ' + i);
    if (o.groups !== undefined && (!Array.isArray(o.groups) || !o.groups.every(n => Number.isInteger(n) && n > 0))) problems.push('Invalid groups at index ' + i);
    if (o.props !== undefined && (!o.props || typeof o.props !== 'object' || Array.isArray(o.props))) problems.push('Invalid properties at index ' + i);
    for (const key of ['target', 'dx', 'dy', 'angle', 'factor', 'duration', 'smooth', 'spawnOnly']) {
      if (o.props?.[key] !== undefined && !Number.isFinite(o.props[key])) problems.push('Invalid ' + key + ' at index ' + i);
    }
    if (typeof o.x !== 'number' || !Number.isFinite(o.x)) {
      problems.push(`objects[${i}].x must be a finite number`);
    }
    if (typeof o.y !== 'number' || !Number.isFinite(o.y)) {
      problems.push(`objects[${i}].y must be a finite number`);
    }
  }
  return problems;
}

/** Compute the horizontal end of the level (just past the last object). */
export function levelEndX(level: LevelData): number {
  let maxX = 0;
  for (const o of level.objects) {
    if (o.x > maxX) maxX = o.x;
  }
  return maxX + 90; // a little runway after the last object
}

/** Total length in world units (used for progress %). */
export function levelLength(level: LevelData): number {
  return Math.max(levelEndX(level) - 0, 300);
}
