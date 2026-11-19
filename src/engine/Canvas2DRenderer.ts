// Canvas 2D renderer — the guaranteed fallback path.

import type { Camera } from './Camera';
import { type Renderer, type Color, rotatePoint } from './Renderer';

function css(c: Color): string {
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a})`;
}

export class Canvas2DRenderer implements Renderer {
  readonly kind = 'canvas2d' as const;
  private ctx: CanvasRenderingContext2D;
  private cam: Camera | null = null;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  resize(w: number, h: number, dpr: number): void {
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  begin(camera: Camera, clear: Color): void {
    this.cam = camera;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.fillStyle = css(clear);
    this.ctx.fillRect(0, 0, camera.viewW, camera.viewH);
  }

  fillRect(x: number, y: number, w: number, h: number, color: Color, rotationDeg = 0): void {
    const cam = this.cam;
    if (!cam) return;
    const sx = cam.screenX(x);
    const sy = cam.screenY(y);
    this.ctx.save();
    this.ctx.translate(sx, sy);
    if (rotationDeg) this.ctx.rotate((rotationDeg * Math.PI) / 180);
    this.ctx.fillStyle = css(color);
    this.ctx.fillRect(-w / 2, -h / 2, w, h);
    this.ctx.restore();
  }

  strokeRect(x: number, y: number, w: number, h: number, color: Color, lineWidth: number): void {
    const cam = this.cam;
    if (!cam) return;
    const sx = cam.screenX(x);
    const sy = cam.screenY(y);
    this.ctx.save();
    this.ctx.translate(sx, sy);
    this.ctx.strokeStyle = css(color);
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(-w / 2, -h / 2, w, h);
    this.ctx.restore();
  }

  fillTriangle(x: number, y: number, w: number, h: number, color: Color, rotationDeg = 0): void {
    const cam = this.cam;
    if (!cam) return;
    const sx = cam.screenX(x);
    const sy = cam.screenY(y);
    // Points in local space with apex up (negative y is up on screen).
    const pts = [
      { x: 0, y: -h / 2 },
      { x: w / 2, y: h / 2 },
      { x: -w / 2, y: h / 2 },
    ].map((p) => rotatePoint(p.x, p.y, 0, 0, rotationDeg));
    this.ctx.save();
    this.ctx.translate(sx, sy);
    this.ctx.fillStyle = css(color);
    this.ctx.beginPath();
    this.ctx.moveTo(pts[0].x, pts[0].y);
    this.ctx.lineTo(pts[1].x, pts[1].y);
    this.ctx.lineTo(pts[2].x, pts[2].y);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  fillCircle(x: number, y: number, radius: number, color: Color): void {
    const cam = this.cam;
    if (!cam) return;
    const sx = cam.screenX(x);
    const sy = cam.screenY(y);
    this.ctx.save();
    this.ctx.translate(sx, sy);
    this.ctx.fillStyle = css(color);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  end(): void {
    // Canvas draws immediately; nothing to flush.
  }

  dispose(): void {
    this.cam = null;
  }
}
