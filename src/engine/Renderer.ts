// Renderer abstraction: the game draws simple geometric shapes in world
// coordinates; the renderer handles the world -> screen transform and the
// underlying graphics API (WebGL 2, with a Canvas 2D fallback).

import type { Camera } from './Camera';

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function rgba(r: number, g: number, b: number, a = 1): Color {
  return { r, g, b, a };
}

export interface Renderer {
  readonly kind: 'webgl2' | 'canvas2d';
  resize(w: number, h: number, dpr: number): void;
  begin(camera: Camera, clear: Color): void;
  /** Axis-aligned rect centered at (x, y); optional clockwise rotation. */
  fillRect(x: number, y: number, w: number, h: number, color: Color, rotationDeg?: number): void;
  /** Outlined rect centered at (x, y). */
  strokeRect(x: number, y: number, w: number, h: number, color: Color, lineWidth: number): void;
  /** Upward-pointing triangle (spike) centered at (x, y). */
  fillTriangle(x: number, y: number, w: number, h: number, color: Color, rotationDeg?: number): void;
  /** Filled circle centered at (x, y). */
  fillCircle(x: number, y: number, radius: number, color: Color): void;
  /** Flush batched primitives. */
  end(): void;
  dispose(): void;
}

/** Rotate a point around a center by degrees (clockwise). */
export function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  deg: number,
): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}
