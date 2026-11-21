import { GroupActions, groupParameters } from './GroupActions';
// Level runtime: ties the Player together with a level's objects.
// Pure simulation (no DOM) so it can be unit tested.

import { Player, type PlayerInput, type WorldBounds } from './Player';
import {
  aabb,
  overlaps,
  segmentIntersectsAABB,
  penetrationX,
  penetrationY,
  clamp,
  type AABB,
} from '../physics/Collision';
import {
  GameMode,
  ObjId,
  isSolid,
  isHazard,
  isOrb,
  isPad,
  isPortal,
  portalMode,
  portalSpeed,
  JUMP_VELOCITY,
  BLOCK,
} from './GameModes';
import { levelEndX, type LevelData, type LevelObject } from '../levels/Level';

export function blockAABB(obj: LevelObject): AABB {
  const s = obj.scale ?? 1;
  return aabb(obj.x, obj.y, BLOCK * s, BLOCK * s);
}

export function spikeAABB(obj: LevelObject): AABB {
  // Forgiving hitbox: much smaller than the visual triangle.
  return aabb(obj.x, obj.y, 12, 16);
}

export function triggerAABB(obj: LevelObject): AABB {
  switch (obj.id) {
    case ObjId.YellowOrb:
    case ObjId.PinkOrb:
    case ObjId.BlueOrb:
      return aabb(obj.x, obj.y, 24, 24);
    case ObjId.YellowPad:
    case ObjId.PinkPad:
    case ObjId.BluePad:
      return aabb(obj.x, obj.y, 30, 14);
    case ObjId.Coin:
      return aabb(obj.x, obj.y, 22, 22);
    case ObjId.Checkpoint:
      return aabb(obj.x, obj.y, 44, 44);
    default:
      // Mode / gravity / speed portals are 3 blocks tall.
      return aabb(obj.x, obj.y, 30, 90);
  }
}

export interface RuntimeEvents {
  died: boolean;
  completed: boolean;
  orbHit: boolean;
  padHit: boolean;
  portalHit: boolean;
  coinCollected: boolean;
}

function emptyEvents(): RuntimeEvents {
  return { died: false, completed: false, orbHit: false, padHit: false, portalHit: false, coinCollected: false };
}

interface SolidObj { obj: LevelObject; aabb: AABB; }
type HazardObj = SolidObj;
interface TriggerObj { obj: LevelObject; used: boolean; }

interface Checkpoint {
  player: ReturnType<Player['snapshot']>;
  used: boolean[];
  coins: number;
  progress: number;
  time: number;
  transforms: [number, number, number | undefined, number | undefined][];
  tweens: GroupActions['tweens'];
  hidden: number[];
}

export class LevelRuntime {
  readonly player = new Player();
  level: LevelData;
  progress = 0;
  time = 0;
  attempts = 0;
  dead = false;
  completed = false;
  practiceMode = false;
  totalCoins = 0;
  coinsCollected = 0;

  private solids: SolidObj[] = [];
  private hazards: HazardObj[] = [];
  private triggers: TriggerObj[] = [];
  private checkpoints: Checkpoint[] = [];

  private original: LevelData;
  private hidden = new Set<LevelObject>();
  private endX = 0;
  private actions!: GroupActions;

  isVisible(o: LevelObject): boolean { return !this.hidden.has(o); }

  constructor(level: LevelData) {
    this.original = structuredClone(level);
    this.level = structuredClone(level);
    this.load();
  }

  get checkpointCount(): number {
    return this.checkpoints.length;
  }

  load(): void {
    this.level = structuredClone(this.original);
    this.hidden.clear();
    this.actions = new GroupActions(this.level.objects, o => {
      if (this.hidden.has(o)) this.hidden.delete(o);
      else this.hidden.add(o);
    });
    this.endX = this.level.objects.find(o => o.id === ObjId.Finish)?.x ?? levelEndX(this.level);
    this.solids = [];
    this.hazards = [];
    this.triggers = [];
    this.totalCoins = 0;
    for (const obj of this.level.objects) {
      if (isSolid(obj.id)) {
        this.solids.push({ obj, aabb: blockAABB(obj) });
      } else if (isHazard(obj.id)) {
        this.hazards.push({ obj, aabb: spikeAABB(obj) });
      } else if (
        groupParameters.has(obj.id) ||
        isOrb(obj.id) ||
        isPad(obj.id) ||
        isPortal(obj.id) ||
        obj.id === ObjId.Coin ||
        obj.id === ObjId.Checkpoint ||
        obj.id === ObjId.StartPos ||
        obj.id === ObjId.Finish
      ) {
        this.triggers.push({ obj, used: false });
        if (obj.id === ObjId.Coin) this.totalCoins++;
      }
    }
    this.attempts = 1;
    this.reset(false);
  }

  reset(countAttempt = true): void {
    if (countAttempt) this.attempts++;
    this.dead = false;
    this.completed = false;
    this.progress = 0;
    this.time = 0;
    this.coinsCollected = 0;
    this.checkpoints = [];
    this.hidden.clear();
    this.actions.tweens = [];
    this.level.objects.forEach((o, i) => Object.assign(o, {
      rotation: undefined, scale: undefined, ...this.original.objects[i],
    }));
    this.refreshBounds();
    for (const t of this.triggers) t.used = false;
    const start = this.findStart();
    this.player.reset(start.x, start.y, start.mode, start.gravitySign);
    this.player.speedMultiplier = this.level.startSpeed;
  }

  private findStart(): { x: number; y: number; mode: GameMode; gravitySign: 1 | -1 } {
    for (const t of this.triggers) {
      if (t.obj.id === ObjId.StartPos) {
        return { x: t.obj.x, y: t.obj.y, mode: GameMode.Cube, gravitySign: 1 };
      }
    }
    return { x: 30, y: 15, mode: GameMode.Cube, gravitySign: 1 };
  }

  die(): void {
    this.dead = true;
  }

  addCheckpoint(): void {
    this.checkpoints.push({
      player: this.player.snapshot(), coins: this.coinsCollected, progress: this.progress,
      time: this.time,
      used: this.triggers.map(t => t.used),
      transforms: this.level.objects.map(o => [o.x, o.y, o.rotation, o.scale]),
      tweens: structuredClone(this.actions.tweens),
      hidden: this.level.objects.flatMap((o, i) => this.hidden.has(o) ? [i] : []),
    });
  }

  removeCheckpoint(): void {
    this.checkpoints.pop();
  }

  respawnAtCheckpoint(): void {
    const cp = this.checkpoints[this.checkpoints.length - 1];
    if (!cp) {
      this.reset(false);
      return;
    }
    this.dead = false;
    this.attempts++;
    this.completed = false;
    this.player.restore(cp.player);
    this.progress = cp.progress;
    this.time = cp.time;
    this.actions.tweens = structuredClone(cp.tweens);
    this.coinsCollected = cp.coins;
    this.triggers.forEach((t, i) => t.used = cp.used[i]);
    this.hidden = new Set(cp.hidden.map(i => this.level.objects[i]));
    this.level.objects.forEach((o, i) => { [o.x, o.y, o.rotation, o.scale] = cp.transforms[i]; });
    this.refreshBounds();
  }

  private refreshBounds(): void {
    for (const s of this.solids) s.aabb = blockAABB(s.obj);
    for (const h of this.hazards) h.aabb = spikeAABB(h.obj);
  }

  private computeBounds(): WorldBounds {
    const p = this.player;
    const half = p.size / 2;
    const xMin = p.x - half;
    const xMax = p.x + half;
    let ceilingY: number | null = null;
    for (const s of this.solids) {
      if (this.hidden.has(s.obj)) continue;
      const b = s.aabb;
      if (b.x + b.w / 2 <= xMin || b.x - b.w / 2 >= xMax) continue;
      const bottom = b.y - b.h / 2;
      if (bottom >= p.y && (ceilingY === null || bottom < ceilingY)) {
        ceilingY = bottom;
      }
    }
    return { floorY: 0, ceilingY };
  }

  step(dt: number, input: PlayerInput): RuntimeEvents {
    const events = emptyEvents();
    if (this.dead || this.completed) return events;

    this.time += dt;
    if (this.actions.step(dt)) this.refreshBounds();
    const bounds = this.computeBounds();
    const prevX = this.player.x;
    const prevY = this.player.y;
    this.player.step(dt, input, bounds);

    if (this.player.y > 3000 || this.player.y < -300 || this.resolveSolids()) {
      this.die();
      events.died = true;
      return events;
    }

    if (this.checkHazards(prevX, prevY)) {
      this.die();
      events.died = true;
      return events;
    }

    this.processTriggers(input, events);

    const len = Math.max(1, this.endX);
    this.progress = clamp(this.player.x / len, 0, 1);

    if (this.player.x >= this.endX) {
      this.progress = 1;
      this.completed = true;
      events.completed = true;
    }
    return events;
  }

  /**
   * Resolves the player against solid blocks.
   * Returns true if the player died (ship/wave contact is lethal).
   */
  private resolveSolids(): boolean {
    const p = this.player;
    const pa = p.aabb;
    for (const s of this.solids) {
      if (this.hidden.has(s.obj)) continue;
      if (!overlaps(pa, s.aabb)) continue;
      if (p.mode === GameMode.Ship || p.mode === GameMode.Wave) return true;
      const px = penetrationX(pa, s.aabb);
      const py = penetrationY(pa, s.aabb);
      if (px < py) {
        return true;
      } else {
        const dir = p.y < s.aabb.y ? -1 : 1;
        p.y += dir * py;
        if (dir < 0 && p.vy > 0) { p.vy = 0; p.onGround = p.gravitySign < 0; } // hit a block above
        if (dir > 0) {
          if (p.vy < 0) p.vy = 0; // landed on a block top
          p.onGround = true;
        }
      }
    }
    return false;
  }

  private checkHazards(prevX: number, prevY: number): boolean {
    const p = this.player;
    const pa = p.aabb;
    for (const h of this.hazards) {
      if (this.hidden.has(h.obj)) continue;
      if (Math.abs(h.aabb.x - p.x) > 400) continue;
      if (overlaps(pa, h.aabb)) return true;
      // Swept test: player center path vs hazard expanded by the player box.
      const swept = aabb(h.aabb.x, h.aabb.y, h.aabb.w + p.size, h.aabb.h + p.size);
      if (segmentIntersectsAABB(prevX, prevY, p.x, p.y, swept)) return true;
    }
    return false;
  }

  private processTriggers(input: PlayerInput, events: RuntimeEvents): void {
    const p = this.player;
    const pa = p.aabb;
    for (const t of this.triggers) {
      const o = t.obj;
      if (t.used || this.hidden.has(o)) continue;
      if (groupParameters.has(o.id)) {
        if (p.x < o.x || o.props?.spawnOnly) continue;
        t.used = true;
        this.actions.run(o);
        this.refreshBounds();
        continue;
      }
      const dx = Math.abs(o.x - p.x);
      const dy = Math.abs(o.y - p.y);
      if (dx > 80 || dy > 120) continue;
      if (!overlaps(pa, triggerAABB(o))) continue;
      if (isOrb(o.id) && !input.pressed) continue;

      if (isPortal(o.id)) t.used = true;
      switch (o.id) {
        case ObjId.MiniPortal:
        case ObjId.NormalSizePortal:
          p.size = o.id === ObjId.MiniPortal ? BLOCK / 2 : BLOCK;
          events.portalHit = true;
          break;
        case ObjId.YellowOrb:
          p.vy = p.gravitySign * JUMP_VELOCITY;
          t.used = true;
          events.orbHit = true;
          break;
        case ObjId.PinkOrb:
          p.vy = p.gravitySign * JUMP_VELOCITY * 0.6;
          t.used = true;
          events.orbHit = true;
          break;
        case ObjId.BlueOrb:
          p.gravitySign *= -1;
          p.vy = 0;
          t.used = true;
          events.orbHit = true;
          break;
        case ObjId.YellowPad:
          p.vy = p.gravitySign * JUMP_VELOCITY * 1.35;
          t.used = true;
          events.padHit = true;
          break;
        case ObjId.PinkPad:
          p.vy = p.gravitySign * JUMP_VELOCITY * 0.8;
          t.used = true;
          events.padHit = true;
          break;
        case ObjId.BluePad:
          p.gravitySign *= -1;
          p.vy = 0;
          t.used = true;
          events.padHit = true;
          break;
        case ObjId.CubePortal:
        case ObjId.ShipPortal:
        case ObjId.BallPortal:
        case ObjId.UfoPortal:
        case ObjId.WavePortal:
        case ObjId.RobotPortal:
        case ObjId.SpiderPortal:
        case ObjId.SwingPortal: {
          const mode = portalMode(o.id);
          if (mode != null) {
            p.setMode(mode);
            events.portalHit = true;
          }
          break;
        }
        case ObjId.GravityUp:
          p.setGravity(-1);
          events.portalHit = true;
          break;
        case ObjId.GravityDown:
          p.setGravity(1);
          events.portalHit = true;
          break;
        case ObjId.SpeedSlow:
        case ObjId.SpeedNormal:
        case ObjId.SpeedFast:
        case ObjId.SpeedFaster:
        case ObjId.SpeedFastest: {
          const speed = portalSpeed(o.id);
          if (speed != null) {
            p.speedMultiplier = speed;
            events.portalHit = true;
          }
          break;
        }
        case ObjId.Coin:
          if (!t.used) {
            t.used = true;
            this.coinsCollected++;
            this.hidden.add(o);
            events.coinCollected = true;
          }
          break;
        case ObjId.Checkpoint:
          if (this.practiceMode && !t.used) {
            t.used = true;
            this.addCheckpoint();
          }
          break;
        default:
          break;
      }
    }
  }

}
