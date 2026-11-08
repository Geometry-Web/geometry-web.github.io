# Geometry Web — Feature Status

Grounded in the recovered analysis (RTTI class names in
`GD-Decompiled/classes/rtti_class_names.txt`: `PlayerObject`, `PlayLayer`,
`GJBaseGameLayer`, `LevelEditorLayer`, `GameManager`, `GJEffectManager`,
`GJGameLevel`, `GameObject`, `CheckpointGameObject`, trigger classes, `CCSprite`,
`CCSpriteBatchNode`, …). This tracks what is implemented vs. simplified vs. missing.

## Player modes (PlayerObject)
| Mode | Status | Mechanics |
| --- | --- | --- |
| Cube | done | gravity + fixed jump; rotates in air, snaps to 90° |
| Ship | done | hold to thrust, release to fall; tilts with velocity |
| Ball | done | tap flips gravity with an impulse |
| UFO | done | tap = mid-air hop; no rotation |
| Wave | done | hold up / release down; no gravity |
| Robot | done | hold to charge, release to jump (height ∝ charge) |
| Spider | done | tap teleports to the surface in the gravity direction |
| Swing | simplified | tap flips gravity (arc-like); mild tilt |

## Objects (GameObject)
Done: block, spike, orb (jump/gravity), pad (jump/gravity), mode portals
(cube/ship/ball/ufo/wave/robot/spider/swing), gravity portal, size portal
(mini/big), speed portal, coin, finish, checkpoint.

## Triggers (GJEffectManager evidence)
Done: move, rotate, pulse, alpha, toggle — a simplified generic design.
Missing: the full GD trigger/effect-ID system (groups, spawn loops, timers,
sequences, count/random/transform triggers).

## Cocos2d classes used
`cc.Scene`, `cc.Layer`, `cc.Node`, `cc.Sprite` (procedurally-drawn textures),
`cc.Texture2D` + `cc.SpriteFrame` (via sprite), `cc.DrawNode`, `cc.LayerColor`,
`cc.LabelTTF`, `cc.ParticleSystem` (death/coin bursts), `cc.Follow` (camera).

## Systems
- **Simulation** (`src/sim/Simulation.js`) — deterministic, mirrored in C++20
  (`runtime/`) with a C ABI (`gd_step`) for WebAssembly; native tests pass.
- **Collision** (`src/systems/Collision.js`) — AABB + circle; block landing,
  hazards, orbs/pads/portals/coins/finish/checkpoint.
- **Camera** — `cc.Follow` (horizontal follow; ground locked to bottom).
- **Particles** — `cc.ParticleSystem` bursts + lightweight custom dots.
- **Audio** — WebAudio synth (original SFX + music loop).
- **Level editor** — place/select/move/delete, grid snap, save/load, test.
- **HUD** — attempts, coins, progress %.

## Missing / simplified
- Full GD trigger/effect-ID system; online features; practice mode; song library.
- Two-player mode.
- Dedicated sprite sheets (currently procedural icons).
