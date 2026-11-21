import { groupParameters } from '../gameplay/GroupActions';
// A functional level editor: place/erase objects on a grid, undo, save, playtest.
// Runs inside the existing renderer/camera and uses HTML/CSS for its toolbar.

import { type Renderer, rgba } from '../engine/Renderer';
import type { Camera } from '../engine/Camera';
import type { Storage } from '../storage/Storage';
import { type LevelData, createEmptyLevel, type LevelObject } from '../levels/Level';
import { ObjId } from '../gameplay/GameModes';
import { h, button } from '../ui/dom';

import { validateLevel, parseLevel, exportLevel } from '../levels/LevelSerializer';

export class Editor {
  private level: LevelData;
  private tool = ObjId.Block;
  private mode = 'place';
  private redoStack: LevelObject[][] = [];
  private clipboard: LevelObject | null = null;
  private title = h('input', { 'aria-label': 'Level name', maxlength: 80 });
  private status = h('output', { 'aria-live': 'polite' });
  private properties = h('div', { class: 'editor-properties' });
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
    private paint: (object: LevelObject) => void,
  ) {
    const draft = this.storage.getSetting<LevelData | null>('editor-draft', null);
    this.level = draft && !validateLevel(draft).length ? draft : createEmptyLevel('My Level', 'You');
    if (this.level === draft) this.status.value = 'Recovered draft';
  }

  buildBar(): HTMLElement {
    const palette = h('select', { 'aria-label': 'Placement tool' });
    palette.append(new Option('Select object', 'select'), new Option('Erase object', 'erase'));
    for (const [name, value] of Object.entries(ObjId)) {
      if (typeof value === 'number') palette.append(new Option(name.replace(/([a-z])([A-Z])/g, '$1 $2'), String(value)));
    }
    palette.value = String(this.tool);
    palette.onchange = () => {
      this.mode = isNaN(Number(palette.value)) ? palette.value : 'place';
      if (this.mode === 'place') this.tool = Number(palette.value);
    };
    this.title.value = this.level.name;
    this.title.onchange = () => {
      this.title.value = this.level.name = this.title.value.trim() || 'My Level';
      this.persistDraft();
    };
    const file = h('input', { type: 'file', accept: '.json', hidden: true });
    file.onchange = async () => {
      try {
        const f = file.files?.[0];
        if (f) this.open(parseLevel(await f.text()));
      } catch (e) { this.status.value = String(e); }
      file.value = '';
    };
    this.bar = h('div', { class: 'editor-bar' }, this.title, palette, this.properties,
      button('Copy', () => { if (this.selected >= 0) this.clipboard = structuredClone(this.level.objects[this.selected]); }),
      button('Paste', () => {
        if (!this.clipboard) return;
        this.pushUndo();
        this.level.objects.push({ ...structuredClone(this.clipboard), x: this.clipboard.x + 30 });
        this.select(this.level.objects.length - 1);
      }),
      button('Undo', () => this.undo()), button('Redo', () => this.redo()),
      button('Save', () => void this.save()), button('New', () => {
        if (confirm('Start a new level? Save your current draft first to keep it.')) this.open(createEmptyLevel('My Level', 'You'));
      }),
      file, button('Import', () => file.click()), button('Export', () => {
        const url = URL.createObjectURL(new Blob([exportLevel(this.level)], { type: 'application/json' }));
        h('a', { href: url, download: this.level.name + '.json' }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
      button('Playtest', () => { this.deactivate(); this.onPlaytest(structuredClone(this.level)); }, 'primary'),
      button('Test selection', () => {
        const selected = this.level.objects[this.selected];
        if (!selected) { this.status.value = 'Select a start location first'; return; }
        const copy = structuredClone(this.level);
        copy.objects = copy.objects.filter(o => o.id !== ObjId.StartPos);
        copy.objects.unshift({ id: ObjId.StartPos, x: selected.x, y: selected.y });
        this.deactivate();
        this.onPlaytest(copy);
      }),
      button('Menu', () => { this.deactivate(); this.onExit(); }), this.status);
    return this.bar;
  }

  open(level: LevelData): void {
    this.level = structuredClone(level);
    this.title.value = level.name;
    this.undoStack = [];
    this.redoStack = [];
    this.select(-1);
    this.status.value = '';
    this.persistDraft();
  }

  private select(index: number): void {
    this.selected = index;
    this.properties.replaceChildren();
    const o = this.level.objects[index];
    if (!o) return;
    const keys = ['x', 'y', 'rotation', 'scale', 'group'];
    const params = groupParameters.get(o.id);
    if (params) keys.push(...params, 'spawnOnly');
    for (const key of keys) {
      const value = key === 'group' ? o.groups?.[0] : (o as unknown as Record<string, unknown>)[key] ?? o.props?.[key];
      const field = h('input', { type: 'number', value: value ?? (['scale','target','factor'].includes(key) ? 1 : 0), 'aria-label': key });
      field.onchange = () => {
        const n = field.valueAsNumber;
        if (!Number.isFinite(n) || (key === 'scale' && n <= 0)) { this.select(index); return; }
        this.pushUndo();
        if (key === 'group') o.groups = n > 0 ? [Math.floor(n)] : [];
        else if (key === 'x' || key === 'y' || key === 'rotation' || key === 'scale') o[key] = n;
        else (o.props ??= {})[key] = n;
      };
      this.properties.append(h('label', {}, key, field));
    }
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
    if (this.mode === 'select') this.select(this.objectAt(e.clientX, e.clientY));
    else if (this.mode === 'erase') this.eraseAt(e.clientX, e.clientY);
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
    this.select(this.level.objects.length - 1);
  }

  private objectAt(clientX: number, clientY: number): number {
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
    return idx;
  }

  private eraseAt(clientX: number, clientY: number): void {
    const idx = this.objectAt(clientX, clientY);
    if (idx >= 0) {
      this.pushUndo();
      this.level.objects.splice(idx, 1);
      this.select(-1);
    }
  }

  deleteSelected(): void {
    if (this.selected < 0 || this.selected >= this.level.objects.length) return;
    this.pushUndo();
    this.level.objects.splice(this.selected, 1);
    this.select(-1);
  }

  private pushUndo(): void {
    queueMicrotask(() => this.persistDraft());
    this.redoStack = [];
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
    this.redoStack.push(this.level.objects);
    this.level.objects = prev;
    this.persistDraft();
    this.select(-1);
  }

  private persistDraft(): void {
    try { this.storage.writeDraft(this.level); }
    catch { this.status.value = 'Draft recovery unavailable. Export a copy to keep your edits.'; }
  }

  private redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.level.objects);
    this.level.objects = next;
    this.persistDraft();
    this.select(-1);
  }

  private async save(): Promise<void> {
    this.level.updatedAt = Date.now();
    try {
      const problems = validateLevel(this.level);
      if (problems.length) throw new Error(problems.join(', '));
      await this.storage.saveLevel(this.level);
      this.status.value = 'Saved';
    } catch (e) { this.status.value = 'Save failed: ' + String(e); }
  }

  private clear(): void {
    this.pushUndo();
    this.level.objects = [];
    this.select(-1);
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
    this.paint(o);
  }
}
