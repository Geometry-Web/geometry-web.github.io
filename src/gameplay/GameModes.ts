// Game modes, object IDs and physics constants for the custom engine.
// Coordinates follow the Geometry Dash convention: 1 block = 30 units,
// y increases upward, the ground line sits at y = 0 and the player runs on it
// with its center at y = 15. All physics values are expressed per second so the
// fixed timestep can be anything.

/** 1 block in world units. */
export const BLOCK = 30;
/** The player hitbox is a square of this size (one block). */
export const PLAYER_SIZE = 30;

/** Gravity magnitude (units/s^2). */
export const GRAVITY = 3200;
/** Initial upward velocity of a cube/robot jump (units/s). */
export const JUMP_VELOCITY = 640;
/** Upward velocity of a UFO hop. */
export const UFO_JUMP_VELOCITY = 560;
/** Ship thrust acceleration (units/s^2). */
export const SHIP_THRUST = 4000;
/** Ship vertical speed limits (units/s). */
export const SHIP_MAX_RISE = 520;
export const SHIP_MAX_FALL = 640;

/** Base horizontal speed at 1x (units/s). */
export const BASE_SPEED = 340;

export enum GameMode {
  Cube = 0,
  Ship = 1,
  Ball = 2,
  UFO = 3,
  Wave = 4,
  Robot = 5,
  Spider = 6,
  Swing = 7,
}

export enum Speed {
  Slow = 0.8,
  Normal = 1,
  Fast = 1.25,
  Faster = 1.5,
  Fastest = 2,
}

/** Object type IDs (mirrors Geometry Dash object IDs for familiarity). */
export enum ObjId {
  Block = 1,
  Spike = 8,

  YellowOrb = 36,
  PinkOrb = 141,
  BlueOrb = 84,

  YellowPad = 35,
  PinkPad = 140,
  BluePad = 67,

  CubePortal = 12,
  ShipPortal = 13,
  BallPortal = 47,
  UfoPortal = 111,
  WavePortal = 660,
  RobotPortal = 745,
  SpiderPortal = 1331,
  SwingPortal = 1933,

  GravityUp = 10,
  GravityDown = 11,

  SpeedSlow = 200,
  SpeedNormal = 201,
  SpeedFast = 202,
  SpeedFaster = 203,
  SpeedFastest = 1334,

  StartPos = 31,
  Coin = 1329,
  Checkpoint = 40,
  Finish = 9999,
}

export function isSolid(id: number): boolean {
  return id === ObjId.Block;
}

export function isHazard(id: number): boolean {
  return id === ObjId.Spike;
}

export function isOrb(id: number): boolean {
  return id === ObjId.YellowOrb || id === ObjId.PinkOrb || id === ObjId.BlueOrb;
}

export function isPad(id: number): boolean {
  return id === ObjId.YellowPad || id === ObjId.PinkPad || id === ObjId.BluePad;
}

export function isPortal(id: number): boolean {
  return (
    id === ObjId.CubePortal ||
    id === ObjId.ShipPortal ||
    id === ObjId.BallPortal ||
    id === ObjId.UfoPortal ||
    id === ObjId.WavePortal ||
    id === ObjId.RobotPortal ||
    id === ObjId.SpiderPortal ||
    id === ObjId.SwingPortal ||
    id === ObjId.GravityUp ||
    id === ObjId.GravityDown ||
    id === ObjId.SpeedSlow ||
    id === ObjId.SpeedNormal ||
    id === ObjId.SpeedFast ||
    id === ObjId.SpeedFaster ||
    id === ObjId.SpeedFastest
  );
}

const PORTAL_TO_MODE: Record<number, GameMode> = {
  [ObjId.CubePortal]: GameMode.Cube,
  [ObjId.ShipPortal]: GameMode.Ship,
  [ObjId.BallPortal]: GameMode.Ball,
  [ObjId.UfoPortal]: GameMode.UFO,
  [ObjId.WavePortal]: GameMode.Wave,
  [ObjId.RobotPortal]: GameMode.Robot,
  [ObjId.SpiderPortal]: GameMode.Spider,
  [ObjId.SwingPortal]: GameMode.Swing,
};

export function portalMode(id: number): GameMode | null {
  return PORTAL_TO_MODE[id] ?? null;
}

const SPEED_PORTAL_TO_SPEED: Record<number, Speed> = {
  [ObjId.SpeedSlow]: Speed.Slow,
  [ObjId.SpeedNormal]: Speed.Normal,
  [ObjId.SpeedFast]: Speed.Fast,
  [ObjId.SpeedFaster]: Speed.Faster,
  [ObjId.SpeedFastest]: Speed.Fastest,
};

export function portalSpeed(id: number): Speed | null {
  return SPEED_PORTAL_TO_SPEED[id] ?? null;
}

/** Friendly label for a game mode (used by HUD/editor). */
export function modeLabel(mode: GameMode): string {
  switch (mode) {
    case GameMode.Cube: return 'Cube';
    case GameMode.Ship: return 'Ship';
    case GameMode.Ball: return 'Ball';
    case GameMode.UFO: return 'UFO';
    case GameMode.Wave: return 'Wave';
    case GameMode.Robot: return 'Robot';
    case GameMode.Spider: return 'Spider';
    case GameMode.Swing: return 'Swing';
  }
}
