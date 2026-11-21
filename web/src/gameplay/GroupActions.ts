import { ObjId } from './GameModes';
import type { LevelObject } from '../levels/Level';

export const groupParameters = new Map<number, string[]>([
  [ObjId.MoveGroup, ['target', 'dx', 'dy', 'duration', 'smooth']],
  [ObjId.RotateGroup, ['target', 'angle', 'duration', 'smooth']],
  [ObjId.ScaleGroup, ['target', 'factor', 'duration', 'smooth']],
  [ObjId.ToggleGroup, ['target']],
  [ObjId.SpawnGroup, ['target']],
]);

type Property = 'x' | 'y' | 'rotation' | 'scale';
interface Tween {
  index: number;
  property: Property;
  from: number;
  to: number;
  elapsed: number;
  duration: number;
  smooth: boolean;
}

export class GroupActions {
  tweens: Tween[] = [];
  private groups = new Map<number, number[]>();

  constructor(private objects: LevelObject[], private toggle: (o: LevelObject) => void) {
    objects.forEach((o, i) => {
      for (const group of new Set(o.groups)) {
        if (!this.groups.has(group)) this.groups.set(group, []);
        this.groups.get(group)!.push(i);
      }
    });
  }

  run(trigger: LevelObject): void {
    const pending = [trigger];
    const visited = new Set<LevelObject>();
    while (pending.length) {
      const current = pending.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const p = current.props ?? {};
      for (const i of this.groups.get(Number(p.target ?? 1)) ?? []) {
        const object = this.objects[i];
        switch (current.id) {
          case ObjId.SpawnGroup:
            if (groupParameters.has(object.id)) pending.push(object);
            break;
          case ObjId.ToggleGroup: this.toggle(object); break;
          case ObjId.MoveGroup:
            this.animate(i, 'x', object.x + Number(p.dx ?? 0), current);
            this.animate(i, 'y', object.y + Number(p.dy ?? 0), current);
            break;
          case ObjId.RotateGroup: this.animate(i, 'rotation', (object.rotation ?? 0) + Number(p.angle ?? 0), current); break;
          case ObjId.ScaleGroup: this.animate(i, 'scale', Math.max(0.01, Number(p.factor ?? 1)), current); break;
        }
      }
    }
  }

  private animate(index: number, property: Property, to: number, trigger: LevelObject): void {
    const obj = this.objects[index];
    const duration = Number(trigger.props?.duration ?? 0);
    this.tweens = this.tweens.filter(t => t.index !== index || t.property !== property);
    if (duration <= 0) { obj[property] = to; return; }
    this.tweens.push({ index, property, to, from: obj[property] ?? (property === 'scale' ? 1 : 0),
      duration, elapsed: 0, smooth: Boolean(trigger.props?.smooth) });
  }

  step(dt: number): boolean {
    if (!this.tweens.length) return false;
    for (const t of this.tweens) {
      t.elapsed += dt;
      let k = Math.min(1, t.elapsed / t.duration);
      if (t.smooth) k = k * k * (3 - 2 * k);
      this.objects[t.index][t.property] = t.from + (t.to - t.from) * k;
    }
    this.tweens = this.tweens.filter(t => t.elapsed < t.duration);
    return true;
  }
}
