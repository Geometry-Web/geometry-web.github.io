# PROJECT_STATUS

Status of the Geometry Dash 2.2 recreation in this repository (`web/`), measured
against the specification. Every line is either **done** (shipped and verified in
a browser), **partial** (works, but not the full feature) or **missing**.

Verification method: headless Chromium/Edge probes in `../.tmp-verify/`
(`probe-flow.js`, `probe-sweep.js`, `probe-complete.js`, `probe-import.js`,
`probe-mode.js`, `probe-ui.js`, `probe-account.js` …) that drive the real canvas
and screenshot 960x540 frames. Nothing below is claimed without such a run.

The account stack is additionally verified two ways: `server/npm test` boots the
real API and drives it over HTTP (33 tests), and `probe-account.js` boots the
site in headless Edge against a live API process, registers a player through
`GD.Account`, and opens the account, shared, friends, messages and notification
screens with no page errors.

## 1. Shell, engine and deployment

| Item | State | Where |
| --- | --- | --- |
| cocos2d-html5 v2.2.3 boot, 960x540 SHOW_ALL | done | `index.html`, `cocos2d.js`, `main.js` |
| Resource manifest, graceful degradation on 404 | done | `src/resource.js`, `GD.sprite()` |
| Sprite-sheet loading (`GJ_GameSheet` 01-04, Icons, plus menu/shop/gauntlet/treasure/vault sheets) | done | `src/core/GD.js` |
| Icon set: 1205 loose SD icons + manifest | done | `res/gd/icons/`, `tools/icon-manifest.js` |
| GitHub Pages deploy (Actions, `.nojekyll`, no build step) | done | `.github/workflows/deploy.yml`, `docs/DEPLOY.md` |

## 2. Shared UI kit

| Item | State | Where |
| --- | --- | --- |
| Gradient/menu backgrounds, ground strip | done | `GD.UI.background`, `GD.UI.menuBackground`, `GD.UI.ground` |
| Buttons (label + icon), round icon buttons | done | `GD.UI.button`, `GD.UI.iconButton` |
| Panels (nine-slice), popups, alert, confirm, toast, spinner | done | `GD.UI.panel/popup/alert/confirm/toast/loading` |
| Toggles, sliders, progress bars, counters | done | `GD.UI.toggle/slider/progress/counter` |
| Virtual scrolling list (shared by every new list screen) | done | `GD.UI.list` (`src/core/UIList.js`) |
| Scene transitions + back stack | done | `GD.Nav` (`src/core/Nav.js`) |

## 3. Menus

| Screen | State | Notes |
| --- | --- | --- |
| Main menu (logo, play, create, garage, daily, socials, achievements, options, stats, creator, secret, news) | done | `MainMenuLayer`, art from `GJ_GameSheet03/04` |
| Level select (official levels, virtual rows, best %, import) | done | `LevelSelectLayer` |
| Create hub (5x3 category grid) | partial | every tile opens a real screen; "editor" still placeholder while the editor is built |
| Icon Kit (9 modes + hearts, paging, selection) | done | `GarageLayer`, `res/gd/icons` |
| Colour customisation (primary/secondary, glow, shop colours) | done | `ColorScene` (`src/screens/Colors.js`) |
| Profile | done | `ProfileScene` |
| Stats / achievements | done | `StatsScene`, `AchievementsScene` |
| Settings | done | `SettingsScene` (persists through `GD.Save.settings`) |
| Online browser (search, recent, downloads, likes, trending, featured, magic, followed + filters + level info + comments) | done | `OnlineScene` on the simulated provider |
| Daily level / quests / chests | done | `DailyScene` |
| Map packs, gauntlets, lists | done | `PacksScene` |
| Shops (community, mechanic, scratch, diamond) | done | `ShopScene` |
| Vault, Vault of Secrets, Chamber of Time | done | `VaultScene` with code entry |
| Treasure room | done | `TreasureScene` |
| News / credits / about | done | `NewsScene` |

## 4. Gameplay

| Item | State | Notes |
| --- | --- | --- |
| Nine modes (cube, ship, ball, UFO, wave, robot, spider, swing, jetpack) | done | `PLAY_LAYOUT.modes`, physics per mode |
| Gravity / speed / size / mode / mirror / teleport portals | done | `usePortal` dispatches on kind; mirror flips the view, size shrinks the hitbox, teleport jumps to the paired portal |
| Orbs (yellow, blue, pink, green, red, black), pads (yellow, blue, pink) | done | `PLAY_LAYOUT.orbs/pads` |
| Collision, camera, vertical camera, attempt counter, best % | done | `PlayLayer` |
| Death (particles, sound, auto-retry) | done | |
| Completion (banner, coins, stats, rewards) | done | `completeLevel()` |
| HUD (progress bar, %, attempts, pause) | done | bar/%/attempts + pause button |
| Pause menu (continue, restart, practice, exit, volumes, progress) | done | `PlayLayer.openPause()` |
| Practice mode (auto checkpoints, respawn at checkpoint, practice %) | done | `PlayLayer.setPractice/maybeCheckpoint/respawn` |
| Platformer mode | missing | needs the 2.2 platformer level set (`--all` import) |
| Keyboard input (space/up jump, R restart, P/Esc pause) | done | `PlayLayer.bindKeys()` |
| Leaderboards | done (simulated) | `LeaderboardScene` |

## 5. Editor

| Item | State | Notes |
| --- | --- | --- |
| Build / edit / delete modes, object palette | done | `EditorScene` |
| Place, select, drag, rotate, scale, delete, copy/paste, undo/redo | done | |
| Grid + snap, pan, zoom, camera buttons | done | |
| Object properties (position, rotation, scale, colour, group, z) | done | |
| Trigger objects (colour, move, toggle, spawn, alpha, pulse) | partial | colour/toggle/alpha/pulse act on gameplay objects |
| Level settings, save/load, export, playtest | done | saved through `GD.Levels.remember` |

## 6. Persistence and services

| Item | State | Notes |
| --- | --- | --- |
| Versioned save (profile, stats, settings, levels, achievements, unlocks) | done | `src/core/Save.js` |
| Simulated online provider, clearly labelled in UI | done | `GD.Online` (`src/services/Online.js`) |
| Account backend (Node + Express + SQLite) | done | `server/` — see `server/README.md` |
| Registration, login, logout, password change, account deletion | done | `server/src/modules/authRoutes.js`; screens `src/screens/Account.js` |
| Persistent server profiles (icons, colours, description, stats, wallet) | done | `server/src/modules/users.js`; pulled into the save on sign-in |
| Level upload + version history + revision conflicts | done | `POST/PATCH /levels`, `level_versions`, `src/screens/Editor.js` UPLOAD |
| Per-user sharing: invitation → accept → access → revoke | done | `server/src/modules/shares.js`; `src/screens/SocialScreens.js` |
| Private / shared / unlisted / public visibility enforced server-side | done | `accessFor()` in `server/src/modules/levels.js` |
| Friends, requests, blocking, following, messages, notifications | done | `server/src/modules/friends.js`, `messages.js`, `notifications.js` |
| Comments, likes, leaderboards, achievements, quests, shop, ledger | done | `server/src/modules/*`; daily/quest/achievement claims are server-checked |
| Reports + moderation tools with audit log | done | `server/src/modules/moderation.js` |
| Live level browsing in the game | done | `src/services/OnlineServer.js`; falls back to the labelled demo when the API is unreachable |
| Automated API tests (33) | done | `server/test/*.test.js` via `npm test` |

Connecting the game to the API is configuration, not code: `?api=https://host`,
`window.GD_API_URL`, or `GD.CONFIG.setApi(url)`. With no API configured the game
stays in guest mode and says so on the account screen.

## Known limitations (documented, not hidden)

1. Official level set: the 22 main levels only (ids `1`–`22`). The 2.2
   platformer files (`3001`, `5001+`) need `node tools/level-import.js … --all`
   and a platformer physics mode, which is still missing.
2. Unknown 2.x tiles are landable but never fatal from the side (see
   `docs/README.md`), because GD's object id table is not part of the level data.
3. The simulated online browser remains for guests; live content needs the API
   from `server/` to be running and configured.
4. Flight modes (ship/wave/UFO/jetpack) rest on the ground instead of clamping
   to GD's exact flight corridor.
5. Most 2.x triggers are not implemented yet (colour/toggle/alpha/pulse act on
   gameplay objects).
6. `POST /users/me/progress` accepts capped, client-reported play counters; the
   server cannot verify a run without a replay format.
7. Real-time collaborative editing is not implemented. Sharing supports
   view/play/comment/copy/edit with revision checks and version history, which
   prevents silent overwrites, but there is no live co-editing session.
