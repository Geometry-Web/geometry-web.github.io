// The player entity: position, velocity, rotation and per-mode physics.
// Pure simulation (no DOM) so it can be unit tested against known GD physics.

import { aabb, clamp, type AABB } from '../physics/Collision';
import {
  GameMode,
  GRAVITY,
  JUMP_VELOCITY,
  UFO_JUMP_VELOCITY,
  SHIP_THRUST,
  SHIP_MAX_RISE,
  SHIP_MAX_FALL,
  BASE_SPEED,
  PLAYER_SIZE,
} from './GameModes';

export interface PlayerInput {
  /** True exactly on the frame a press begins (edge-triggered). */
  pressed: boolean;
  /** True while the button is held (level-triggered). */
  held: boolean;
}

export interface WorldBounds {
  /** y of the walkable floor top. */
  floorY: number;
  /** y of the walkable ceiling bottom (null = no ceiling). */
  ceilingY: number | null;
}

export const EMPTY_INPUT: PlayerInput = { pressed: false, held: false };

export class Player {
  x = 0;
  y = PLAYER_SIZE / 2;
  vx = 0;
  vy = 0;
  mode = GameMode.Cube;
  /** +1 = gravity pulls down (normal); -1 = gravity pulls up. */
  gravitySign = 1;
  rotation = 0;
  onGround = false;
  dead = false;
  size = PLAYER_SIZE;
  speedMultiplier = 1;

  private ufoCooldown = 0;
  private robotJumping = false;
  private waveDir = 1;

  snapshot() {
    return { x: this.x, y: this.y, vx: this.vx, vy: this.vy, mode: this.mode,
      gravitySign: this.gravitySign, rotation: this.rotation, onGround: this.onGround,
      speedMultiplier: this.speedMultiplier, size: this.size, ufoCooldown: this.ufoCooldown,
      robotJumping: this.robotJumping, waveDir: this.waveDir };
  }

  restore(state: ReturnType<Player['snapshot']>): void { Object.assign(this, state); }

  get speed(): number {
    return BASE_SPEED * this.speedMultiplier;
  }

  get aabb(): AABB {
    return aabb(this.x, this.y, this.size, this.size);
  }

  reset(x: number, y: number, mode = GameMode.Cube, gravitySign = 1): void {
    this.size = PLAYER_SIZE;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.mode = mode;
    this.gravitySign = gravitySign;
    this.rotation = 0;
    this.onGround = true;
    this.dead = false;
    this.speedMultiplier = 1;
    this.ufoCooldown = 0;
    this.robotJumping = false;
    this.waveDir = 1;
  }

  setMode(mode: GameMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.vy = 0;
  }

  setGravity(sign: 1 | -1): void {
    this.gravitySign = sign;
  }

  step(dt: number, input: PlayerInput, bounds: WorldBounds): void {
    switch (this.mode) {
      case GameMode.Cube: this.stepCube(dt, input, bounds); break;
      case GameMode.Ship: this.stepShip(dt, input, bounds); break;
      case GameMode.Ball: this.stepBall(dt, input, bounds); break;
      case GameMode.UFO: this.stepUFO(dt, input, bounds); break;
      case GameMode.Wave: this.stepWave(dt, input); break;
      case GameMode.Robot: this.stepRobot(dt, input, bounds); break;
      case GameMode.Spider: this.stepSpider(dt, input, bounds); break;
      case GameMode.Swing: this.stepSwing(dt, input, bounds); break;
    }
  }

  private stepCube(dt: number, input: PlayerInput, bounds: WorldBounds): void {
    this.vx = this.speed;
    if (input.pressed && this.onGround) {
      this.vy = this.gravitySign * JUMP_VELOCITY;
      this.onGround = false;
    }
    this.vy += -this.gravitySign * GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.applySurfaceClamp(bounds);
    if (!this.onGround) {
      this.rotation += 400 * dt;
    } else {
      this.rotation = 0;
    }
  }

  private stepShip(dt: number, input: PlayerInput, bounds: WorldBounds): void {
    this.vx = this.speed;
    this.vy += -this.gravitySign * GRAVITY * dt;
    if (input.held) this.vy += this.gravitySign * SHIP_THRUST * dt;

    // Clamp in the gravity frame (positive = moving "up" against gravity).
    let vrel = this.vy * this.gravitySign;
    if (vrel > SHIP_MAX_RISE) vrel = SHIP_MAX_RISE;
    if (vrel < -SHIP_MAX_FALL) vrel = -SHIP_MAX_FALL;
    this.vy = vrel * this.gravitySign;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.applySurfaceClamp(bounds);
    this.rotation = clamp(vrel * 0.05, -30, 30);
  }

  private stepBall(dt: number, input: PlayerInput, bounds: WorldBounds): void {
    this.vx = this.speed;
    if (input.pressed) this.gravitySign *= -1;
    this.vy += -this.gravitySign * GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.applySurfaceClamp(bounds);
    this.rotation += (this.vx / (this.size / 2)) * dt * 57.29578;
  }

  private stepUFO(dt: number, input: PlayerInput, bounds: WorldBounds): void {
    this.vx = this.speed;
    this.vy += -this.gravitySign * GRAVITY * dt;
    this.ufoCooldown -= dt;
    if (input.pressed && this.ufoCooldown <= 0) {
      this.vy = this.gravitySign * UFO_JUMP_VELOCITY;
      this.ufoCooldown = 0.1;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.applySurfaceClamp(bounds);
    this.rotation = 0;
  }

  private stepWave(dt: number, input: PlayerInput): void {
    this.vx = this.speed;
    this.waveDir = (input.held || input.pressed ? 1 : -1) * this.gravitySign;
    this.vy = this.waveDir * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.onGround = false;
    this.rotation = this.waveDir * 45;
  }

  private stepRobot(dt: number, input: PlayerInput, bounds: WorldBounds): void {
    this.vx = this.speed;
    if (input.pressed && this.onGround) {
      this.vy = this.gravitySign * JUMP_VELOCITY * 0.92;
      this.onGround = false;
      this.robotJumping = true;
    }
    if (this.robotJumping) {
      if (input.held && this.vy * this.gravitySign > 0) {
        // Hold to hover: fight gravity while rising.
        this.vy += this.gravitySign * GRAVITY * 0.72 * dt;
        if (this.vy * this.gravitySign > JUMP_VELOCITY) {
          this.vy = this.gravitySign * JUMP_VELOCITY;
        }
      } else {
        this.robotJumping = false;
      }
    }
    this.vy += -this.gravitySign * GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.applySurfaceClamp(bounds);
    this.rotation = this.onGround ? 0 : this.rotation + 320 * dt;
  }

  private stepSpider(dt: number, input: PlayerInput, bounds: WorldBounds): void {
    this.vx = this.speed;
    const half = this.size / 2;
    if (input.pressed) {
      this.gravitySign *= -1;
      if (this.gravitySign > 0) {
        this.y = bounds.floorY + half;
      } else if (bounds.ceilingY != null) {
        this.y = bounds.ceilingY - half;
      }
      this.vy = 0;
    }
    this.vy += -this.gravitySign * GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.applySurfaceClamp(bounds);
    this.rotation = this.gravitySign > 0 ? 0 : 180;
  }

  private stepSwing(dt: number, input: PlayerInput, bounds: WorldBounds): void {
    // Swing is a gravity-flip mode (same core control as ball) with a gentler
    // gravity for its own feel.
    this.vx = this.speed;
    if (input.pressed) this.gravitySign *= -1;
    this.vy += -this.gravitySign * GRAVITY * 0.9 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.applySurfaceClamp(bounds);
    this.rotation = this.gravitySign > 0 ? 0 : 180;
  }

  private applySurfaceClamp(bounds: WorldBounds): void {
    const half = this.size / 2;
    this.onGround = false;
    if (this.gravitySign > 0) {
      if (this.y - half <= bounds.floorY) {
        this.y = bounds.floorY + half;
        if (this.vy < 0) this.vy = 0;
        this.onGround = true;
      }
    } else if (bounds.ceilingY != null && this.y + half >= bounds.ceilingY) {
      this.y = bounds.ceilingY - half;
      if (this.vy > 0) this.vy = 0;
      this.onGround = true;
    }
  }
}
