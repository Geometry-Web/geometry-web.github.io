/**
 * Geometry Web — recovered program-structure layer.
 *
 * These aliases expose the actual C++ class names recovered from
 * GeometryDash.exe's RTTI type descriptors
 * (GD-Decompiled/classes/rtti_class_names.txt) as the canonical names of the
 * reconstructed architecture. Each maps to an original, browser-compatible
 * implementation. See docs/RECONSTRUCTION.md for the full mapping and the
 * boundary between recovered structure and compatible equivalents.
 */
window.GD = window.GD || {};

// Application bootstrap (recovered: AppDelegate).
GD.AppDelegate = GD.App;

// Managers (recovered: GameManager, GJEffectManager).
GD.GameManager = GD.GameState;
GD.GJEffectManager = GD.Triggers;

// Level data (recovered: GJGameLevel).
GD.GJGameLevel = GD.Level;

// Core layers (recovered: GJBaseGameLayer, PlayLayer, LevelEditorLayer).
GD.GJBaseGameLayer = GD.scenes.GameScene;
GD.PlayLayer = GD.scenes.GameScene;
GD.LevelEditorLayer = GD.scenes.EditorScene;

// Player (recovered: PlayerObject).
GD.PlayerObject = GD.Player;

// Game objects (recovered: GameObject).
GD.GameObject = GD.Objects;
