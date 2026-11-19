# PROJECT STATUS

## What works

**Custom engine**
- Fixed-step physics accumulator (`FixedStepper`) with interpolation, frame-delta
  clamping (max 0.25s) and backlog dropping after tab suspension.
- `requestAnimationFrame` loop that runs physics at a fixed 120 Hz and renders at
  the display refresh rate.
- Batched WebGL 2 renderer (single shader, one draw call/frame) with an automatic
  Canvas 2D fallback.
- Camera (follow + smooth vertical), input manager (keyboard + pointer), object
  pooling-friendly rendering, performance monitor (FPS/frame times/object counts).

**Gameplay**
- 8 game modes (Cube, Ship, Ball, UFO, Wave, Robot, Spider, Swing) with distinct
  physics and controls.
- Spikes, blocks, yellow/pink/blue orbs and pads, speed/gravity/mode portals,
  coins, checkpoints, start/finish.
- Swept AABB hazard tests (no tunneling at high speed), solid block resolution.
- HUD (progress bar + %), pause menu (resume/restart/practice/exit/volume),
  practice mode with checkpoints, death/complete overlays, particles + trail,
  synthesized SFX and a looping synth music bed.

**Level system**
- Versioned JSON level format + validation + serializer (save/load/import/export).
- Two built-in levels ("Neon Rush" demo, "Warmup").

**Editor**
- Place/erase objects on a snap grid, pan + zoom, undo, save to IndexedDB,
  playtest.

**Backend (server/)**
- Registration/login/logout with scrypt-hashed passwords and opaque session
  tokens (7-day expiry).
- Profiles, user search, friend requests/accept/reject, comments, notifications.
- Online levels with 4 visibility modes (private / specific / unlisted / public),
  pagination, search, versioned updates with conflict detection, publish/delete.
- Specific-user sharing: invitations with granular permissions (view/play/
  comment/copy/edit), accept/reject, revoke. All permission checks are enforced
  server-side.

**Frontend ↔ backend**
- `ApiClient` (typed) + an online screen (login/register, browse public levels,
  download & play, publish current level, accept invitations).

## What has been tested

- **17 frontend tests** (`npm test`, all passing): collision AABB + swept segment,
  fixed stepper clamping, cube jump height ≈64 / length ≈136, ship/ball/wave
  behavior, runtime complete-on-jump / die-on-spike / portal mode conversion,
  level schema validation + JSON round-trip.
- **6 backend integration tests** (`cd server && npm test`, all passing):
  registration (duplicate → 409), login (wrong password → 401), logout +
  session invalidation, the full specific-user sharing workflow
  (private → denied → share → accept → access → revoke → denied), edit-permission
  collaboration with version-conflict (409), public-vs-unlisted listing, friends,
  comments, notifications.
- **Build**: `npm run build` succeeds (TypeScript typecheck + Vite bundle).

## What was measured

- Bundle size: ~52 KB JS (16 KB gzipped) + ~5 KB CSS.
- Tests: 17 frontend (≈1.5s), 6 backend (≈0.7s).
- Performance was not measured in a live browser (no browser available in this
  environment); the renderer is designed for one draw call/frame and the
  performance monitor is wired to show FPS/frame times when run.

## Backend required

Yes — accounts, online levels, sharing, friends, comments and notifications all
require the Node.js backend (`server/`). The frontend runs as a static site and
reports connection failures rather than faking success.

## How to run

- Frontend: `npm install && npm run dev` (then open http://localhost:5173).
- Backend: `cd server && npm install && npm start` (http://localhost:3000).

## What remains incomplete

- The WebGL 2 path and the overall UI were verified by typecheck/build + logic
  tests; they should be visually confirmed in a real browser.
- Full modular trigger editor (color/move/alpha/pulse/rotate/shake/etc.) — only
  the core triggers are implemented.
- Achievements, quests, daily rewards, shops/treasure room, and leaderboards are
  architecturally present but not implemented end-to-end.
- Rate limiting, CSRF, and moderation/admin tooling are stubbed, not finished.
- `node:sqlite` is experimental in Node 24; switch to PostgreSQL for production.

## Next steps

1. Browser-based visual/console verification and 120 FPS measurement.
2. Finish the trigger system and the full editor (copy/paste, multi-select, layers).
3. Add rate limiting, CSRF, and an admin panel to the backend.
4. Implement achievements/quests/leaderboards/economy on top of the existing
   accounts + notifications foundations.
