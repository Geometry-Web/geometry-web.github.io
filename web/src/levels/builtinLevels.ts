// Built-in levels shipped with the game. These are plain JSON data so they can
// also be round-tripped through the serializer / storage layer.

import { type LevelData } from './Level';
import { ObjId } from '../gameplay/GameModes';

interface Obj { id: number; x: number; y: number; scale?: number; rotation?: number; }

function spike(x: number, y = 15): Obj {
  return { id: ObjId.Spike, x, y };
}

function block(x: number, y: number, scale = 1): Obj {
  return { id: ObjId.Block, x, y, scale };
}

function portal(id: number, x: number, y = 45): Obj {
  return { id, x, y };
}

/** The main built-in demo level: cube intro, pad jump, ship corridor, ball, finale. */
export function buildDemoLevel(): LevelData {
  const objects: Obj[] = [];
  objects.push({ id: ObjId.StartPos, x: 30, y: 15 });

  // Cube intro — single spikes, then a double spike.
  objects.push(spike(450));
  objects.push(spike(750));
  objects.push(spike(1050), spike(1080));
  objects.push(spike(1350));

  // Yellow pad launch over a spike, with a coin above the pad.
  objects.push({ id: ObjId.YellowPad, x: 1560, y: 15 });
  objects.push({ id: ObjId.Coin, x: 1660, y: 115 });
  objects.push(spike(1950));

  // Ship section: a tall corridor (ceiling blocks). Ship glides on the floor.
  objects.push(portal(ObjId.ShipPortal, 2100));
  for (let x = 2250; x <= 2850; x += 30) objects.push(block(x, 315));
  objects.push(portal(ObjId.CubePortal, 2850));

  // Ball section: roll on floor, flip up to a ceiling, dodge a floor spike.
  objects.push(portal(ObjId.BallPortal, 3000));
  for (let x = 3150; x <= 3750; x += 30) objects.push(block(x, 255));
  objects.push(spike(3300));
  objects.push(portal(ObjId.CubePortal, 3900));

  // Finale.
  objects.push(spike(4200));
  objects.push(spike(4500), spike(4530));
  objects.push({ id: ObjId.Finish, x: 4740, y: 15 });

  return {
    schemaVersion: 1,
    id: 'builtin-demo',
    name: 'Neon Rush',
    description: 'Cube, pad, ship, ball and a spicy finale.',
    creator: 'Engine',
    difficulty: 'normal',
    startSpeed: 1,
    objects,
    createdAt: 0,
    updatedAt: 0,
  };
}

/** A short, gentle level for warming up. */
export function buildWarmupLevel(): LevelData {
  const objects: Obj[] = [];
  objects.push({ id: ObjId.StartPos, x: 30, y: 15 });
  objects.push(spike(480));
  objects.push(spike(780));
  objects.push(spike(1080), spike(1110));
  objects.push({ id: ObjId.Finish, x: 1350, y: 15 });
  return {
    schemaVersion: 1,
    id: 'builtin-warmup',
    name: 'Warmup',
    description: 'A gentle start to get your timing.',
    creator: 'Engine',
    difficulty: 'easy',
    startSpeed: 1,
    objects,
    createdAt: 0,
    updatedAt: 0,
  };
}

export function builtinLevels(): LevelData[] {
  return [buildDemoLevel(), buildWarmupLevel()];
}
