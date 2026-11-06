/* Web Dashers — Custom Gameplay regression tests (§19)
 * Run: node --test tests/custom-gameplay.test.js */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const W = require("../assets/scripts/core/custom-gameplay.js");

function freshEngine() {
  return new W.CustomGameplayEngine();
}

function recordProxy(label, calls) {
  return new Proxy({}, {
    get(target, prop) {
      if (prop === Symbol.toPrimitive) return undefined;
      return (...args) => {
        calls.push({ target: label, method: String(prop), args });
        return undefined;
      };
    }
  });
}

function mockContext() {
  const calls = [];
  const state = { gravityFlipped: false, isMini: false, yVelocity: 0, xVelocity: 0, x: 0, y: 0, controlEnabled: true };
  const ctx = {
    player: recordProxy("player", calls),
    state,
    variables: new W.TriggerVariableStore(),
    groups: recordProxy("groups", calls),
    objects: recordProxy("objects", calls),
    camera: recordProxy("camera", calls),
    audio: recordProxy("audio", calls),
    effects: recordProxy("effects", calls),
    level: recordProxy("level", calls),
    runtime: null,
    event: null,
    eventInfo: {},
    deltaTime: 0
  };
  return { ctx, calls, state };
}

/* ----------------------- 1. registry & validation ------------------ */
test("action registry validates schema and rejects unknown actions", () => {
  const engine = freshEngine();
  assert.ok(engine.listActions().includes("set_gamemode"));
  assert.equal(engine.actions.validateAction({ action: "set_gamemode", params: { mode: "wave" } }).ok, true);
  assert.equal(engine.actions.validateAction({ action: "set_gamemode", params: { mode: "nope" } }).ok, false);
  assert.equal(engine.actions.validateAction({ action: "does_not_exist" }).ok, false);
});

test("unknown action throws a meaningful error at execution", () => {
  const engine = freshEngine();
  const { ctx } = mockContext();
  assert.throws(() => engine.executor.executeAction({ action: "nope" }, ctx), /Unknown action/);
});

test("missing required param throws a meaningful error", () => {
  const engine = freshEngine();
  const { ctx } = mockContext();
  assert.throws(() => engine.executor.executeAction({ action: "set_gamemode", params: {} }, ctx), /required/);
});

/* ----------------------- 2. action execution ----------------------- */
test("representative actions dispatch to context", () => {
  const engine = freshEngine();
  const { ctx, calls } = mockContext();
  engine.executor.executeSequence([
    { action: "set_gamemode", params: { mode: "wave" } },
    { action: "reverse_gravity" },
    { action: "set_vertical_velocity", params: { value: 420 } },
    { action: "activate_group", params: { group: 15 } },
    { action: "play_sound", params: { sound: "boom" } }
  ], ctx);

  assert.ok(calls.some((c) => c.target === "player" && c.method === "setGamemode" && c.args[0] === "wave"));
  assert.ok(calls.some((c) => c.target === "player" && c.method === "reverseGravity"));
  assert.ok(calls.some((c) => c.target === "player" && c.method === "setVerticalVelocity" && c.args[0] === 420));
  assert.ok(calls.some((c) => c.target === "groups" && c.method === "activate" && c.args[0] === 15));
  assert.ok(calls.some((c) => c.target === "audio" && c.method === "playSound" && c.args[0] === "boom"));
});

/* ----------------------- 3. condition evaluator -------------------- */
test("condition evaluator supports comparisons, AND/OR/NOT and nesting", () => {
  const engine = freshEngine();
  const ev = engine.conditions;
  const ctx = { gamemode: "cube", gravityFlipped: false, speed: 2 };

  assert.equal(ev.evaluate({ gamemode: "cube" }, ctx), true);
  assert.equal(ev.evaluate({ op: "not_equal", left: { path: "gamemode" }, right: "ship" }, ctx), true);
  assert.equal(ev.evaluate({ op: "greater_than", left: { path: "speed" }, right: 1 }, ctx), true);
  assert.equal(ev.evaluate({ op: "and", conditions: [{ gamemode: "cube" }, { speed: 2 }] }, ctx), true);
  assert.equal(ev.evaluate({ op: "or", conditions: [{ gamemode: "ship" }, { speed: 2 }] }, ctx), true);
  assert.equal(ev.evaluate({ op: "not", condition: { gamemode: "ship" } }, ctx), true);
  assert.equal(ev.evaluate({ op: "contains", left: "abc", right: "b" }, ctx), true);
});

/* ----------------------- 4. variable store ------------------------- */
test("variable store supports scopes and arithmetic", () => {
  const store = new W.TriggerVariableStore();
  store.set("global", "score", 10);
  assert.equal(store.get("global", "score"), 10);
  assert.equal(store.increment("global", "score", 5), 15);
  assert.equal(store.multiply("global", "score", 2), 30);
  assert.equal(store.divide("global", "score", 3), 10);
  store.set("player", "hp", 100);
  assert.equal(store.get("player", "hp"), 100);
  assert.equal(store.resolve({ scope: "global", key: "score" }), 10);
});

/* ----------------------- 5. function registry ---------------------- */
test("reusable functions run their action list with parameters", () => {
  const engine = freshEngine();
  engine.registerFunction("ApplyCustomPortal", {
    parameters: { gamemode: "string", gravity: "string", speed: "number", scale: "number" },
    actions: [
      { action: "set_gamemode", params: { mode: { $param: "gamemode" } } },
      { action: "set_gravity", params: { direction: { $param: "gravity" } } },
      { action: "set_speed", params: { value: { $param: "speed" } } },
      { action: "set_player_scale", params: { scale: { $param: "scale" } } }
    ]
  });
  const { ctx, calls } = mockContext();
  engine.executor.callFunction("ApplyCustomPortal", { gamemode: "wave", gravity: "up", speed: 2, scale: 0.5 }, ctx);
  assert.ok(calls.some((c) => c.target === "player" && c.method === "setGamemode" && c.args[0] === "wave"));
  assert.ok(calls.some((c) => c.target === "player" && c.method === "setSpeed" && c.args[0] === 2));
});

/* ----------------------- 6. serializer ----------------------------- */
test("serializer round-trips, validates and migrates presets", () => {
  const engine = freshEngine();
  const preset = {
    type: "custom_orb",
    id: "portal_wave_orb",
    name: "Portal Wave Orb",
    activation: { type: "player_input" },
    actions: [
      { action: "set_gamemode", params: { mode: "wave" } },
      { action: "reverse_gravity" },
      { action: "set_speed", params: { value: 2 } }
    ]
  };
  const cloned = engine.deserialize(preset);
  assert.ok(cloned.events, "flat actions migrated into an event map");
  assert.equal(cloned.version, W.SCHEMA_VERSION);

  const roundtrip = engine.deserialize(JSON.parse(engine.exportPreset(engine.createObject(preset))));
  assert.equal(roundtrip.type, "custom_orb");
  assert.equal(roundtrip.id, "portal_wave_orb");

  assert.equal(engine.validatePreset({ type: "custom_orb" }).ok, true);
  assert.equal(engine.validatePreset({ type: "unknown_thing" }).ok, false);
});

/* ----------------------- 7. templates & factory -------------------- */
test("every built-in template is valid and creates an object", () => {
  const engine = freshEngine();
  for (const id of engine.listTemplates()) {
    const obj = engine.createFromTemplate(id);
    assert.ok(obj.id, `template ${id} produced an id`);
    assert.ok(obj.type, `template ${id} produced a type`);
    assert.equal(engine.validatePreset(obj).ok, true, `template ${id} is valid`);
  }
  const hybrid = engine.createFromTemplate("portal_orb");
  assert.equal(hybrid.type, "custom_portal_orb");
  assert.ok(hybrid.events.on_orb_activation.actions.length >= 7);
});

/* ----------------------- 8. event dispatcher ----------------------- */
test("dispatcher enforces cooldown, activation limits and dedup", () => {
  const engine = freshEngine();
  const obj = engine.registerObject({
    id: "dedup_orb",
    type: "custom_orb",
    events: {
      on_player_touch: {
        actions: [{ action: "set_gamemode", params: { mode: "cube" } }],
        cooldown: 1000,
        maxActivations: 2
      }
    }
  });
  const { ctx, calls } = mockContext();

  engine.execute(obj, "on_player_touch", ctx);
  engine.execute(obj, "on_player_touch", ctx); // cooldown → skipped
  engine.execute(obj, "on_player_touch", ctx); // cooldown → skipped
  assert.equal(calls.filter((c) => c.method === "setGamemode").length, 1);

  engine.dispatcher.tick(1001);
  engine.execute(obj, "on_player_touch", ctx);
  assert.equal(calls.filter((c) => c.method === "setGamemode").length, 2);

  engine.dispatcher.tick(1001);
  engine.execute(obj, "on_player_touch", ctx); // maxActivations reached
  assert.equal(calls.filter((c) => c.method === "setGamemode").length, 2);
});

test("dispatcher runs global events by priority", () => {
  const engine = freshEngine();
  engine.registerObject({ id: "low", type: "custom_trigger", events: { on_level_start: { priority: 1, actions: [{ action: "set_gamemode", params: { mode: "cube" } }] } } });
  engine.registerObject({ id: "high", type: "custom_trigger", events: { on_level_start: { priority: 10, actions: [{ action: "set_gamemode", params: { mode: "ship" } }] } } });
  const { ctx, calls } = mockContext();
  engine.dispatch("on_level_start", ctx);
  const modes = calls.filter((c) => c.method === "setGamemode").map((c) => c.args[0]);
  assert.deepEqual(modes, ["ship", "cube"]);
});

/* ----------------------- 9. preset import/export ------------------- */
test("presets can be exported and imported as JSON (§13 example)", () => {
  const engine = freshEngine();
  const preset = {
    type: "custom_orb",
    id: "portal_wave_orb",
    name: "Portal Wave Orb",
    activation: { type: "player_input" },
    actions: [
      { action: "set_gamemode", params: { mode: "wave" } },
      { action: "reverse_gravity" },
      { action: "set_speed", params: { value: 2 } }
    ]
  };
  const json = engine.exportPreset(engine.createObject(preset));
  const imported = engine.importPreset(json);
  assert.equal(imported.name, "Portal Wave Orb");
  assert.equal(imported.id, "portal_wave_orb");
});

/* ---------------- 10. example mechanics (§18) ---------------------- */
test("Example 1 — Portal Orb executes all actions", () => {
  const engine = freshEngine();
  const obj = engine.createFromTemplate("portal_orb");
  const { ctx, calls } = mockContext();
  engine.execute(obj, "on_orb_activation", ctx);
  assert.ok(calls.some((c) => c.method === "setGamemode" && c.args[0] === "wave"));
  assert.ok(calls.some((c) => c.method === "reverseGravity"));
  assert.ok(calls.some((c) => c.method === "setSpeed" && c.args[0] === 2));
  assert.ok(calls.some((c) => c.target === "groups" && c.method === "activate" && c.args[0] === 15));
  assert.ok(calls.some((c) => c.target === "audio" && c.method === "playSound"));
});

test("Example 2 — Portal Pad executes all actions", () => {
  const engine = freshEngine();
  const obj = engine.createFromTemplate("portal_pad");
  const { ctx, calls, state } = mockContext();
  engine.execute(obj, "on_pad_activation", ctx);
  assert.ok(calls.some((c) => c.method === "setGamemode" && c.args[0] === "ship"));
  assert.ok(calls.some((c) => c.method === "setSpeed" && c.args[0] === 1.5));
  assert.equal(state.yVelocity, 400);
  assert.ok(calls.some((c) => c.target === "groups" && c.method === "activate" && c.args[0] === 25));
});

test("Example 3 — Conditional Orb branches on gamemode", () => {
  const engine = freshEngine();
  const obj = engine.createObject({
    type: "custom_orb",
    id: "conditional_orb",
    events: {
      on_orb_activation: {
        actions: [{
          action: "if",
          condition: { gamemode: "cube" },
          then: [{ action: "set_gamemode", params: { mode: "wave" } }],
          else: [{ action: "set_gamemode", params: { mode: "ball" } }]
        }]
      }
    }
  });
  let { ctx, calls } = mockContext();
  ctx.gamemode = "cube";
  engine.execute(obj, "on_orb_activation", ctx);
  assert.ok(calls.some((c) => c.method === "setGamemode" && c.args[0] === "wave"));

  ({ ctx, calls } = mockContext());
  ctx.gamemode = "ship";
  engine.execute(obj, "on_orb_activation", ctx);
  assert.ok(calls.some((c) => c.method === "setGamemode" && c.args[0] === "ball"));
});

test("Example 4 — Teleport Portal teleports and changes camera", () => {
  const engine = freshEngine();
  const obj = engine.createObject({
    type: "custom_portal",
    id: "teleport_portal",
    events: {
      on_portal_entry: {
        actions: [
          { action: "teleport_to_object", params: { objectId: "target" } },
          { action: "set_camera_target", params: { objectId: "target" } },
          { action: "play_sound", params: { sound: "teleport" } }
        ]
      }
    }
  });
  const { ctx, calls } = mockContext();
  engine.execute(obj, "on_portal_entry", ctx);
  assert.ok(calls.some((c) => c.method === "teleportToObject" && c.args[0] === "target"));
  assert.ok(calls.some((c) => c.target === "camera" && c.method === "setTarget"));
});

test("Example 5 — Custom Jetpack Mode is configurable", () => {
  const engine = freshEngine();
  const obj = engine.createFromTemplate("jetpack");
  assert.equal(obj.type, "custom_gamemode");
  assert.equal(obj.properties.input, "hold_to_fly");
  assert.equal(obj.properties.horizontalMovement, "automatic");
  assert.equal(obj.properties.collisionBehavior, "custom");
});

test("Example 6 — Gravity Dash Orb restores speed after a delay", () => {
  const engine = freshEngine();
  const obj = engine.createObject({
    type: "custom_orb",
    id: "gravity_dash_orb",
    events: {
      on_orb_activation: {
        actions: [
          { action: "reverse_gravity" },
          { action: "dash", params: { direction: "horizontal" } },
          { action: "set_speed", params: { value: 3 } },
          { action: "delay", duration: 1000, actions: [{ action: "set_speed", params: { value: 1 } }] }
        ]
      }
    }
  });
  const { ctx, calls } = mockContext();
  engine.execute(obj, "on_orb_activation", ctx);
  assert.ok(calls.some((c) => c.method === "setSpeed" && c.args[0] === 3));
  engine.tick(1000);
  assert.ok(calls.some((c) => c.method === "setSpeed" && c.args[0] === 1));
});

test("Example 7 — Multi-Action Custom Orb runs every action", () => {
  const engine = freshEngine();
  const obj = engine.createObject({
    type: "custom_orb",
    id: "multi_action_orb",
    events: {
      on_orb_activation: {
        actions: [
          { action: "set_gamemode", params: { mode: "spider" } },
          { action: "enable_mini_mode" },
          { action: "set_speed", params: { value: 2 } },
          { action: "rotate_player", params: { degrees: 45 } },
          { action: "activate_group", params: { group: 20 } },
          { action: "play_sound", params: { sound: "custom" } },
          { action: "spawn_particles", params: {} }
        ]
      }
    }
  });
  const { ctx, calls } = mockContext();
  engine.execute(obj, "on_orb_activation", ctx);
  assert.ok(calls.some((c) => c.method === "setGamemode" && c.args[0] === "spider"));
  assert.ok(calls.some((c) => c.method === "setMini" && c.args[0] === true));
  assert.ok(calls.some((c) => c.method === "setSpeed" && c.args[0] === 2));
  assert.ok(calls.some((c) => c.method === "rotate" && c.args[0] === 45));
  assert.ok(calls.some((c) => c.target === "groups" && c.method === "activate" && c.args[0] === 20));
  assert.ok(calls.some((c) => c.target === "effects" && c.method === "spawnParticles"));
});

test("Example 8 — Custom Triggered Portal branches on a level variable", () => {
  const engine = freshEngine();
  engine.variables.set("global", "modeFlag", 1);
  const obj = engine.createObject({
    type: "custom_portal",
    id: "triggered_portal",
    events: {
      on_portal_entry: {
        actions: [{
          action: "if",
          condition: { op: "equal", left: { variable: { scope: "global", key: "modeFlag" } }, right: 1 },
          then: [
            { action: "set_gamemode", params: { mode: "ship" } },
            { action: "activate_group", params: { group: 1 } }
          ],
          else: [
            { action: "set_gamemode", params: { mode: "wave" } },
            { action: "activate_group", params: { group: 2 } }
          ]
        }]
      }
    }
  });
  const { ctx, calls } = mockContext();
  engine.execute(obj, "on_portal_entry", ctx);
  assert.ok(calls.some((c) => c.method === "setGamemode" && c.args[0] === "ship"));
  assert.ok(calls.some((c) => c.target === "groups" && c.method === "activate" && c.args[0] === 1));
});

/* ------------------ 11. scripting API (§17) ------------------------ */
test("WebDashers.registerAction registers and executes a custom action", () => {
  const engine = freshEngine();
  engine.registerAction("custom:launch_player", {
    schema: { force: { type: "number", default: 15 } },
    execute(context, params) { context.player.velocity = { y: params.force }; }
  });
  const ctx = { player: {} };
  engine.executor.executeAction({ action: "custom:launch_player", params: { force: 30 } }, ctx);
  assert.deepEqual(ctx.player.velocity, { y: 30 });
});

test("WebDashers.registerCondition registers a custom operator", () => {
  const engine = freshEngine();
  engine.registerCondition("is_mini", (cond, ctx) => !!ctx.isMini);
  assert.equal(engine.conditions.evaluate({ op: "is_mini" }, { isMini: true }), true);
  assert.equal(engine.conditions.evaluate({ op: "is_mini" }, { isMini: false }), false);
});

/* --------------- 12. gameplay collision hook ------------------------ */
test("_eventNameForType maps custom collider types to events", () => {
  const runtime = new W.CustomGameplayRuntime({}, new W.CustomGameplayEngine());
  assert.equal(runtime._eventNameForType("custom_orb"), "on_orb_activation");
  assert.equal(runtime._eventNameForType("custom_portal_orb"), "on_orb_activation");
  assert.equal(runtime._eventNameForType("custom_pad"), "on_pad_activation");
  assert.equal(runtime._eventNameForType("custom_portal"), "on_portal_entry");
  assert.equal(runtime._eventNameForType("custom_interactive"), "on_player_touch");
});

test("dispatchCustomActivation runs a custom orb's actions on touch", () => {
  const engine = new W.CustomGameplayEngine();
  const runtime = new W.CustomGameplayRuntime({}, engine);
  const object = engine.createObject({
    type: "custom_orb",
    id: "collide_orb",
    events: { on_orb_activation: { actions: [{ action: "reverse_gravity" }, { action: "set_vertical_velocity", params: { value: 300 } }] } }
  });
  const state = { gravityFlipped: false, yVelocity: 0, isMini: false };
  const playerObject = { p: state };
  const gameObj = { _wdCustom: object, _wdCustomId: object.id, type: "custom_orb" };

  runtime.dispatchCustomActivation(gameObj, playerObject, "custom_orb");

  assert.equal(state.gravityFlipped, true);
  assert.equal(state.yVelocity, 300);
});

/* Unsupported custom objects are preserved, not deleted (§14). */
test("deserializeUnsupported preserves unknown custom object data", () => {
  const serializer = new W.CustomObjectSerializer();
  const preserved = serializer.deserializeUnsupported({ type: "future_thing", payload: 123 });
  assert.equal(preserved._raw.payload, 123);
  assert.ok(preserved._unsupported.length > 0);
});

