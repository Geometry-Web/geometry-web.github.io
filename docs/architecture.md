# Architecture notes

## Provenance (important)

`GeometryWeb/` is an **original** implementation. The earlier `GD-Decompiled/`
workspace (PE analysis, 19,380 function boundaries, 739 RTTI class names,
disassembly, CFGs) was consulted only to understand *what systems a
Geometry-Dash-style game contains* and *standard genre mechanics* — e.g. that
there is a `GameManager`, a `PlayLayer`, a `PlayerObject` with distinct modes
(cube/ship/ball/…), `GameObject`s, orbs, pads, portals, and a level editor.

No code, pseudocode, or constants were copied from the Geometry Dash binary. The
gameplay numbers in `src/config.js` are our own tuning. Every file is new code.

## Layering

```
Input (DOM) ──> GameScene.update(dt) ──> bridge.step ──> Simulation (JS) or WASM
                    │                                      │
                    ├── Collision (objects)                └── State {x,y,vy,mode,...}
                    ├── Camera (moves world layer)
                    ├── Triggers (cc actions)
                    └── HUD
   Rendering: cocos2d-html5 cc.Scene / cc.Layer / cc.DrawNode / cc.LayerColor
```

- **`src/sim/Simulation.js`** is the deterministic movement model with no
  rendering dependency, so the exact math can be mirrored in C++ (`runtime/`).
- **`src/bridge.js`** marshals the `State` to/from the C ABI. If the WASM
  runtime is present it steps in WebAssembly; otherwise it calls the JS sim.
- **`runtime/`** is a self-contained C++20 mirror (`gd::step`, `gd::overlap`)
  plus a C ABI binding (`gd_step`). Native unit tests validate parity with the
  JS model.

## System map (genre reference vs. implementation)

| Concept (from analysis) | Implementation here |
| --- | --- |
| GameManager | `GD.GameState` + `GameScene` lifecycle (attempts, coins, progress) |
| PlayLayer | `src/scenes/GameScene.js` |
| PlayerObject (modes) | `src/objects/Player.js` + `Simulation.js` (cube/ship/ball/wave) |
| GameObject | `src/objects/GameObject.js` factory (block/spike/orb/pad/portal/speed/coin/finish) |
| Camera | `src/systems/Camera.js` |
| Level format | `src/level.js` + `levels/sample.json` |
| Editor | `src/scenes/EditorScene.js` |
| Triggers | `src/triggers/Triggers.js` (move/rotate/pulse/alpha/toggle) |
| Collision | `src/systems/Collision.js` (AABB + circle checks) |

## Implemented vs. simplified (marked)

- **Fully implemented:** cube + ship + ball + wave movement, gravity, jump,
  ground, blocks/spikes, orbs (jump/gravity), pads, mode portals, speed portals,
  coins, finish, death/restart, camera, synthesized audio, keyboard + pointer.
- **Simplified (independent interpretation, not a faithful reconstruction):**
  - Triggers: a generic `move/rotate/pulse/alpha/toggle` set that animates
    objects with cocos2d actions when the player passes the trigger.
  - Editor: basic placement/selection/move/delete, grid snap, save/load.
  - The UFO / robot / spider / swing modes have distinct *visuals* but currently
    fall back to cube physics (documented in `Player.js`).
- **Not implemented:** the full Geometry Dash trigger/effect ID system, online
  features, and the complete roster of 8 modes.

## WASM integration

The C ABI is intentionally tiny and frameless so it can be tested natively and
compiled to WebAssembly without change. See `docs/BUILD.md` and
`runtime/bindings/gd_bindings.cpp` for the exact layout.
