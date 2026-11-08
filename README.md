# Geometry Web

A **playable, original** Geometry-Dash-style side-scroller built on the
[cocos2d-html5](https://github.com/cocos2d/cocos2d-html5) framework (MIT),
with an optional C++20 gameplay runtime that can be compiled to WebAssembly.

This is an **independent implementation** — not a copy of Geometry Dash. The
`GD-Decompiled/` workspace was used only as a *design/architecture reference*
(names of systems and standard genre mechanics), never as a source to copy. All
code and assets here are original; visuals and audio are generated procedurally.

## Status

- **Playable browser game** — cube/ship/ball/wave modes, gravity, jump, ground,
  obstacles (blocks + spikes), collision, death/restart, camera follow, orbs,
  pads, portals, speed changes, coins, finish, synthesized music + SFX.
- **Level editor** — place/select/move/delete objects, grid snap, save/load, test.
- **Trigger system** — move / rotate / pulse / alpha / toggle.
- **C++20 runtime** — mirrors the simulation; native unit tests pass; a WASM
  build script is provided (Emscripten is not installed in this environment).

## Quick start

```bash
python serve.py
# then open http://localhost:8000/
```

The game must be served over HTTP (cocos2d-html5 loads its engine modules via XHR).

## Controls

| Input | Action |
| --- | --- |
| Space / Up / W / click / tap | Jump (hold for ship thrust / wave up) |
| 1..7 | Select level (menu) |
| E | Open level editor |
| M | Mute |
| R | Restart level |
| Esc | Back to menu |

Editor: `1..7` pick object, click to place/select, arrow keys move (or pan when
nothing selected), `Del` remove, `P` test, `S` save, `L` load, `Esc` menu.

## Project layout

```
GeometryWeb/
├── index.html, cocos2d.js, main.js      bootstrap + loader config
├── frameworks/cocos2d-html5/            the cocos2d-html5 engine (MIT)
├── src/
│   ├── config.js, math.js, input.js, audio.js, level.js
│   ├── sim/Simulation.js                deterministic movement model
│   ├── rendering/Renderer.js            cc.Node/DrawNode/LayerColor helpers
│   ├── objects/  players/ scenes/ systems/ triggers/ editor/ menus/
│   ├── bridge.js                        WASM <-> JS bridge (with JS fallback)
│   └── app.js                           cc.Application bootstrap
├── runtime/                             C++20 runtime + Emscripten/CMake
├── levels/                              sample level (JSON format)
├── tests/                               JS + native unit tests
└── docs/                                build + architecture notes
```

## Tests

```bash
node tests/run_tests.js                # JS simulation tests
powershell -File runtime/build_native.ps1   # C++ native build + tests
```

See `docs/BUILD.md` for full build instructions, and `docs/architecture.md`
for how the systems map to the genre and to the earlier analysis.
