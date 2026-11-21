import { describe, it, expect } from 'vitest';
import { aabb, overlaps, penetrationX, penetrationY, segmentIntersectsAABB } from '../src/physics/Collision';

describe('collision helpers', () => {
  it('detects AABB overlap', () => {
    expect(overlaps(aabb(0, 0, 10, 10), aabb(5, 5, 10, 10))).toBe(true);
    expect(overlaps(aabb(0, 0, 10, 10), aabb(20, 20, 10, 10))).toBe(false);
  });

  it('computes penetration depths', () => {
    expect(penetrationX(aabb(0, 0, 10, 10), aabb(5, 0, 10, 10))).toBeCloseTo(5);
    expect(penetrationY(aabb(0, 0, 10, 10), aabb(0, 5, 10, 10))).toBeCloseTo(5);
  });

  it('tests segment vs AABB (swept hazard)', () => {
    const box = aabb(10, 10, 4, 4);
    expect(segmentIntersectsAABB(0, 10, 20, 10, box)).toBe(true);
    expect(segmentIntersectsAABB(0, 0, 20, 20, box)).toBe(true);
    expect(segmentIntersectsAABB(0, 0, 5, 5, box)).toBe(false);
  });
});
