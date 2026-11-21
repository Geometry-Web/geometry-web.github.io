# FEATURE TRACKER

Legend: ✅ done · 🟡 partial · ❌ not started

## Engine
- ✅ Custom fixed-step game loop with interpolation & tab-suspension handling
- ✅ WebGL 2 batched renderer + Canvas 2D fallback
- ✅ Camera, input manager, performance monitor
- 🟡 Object pooling (architecture supports it; particles reuse arrays)

## Gameplay
- ✅ Cube, Ship, Ball, UFO, Wave, Robot, Spider, Swing (8 modes)
- ✅ Spikes, blocks, orbs, pads, speed/gravity/mode portals, coins, checkpoints
- ✅ Swept collision, solid resolution, death/restart/complete, progress %
- ✅ HUD, pause menu, practice mode
- ✅ Particles + trail, generated audio (SFX + music)

## Levels
- ✅ Versioned JSON format, validation, serializer, import/export
- ✅ Built-in levels
- 🟡 Migration tooling (schema version field present; no migrator yet)

## Editor
- ✅ Place/erase on grid, pan/zoom, undo, save, playtest
- ❌ Copy/paste, multi-select, rotate/scale tools, layer/group management
- 🟡 Trigger editing (core triggers only)

## Accounts & online
- ✅ Registration/login/logout, scrypt hashing, opaque sessions
- ✅ Profiles, user search
- ✅ Online levels (4 visibility modes, pagination, search, versioning)
- ✅ Specific-user sharing (permissions, invitations, revoke, server-enforced)
- ✅ Friends, comments, notifications
- ❌ Achievements, quests, daily rewards, shops, treasure room, leaderboards
- ❌ Rate limiting, CSRF, admin/moderation panel, report system

## Storage & settings
- ✅ localStorage settings + IndexedDB levels
- ✅ Music/SFX volume, fullscreen
- ❌ Key rebinding, language selection, reduced-motion toggle (settings UI
  has fullscreen + volume only)

## Deployment & docs
- ✅ README, PROJECT_STATUS, FEATURE_TRACKER, server/.env.example
- ✅ Static frontend + separate backend, VITE_API_URL config
- ❌ GitHub Pages + backend deployment walkthrough (general guidance in README)
