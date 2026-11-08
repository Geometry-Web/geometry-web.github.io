# Geometry Dash 2.206 — Reconstruction Map

This document maps the **recovered program structure** of `GeometryDash.exe`
(2.206, 64-bit `Release.win64` build) onto the Cocos2d-HTML5 project in
`GeometryWeb/`. It preserves recovered class/function references and marks the
boundary between *recovered evidence* and *compatible equivalent*.

> **Scope boundary (important).** The binary's *structure* (PE metadata, section
> layout, 19,380 function boundaries, 739 RTTI type descriptors, import table,
> printable strings, entry-point chain) is real and documented below. The
> *bodies* of those functions were **not** decompiled to source, because that
> would reproduce the copyrighted program. Where the original behavior cannot
> be recovered, the project ships an **original, compatible equivalent** and
> labels it as such.

## 1. Recovered program structure

| Evidence | Value (recovered) |
| --- | --- |
| File / build | `GeometryDash.exe`, AMD64, `Release.win64` |
| PDB path | `D:\BuildOutput64\GD\Release.win64\GeometryDash.pdb` |
| Linker | MSVC 14.44 (VS 2022 17.14), PGO + LTCG |
| Functions | 19,380 (from `.pdata` unwind table) |
| RTTI type descriptors | 739 (683 game-specific) |
| Imported DLLs | 25 (`libcocos2d.dll`, `libExtensions.dll`, `fmod.dll`, Steam, …) |
| Entry chain | `0x677f70` (entry) → `0x677dfc` (`mainCRTStartup`) → `0x674a90` (`WinMain`) |

## 2. Recovered class inventory (RTTI)

The following are actual C++ class names embedded in the binary (`.?AV…@@` RTTI
type descriptors), grouped by role. These drove the module naming in the
reconstruction.

**Application / managers**
`AppDelegate`, `GameManager`, `GJEffectManager`, `GJGameLevel`,
`GameLevelManager`, `AchievementManager`, `GameStatsManager`, `LevelManager`.

**Core layers**
`GJBaseGameLayer`, `PlayLayer`, `LevelEditorLayer`, `CreatorLayer`,
`MenuLayer`, `GameScene` (see note below).

**Player**
`PlayerObject`, `PlayerControlGameObject`.

**Game objects**
`GameObject`, `EnhancedGameObject`, `EffectGameObject`, `CheckpointGameObject`,
`ForceBlockGameObject`, `ParticleGameObject`, `ProgressGameObject`,
`SmartGameObject`, `SpecialAnimGameObject`, `TextGameObject`, `LabelGameObject`,
`AnimatedGameObject`, `ColorActionSprite`, `ColorChannelSprite`,
`GravityEffectSprite`.

**Trigger game objects (GJEffectManager)**
`CameraTriggerGameObject`, `ChanceTriggerGameObject`, `CountTriggerGameObject`,
`EndTriggerGameObject`, `ItemTriggerGameObject`, `KeyframeGameObject`,
`RandTriggerGameObject`, `RotateGameplayGameObject`, `SFXTriggerGameObject`,
`SequenceTriggerGameObject`, `SongTriggerGameObject`, `SpawnParticleGameObject`,
`SpawnTriggerGameObject`, `TimerTriggerGameObject`, `TransformTriggerGameObject`,
`TriggerControlGameObject`, `ArtTriggerGameObject`,
`AdvancedFollowTriggerObject`.

**Editor**
`LevelEditorLayer`, `EditGameObjectPopup`, `CreateParticlePopup`,
`CustomizeObjectLayer`, `ObjectControlGameObject`, `CreateGuidelinesLayer`.

**Cocos2d classes actually imported by the exe**
`CCSprite`, `CCSpriteBatchNode`, `CCSpriteWithHue`, `CCMenuItemSprite`,
`CCMenuItem`, `CCNode`, `CCDirector`, `CCEGLView`, `CCLabelBMFont`, …

## 3. Mapping to the reconstruction

| Recovered class | Reconstructed module | Status |
| --- | --- | --- |
| `AppDelegate` | `src/app.js` (`GD.App`) | compatible equivalent |
| `GameManager` | `src/systems/GameState.js` (`GD.GameManager`) | equivalent |
| `GJGameLevel` | `src/level.js` (`GD.Level` / `GD.GJGameLevel`) | equivalent |
| `GJBaseGameLayer` | `src/scenes/GameScene.js` (`GD.GJBaseGameLayer`) | equivalent |
| `PlayLayer` | `src/scenes/GameScene.js` (`GD.PlayLayer`) | equivalent |
| `PlayerObject` | `src/objects/Player.js` (`GD.PlayerObject`) | equivalent (all 8 modes) |
| `GameObject` | `src/objects/GameObject.js` (`GD.GameObject`) | equivalent |
| `CheckpointGameObject` | `src/objects/GameObject.js` (`checkpoint`) | equivalent |
| `ForceBlockGameObject` | block object (no force behavior yet) | partial |
| `GJEffectManager` | `src/triggers/Triggers.js` (`GD.GJEffectManager`) | partial (simplified trigger set) |
| `LevelEditorLayer` | `src/scenes/EditorScene.js` (`GD.LevelEditorLayer`) | equivalent (basic) |
| `GravityEffectSprite` | gravity portal / orb visuals | equivalent |

## 4. Missing / uncertain (documented gaps)

- **Function bodies** — not recovered (copyright boundary). All behavior is an
  original equivalent.
- **Full trigger/effect-ID system** — recovered names (`SpawnTriggerGameObject`,
  `TimerTriggerGameObject`, `CountTriggerGameObject`, `RandTriggerGameObject`,
  `SequenceTriggerGameObject`, `KeyframeGameObject`, `TransformTriggerGameObject`,
  …) are listed above, but the effect-ID/group system is only partially
  reconstructed (move/rotate/pulse/alpha/toggle).
- **`ForceBlockGameObject`** force behavior, **`ParticleGameObject`** authored
  particle objects, **`TextGameObject`**/`LabelGameObject` text labels,
  **color channels** (`ColorChannelSprite`) — recovered names only; equivalents
  are partial or pending.
- **Swing mode** — simplified (gravity flip) rather than a true pendulum.

## 5. Preservation of references

- Raw recovered data: `GD-Decompiled/metadata/pe_metadata.{json,md}`,
  `GD-Decompiled/metadata/imports.md`, `GD-Decompiled/functions/function_index.{json,csv}`,
  `GD-Decompiled/classes/rtti_class_names.txt`, `GD-Decompiled/classes/rtti_classes.json`,
  `GD-Decompiled/analysis/strings.txt`.
- Class names above are byte-exact from the RTTI descriptors (see
  `rtti_class_names.txt`).
