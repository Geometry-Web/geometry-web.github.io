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
| `src/core/` | Shared layer: `GD.js` (namespace, sheets, art/text helpers), `Save.js`, `Audio.js`, `Levels.js` and `UI.js` — the widget kit every screen draws its buttons, popups and bars from. |
| `src/resource.js` | Declares every atlas/plist/font; missing files degrade instead of aborting. |
| `src/MyApp.js` | The app: `MenuScene`, `GarageScene`, `CreateScene`, `StatsScene`, `LevelSelectScene`, `PlayScene`, name editor, screens built on the kit. |
| `src/dev/KitShowcase.js` | `index.html?kit` — renders every kit widget on one page for layout review. |
| `levels/` | The playable level set: `manifest.json` + one `<id>-<slug>.json` per level, written by `tools/level-import.js`. |
| `tools/` | Local helpers: asset server, level importer, frame dumper, sheet gallery, PNG size reader, Icon Kit manifest builder. |
| `cocos2d/` | cocos2d-html5 v2.2.3 engine source. |
| `extensions/` | Optional engine extensions, only loaded when `loadExtension` asks for them. |
| `res/gd/` | Sprite sheets, fonts and UI art used by the scenes. |
| `res/gd/icons/` | The complete SD player-icon set (1205 tiny atlases + `manifest.json`) the Icon Kit pages through. |

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
level (Jumper, Dash, Deadlocked…) playable instead of hollow. Current set:
22 levels, 68.8k kept objects.

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
