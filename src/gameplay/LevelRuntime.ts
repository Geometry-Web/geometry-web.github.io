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

interface SolidObj { aabb: AABB; }
interface HazardObj { aabb: AABB; }
interface TriggerObj { obj: LevelObject; used: boolean; }

interface Checkpoint {
  x: number;
  y: number;
  mode: GameMode;
  gravitySign: 1 | -1;
  speed: number;
}

export class LevelRuntime {
  readonly player = new Player();
  level: LevelData;
  progress = 0;
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

  constructor(level: LevelData) {
    this.level = level;
    this.load();
  }

  get checkpointCount(): number {
    return this.checkpoints.length;
  }

  load(): void {
    this.solids = [];
    this.hazards = [];
    this.triggers = [];
    this.totalCoins = 0;
    for (const obj of this.level.objects) {
      if (isSolid(obj.id)) {
        this.solids.push({ aabb: blockAABB(obj) });
      } else if (isHazard(obj.id)) {
        this.hazards.push({ aabb: spikeAABB(obj) });
      } else if (
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
    this.attempts = 0;
    this.reset(false);
  }

  reset(countAttempt = true): void {
    if (countAttempt) this.attempts++;
    this.dead = false;
    this.completed = false;
    this.progress = 0;
    this.coinsCollected = 0;
    this.checkpoints = [];
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
      x: this.player.x,
      y: this.player.y,
      mode: this.player.mode,
      gravitySign: this.player.gravitySign as 1 | -1,
      speed: this.player.speedMultiplier,
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
    this.player.reset(cp.x, cp.y, cp.mode, cp.gravitySign);
    this.player.speedMultiplier = cp.speed;
  }

  private computeBounds(): WorldBounds {
    const p = this.player;
    const half = p.size / 2;
    const xMin = p.x - half;
    const xMax = p.x + half;
    let ceilingY: number | null = null;
    for (const s of this.solids) {
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

    const bounds = this.computeBounds();
    const prevX = this.player.x;
    const prevY = this.player.y;
    this.player.step(dt, input, bounds);

    if (this.resolveSolids()) {
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

    const len = levelEndX(this.level);
    this.progress = clamp(this.player.x / len, 0, 1);

    if (this.isAtEnd()) {
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
      if (!overlaps(pa, s.aabb)) continue;
      if (p.mode === GameMode.Ship || p.mode === GameMode.Wave) return true;
      const px = penetrationX(pa, s.aabb);
      const py = penetrationY(pa, s.aabb);
      if (px < py) {
        p.x += (p.x < s.aabb.x ? -1 : 1) * px;
      } else {
        const dir = p.y < s.aabb.y ? -1 : 1;
        p.y += dir * py;
        if (dir < 0 && p.vy > 0) p.vy = 0; // hit a block above
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
      const oneShot = isOrb(o.id) || isPad(o.id) || o.id === ObjId.Coin;
      if (oneShot && t.used) continue;
      const dx = Math.abs(o.x - p.x);
      const dy = Math.abs(o.y - p.y);
      if (dx > 80 || dy > 120) continue;
      if (!overlaps(pa, triggerAABB(o))) continue;
      if (isOrb(o.id) && !input.pressed) continue;

      switch (o.id) {
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

  private isAtEnd(): boolean {
    for (const t of this.triggers) {
      if (t.obj.id === ObjId.Finish) return this.player.x >= t.obj.x;
    }
    return this.player.x >= levelEndX(this.level);
  }
}
