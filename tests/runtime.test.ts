import { describe, it, expect } from 'vitest';
import { LevelRuntime } from '../src/gameplay/LevelRuntime';
import { ObjId } from '../src/gameplay/GameModes';
import { type LevelData } from '../src/levels/Level';

const dt = 1 / 120;

function makeLevel(objects: { id: number; x: number; y: number }[]): LevelData {
  return {
    schemaVersion: 1,
    id: 'test',
    name: 'test',
    description: '',
    creator: 'test',
    difficulty: 'normal',
    startSpeed: 1,
    objects,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('LevelRuntime', () => {
  it('completes when the player jumps over a spike', () => {
    const rt = new LevelRuntime(
      makeLevel([
        { id: ObjId.StartPos, x: 30, y: 15 },
        { id: ObjId.Spike, x: 450, y: 15 },
        { id: ObjId.Finish, x: 900, y: 15 },
      ]),
    );
    let jumped = false;
    for (let i = 0; i < 3000; i++) {
      let pressed = false;
      if (!jumped && rt.player.x >= 385) {
        pressed = true;
        jumped = true;
      }
      const ev = rt.step(dt, { pressed, held: false });
      if (ev.died || ev.completed) break;
    }
    expect(rt.dead).toBe(false);
    expect(rt.completed).toBe(true);
  });

  it('dies when running straight into a spike', () => {
    const rt = new LevelRuntime(
      makeLevel([
        { id: ObjId.StartPos, x: 30, y: 15 },
        { id: ObjId.Spike, x: 450, y: 15 },
        { id: ObjId.Finish, x: 900, y: 15 },
      ]),
    );
    for (let i = 0; i < 3000; i++) {
      const ev = rt.step(dt, { pressed: false, held: false });
      if (ev.died || ev.completed) break;
    }
    expect(rt.dead).toBe(true);
  });

  it('converts game mode when passing a portal', () => {
    const rt = new LevelRuntime(
      makeLevel([
        { id: ObjId.StartPos, x: 30, y: 15 },
        { id: ObjId.ShipPortal, x: 300, y: 45 },
        { id: ObjId.Finish, x: 600, y: 15 },
      ]),
    );
    for (let i = 0; i < 3000; i++) {
      const ev = rt.step(dt, { pressed: false, held: false });
      if (ev.died || ev.completed) break;
    }
    expect(rt.player.mode).toBe(1); // GameMode.Ship
  });
});
