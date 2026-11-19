// A simple 2D follow camera. World coordinates have y pointing up.

import { clamp } from '../physics/Collision';

export class Camera {
  /** Center of the view in world coordinates. */
  cx = 0;
  cy = 0;
  /** Pixels per world unit. */
  zoom = 1;
  /** Logical view size (CSS pixels). */
  viewW = 960;
  viewH = 540;

  /** World y at the bottom of the view (default ground position). */
  baselineY = 189;

  update(targetX: number, targetY: number, dt: number): void {
    const lead = 90;
    const targetCx = targetX + lead;
    // Follow the player vertically, but clamp so the ground stays on screen.
    const targetCy = clamp(targetY * 0.6 + 110, 100, 440);
    const k = 1 - Math.exp(-dt * 7);
    this.cx += (targetCx - this.cx) * k;
    this.cy += (targetCy - this.cy) * k;
  }

  snapTo(targetX: number, targetY: number): void {
    this.cx = targetX + 90;
    this.cy = clamp(targetY * 0.6 + 110, 100, 440);
  }

  screenX(worldX: number): number {
    return (worldX - this.cx) * this.zoom + this.viewW / 2;
  }

  screenY(worldY: number): number {
    return (this.cy - worldY) * this.zoom + this.viewH / 2;
  }

  worldX(screenX: number): number {
    return (screenX - this.viewW / 2) / this.zoom + this.cx;
  }

  worldY(screenY: number): number {
    return this.cy - (screenY - this.viewH / 2) / this.zoom;
  }

  /** World x at the left edge of the view. */
  get left(): number {
    return this.cx - this.viewW / 2 / this.zoom;
  }

  /** World x at the right edge of the view. */
  get right(): number {
    return this.cx + this.viewW / 2 / this.zoom;
  }
}
