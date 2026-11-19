// Renderer factory: prefer WebGL 2, fall back to Canvas 2D.

import { type Renderer } from './Renderer';
import { WebGL2Renderer } from './WebGL2Renderer';
import { Canvas2DRenderer } from './Canvas2DRenderer';

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  try {
    const r = new WebGL2Renderer(canvas);
    console.info('[renderer] using WebGL2');
    return r;
  } catch (e) {
    console.warn('[renderer] WebGL2 unavailable, falling back to Canvas2D:', e);
    return new Canvas2DRenderer(canvas);
  }
}
