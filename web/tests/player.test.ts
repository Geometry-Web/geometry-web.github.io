import { describe, it, expect } from 'vitest';
import { Player } from '../src/gameplay/Player';
import { GameMode, GRAVITY, JUMP_VELOCITY } from '../src/gameplay/GameModes';

const bounds = { floorY: 0, ceilingY: null };
const dt = 1 / 120;

function simulateJump(): { apex: number; landX: number; airSteps: number } {
  const p = new Player();
  p.reset(0, 15, GameMode.Cube, 1);
  let apex = 0;
  let landX = 0;
  let airSteps = 0;
  for (let i = 0; i < 240; i++) {
    p.step(dt, { pressed: i === 0, held: false }, bounds);
    apex = Math.max(apex, p.y);
    airSteps = i;
    if (i > 0 && p.onGround) {
      landX = p.x;
      break;
    }
  }
  return { apex, landX, airSteps };
}

describe('cube physics', () => {
  it('calibration: jump height is ~64 units and length ~136 at 1x', () => {
    const h = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
    expect(h).toBeCloseTo(64, 0);
  });

  it('a cube jump reaches ~2 blocks high and ~136 units long', () => {
    const r = simulateJump();
    expect(r.apex).toBeGreaterThan(70);
    expect(r.apex).toBeLessThan(90);
    expect(r.landX).toBeGreaterThan(120);
    expect(r.landX).toBeLessThan(155);
    expect(r.airSteps).toBeGreaterThan(40);
    expect(r.airSteps).toBeLessThan(60);
  });
});

describe('mode physics', () => {
  it('ball flips gravity on tap', () => {
    const p = new Player();
    p.reset(0, 15, GameMode.Ball, 1);
    p.step(dt, { pressed: true, held: false }, bounds);
    expect(p.gravitySign).toBe(-1);
  });

  it('ship thrusts upward while holding', () => {
    const p = new Player();
    p.reset(0, 15, GameMode.Ship, 1);
    p.step(dt, { pressed: false, held: true }, bounds);
    expect(p.vy).toBeGreaterThan(0);
  });

  it('wave rises while held and descends on release', () => {
    const p = new Player();
    p.reset(0, 100, GameMode.Wave, 1);
    p.step(dt, { pressed: false, held: false }, bounds);
    const first = p.vy;
    p.step(dt, { pressed: true, held: false }, bounds);
    expect(p.vy).toBeCloseTo(-first, 0);
    p.step(dt, { pressed: false, held: true }, bounds);
    expect(p.vy).toBeGreaterThan(0);
    p.step(dt, { pressed: false, held: false }, bounds);
    expect(p.vy).toBeLessThan(0);
  });
});
