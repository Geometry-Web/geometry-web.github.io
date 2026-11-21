// Level (de)serialization: save/load, import/export as JSON.

import { type LevelData, validateLevel } from './Level';

/** Serialize a level to a compact JSON string (for saving). */
export function serializeLevel(level: LevelData): string {
  return JSON.stringify(level);
}

/** Pretty-print a level for sharing/export. */
export function exportLevel(level: LevelData): string {
  return JSON.stringify(level, null, 2);
}

/** Parse and validate a level JSON string. Throws on invalid input. */
export function parseLevel(json: string): LevelData {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error('Level is not valid JSON: ' + (e instanceof Error ? e.message : String(e)));
  }
  const problems = validateLevel(data);
  if (problems.length > 0) {
    throw new Error('Invalid level: ' + problems.join('; '));
  }
  return data as LevelData;
}

export { validateLevel };
