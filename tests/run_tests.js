#!/usr/bin/env node
/**
 * Geometry Web — JavaScript unit tests.
 * Run with:  node tests/run_tests.js
 * Loads the pure-logic modules (config, math, simulation) with a minimal
 * window shim and asserts the movement model behaves as expected.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

// Browser-like sandbox: window is the sandbox global, so `window.GD` and bare
// `GD` both resolve to sandbox.GD.
var root = path.join(__dirname, '..', 'src');
var sandbox = { console: console };
sandbox.window = sandbox;
vm.createContext(sandbox);

function load(rel) {
    var code = fs.readFileSync(path.join(root, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
}
load('config.js');
load('math.js');
load('sim/Simulation.js');

var failures = 0;
function check(cond, msg) {
    if (!cond) { console.error('FAIL: ' + msg); failures++; }
}

var GD = sandbox.GD;
var C = GD.C, Sim = GD.Sim, Mode = GD.Mode;

// 1) Cube jump.
var s = Sim.createState(Mode.CUBE, 120, 75);
Sim.step(s, { pressed: true, held: false }, 1 / 60);
check(!s.onGround, 'cube leaves the ground on jump');
check(s.vy > 0, 'cube has upward velocity after jump');

// 2) Gravity reverses velocity while airborne (~0.33s, before the ~0.52s landing).
for (var i = 0; i < 20; i++) Sim.step(s, { pressed: false, held: false }, 1 / 60);
check(s.vy < 0, 'gravity reverses the vertical velocity');
check(!s.onGround, 'cube is still airborne at 0.33s');

// 3) The cube lands back on the ground.
for (var j = 0; j < 120; j++) Sim.step(s, { pressed: false, held: false }, 1 / 60);
check(s.onGround, 'cube lands back on the ground');

// 4) Mode switch to ship sets the correct collision size.
Sim.setMode(s, Mode.SHIP);
check(s.size === C.shipHeight, 'ship mode sets size to shipHeight');

// 5) Horizontal auto-scroll advances x.
var x0 = s.x;
Sim.step(s, { pressed: false, held: false }, 1 / 60);
check(s.x > x0, 'horizontal auto-scroll advances x');

// 6) Ship rises while holding thrust.
Sim.reset(s, 120, 75);
Sim.setMode(s, Mode.SHIP);
var y0 = s.y;
for (var k = 0; k < 20; k++) Sim.step(s, { pressed: false, held: true }, 1 / 60);
check(s.y > y0, 'ship rises while holding thrust');

// 7) UFO hops mid-air.
Sim.reset(s, 120, 75);
Sim.setMode(s, Mode.UFO);
for (var u = 0; u < 5; u++) Sim.step(s, { pressed: false, held: false }, 1 / 60);
Sim.step(s, { pressed: true, held: false }, 1 / 60);
check(s.vy > 0, 'ufo hops upward');

// 8) Robot charge -> release jump.
Sim.reset(s, 120, 75);
Sim.setMode(s, Mode.ROBOT);
for (var r = 0; r < 12; r++) Sim.step(s, { pressed: false, held: true }, 1 / 60);
check(s.charge > 0, 'robot charges while holding');
Sim.step(s, { pressed: false, held: false }, 1 / 60);
check(s.vy > 0 && !s.onGround, 'robot jumps on release');

// 9) Spider teleports to floor.
Sim.reset(s, 120, 75);
Sim.setMode(s, Mode.SPIDER);
s.y = 200; s.onGround = false;
Sim.step(s, { pressed: true, held: false }, 1 / 60);
check(s.onGround, 'spider teleports to ground');

// 10) Math helpers.
check(GD.math.clamp(5, 0, 3) === 3, 'clamp clamps to hi');
check(GD.math.aabbOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), 'aabb overlap true');
check(!GD.math.aabbOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 5, h: 5 }), 'aabb overlap false');

if (failures === 0) {
    console.log('All JS simulation tests passed.');
    process.exit(0);
} else {
    console.error(failures + ' test(s) FAILED.');
    process.exit(1);
}
