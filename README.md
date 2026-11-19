# Geometry Dash Recreation

A Geometry Dash-inspired game built **from scratch** with a custom TypeScript
engine. No Cocos2d, no Phaser, no PixiJS, no Three.js, no game framework — just
TypeScript, HTML5, CSS, WebGL 2 (with a Canvas 2D fallback), Web Audio, and
IndexedDB, plus a small Node.js/Express/SQLite backend for accounts and online
features.

## Highlights

- **Custom engine** — fixed-step physics (`FixedStepper`) decoupled from a
  `requestAnimationFrame` render loop, with interpolation, frame-delta clamping
  and tab-suspension handling.
- **Custom renderer** — a batched WebGL 2 triangle pipeline (one draw call per
  frame) with an automatic Canvas 2D fallback.
- **8 game modes** — Cube, Ship, Ball, UFO, Wave, Robot, Spider, Swing — each
  with distinct controls/physics.
- **Playable levels** — spikes, blocks, orbs, pads, speed/gravity/mode portals,
  coins, checkpoints, progress %, HUD, pause menu, practice mode.
- **Level editor** — place/erase objects on a grid, undo, save (IndexedDB),
  playtest.
- **Backend** — registration/login (scrypt-hashed passwords, opaque sessions),
  online levels with 4 visibility modes, per-user sharing with granular
  permissions, friends, comments, notifications. All permissions are enforced
  server-side.
- **Tests** — 17 frontend unit/integration tests (physics, collision, schema,
  stepping) and 6 backend API tests (accounts + the full sharing workflow).

## Quick start

### No npm — just open the game

`standalone.html` is a single self-contained file (game + menus + editor inlined,
56 KB). **Double-click it** to play — no install, no build step, no server. The
offline game and editor work directly from `file://`; the online features need
the backend running and the page served over http (see below).

To regenerate it after editing source:

```bash
node scripts/make-standalone.mjs
```

The online API URL defaults to `http://localhost:3000`; override it at runtime by
setting `window.GDR_API_URL` before the game loads (or build with
`VITE_API_URL` for the npm build).

### Frontend (development / tests)

```bash
npm install
npm run dev        # start Vite dev server at http://localhost:5173
npm test           # run unit/integration tests (vitest)
npm run build      # typecheck + production build into dist/
npm run preview    # preview the production build
```

### Backend (no npm)

```bash
node server/src/index.js             # starts http://localhost:3000 (SQLite at server/gdr.db)
node server/tests/api.test.mjs       # run the API integration tests
```

The backend uses only Node built-ins (`http`, `node:sqlite`, `node:crypto`) —
no install step and zero npm dependencies. Configure it with `PORT` and
`DB_PATH` environment variables (see `server/.env.example`).

To point the frontend at a non-default backend, build with:

```bash
VITE_API_URL=https://your-api.example.com npm run build
```

(The default is `http://localhost:3000` for local development.)

## Controls

- **Space / ↑ / W / tap** — jump / flap / flip gravity (mode-dependent).
- **Esc / P** — pause.
- **R** — restart.
- **Z** — practice-mode checkpoint toggle.
- In the editor: click to place, drag to pan, scroll to zoom, **✕** to erase,
  Delete to remove the selected object.

## Project structure

```
src/
  engine/       game loop, renderers (WebGL2 + Canvas2D), camera, input
  physics/      fixed stepper, collision (AABB + swept segment)
  gameplay/     Player (8 modes), LevelRuntime (collision/triggers/portals)
  levels/       level model, schema validation, serializer, builtin levels
  editor/       level editor
  audio/        Web Audio (generated SFX + synth music)
  ui/           DOM-based menus/HUD + online screen
  online/       ApiClient (typed backend client)
  storage/      localStorage settings + IndexedDB levels
  debug/        performance monitor
server/
  src/          Express + node:sqlite + scrypt backend
  tests/        API integration tests
tests/          frontend unit/integration tests
```

## What's tested

- **Physics** — cube jump height ≈64 units and length ≈136 at 1x, ship thrust,
  ball gravity flip, wave direction flip.
- **Runtime** — completes a level when jumping over a spike, dies when it
  doesn't, converts mode through portals.
- **Collision/stepper/schema** — AABB + swept tests, fixed-step clamping, JSON
  round-trip + validation.
- **Backend** — registration (duplicate username 409), login (wrong password
  401), logout, session invalidation, the **full specific-user sharing
  workflow** (private level → denied → share → accept → access → revoke →
  denied), edit-permission collaboration with version-conflict detection,
  public vs unlisted listing, friends, comments, notifications.

## Deployment

- **Frontend**: static site — deployable to GitHub Pages or any static host.
  `standalone.html` is the no-npm, self-contained build (game + menus + editor
  inlined). Configure the API URL at runtime via `window.GDR_API_URL` (or build
  with `VITE_API_URL` for the npm build).
- **Auto-deploy**: `.github/workflows/deploy.yml` publishes `standalone.html` as
  `index.html` to GitHub Pages on every push to `main` (no npm in CI). To enable
  it, set the repo's **Settings → Pages → Source = "GitHub Actions"**. After
  editing source, run `node scripts/make-standalone.mjs`, commit `standalone.html`,
  and push.
- **Backend**: a separate Node.js process. Configure via environment variables
  (see `server/.env.example`). Secrets live only in the server environment.
- If the backend is unreachable, the online screen reports the error instead of
  pretending to work.

## Known limitations / next steps

- The WebGL 2 path and UI were verified via typecheck/build and logic tests;
  visual/console behavior should be confirmed in a real browser.
- Triggers are currently limited to the core set (portals/orbs/pads/coins);
  the full modular trigger editor (color/move/alpha/etc.) is a natural next step.
- The backend uses `node:sqlite` (experimental in Node 24) — swap to a managed
  PostgreSQL for production, and add rate limiting + CSRF for public hosting.
- Achievements/quests/shops/leaderboards are stubbed in the architecture but not
  yet implemented end-to-end.
