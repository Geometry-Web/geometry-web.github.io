# Web Dashers — Custom Trigger-Based Gameplay System

A reusable, native trigger-action engine for the Web Dashers editor. Custom
orbs, pads, portals, interactive objects, gamemode objects and trigger objects
are all modelled as objects that combine configurable **actions**, **conditions**
and **properties** — no hardcoded object types and no external plugins required.

## Files

- `assets/scripts/core/custom-gameplay.js` — the engine (environment-agnostic, unit-testable).
- `assets/scripts/core/custom-gameplay-editor.js` — DOM overlay panel for the editor.
- `tests/custom-gameplay.test.js` — automated regression tests (Node).
- `index.html` — loads the two modules.

## Quick start

1. Open a level in the editor.
2. Press **Ctrl+G** (or **Cmd+G**) to open the **Custom Gameplay** panel, or run `WebDashersEditor.open()` from the console.
3. Use the tabs to configure the object:
   - **General** — name, id, description, category, groups.
   - **Appearance** — sprite, color, glow, opacity, animation.
   - **Activation** — event, activation type, radius, cooldown, limits, delay.
   - **Functions** — the visual action builder (add / reorder / duplicate / remove).
   - **Conditions** — when actions are allowed to run (JSON).
   - **Effects** — particles / sound / animation / camera / screen.
   - **Advanced** — priority, custom properties.
   - **Presets** — save / load / rename / duplicate / delete presets.
4. **Save Preset**, **Export JSON**, **Import JSON**, **Test**, or **Place in Level**.

## The reusable system (architecture §16)

- `CustomObjectRegistry`, `TriggerActionRegistry`, `TriggerActionExecutor`,
  `TriggerConditionEvaluator`, `TriggerVariableStore`, `CustomFunctionRegistry`,
  `TriggerEventDispatcher`, `CustomObjectSerializer`, `CustomObjectFactory`,
  `CustomGameplayRuntime`.

### Universal action library (§3)

All ~150 actions are registered by name with schema validation, grouped as:
**Player, Gamemode, Portal, Physics, Object, Group, Camera, Audio,
Visual effects, Level.** Examples:

```json
{ "action": "set_gamemode", "params": { "mode": "wave" } }
{ "action": "reverse_gravity" }
{ "action": "set_speed", "params": { "value": 2 } }
{ "action": "set_player_scale", "params": { "scale": 0.5 } }
{ "action": "activate_group", "params": { "group": 15 } }
{ "action": "set_vertical_velocity", "params": { "value": 420 } }
```

### Control-flow steps

Supports `if`/`branch`, `condition` (gate), `loop` (safe limit 64), `delay`, and
`call_function`:

```json
{
  "action": "if",
  "condition": { "gamemode": "cube" },
  "then": [ { "action": "set_gamemode", "params": { "mode": "wave" } } ],
  "else": [ { "action": "set_gamemode", "params": { "mode": "ball" } } ]
}
```

### Conditions (§9)

Operators: `equal`, `not_equal`, `greater_than`, `less_than`,
`greater_or_equal`, `less_or_equal`, `contains`, `and`, `or`, `not`.
Operands support `{ "path": "gamemode" }` and
`{ "variable": { "scope": "global", "key": "flag" } }`.

### Events (§9)

`on_level_start`, `on_level_end`, `on_player_enter`, `on_player_touch`,
`on_player_collision`, `on_player_death`, `on_orb_activation`,
`on_pad_activation`, `on_portal_entry`, `on_portal_exit`,
`on_gamemode_change`, `on_group_activation`, `on_timer`,
`on_variable_change`, `on_custom_event`, … (full list in `EVENT_NAMES`).

## Preset format (§13)

```json
{
  "type": "custom_orb",
  "id": "portal_wave_orb",
  "name": "Portal Wave Orb",
  "activation": { "type": "player_input" },
  "actions": [
    { "action": "set_gamemode", "value": "wave" },
    { "action": "reverse_gravity" },
    { "action": "set_speed", "value": 2 }
  ]
}
```

`WebDashers.validatePreset()`, `exportPreset()` and `importPreset()` validate
and round-trip these. Flat `actions` are auto-migrated into an event map on load.

## Level serialization (§14)

Custom objects are serialized into a GD object's **text** field with the
`WD_CUSTOM:` marker (`WebDashers.buildCustomLevelObject()`), so they round-trip
through the existing level text encoding. `WebDashers.loadCustomObjects()`
restores them, and unknown custom types are preserved (not deleted).

## Scripting API (§17, optional)

```js
WebDashers.registerAction("custom:launch_player", {
  parameters: { force: { type: "number", default: 15 } },
  execute(context, params) { context.player.velocity = { y: params.force }; }
});
WebDashers.registerCondition("is_mini", (cond, ctx) => !!ctx.isMini);
WebDashers.registerFunction("ApplyCustomPortal", { actions: [ ... ] });
WebDashers.registerTemplate("my_orb", { type: "custom_orb", events: { ... } });
```

## Running the tests

```bash
node --test tests/custom-gameplay.test.js
```

Tests cover action registration/validation, the condition evaluator, the
variable store, reusable functions, serialization/migration, all built-in
templates, the event dispatcher (cooldown/limits/priority/recursion), preset
import/export, and the 8 example mechanics from the spec.

## In-game collision integration (implemented)

Custom objects are now fully playable. `level.js` spawns custom objects as real
colliders (carrying their config on `collider._wdCustom`), and `player.js`
`checkCollisions` routes any `custom_*` collider to
`WebDashersRuntime.dispatchCustomActivation(...)`, which runs the object's event
actions through the engine (with cooldown/limit/dedup protection).

The runtime attaches automatically via `WebDashers.autoAttach()` (polls
`Phaser.GAMES`), or explicitly with `WebDashers.initGameplay(scene)`.


