# Geometry Web — Cocos2d-HTML5

Geometry Dash's engine (recovered as **Cocos2d-x 2.2.3**) running directly on the
**cocos2d-html5 v2.2.3** engine — the official JavaScript port of the same engine.
The API maps almost 1:1: only the `CC` prefix becomes `cc.` and classes become
namespaced singletons.

## Run it

Cocos2d-html5 loads many engine files over XHR/`<script>`, so it must be served over
HTTP, not opened as `file://`.

```powershell
cd "D:\Geometry Web\web"
python -m http.server 8080
```

Then open http://localhost:8080/

`run.bat` does exactly that on Windows (Python's `http.server` on port 8080).

## Deploy

The site is published straight from this repository — no build step, no bundler:

- **URL:** <https://geometry-web.github.io/>
- **Repository:** <https://github.com/Geometry-Web/geometry-web.github.io>
- **Branch:** `main` (the repository root *is* the site root, `index.html` included)
- **Pipeline:** `.github/workflows/deploy.yml` runs on every push to `main` (and on
  manual `workflow_dispatch`). It validates that the entry files, the vendored
  engine and the required atlases exist, then uploads the repository root with
  `actions/upload-pages-artifact` and publishes it with `actions/deploy-pages`
  (user site, so the site lives at `/`, not at a subpath).
- **Pages source:** Settings → Pages → *Build and deployment* → *Source: GitHub
  Actions*. `has_pages` is already true for this repository and the branch is
  configured, so pushing to `main` is all that is needed.

Because everything is referenced with relative paths (`cocos2d.js`, `src/…`,
`res/…`, `cocos2d/…`) the same tree also works unchanged from a subpath of another
repository. GitHub Pages is case sensitive, so file names must keep their exact
capitalisation (`GJ_GameSheetIcons.png`, `CCDirector.js`, …).

## Structure

```
web/
├── index.html         # page + <canvas id="gameCanvas">
├── cocos2d.js         # engine boot config (engineDir, appFiles, renderMode)
├── main.js            # cc.Application bootstrap (director/EGLView/resources)
├── cocos2d/           # cocos2d-html5 v2.2.3 engine (116 files)
├── res/               # images (same -hd/-uhd suffix convention as GD)
└── src/
    ├── resource.js    # g_resources preload list
    └── MyApp.js       # demo scene (mirrors the recovered GD classes)
```

## Cocos2d-x 2.2.3 → Cocos2d-HTML5 mapping

| Geometry Dash (C++) | Cocos2d-HTML5 (JS) |
|---|---|
| `cocos2d::CCScene` | `cc.Scene` |
| `cocos2d::CCLayer` | `cc.Layer` |
| `cocos2d::CCLayerColor` | `cc.LayerColor` |
| `cocos2d::CCNode` | `cc.Node` |
| `cocos2d::CCSprite` | `cc.Sprite` |
| `cocos2d::CCLabelTTF` | `cc.LabelTTF` |
| `cocos2d::CCMenu` / `CCMenuItem*` | `cc.Menu` / `cc.MenuItemFont` / `cc.MenuItemImage` |
| `cocos2d::CCAction*` | `cc.Action*` (`cc.MoveBy`, `cc.Sequence`, `cc.RepeatForever`, `cc.EaseIn`, …) |
| `cocos2d::CCDirector` | `cc.Director.getInstance()` |
| `cocos2d::CCFileUtils` | `cc.FileUtils.getInstance()` |
| `cocos2d::CCEGLView` | `cc.EGLView.getInstance()` |
| `cocos2d::CCTextureCache` / `CCSpriteFrameCache` | `cc.TextureCache` / `cc.SpriteFrameCache` |
| `cocos2d::CCTouchDispatcher` | `cc.Director.getTouchDispatcher()` / `setTouchEnabled` |

## Notes

- `renderMode: 1` selects the **Canvas** renderer (most compatible; switch to `0`/`2`
  for auto/WebGL).
- The `cocos2d/` engine directory is a vendored copy of
  `cocos2d/cocos2d-html5` tag `Cocos2d-html5-v2.2.3` (MIT licensed).
- The recreated Geometry Dash screens live in `src/MyApp.js`; every coordinate
  and scale is a single value in the `MENU_LAYOUT` / `CREATE_LAYOUT` /
  `GARAGE_LAYOUT` / `STATS_LAYOUT` tables at the top of the file (960x540, sprite
  centers, `+Y` up):
  - `MyScene` / `MainMenuLayer` — the GD 1.0 main menu: magenta tiled background,
    logo, PLAY / GARAGE / CREATE / DAILY, social icons, bottom button row, NEWS.
  - `CreatorScene` / `CreatorLayer` — the Create hub: the blue gradient, the shared
    `GJ_sideArt_001.png` stairs in three corners, the pink back arrow, the locked
    world padlock, and the 15 category tiles in a 5x3 grid (VERSUS and THE MAP are
    shown locked, DAILY / WEEKLY carry the red "new" badge). Each tile opens a
    placeholder screen whose BACK button returns to the hub.
  - `GarageScene` / `GarageLayer` — the Icon Kit (reached from the main menu's
    paint-palette button): grey tiled background, side stairs, the player-name
    label, the cyan preview cube, the seven-row stat column (stars / moons / coins
    / orbs / diamonds), the 11 icon-type tabs, the "Tap an icon to use it!" hint,
    the paged 12x3 icon grid, the paging arrows + dots, and the chrome buttons
    (back arrow → main menu, shards → SHARDS, paint → COLORS; the two placeholder
    screens return to `GarageScene`). Every icon frame that ships in
    `GJ_GameSheetIcons` is unlocked and selectable: each tab declares a `pool` and
    `count` in `GARAGE_LAYOUT.tabs.items`, `iconFrameName(pool, n)` builds the
    frame name (`player_01_001.png`, `ship_01_001.png`, …), the page count follows
    from the family size (cubes: 248 icons → 7 pages, ships: 79 → 3, …), and slots
    past the end of a family draw an empty square instead of a padlock.
  - `StatsScene` / `StatsLayer` — the Stats drop-down (reached from the main
    menu's stats-bars button): the menu art is redrawn behind a brown veil, and the
    table is assembled from the `GJ_table_top` banner, the two gradient side rails
    and the `GJ_table_bottom` drawer bar. The 18 real stat labels (`Total Jumps:`
    … `Liked/Disliked Levels:`) use the `goldFont`, sit on alternating stripes and
    live inside a `cc.ClippingNode`, so dragging inside the body scrolls them under
    the banner rather than past it (scroll is clamped between 0 and `maxScroll()`).
    The pink back arrow returns to `MainMenuLayer`.
- All menu art comes from the real `GJ_GameSheet03` / `GJ_GameSheet04` sheets. The
  player-icon frames (`player_01_001.png`, `ship_01_001.png`, `bird_01_001.png`,
  `dart_01_001.png`) and the 11 tab icons come from `GJ_GameSheetIcons`, and the
  `bigFont` bitmap font is preloaded for the logo and the name/number labels, so
  `resource.js` lists those four files. The category frames are `GJ_createBtn`,
  `GJ_savedBtn`, `GJ_highscoreBtn` (SCORES), `GJ_challengeBtn` (QUESTS),
  `GJ_versusBtn`, `GJ_mapBtn`, `GJ_dailyBtn`, `GJ_weeklyBtn`, `GJ_eventBtn`,
  `GJ_gauntletsBtn`, `GJ_featuredBtn`, `GJ_listsBtn`, `GJ_pathsBtn`,
  `GJ_mapPacksBtn` and `GJ_searchBtn`. The Stats page adds the `goldFont` bitmap font
  (its counters) and `game_bg_01_001.png` (the tiled menu background, tinted brown)
  to the preload list.
- `GJ_paintBtn_001.png` sits at x=989 in a 1024px-wide sheet, so its plist rect
  overflows the texture; the Icon Kit re-registers a clipped 35x35 sprite frame at
  start-up (`fixPaintButton`) so the palette button draws 1:1.

## Asset and licensing note

The **code** in `src/`, the vendored engine config and these docs are the project's
own code; `cocos2d/` and `extensions/` are a vendored copy of cocos2d-html5 v2.2.3
(MIT). The art, fonts and sprite sheets under `res/gd/` come from **Geometry Dash**,
which is © RobTop Games; nothing in this repository claims those files as original
work, and no new third-party assets were added for the deployment. They are kept
here because the build is a local recreation, and they are published to Pages exactly
as they already exist in the working copy. If redistribution of those specific files
is not acceptable, the only deployment change needed is to strip `res/gd/` from the
published artifact (or from the repository) — the tooling, the workflow and the code
do not depend on any other external asset.

`docs/` describes the earlier, framework-free implementation that used to live in
this repository at `frameworks/` and `src/app.js`. Those files were removed in the
commit that introduced the current Cocos2d-HTML5 build; they remain available in the
git history (`git log -- frameworks`). `levels/sample.json` and `GeometryWebicon.png`
are kept as-is.

