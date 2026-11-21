import { expect, it } from 'vitest';
import { ObjId, portalMode, portalSpeed } from '../src/gameplay/GameModes';
import { LevelRuntime } from '../src/gameplay/LevelRuntime';
import { createEmptyLevel, type LevelObject } from '../src/levels/Level';

const dt = 1 / 120;
const idle = { pressed: false, held: false };
function run(objects: LevelObject[]) {
  const level = createEmptyLevel('Test track', 'Test');
  level.objects = [...objects, {id: ObjId.Finish, x: 2000, y: 15}];
  return new LevelRuntime(level);
}
const portals = [ObjId.CubePortal, ObjId.ShipPortal, ObjId.BallPortal, ObjId.UfoPortal,
  ObjId.WavePortal, ObjId.RobotPortal, ObjId.SpiderPortal, ObjId.SwingPortal,
  ObjId.GravityUp, ObjId.GravityDown, ObjId.SpeedSlow, ObjId.SpeedNormal, ObjId.SpeedFast,
  ObjId.SpeedFaster, ObjId.SpeedFastest, ObjId.MiniPortal, ObjId.NormalSizePortal];
it.each(portals)('portal %i applies once and rearms on retry', id => {
  const rt = run([{ id, x: 32, y: 15 }]);
  expect(rt.step(dt, idle).portalHit).toBe(true);
  if (portalMode(id) !== null) expect(rt.player.mode).toBe(portalMode(id));
  if (portalSpeed(id) !== null) expect(rt.player.speedMultiplier).toBe(portalSpeed(id));
  if (id === ObjId.MiniPortal) expect(rt.player.size).toBe(15);
  if (id === ObjId.GravityUp) expect(rt.player.gravitySign).toBe(-1);
  expect(rt.step(dt, idle).portalHit).toBe(false);
  rt.reset();
  expect(rt.step(dt, idle).portalHit).toBe(true);
});
it.each([ObjId.YellowOrb, ObjId.PinkOrb, ObjId.BlueOrb])('orb %i needs a fresh press', id => {
  const rt = run([{id, x: 33, y: 15}]);
  expect(rt.step(dt, idle).orbHit).toBe(false);
  expect(rt.step(dt, { pressed: true, held: true }).orbHit).toBe(true);
  expect(rt.step(dt, { pressed: true, held: true }).orbHit).toBe(false);
});
it.each([ObjId.YellowPad, ObjId.PinkPad, ObjId.BluePad])('pad %i fires on contact', id => {
  const rt = run([{id, x: 33, y: 15}]);
  expect(rt.step(dt, idle).padHit).toBe(true);
  expect(rt.step(dt, idle).padHit).toBe(false);
});
it('restores an in-flight tween, coins, visibility and player motion', () => {
  const rt = run([
    {id: ObjId.Block, x: 400, y: 100, groups: [2]},
    {id: ObjId.MoveGroup, x: 20, y: 0, props: {target: 2, dx: 120, duration: 1}},
    {id: ObjId.Coin, x: 82, y: 15},
  ]);
  rt.step(dt, idle);
  rt.addCheckpoint();
  for (let i = 0; i < 24; i++) rt.step(dt, idle);
  const expected = rt.player.snapshot();
  expect(rt.coinsCollected).toBe(1);
  expect(rt.level.objects[0].x).toBeCloseTo(424);
  rt.respawnAtCheckpoint();
  expect(rt.coinsCollected).toBe(0);
  expect(rt.isVisible(rt.level.objects[2])).toBe(true);
  for (let i = 0; i < 24; i++) rt.step(dt, idle);
  expect(rt.player.snapshot()).toEqual(expected);
  expect(rt.level.objects[0].x).toBeCloseTo(424);
  expect(rt.coinsCollected).toBe(1);
  rt.reset();
  expect(rt.level.objects[0].x).toBe(400);
});
it('bounds cyclic spawn and restores grouped geometry on restart', () => {
  const rt = run([
    {id: ObjId.SpawnGroup, x: 20, y: 15, groups: [1], props: {target: 1}},
    {id: ObjId.RotateGroup, x: 0, y: 0, groups: [1], props: {spawnOnly: 1, target: 2, angle: 45}},
    {id: ObjId.ScaleGroup, x: 0, y: 0, groups: [1], props: {spawnOnly: 1, target: 2, factor: 2}},
    {id: ObjId.ToggleGroup, x: 0, y: 0, groups: [1], props: {spawnOnly: 1, target: 2}},
    {id: ObjId.Block, x: 500, y: 15, groups: [2]},
  ]);
  rt.step(dt, idle);
  const block = rt.level.objects[4];
  expect(block.rotation).toBe(45);
  expect(block.scale).toBe(2);
  expect(rt.isVisible(block)).toBe(false);
  rt.reset();
  expect(block.rotation).toBeUndefined();
  expect(rt.isVisible(block)).toBe(true);
});
