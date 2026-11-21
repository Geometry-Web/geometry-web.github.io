// Axis-aligned bounding box helpers and swept segment tests.
// These are pure functions with no DOM dependency so they can be unit tested.

export interface AABB {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  /** Full width. */
  w: number;
  /** Full height. */
  h: number;
}

export function aabb(x: number, y: number, w: number, h: number): AABB {
  return { x, y, w, h };
}

export function overlaps(a: AABB, b: AABB): boolean {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
    Math.abs(a.y - b.y) < (a.h + b.h) / 2
  );
}

/** Penetration depth along X (positive = overlapping). */
export function penetrationX(a: AABB, b: AABB): number {
  return (a.w + b.w) / 2 - Math.abs(a.x - b.x);
}

/** Penetration depth along Y (positive = overlapping). */
export function penetrationY(a: AABB, b: AABB): number {
  return (a.h + b.h) / 2 - Math.abs(a.y - b.y);
}

/**
 * Returns true if the segment from (ax,ay) to (bx,by) intersects the box.
 * Uses the slab method; used for swept hazard tests so fast players cannot
 * tunnel through thin hitboxes in a single fixed step.
 */
export function segmentIntersectsAABB(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  box: AABB,
): boolean {
  const hw = box.w / 2;
  const hh = box.h / 2;
  const minX = box.x - hw;
  const maxX = box.x + hw;
  const minY = box.y - hh;
  const maxY = box.y + hh;

  const dx = bx - ax;
  const dy = by - ay;

  let tMin = 0;
  let tMax = 1;

  if (Math.abs(dx) < 1e-9) {
    if (ax < minX || ax > maxX) return false;
  } else {
    let t1 = (minX - ax) / dx;
    let t2 = (maxX - ax) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  if (Math.abs(dy) < 1e-9) {
    if (ay < minY || ay > maxY) return false;
  } else {
    let t1 = (minY - ay) / dy;
    let t2 = (maxY - ay) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  return true;
}

/** Clamp a value into [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
