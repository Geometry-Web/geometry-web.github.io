// A functional level editor: place/erase objects on a grid, undo, save, playtest.
// Runs inside the existing renderer/camera and uses HTML/CSS for its toolbar.

import { type Renderer, rgba } from '../engine/Renderer';
import type { Camera } from '../engine/Camera';
import type { Storage } from '../storage/Storage';
import { type LevelData, createEmptyLevel, type LevelObject } from '../levels/Level';
import { ObjId } from '../gameplay/GameModes';
import { h, button } from '../ui/dom';

const PALETTE: { id: number; label: string }[] = [
  { id: ObjId.Block, label: '▢' },
  { id: ObjId.Spike, label: '▲' },
  { id: ObjId.YellowOrb, label: '●' },
  { id: ObjId.YellowPad, label: '▬' },
  { id: ObjId.CubePortal, label: 'C' },
  { id: ObjId.ShipPortal, label: 'S' },
  { id: ObjId.BallPortal, label: 'B' },
  { id: ObjId.Coin, label: '$' },
  { id: ObjId.StartPos, label: 'P' },
  { id: ObjId.Finish, label: 'F' },
];

export class Editor {
  private level: LevelData;
  private tool = ObjId.Block;
  private eraseMode = false;
  private selected = -1;
  private undoStack: LevelObject[][] = [];
  private active = false;
  private bar: HTMLElement | null = null;

  private lastClientX = 0;
  private lastClientY = 0;
  private dragging = false;
  private downClientX = 0;
  private downClientY = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private renderer: Renderer,
    private camera: Camera,
    private storage: Storage,
    private onPlaytest: (level: LevelData) => void,
    private onExit: () => void,
  ) {
    this.level = createEmptyLevel('My Level', 'You');
  }

  buildBar(): HTMLElement {
    const palette = h('div', { class: 'palette' });
    for (const item of PALETTE) {
      palette.appendChild(
        h('button', { class: 'swatch', title: item.label, onclick: () => { this.tool = item.id; this.eraseMode = false; this.refreshPalette(); } }, item.label),
      );
    }
    palette.appendChild(
      h('button', { class: 'swatch', title: 'Erase', onclick: () => { this.eraseMode = true; this.refreshPalette(); } }, '✕'),
    );

    this.bar = h('div', { class: 'editor-bar' },
      palette,
      button('UNDO', () => this.undo()),
      button('SAVE', () => void this.save()),
      button('CLEAR', () => this.clear(), 'danger'),
      button('PLAYTEST', () => { this.deactivate(); this.onPlaytest(this.level); }, 'primary'),
      button('← MENU', () => { this.deactivate(); this.onExit(); }, 'danger'),
    );
    this.refreshPalette();
    return this.bar;
  }

  private refreshPalette(): void {
    if (!this.bar) return;
    const swatches = this.bar.querySelectorAll('.palette .swatch');
    swatches.forEach((sw, i) => {
      const isActive = i < PALETTE.length ? (!this.eraseMode && PALETTE[i].id === this.tool) : this.eraseMode;
      sw.classList.toggle('active', isActive);
    });
  }

  activate(): void {
    if (this.active) return;
    this.active = true;
    this.camera.snapTo(0, 15);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  deactivate(): void {
    this.active = false;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.dragging = false;
    this.downClientX = e.clientX;
    this.downClientY = e.clientY;
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.buttons === 0) return;
    const dx = e.clientX - this.lastClientX;
    const dy = e.clientY - this.lastClientY;
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
    if (Math.abs(e.clientX - this.downClientX) + Math.abs(e.clientY - this.downClientY) > 8) {
      this.dragging = true;
    }
    if (this.dragging) {
      this.camera.cx -= dx / this.camera.zoom;
      this.camera.cy += dy / this.camera.zoom;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.dragging) return;
    if (this.eraseMode) this.eraseAt(e.clientX, e.clientY);
    else this.placeAt(e.clientX, e.clientY);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this.camera.zoom = Math.min(4, Math.max(0.2, this.camera.zoom * factor));
  };

  private snap(v: number): number {
    return 15 + 30 * Math.round((v - 15) / 30);
  }

  private placeAt(clientX: number, clientY: number): void {
    const wx = this.snap(this.camera.worldX(clientX));
    const wy = this.snap(this.camera.worldY(clientY));
    this.pushUndo();
    this.level.objects.push({ id: this.tool, x: wx, y: wy });
    this.selected = this.level.objects.length - 1;
  }

  private eraseAt(clientX: number, clientY: number): void {
    const wx = this.camera.worldX(clientX);
    const wy = this.camera.worldY(clientY);
    let idx = -1;
    for (let i = 0; i < this.level.objects.length; i++) {
      const o = this.level.objects[i];
      if (Math.abs(o.x - wx) < 20 && Math.abs(o.y - wy) < 20) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      this.pushUndo();
      this.level.objects.splice(idx, 1);
      this.selected = -1;
    }
  }

  deleteSelected(): void {
    if (this.selected < 0 || this.selected >= this.level.objects.length) return;
    this.pushUndo();
    this.level.objects.splice(this.selected, 1);
    this.selected = -1;
  }

  private pushUndo(): void {
    this.undoStack.push(
      this.level.objects.map((o) => ({
        ...o,
        groups: o.groups?.slice(),
        props: o.props ? { ...o.props } : undefined,
      })),
    );
    if (this.undoStack.length > 100) this.undoStack.shift();
  }

  private undo(): void {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.level.objects = prev;
    this.selected = -1;
  }

  private async save(): Promise<void> {
    this.level.updatedAt = Date.now();
    await this.storage.saveLevel(this.level);
  }

  private clear(): void {
    this.pushUndo();
    this.level.objects = [];
    this.selected = -1;
  }

  render(): void {
    const r = this.renderer;
    const cam = this.camera;
    const step = 30;
    const left = cam.left - 60;
    const right = cam.right + 60;
    const top = cam.cy + cam.viewH / 2 + 60;
    const bottom = cam.cy - cam.viewH / 2 - 60;
    for (let x = Math.floor(left / step) * step; x <= right; x += step) {
      r.fillRect(x, cam.cy, 1, cam.viewH * 1.5, rgba(0.5, 0.65, 1, 0.09));
    }
    for (let y = Math.floor(bottom / step) * step; y <= top; y += step) {
      r.fillRect(cam.cx, y, cam.viewW * 1.5, 1, rgba(0.5, 0.65, 1, 0.09));
    }
    for (let i = 0; i < this.level.objects.length; i++) {
      const o = this.level.objects[i];
      if (o.x < left || o.x > right || o.y < bottom || o.y > top) continue;
      this.drawObject(o, i === this.selected);
    }
  }

  private drawObject(o: LevelObject, isSelected: boolean): void {
    const r = this.renderer;
    if (isSelected) r.strokeRect(o.x, o.y, 36, 36, rgba(1, 1, 0.4, 0.9), 2);
    switch (o.id) {
      case ObjId.Block: r.fillRect(o.x, o.y, 30, 30, rgba(0.92, 0.95, 1)); break;
      case ObjId.Spike: r.fillTriangle(o.x, o.y, 30, 30, rgba(0.95, 0.97, 1)); break;
      case ObjId.YellowOrb: r.fillCircle(o.x, o.y, 12, rgba(1, 0.82, 0.2)); break;
      case ObjId.YellowPad: r.fillRect(o.x, o.y, 30, 10, rgba(1, 0.82, 0.2)); break;
      case ObjId.CubePortal: this.drawPortal(o, rgba(0.45, 1, 0.55)); break;
      case ObjId.ShipPortal: this.drawPortal(o, rgba(1, 0.35, 0.85)); break;
      case ObjId.BallPortal: this.drawPortal(o, rgba(1, 0.6, 0.2)); break;
      case ObjId.Coin: r.fillCircle(o.x, o.y, 10, rgba(1, 0.85, 0.25)); break;
      case ObjId.StartPos: r.strokeRect(o.x, o.y, 30, 30, rgba(0.5, 1, 0.5, 0.7), 2); break;
      case ObjId.Finish: r.fillRect(o.x, o.y, 4, 800, rgba(1, 1, 1, 0.85)); break;
    }
  }

  private drawPortal(o: LevelObject, color: { r: number; g: number; b: number; a: number }): void {
    const r = this.renderer;
    r.fillRect(o.x, o.y, 30, 90, rgba(color.r, color.g, color.b, 0.22));
    r.strokeRect(o.x, o.y, 30, 90, color, 3);
  }
}
