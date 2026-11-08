# Geometry Dash asset integration (local, personal use)

## What the install contains (verified)

`E:\GDWEB\Resources\` is standard cocos2d-x data:

| Type | Format | Examples |
| --- | --- | --- |
| Texture atlases | XML `.plist` + `.png` | `GJ_GameSheet`, `GJ_GameSheet02`, `GJ_GameSheet03`, `GJ_GameSheetGlow`, `GJ_GameSheetIcons` |
| Bitmap fonts | `.fnt` + `.png` (BMFont) | `bigFont.fnt` (face "Pusab") |
| Music | `.mp3` | `StereoMadness.mp3`, `BackOnTrack.mp3`, … |
| SFX | `.ogg` | `sfx/s*.ogg` |

cocos2d-html5 loads every one of these natively:
`cc.SpriteFrameCache.addSpriteFrames(plist, png)` + `getSpriteFrame(name)`,
`cc.LabelBMFont` for `.fnt`, `cc.AudioEngine.playMusic/playEffect`.

## How to enable

1. Serve the `E:\GDWEB` folder so both the game and Resources are reachable:
   ```
   cd E:\GDWEB
   python -m http.server 8000
   ```
2. Open `http://localhost:8000/GeometryWeb/`.
3. In `src/config.js`, set `assetsRoot: '../Resources/'`.

The game then loads the real atlases and plays `StereoMadness.mp3`. The loader is
`src/core/Assets.js`:
- `GD.Assets.sprite(name)` / `GD.Assets.icon(key)` / `GD.Assets.fontPath(name)`
- `GD.Assets.playMusic(name, loop)` / `GD.Assets.playEffect(name)`

Verified frame names (from the plists): `d_ball_01_001.png`, `d_animWave_01_001.png`
(player), `GJ_hammerIcon_001.png` (level editor), `GJ_musicIcon_001.png`,
`GJ_demonIcon_001.png` (difficulty), `GJ_coinsIcon_001.png`, `GJ_diamondsIcon_001.png`.

## Legal boundary (read this)

These are **RobTop Games' copyrighted assets**. They may only be used for your
own personal, non-distributed reconstruction. Do **not** publish or redistribute
them. This project does **not** copy the files — it loads them at runtime from
your own folder.

