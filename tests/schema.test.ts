import { describe, it, expect } from 'vitest';
import { validateLevel, createEmptyLevel, levelEndX } from '../src/levels/Level';
import { serializeLevel, parseLevel } from '../src/levels/LevelSerializer';

describe('level schema', () => {
  it('accepts a valid empty level', () => {
    const l = createEmptyLevel('Test', 'me');
    expect(validateLevel(l)).toEqual([]);
  });

  it('round-trips through JSON', () => {
    const l = createEmptyLevel('Test', 'me');
    l.objects.push({ id: 1, x: 15, y: 15 });
    const parsed = parseLevel(serializeLevel(l));
    expect(parsed.name).toBe('Test');
    expect(parsed.objects.length).toBe(1);
    expect(parsed.objects[0].x).toBe(15);
  });

  it('rejects invalid data', () => {
    expect(() => parseLevel('{not json')).toThrow();
    expect(() => parseLevel('{"schemaVersion": 99, "objects": []}')).toThrow();
    expect(validateLevel({ schemaVersion: 1, name: '', objects: [] })).not.toEqual([]);
  });

  it('computes the end of a level', () => {
    const l = createEmptyLevel('Test', 'me');
    l.objects.push({ id: 1, x: 300, y: 15 });
    expect(levelEndX(l)).toBe(390);
  });
});
