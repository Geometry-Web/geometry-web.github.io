# Documentation

Two generations of this project are documented here. Only the first row describes
what is deployed today.

| Document | Status | Contents |
| --- | --- | --- |
| [`DEPLOY.md`](DEPLOY.md) | **current** | GitHub Pages deployment: pipeline, publish path, path/case/cache rules, local preview, licensing. |
| [`ASSETS.md`](ASSETS.md) | legacy | Where the original asset files go and what the loader expects. |

The remaining files describe the **framework-free build** that used to live in
this repository (`frameworks/cocos2d-html5/…`, `src/app.js`, the old
`src/core/assets.js` and `src/menus/*`) and was replaced by the cocos2d-html5
v2.2.3 app now in `src/`. They are kept for the design records and are
recoverable in git history at commit `e23725b`:

| Document | Status | Contents |
| --- | --- | --- |
| [`architecture.md`](architecture.md) | legacy | Module layout of the removed `src/` tree. |
| [`FEATURES.md`](FEATURES.md) | legacy | Screen-by-screen feature inventory of the removed build. |
| [`BUILD.md`](BUILD.md) | legacy | Build/run notes for the removed tree. |
| [`RECONSTRUCTION.md`](RECONSTRUCTION.md) | legacy | Notes on reconstructing the original behaviour. |

## Where the current implementation actually is

| Path | Role |
| --- | --- |
| `index.html` | Hosts `#gameCanvas`, loads `cocos2d.js?v=22`, shows a hint if the engine never boots. |
| `cocos2d.js` | Boot config: engine file list, `res` path, cache-busting version, then `main.js`. |
| `main.js` | `cc.game.run` with `renderMode: 1` (Canvas) — no WebGL dependency. Also installs the one-time audio unlock and the `?kit` switch. |
| `src/core/` | Shared layer: `GD.js` (namespace, sheets, art/text helpers), `Save.js`, `Audio.js`, `Levels.js`, `UI.js` (widget kit), `Nav.js` (transitions + screen shell), `UIList.js` (virtual scrolling list), `UIText.js` (text prompt). |
| `src/data/` | Static game data: `Official.js` (main-level metadata, difficulty names, song credits), `Unlocks.js` (achievements, wallet, shops, vaults, map packs, gauntlets, quests, daily chest). |
| `src/services/` | `Online.js` (the simulated level-browser provider) and `Generate.js` (the deterministic level builder that makes its levels playable). |
| `src/screens/` | The screens added on top of the menu: `Settings`, `Achievements`, `Online` (+ leaderboard), `Collections` (packs, gauntlets, lists, daily/quests, news), `Shops`, `Vaults` (+ treasure room), `Profile`, `Editor`, and `Routes.js` which maps the Create hub's tiles to them. |
| `src/resource.js` | Declares every atlas/plist/font; missing files degrade instead of aborting. |
| `src/MyApp.js` | The three hand-laid core scenes: `MenuScene`, `LevelSelectScene`, `PlayScene` (plus `GarageScene`/`StatsScene`), with the pause menu, practice mode and keyboard input. |
| `src/dev/KitShowcase.js` | `index.html?kit` — renders every kit widget on one page for layout review. |
| `levels/` | The playable level set: `manifest.json` + one `<id>-<slug>.json` per level, written by `tools/level-import.js`. |
| `tools/` | Local helpers: asset server, level importer, frame dumper, sheet gallery, PNG size reader, Icon Kit manifest builder. |
| `cocos2d/` | cocos2d-html5 v2.2.3 engine source. |
| `extensions/` | Optional engine extensions, only loaded when `loadExtension` asks for them. |
| `res/gd/` | Sprite sheets, fonts and UI art used by the scenes. |
| `res/gd/icons/` | The complete SD player-icon set (1205 tiny atlases + `manifest.json`) the Icon Kit pages through. |
| `PROJECT_STATUS.md` | What is done, what is partial and what is deliberately missing, measured against the specification. |

## Screens that are not in `MyApp.js`

Everything that is a *list or a grid of data* lives in `src/screens/` and is built
from two shared pieces: `GD.UI.screen(options)` (the gradient, Pusab title, back
arrow, music and fade-in) and `GD.UI.list(parent, options)` (a virtual row list
that only ever holds `count` nodes, whatever the data length).

| Screen | Data it shows | Notes |
| --- | --- | --- |
| `SettingsScene` | `GD.Save.settings` | Volumes apply immediately through `GD.Audio`; reset goes through a confirm. |
| `AchievementsScene` | `GD.Data.ACHIEVEMENTS` + save counters | Entering it pays any achievement that is already due. |
| `OnlineScene` | `GD.Online.query()` | Nine tabs, search, saved list; the level popup plays the level for real. |
| `LeaderboardScene` | `GD.Online.leaderboard()` | Simulated, labelled as such. |
| `ProfileScene` | `GD.Save` profile/stats/wallet | Rename, Icon Kit, achievements and the stats table link out. |
| `PacksScene` / `GauntletsScene` | `GD.Data.PACKS` / `GAUNTLETS` | Progress is the real record of the levels they list. |
| `ListsScene` | `GD.Save` `lists` | Create/delete lists of saved online levels. |
| `DailyScene` | `GD.Online.daily/weekly`, `GD.Data.QUESTS` | Quest claims and the once-a-day chest. |
| `ShopScene` | `GD.Data.SHOPS` + wallet | Buying grants a real icon/number, colour or bundle. |
| `VaultScene` / `TreasureScene` | `GD.Data.VAULTS` / `TREASURE_CHESTS` | Code entry through the kit's text prompt. |
| `EditorScene` | its own object list | Build/edit/pan, undo/redo, rotate, duplicate, delete, zoom, save and playtest. |
| `NewsScene` / `ComingSoonScene` | static text | The honest panels (what this build is, what it is not). |

## Simulation boundary

`GD.Online.simulated` is `true` and every screen that lists online data says so
in its own words ("SIMULATED LEVELS - no connection to GD servers", "Simulated
rankings", "Simulated creator profile"). Creator handles are prefixed `sim_` so
no screenshot can be read as a real player's level. Replacing that one module
with real endpoints is the whole backend integration.


## Levels (`levels/`, `tools/level-import.js`)

The play layer runs the real Geometry Dash 2.2 main levels. GD ships a level as
one long object string — `Resources/levels/<id>.txt` holds it base64url + gzip,
and an export (`.gmd`, `CCLocalLevels.dat`) wraps the same string in an XML
plist — so the tool is only decode + write:

```
node tools/level-import.js ../gdstuffs/Resources/levels --out levels
node tools/level-import.js my-level.gmd --out levels     # one file
node tools/level-import.js ../gdstuffs/Resources/levels --out levels --all
```

`--all` also takes the numbered files that are not main levels (3001 and 5001+:
the 2.2 platformer set, which this play layer cannot run). Everything else in
the folder is reported as skipped instead of being silently dropped, and the
per-level object/cell table it prints is the quickest way to spot a level that
baked down suspiciously small. Files from an older run are removed, so
`levels/` always matches its manifest.

`src/core/Levels.js` is the single reader both the tool and the browser use:
`Levels.sources(text)` finds the level string(s) in a file, `Levels.parse()`
turns it into objects (stripping the NUL padding GD leaves behind) and
`Levels.pack()` writes the record the runtime loads. Objects this build cannot
draw — decoration, triggers, most of the 2.x object library — are dropped, with
two exceptions: the coin/gem/pad/orb/portal ids in `Levels.DEFS`, and unknown
**structural** tiles, which `structuralIds()` promotes to a generic solid block
when they sit on the 30-unit grid, have at least two grid neighbours, appear at
least six times and are mostly linked up. That heuristic is what keeps a 2.x
level (Jumper, Dash, Deadlocked…) playable instead of hollow.

Those generic tiles are landable but never fatal from the side: GD's id table is
not in the level data, so a piece of decoration or a spike can look exactly like
a block, and a wrong guess would be an invisible wall in the player's face. The
spike ids that do show up in the data (`8`, and `191`, which the levels use
exactly like `8`) are hazards, and the 1.0 block set (`1`–`7`) still kills on its
walls like the real game. Current set: 22 levels, 68.6k kept objects.

`LevelSelectScene` lists them one row per level (difficulty face, name, author,
stars, best run) with a virtual row list — only `rows.count` nodes exist, so a
22-level set costs the same as five — and its `IMPORT` button reads a
`.gmd`/`.dat`/level-string file dropped by the player (`GD.Levels.readFile`,
remembered in local storage) and starts it. `PlayScene` runs a level: GD's speed
table, cube/ship/ball/UFO/wave/robot/spider/swing/jetpack modes, gravity
portals, orbs, pads, secret coins, vertical camera, attempts, best % and the
completion banner, with the level colour driving the block art. A run writes
into `GD.Save` (best %, coins, completion) and `PLAYER_STATS` (jumps, attempts,
orbs, stars, completed levels), which is what the Stats table and the level
select read back.

## Icon Kit icon set (`res/gd/icons/`)

GD 2.2 keeps player icons outside the game sheets: every icon is its own tiny
atlas, `Resources/icons/<family>_<n>.plist` + `.png`, holding the icon body, its
detail layer and its glow side by side. The sheet this build shipped
(`GJ_GameSheetIcons`) is a truncated rip — 249 cubes and 79 ships — so the Icon
Kit ran out of icons after a few pages.

`tools/icon-manifest.js` turns the real resources into what the runtime wants:
one PNG per icon plus `manifest.json`, a map of `<family>_<n>` → the
`[x, y, w, h, rotated]` rect of the icon body. No plist is parsed at runtime and
only the icons of the page being looked at are fetched.

```
node tools/icon-manifest.js ../gdstuffs/Resources/icons \
     --out res/gd/icons/manifest.json --copy res/gd/icons
```

It prints the per-family counts it found and fails loudly on a missing PNG or a
rect that falls outside its atlas. Current set (icon 0 is GD's "no icon"
placeholder and is skipped; this install has no cube 140 or 420):

| Family | File prefix | Icons | Pages in the kit |
| --- | --- | --- | --- |
| Cubes | `player_` | 483 | 14 |
| Ships | `ship_` | 169 | 5 |
| Balls | `player_ball_` | 118 | 4 |
| UFOs | `bird_` | 149 | 5 |
| Waves | `dart_` | 96 | 3 |
| Robots | `robot_` | 68 | 2 |
| Spiders | `spider_` | 69 | 2 |
| Swings | `swing_` | 43 | 2 |
| Jetpacks | `jetpack_` | 8 | 1 |

`GD.ICONS` / `GD.iconManifest()` / `GD.iconCount(pool)` / `GD.iconNumberAt()` /
`GD.iconSpriteFrame()` / `GD.preloadIcons()` in `src/core/GD.js` are the runtime
side; `GarageLayer` falls back to the old sheet frames whenever the loose set is
absent, so the kit still works on a checkout without `res/gd/icons/`.
