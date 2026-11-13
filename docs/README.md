# Documentation

Two generations of this project are documented here. Only the first row describes
what is deployed today.

| Document | Status | Contents |
| --- | --- | --- |
| [`DEPLOY.md`](DEPLOY.md) | **current** | GitHub Pages deployment: pipeline, publish path, path/case/cache rules, local preview, licensing. |
| [`ASSETS.md`](ASSETS.md) | legacy | Where the original asset files go and what the loader expects. |

The remaining files describe the **framework-free build** that used to live in
this repository (`frameworks/cocos2d-html5/…`, `src/app.js`, `src/core/*`,
`src/menus/*`) and was replaced by the cocos2d-html5 v2.2.3 app now in `src/`.
They are kept for the design records and are recoverable in git history at
commit `e23725b`:

| Document | Status | Contents |
| --- | --- | --- |
| [`architecture.md`](architecture.md) | legacy | Module layout of the removed `src/` tree. |
| [`FEATURES.md`](FEATURES.md) | legacy | Screen-by-screen feature inventory of the removed build. |
| [`BUILD.md`](BUILD.md) | legacy | Build/run notes for the removed tree. |
| [`RECONSTRUCTION.md`](RECONSTRUCTION.md) | legacy | Notes on reconstructing the original behaviour. |

## Where the current implementation actually is

| Path | Role |
| --- | --- |
| `index.html` | Hosts `#gameCanvas`, loads `cocos2d.js?v=17`, shows a hint if the engine never boots. |
| `cocos2d.js` | Boot config: engine file list, `res` path, cache-busting version, then `main.js`. |
| `main.js` | `cc.game.run` with `renderMode: 1` (Canvas) — no WebGL dependency. |
| `src/resource.js` | Declares every atlas/plist/font; missing files degrade instead of aborting. |
| `src/MyApp.js` | The app: `MenuScene`, `GarageScene`, `CreateScene`, `StatsScene`, name editor, shared UI helpers. |
| `cocos2d/` | cocos2d-html5 v2.2.3 engine source. |
| `extensions/` | Optional engine extensions, only loaded when `loadExtension` asks for them. |
| `res/gd/` | Sprite sheets, fonts and UI art used by the scenes. |
