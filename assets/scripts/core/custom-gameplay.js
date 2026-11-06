/* =============================================================================
 * Web Dashers — Custom Trigger-Based Gameplay System
 * -----------------------------------------------------------------------------
 * A reusable trigger-action execution engine. Custom orbs, pads, portals,
 * interactive objects, gamemode objects and triggers are all modelled as
 * objects that combine configurable *actions*, *conditions* and *properties*.
 *
 * Environment-agnostic: browser → window.WebDashers / window.TriggerEngine;
 * Node → module.exports (used by tests). No hard Phaser dependency at load.
 * ========================================================================== */
(function (global) {
  "use strict";

  const SCHEMA_VERSION = 1;
  const MAX_RECURSION_DEPTH = 64;
  const MAX_SEQUENCE_STEPS = 256;
  const MAX_LOOP_ITERATIONS = 64;
  const MAX_DISPATCH_DEPTH = 48;

  /* --------------------------- utilities --------------------------- */
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function deepClone(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); } catch (err) { return value; }
  }
  function generateId(prefix) {
    const rnd = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36).slice(-6);
    return `${prefix || "custom"}_${ts}_${rnd}`;
  }
  function normalizeTypeString(value) {
    return String(value === undefined || value === null ? "" : value).trim().toLowerCase();
  }
  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }
  function toNumber(value, fallback) {
    const n = typeof value === "number" ? value : parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  /* ------------------------ schema validation ---------------------- */
  const SCHEMA_TYPES = ["number", "integer", "boolean", "string", "array", "object", "vector2", "any"];

  function validateValue(value, schema, path) {
    const errors = [];
    if (!isPlainObject(schema)) return errors;
    const type = schema.type || "any";

    if (type !== "any" && value !== undefined && value !== null) {
      let ok = true;
      switch (type) {
        case "number":
          ok = (typeof value === "number" && Number.isFinite(value)) ||
               (typeof value === "string" && value.trim() !== "" && Number.isFinite(parseFloat(value)));
          break;
        case "integer":
          ok = Number.isInteger(value) || (typeof value === "string" && /^-?\d+$/.test(value.trim()));
          break;
        case "boolean":
          ok = typeof value === "boolean" || value === 0 || value === 1 ||
               value === "0" || value === "1" || value === "true" || value === "false";
          break;
        case "string":
          ok = typeof value === "string" || typeof value === "number" || typeof value === "boolean";
          break;
        case "array": ok = Array.isArray(value); break;
        case "object": ok = isPlainObject(value); break;
        case "vector2":
          ok = isPlainObject(value) && Number.isFinite(toNumber(value.x, NaN)) && Number.isFinite(toNumber(value.y, NaN));
          break;
      }
      if (!ok) errors.push(`${path}: expected ${type}, got ${typeof value}`);
    }

    if ((value === undefined || value === null) && schema.required) errors.push(`${path}: is required`);
    if (schema.enum && Array.isArray(schema.enum) && value !== undefined && value !== null && !schema.enum.includes(value)) {
      errors.push(`${path}: must be one of [${schema.enum.join(", ")}]`);
    }
    if (isFiniteNumber(schema.min) && value !== undefined && value !== null) {
      const n = toNumber(value, NaN);
      if (Number.isFinite(n) && n < schema.min) errors.push(`${path}: must be >= ${schema.min}`);
    }
    if (isFiniteNumber(schema.max) && value !== undefined && value !== null) {
      const n = toNumber(value, NaN);
      if (Number.isFinite(n) && n > schema.max) errors.push(`${path}: must be <= ${schema.max}`);
    }
    if (schema.type === "object" && isPlainObject(schema.properties) && isPlainObject(value)) {
      for (const key of Object.keys(schema.properties)) {
        errors.push(...validateValue(value[key], schema.properties[key], `${path}.${key}`));
      }
    }
    return errors;
  }

  function validateParams(schema, params, actionName) {
    const errors = [];
    if (!isPlainObject(schema)) return { ok: true, errors };
    params = params || {};
    for (const key of Object.keys(schema)) {
      errors.push(...validateValue(params[key], schema[key], `${actionName || "action"}.${key}`));
    }
    return { ok: errors.length === 0, errors };
  }

  /* ------------------------- generic registry ---------------------- */
  class Registry {
    constructor() { this._entries = Object.create(null); }
    register(name, definition) {
      if (typeof name !== "string" || name.trim() === "") throw new Error("Registry entry name must be a non-empty string.");
      if (!isPlainObject(definition)) throw new Error(`Registry entry "${name}" requires an object definition.`);
      this._entries[name] = definition;
      return this;
    }
    get(name) { return this._entries[name] || null; }
    has(name) { return Object.prototype.hasOwnProperty.call(this._entries, name); }
    names() { return Object.keys(this._entries); }
    remove(name) { delete this._entries[name]; }
    clear() { this._entries = Object.create(null); }
  }

  /* ------------------- TriggerVariableStore (§10) ------------------ */
  const VARIABLE_SCOPES = ["global", "object", "player", "group", "temp"];

  class TriggerVariableStore {
    constructor(initial = {}) {
      this._scopes = Object.create(null);
      for (const scope of VARIABLE_SCOPES) this._scopes[scope] = Object.create(null);
      if (isPlainObject(initial)) {
        for (const scope of VARIABLE_SCOPES) {
          if (isPlainObject(initial[scope])) this._scopes[scope] = Object.assign(Object.create(null), initial[scope]);
        }
      }
    }
    _resolveScope(scope) {
      const s = normalizeTypeString(scope);
      return VARIABLE_SCOPES.includes(s) ? s : "global";
    }
    set(scope, key, value) { this._scopes[this._resolveScope(scope)][key] = deepClone(value); return this; }
    get(scope, key, fallback) {
      const s = this._resolveScope(scope);
      return Object.prototype.hasOwnProperty.call(this._scopes[s], key) ? deepClone(this._scopes[s][key]) : fallback;
    }
    has(scope, key) { return Object.prototype.hasOwnProperty.call(this._scopes[this._resolveScope(scope)], key); }
    remove(scope, key) { delete this._scopes[this._resolveScope(scope)][key]; return this; }
    setVariable(scope, key, value) { return this.set(scope, key, value); }
    getVariable(scope, key, fallback) { return this.get(scope, key, fallback); }
    increment(scope, key, amount = 1) {
      const s = this._resolveScope(scope);
      this._scopes[s][key] = toNumber(this._scopes[s][key], 0) + amount;
      return this._scopes[s][key];
    }
    multiply(scope, key, factor = 1) {
      const s = this._resolveScope(scope);
      this._scopes[s][key] = toNumber(this._scopes[s][key], 0) * factor;
      return this._scopes[s][key];
    }
    divide(scope, key, divisor = 1) {
      const s = this._resolveScope(scope);
      this._scopes[s][key] = divisor === 0 ? 0 : toNumber(this._scopes[s][key], 0) / divisor;
      return this._scopes[s][key];
    }
    list(scope) { return deepClone(this._scopes[this._resolveScope(scope)]); }
    clear(scope) {
      if (scope === undefined) { for (const s of VARIABLE_SCOPES) this._scopes[s] = Object.create(null); }
      else this._scopes[this._resolveScope(scope)] = Object.create(null);
      return this;
    }
    toJSON() {
      const out = {};
      for (const s of VARIABLE_SCOPES) out[s] = deepClone(this._scopes[s]);
      return out;
    }
    resolve(ref, fallback) {
      if (isPlainObject(ref) && ref.key !== undefined) return this.get(ref.scope, ref.key, fallback);
      return this.get("global", ref, fallback);
    }
  }

  /* ----------------- TriggerConditionEvaluator (§9) ---------------- */
  const COMPARATORS = ["equal", "not_equal", "greater_than", "less_than", "greater_or_equal", "less_or_equal", "contains", "and", "or", "not"];

  class TriggerConditionEvaluator {
    constructor(variableStore) {
      this.variables = variableStore || new TriggerVariableStore();
    }
    _resolveValue(operand, context) {
      if (operand === undefined || operand === null) return null;
      if (isPlainObject(operand)) {
        if (operand.variable !== undefined) return this.variables.resolve(operand.variable, operand.default);
        if (operand.variableKey !== undefined) return this.variables.get(operand.scope || "global", operand.variableKey, operand.default);
        if (operand.path !== undefined && context) return this._resolvePath(context, operand.path);
        return operand.value !== undefined ? operand.value : operand;
      }
      return operand;
    }
    _resolvePath(context, path) {
      try { return String(path).split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), context); }
      catch (err) { return undefined; }
    }
    _compare(op, left, right) {
      switch (op) {
        case "equal": return left === right;
        case "not_equal": return left !== right;
        case "greater_than": return toNumber(left, NaN) > toNumber(right, NaN);
        case "less_than": return toNumber(left, NaN) < toNumber(right, NaN);
        case "greater_or_equal": return toNumber(left, NaN) >= toNumber(right, NaN);
        case "less_or_equal": return toNumber(left, NaN) <= toNumber(right, NaN);
        case "contains":
          if (typeof left === "string") return left.includes(String(right));
          if (Array.isArray(left)) return left.includes(right);
          return false;
        default: return false;
      }
    }
    evaluate(condition, context) {
      if (condition === undefined || condition === null) return true;
      if (condition === true) return true;
      if (condition === false) return false;
      if (!isPlainObject(condition)) return !!condition;

      const op = condition.op || condition.operator || null;
      if (op === "and") return (condition.conditions || []).every((s) => this.evaluate(s, context));
      if (op === "or") return (condition.conditions || []).some((s) => this.evaluate(s, context));
      if (op === "not") {
        const sub = condition.condition !== undefined ? condition.condition : condition.value;
        return !this.evaluate(sub, context);
      }
      if (op === "true" || op === "false") return op === "true";
      if (op && COMPARATORS.includes(op)) {
        const left = this._resolveValue(condition.left !== undefined ? condition.left : condition.value, context);
        const right = this._resolveValue(condition.right, context);
        return this._compare(op, left, right);
      }

      const keys = Object.keys(condition);
      if (keys.length === 1) {
        const key = keys[0];
        const expected = condition[key];
        const actual = this._resolvePath(context, key);
        if (expected === true || expected === false) return !!actual === expected;
        return actual === expected;
      }
      return Object.keys(condition).every((key) => {
        const expected = condition[key];
        const actual = this._resolvePath(context, key);
        if (expected === true || expected === false) return !!actual === expected;
        return actual === expected;
      });
    }
    evaluateMany(conditions, context, mode = "all") {
      const list = Array.isArray(conditions) ? conditions : [];
      if (mode === "any") return list.some((c) => this.evaluate(c, context));
      return list.every((c) => this.evaluate(c, context));
    }
  }

  /* ------------------- TriggerActionRegistry (§16) ------------------ */
  class TriggerActionRegistry extends Registry {
    register(name, definition) {
      if (typeof definition.execute !== "function") {
        throw new Error(`Action "${name}" must define an execute(context, params) function.`);
      }
      super.register(name, definition);
      return this;
    }
    validateAction(action) {
      const def = this.get(action && action.action);
      if (!def) return { ok: false, errors: [`Unknown action "${action && action.action}"`] };
      return validateParams(def.schema, action.params, action.action);
    }
  }

  /* ------------------------ TriggerScheduler ----------------------- */
  class TriggerScheduler {
    constructor() { this._now = 0; this._queue = []; this._nextId = 1; }
    now() { return this._now; }
    setNow(value) { this._now = value; }
    schedule(fn, delayMs) {
      const id = this._nextId++;
      const due = this._now + Math.max(0, toNumber(delayMs, 0));
      this._queue.push({ id, due, fn });
      this._queue.sort((a, b) => a.due - b.due);
      return id;
    }
    cancel(id) { this._queue = this._queue.filter((t) => t.id !== id); }
    clear() { this._queue = []; }
    tick(deltaMs) {
      this._now += Math.max(0, toNumber(deltaMs, 0));
      const due = this._queue.filter((t) => t.due <= this._now);
      this._queue = this._queue.filter((t) => t.due > this._now);
      for (const t of due) { try { t.fn(); } catch (err) { /* swallow */ } }
    }
  }

  /* -------------------- CustomFunctionRegistry (§10) --------------- */
  class CustomFunctionRegistry extends Registry {
    register(name, definition) {
      if (!Array.isArray(definition && definition.actions)) {
        throw new Error(`Function "${name}" must define an actions array.`);
      }
      super.register(name, definition);
      return this;
    }
    registerFunction(name, definition) { return this.register(name, definition); }
    getFunction(name) { return this.get(name); }
  }

  /* --------------------- TriggerActionExecutor (§16) ---------------- */
  class TriggerActionExecutor {
    constructor(actionRegistry, conditionEvaluator, functionRegistry, scheduler) {
      this.actions = actionRegistry || new TriggerActionRegistry();
      this.conditions = conditionEvaluator || new TriggerConditionEvaluator();
      this.functions = functionRegistry || new CustomFunctionRegistry();
      this.scheduler = scheduler || new TriggerScheduler();
    }

    _resolveParams(params, context) {
      if (!isPlainObject(params)) return params || {};
      const out = {};
      for (const key of Object.keys(params)) {
        const v = params[key];
        if (isPlainObject(v) && (v.$param !== undefined || v.$ref !== undefined)) {
          const name = v.$param !== undefined ? v.$param : v.$ref;
          const bag = context && context.functionArgs ? context.functionArgs : {};
          out[key] = Object.prototype.hasOwnProperty.call(bag, name) ? bag[name] : v.default;
        } else out[key] = v;
      }
      return out;
    }

    executeAction(action, context) {
      if (!isPlainObject(action) || !action.action) throw new Error("Action must be an object with an `action` property.");
      const def = this.actions.get(action.action);
      if (!def) throw new Error(`Unknown action "${action.action}"`);
      const resolved = this._resolveParams(action.params, context);
      const validation = this.actions.validateAction({ action: action.action, params: resolved });
      if (!validation.ok) throw new Error(`Invalid action "${action.action}": ${validation.errors.join("; ")}`);
      return def.execute(context, resolved);
    }

    executeStep(step, context, state) {
      if (!step || !isPlainObject(step)) return;
      if (step.action === "if" || step.action === "branch") {
        const pass = this.conditions.evaluate(step.condition, context);
        const branch = pass ? step.then : step.else;
        if (Array.isArray(branch)) this.executeSequence(branch, context, state);
        return;
      }
      if (step.action === "condition") {
        if (!this.conditions.evaluate(step.condition, context)) state.cancelled = true;
        return;
      }
      if (step.action === "loop") {
        const count = clamp(Math.floor(toNumber(step.count, 0)), 0, MAX_LOOP_ITERATIONS);
        for (let i = 0; i < count && !state.cancelled; i++) {
          this.executeSequence(step.actions || [], Object.assign({}, context, { loopIndex: i }), state);
        }
        return;
      }
      if (step.action === "delay") {
        const delayMs = Math.max(0, toNumber(step.duration !== undefined ? step.duration : step.delay, 0));
        const actions = step.actions || [];
        if (delayMs <= 0) this.executeSequence(actions, context, state);
        else {
          const self = this;
          this.scheduler.schedule(() => self.executeSequence(actions, context, { depth: state.depth, steps: 0, cancelled: false }), delayMs);
        }
        return;
      }
      if (step.action === "call_function" || step.action === "callFunction") {
        this.callFunction(step.function || step.name, step.params || step.arguments || {}, context);
        return;
      }
      this.executeAction(step, context);
    }

    executeSequence(sequence, context, state) {
      state = state || { depth: 0, steps: 0, cancelled: false };
      if (state.depth > MAX_RECURSION_DEPTH) throw new Error("Trigger recursion limit exceeded.");
      const child = { depth: state.depth + 1, steps: state.steps, cancelled: false };
      for (const step of (Array.isArray(sequence) ? sequence : [])) {
        if (child.cancelled) break;
        child.steps++;
        if (child.steps > MAX_SEQUENCE_STEPS) throw new Error("Action sequence step limit exceeded.");
        this.executeStep(step, context, child);
      }
      state.steps = child.steps;
      state.cancelled = child.cancelled;
      return state;
    }

    callFunction(name, args, context) {
      const def = this.functions.getFunction(name);
      if (!def) throw new Error(`Unknown function "${name}"`);
      return this.executeSequence(def.actions, Object.assign({}, context, { functionArgs: args || {} }));
    }

    executeObjectActions(object, eventName, context) {
      const events = object && object.events;
      const list = (events && events[eventName]) || (object && object.actions) || [];
      const eventCfg = (events && isPlainObject(events[eventName]) && !Array.isArray(events[eventName])) ? events[eventName] : null;
      const actions = eventCfg ? eventCfg.actions : list;
      if (eventCfg && eventCfg.condition !== undefined && !this.conditions.evaluate(eventCfg.condition, context)) {
        return { executed: false };
      }
      this.executeSequence(actions, context);
      return { executed: true };
    }
  }

  /* --------------------- TriggerEventDispatcher (§9) --------------- */
  class TriggerEventDispatcher {
    constructor(executor) {
      this.executor = executor;
      this._now = 0;
      this._objects = new Map();      // objectId -> object
      this._counts = new Map();       // key -> fired count
      this._lastFire = new Map();     // key -> last fire timestamp (ms)
      this._stack = [];               // recursion protection
    }
    tick(deltaMs) { this._now += Math.max(0, toNumber(deltaMs, 0)); }
    registerObject(object) { if (object && object.id !== undefined) this._objects.set(object.id, object); }
    unregisterObject(id) { this._objects.delete(id); }
    clear() { this._objects.clear(); this._counts.clear(); this._lastFire.clear(); this._stack = []; }

    _hasEvent(object, eventName) {
      return !!(object && object.events && object.events[eventName] !== undefined);
    }
    _getEventConfig(object, eventName) {
      const raw = object.events[eventName];
      if (Array.isArray(raw)) return { actions: raw };
      if (isPlainObject(raw)) return raw;
      return { actions: [] };
    }
    _key(objectId, eventName, playerKey) {
      return `${objectId}|${eventName}|${playerKey || ""}`;
    }

    _shouldFire(object, eventName, playerKey, context) {
      const cfg = this._getEventConfig(object, eventName);
      const key = this._key(object.id, eventName, playerKey);

      // recursion protection: same key already executing
      if (this._stack.includes(key)) return false;

      // activation count / single-activation limits
      const maxActivations = cfg.maxActivations !== undefined ? cfg.maxActivations : cfg.activationLimit;
      if (maxActivations !== undefined && maxActivations !== null) {
        const fired = this._counts.get(key) || 0;
        if (fired >= maxActivations) return false;
      }

      // cooldown (dedup repeated collision frames)
      const cooldown = cfg.cooldown !== undefined ? cfg.cooldown : cfg.cooldownMs;
      if (cooldown && cooldown > 0) {
        const last = this._lastFire.get(key);
        if (last !== undefined && this._now - last < cooldown) return false;
      }

      return true;
    }

    _fire(object, eventName, context, eventInfo, playerKey) {
      const cfg = this._getEventConfig(object, eventName);
      const key = this._key(object.id, eventName, playerKey);

      this._stack.push(key);
      this._counts.set(key, (this._counts.get(key) || 0) + 1);
      this._lastFire.set(key, this._now);

      try {
        const evtContext = Object.assign({}, context, {
          event: eventName,
          eventInfo: eventInfo || {},
          currentObject: object,
          playerKey: playerKey
        });
        if (cfg.condition !== undefined && !this.executor.conditions.evaluate(cfg.condition, evtContext)) {
          return;
        }
        this.executor.executeSequence(cfg.actions || [], evtContext);
      } finally {
        const idx = this._stack.lastIndexOf(key);
        if (idx >= 0) this._stack.splice(idx, 1);
      }
    }

    /* Fire a single object's handler for an event. */
    dispatchObject(object, eventName, context, eventInfo) {
      if (!object || !this._hasEvent(object, eventName)) return;
      const playerKey = (context && context.playerKey) || (eventInfo && eventInfo.playerKey) || "";
      if (!this._shouldFire(object, eventName, playerKey, context)) return;
      this._fire(object, eventName, context, eventInfo, playerKey);
    }

    /* Fire all registered objects listening for a (typically global) event. */
    dispatchAll(eventName, context, eventInfo) {
      const matched = [];
      for (const object of this._objects.values()) {
        if (this._hasEvent(object, eventName)) {
          matched.push({ object, cfg: this._getEventConfig(object, eventName) });
        }
      }
      matched.sort((a, b) => (b.cfg.priority || 0) - (a.cfg.priority || 0));
      for (const m of matched) {
        const playerKey = (context && context.playerKey) || (eventInfo && eventInfo.playerKey) || "";
        if (this._shouldFire(m.object, eventName, playerKey, context)) {
          this._fire(m.object, eventName, context, eventInfo, playerKey);
        }
      }
    }
  }

  /* -------------------- CustomObjectSerializer (§13/14) ------------- */
  const KNOWN_OBJECT_TYPES = [
    "custom_orb", "custom_pad", "custom_portal", "custom_portal_orb",
    "custom_portal_pad", "custom_interactive", "custom_gamemode", "custom_trigger"
  ];
  const EVENT_NAMES = [
    "on_level_start", "on_level_end", "on_player_enter", "on_player_exit",
    "on_player_touch", "on_player_collision", "on_player_death", "on_player_jump",
    "on_player_land", "on_orb_activation", "on_pad_activation", "on_portal_entry",
    "on_portal_exit", "on_gamemode_change", "on_gravity_change", "on_speed_change",
    "on_group_activation", "on_group_deactivation", "on_timer", "on_variable_change",
    "on_item_collection", "on_percentage_reached", "on_custom_event"
  ];

  class CustomObjectSerializer {
    constructor(schemaVersion = SCHEMA_VERSION) {
      this.schemaVersion = schemaVersion;
    }

    /* Migrate any older format to the current schema version. */
    migrate(data) {
      if (!isPlainObject(data)) return data;
      let out = deepClone(data);
      let version = toNumber(out.version, 0);

      // v0 → v1: split flat `actions`/`conditions` into event map if missing.
      if (version < 1) {
        if (!out.events && Array.isArray(out.actions)) {
          const event = (out.activation && out.activation.primaryEvent) || this._defaultEventForType(out.type);
          out.events = {};
          out.events[event] = { actions: out.actions };
          if (Array.isArray(out.conditions) && out.conditions.length) {
            out.events[event].condition = { op: "and", conditions: out.conditions };
          }
        }
        version = 1;
      }

      out.version = this.schemaVersion;
      return out;
    }

    _defaultEventForType(type) {
      switch (normalizeTypeString(type)) {
        case "custom_pad": case "custom_portal_pad": return "on_pad_activation";
        case "custom_portal": case "custom_portal_orb": return "on_portal_entry";
        case "custom_gamemode": return "on_gamemode_change";
        case "custom_trigger": return "on_custom_event";
        case "custom_interactive": return "on_player_touch";
        default: return "on_orb_activation";
      }
    }

    validatePreset(data) {
      const errors = [];
      if (!isPlainObject(data)) return { ok: false, errors: ["Preset must be a JSON object."] };
      const type = normalizeTypeString(data.type);
      if (!KNOWN_OBJECT_TYPES.includes(type)) {
        errors.push(`Unknown custom object type "${data.type}".`);
      }
      if (data.id !== undefined && (typeof data.id !== "string" || data.id.trim() === "")) {
        errors.push("`id` must be a non-empty string.");
      }
      if (data.actions !== undefined && !Array.isArray(data.actions)) {
        errors.push("`actions` must be an array.");
      }
      if (data.conditions !== undefined && !Array.isArray(data.conditions)) {
        errors.push("`conditions` must be an array.");
      }
      if (data.events !== undefined && !isPlainObject(data.events)) {
        errors.push("`events` must be an object.");
      }
      if (Array.isArray(data.groups)) {
        for (const g of data.groups) {
          if (!Number.isInteger(g)) errors.push(`Group id "${g}" must be an integer.`);
        }
      }
      return { ok: errors.length === 0, errors };
    }

    serialize(object) {
      const out = deepClone(object);
      if (isPlainObject(out)) {
        out.version = this.schemaVersion;
        delete out._raw;
        delete out._unsupported;
      }
      return out;
    }

    deserialize(data) {
      const migrated = this.migrate(data);
      const validation = this.validatePreset(migrated);
      const out = deepClone(migrated);
      out._raw = deepClone(data);
      if (!validation.ok) out._unsupported = validation.errors;
      return out;
    }

    /* Preserve unknown objects instead of deleting them. */
    deserializeUnsupported(data) {
      return { _raw: deepClone(data), _unsupported: ["Unsupported custom object type."] };
    }
  }

  /* ------------------- CustomObjectRegistry (§16) ------------------- */
  class CustomObjectRegistry {
    constructor() { this._objects = new Map(); }
    register(object) {
      if (!object || !object.id) object = Object.assign({}, object, { id: object && object.id || generateId("obj") });
      this._objects.set(object.id, object);
      return object;
    }
    get(id) { return this._objects.get(id) || null; }
    has(id) { return this._objects.has(id); }
    remove(id) { return this._objects.delete(id); }
    list() { return Array.from(this._objects.values()); }
    findByName(name) {
      const n = normalizeTypeString(name);
      return this.list().find((o) => normalizeTypeString(o.name) === n) || null;
    }
    clear() { this._objects.clear(); }
  }

  /* --------------------- CustomObjectFactory (§4-7) ----------------- */
  class CustomObjectFactory {
    constructor(serializer, templates) {
      this.serializer = serializer || new CustomObjectSerializer();
      this.templates = templates || {};
    }
    createFromPreset(preset) {
      const data = this.serializer.migrate(preset);
      const validation = this.serializer.validatePreset(data);
      if (!validation.ok) throw new Error(`Invalid preset: ${validation.errors.join("; ")}`);
      if (!data.id) data.id = generateId(data.type || "custom");
      return deepClone(data);
    }
    createFromTemplate(templateId, overrides) {
      const template = this.templates[templateId];
      if (!template) throw new Error(`Unknown template "${templateId}"`);
      return this.createFromPreset(Object.assign({}, deepClone(template), deepClone(overrides || {})));
    }
    registerTemplates(map) { Object.assign(this.templates, map); return this; }
  }

  /* ---------------------------------------------------------------------
   * Built-in universal action library (§3).
   * Each action is registered independently with a schema + execute().
   * Execute functions operate on a *context* object supplied at runtime.
   * ------------------------------------------------------------------- */
  const BUILTIN_ACTIONS = {};

  function _player(ctx) { return ctx && ctx.player; }
  function _state(ctx) { return ctx && ctx.state; }
  function _call(obj, method) {
    if (obj && typeof obj[method] === "function") {
      return obj[method].apply(obj, Array.prototype.slice.call(arguments, 2));
    }
    return undefined;
  }
  function _has(obj, method) {
    return !!(obj && typeof obj[method] === "function");
  }
  const GAMEMODE_ENUM = ["cube", "ship", "ball", "ufo", "wave", "robot", "spider", "swing", "custom"];
  const GRAVITY_ENUM = ["up", "down", "normal", "inverted", "flip", "toggle"];

  /* ------------------------------ A. Player ----------------------- */
  Object.assign(BUILTIN_ACTIONS, {
    set_gamemode: {
      schema: { mode: { type: "string", required: true, enum: GAMEMODE_ENUM } },
      execute(ctx, p) { _call(_player(ctx), "setGamemode", p.mode); }
    },
    set_gravity: {
      schema: { direction: { type: "string", required: true, enum: GRAVITY_ENUM } },
      execute(ctx, p) {
        if (_has(_player(ctx), "setGravity")) { _call(_player(ctx), "setGravity", p.direction); return; }
        const flipped = ["up", "inverted", "flip"].includes(p.direction);
        if (_state(ctx)) _state(ctx).gravityFlipped = p.direction === "toggle" ? !_state(ctx).gravityFlipped : flipped;
      }
    },
    reverse_gravity: {
      schema: {},
      execute(ctx) {
        if (_has(_player(ctx), "reverseGravity")) { _call(_player(ctx), "reverseGravity"); return; }
        if (_state(ctx)) _state(ctx).gravityFlipped = !_state(ctx).gravityFlipped;
      }
    },
    multiply_gravity: {
      schema: { factor: { type: "number", required: true, default: -1 } },
      execute(ctx, p) { _call(_player(ctx), "multiplyGravity", p.factor); }
    },
    set_speed: {
      schema: { value: { type: "number" }, multiplier: { type: "number" } },
      execute(ctx, p) { _call(_player(ctx), "setSpeed", p.value !== undefined ? p.value : p.multiplier); }
    },
    multiply_speed: {
      schema: { factor: { type: "number", required: true } },
      execute(ctx, p) { _call(_player(ctx), "multiplySpeed", p.factor); }
    },
    set_horizontal_velocity: {
      schema: { value: { type: "number", required: true } },
      execute(ctx, p) {
        if (_has(_player(ctx), "setHorizontalVelocity")) { _call(_player(ctx), "setHorizontalVelocity", p.value); return; }
        if (_state(ctx)) _state(ctx).xVelocity = p.value;
      }
    },
    set_vertical_velocity: {
      schema: { value: { type: "number", required: true } },
      execute(ctx, p) {
        if (_has(_player(ctx), "setVerticalVelocity")) { _call(_player(ctx), "setVerticalVelocity", p.value); return; }
        if (_state(ctx)) _state(ctx).yVelocity = p.value;
      }
    },
    multiply_velocity: {
      schema: { x: { type: "number", default: 1 }, y: { type: "number", default: 1 }, factor: { type: "number" } },
      execute(ctx, p) {
        const fx = p.x !== undefined ? p.x : (p.factor !== undefined ? p.factor : 1);
        const fy = p.y !== undefined ? p.y : (p.factor !== undefined ? p.factor : 1);
        if (_state(ctx)) {
          if (_state(ctx).xVelocity !== undefined) _state(ctx).xVelocity *= fx;
          if (_state(ctx).yVelocity !== undefined) _state(ctx).yVelocity *= fy;
        }
      }
    },
    add_velocity: {
      schema: { x: { type: "number", default: 0 }, y: { type: "number", default: 0 } },
      execute(ctx, p) {
        if (_state(ctx)) {
          if (p.x !== undefined && _state(ctx).xVelocity !== undefined) _state(ctx).xVelocity += p.x;
          if (p.y !== undefined) _state(ctx).yVelocity = (_state(ctx).yVelocity || 0) + p.y;
        }
      }
    },
    remove_velocity: {
      schema: { x: { type: "number", default: 0 }, y: { type: "number", default: 0 } },
      execute(ctx, p) {
        if (_state(ctx)) {
          if (p.x !== undefined && _state(ctx).xVelocity !== undefined) _state(ctx).xVelocity -= p.x;
          if (p.y !== undefined) _state(ctx).yVelocity = (_state(ctx).yVelocity || 0) - p.y;
        }
      }
    },
    stop_movement: {
      schema: {},
      execute(ctx) {
        _call(_player(ctx), "stopMovement");
        if (_state(ctx)) { _state(ctx).yVelocity = 0; if (_state(ctx).xVelocity !== undefined) _state(ctx).xVelocity = 0; }
      }
    }
  });

  Object.assign(BUILTIN_ACTIONS, {
    jump: { schema: { force: { type: "number" } }, execute(ctx, p) { _call(_player(ctx), "jump", p.force); } },
    force_jump: { schema: { force: { type: "number" } }, execute(ctx, p) { _call(_player(ctx), "forceJump", p.force); } },
    dash: { schema: { direction: { type: "string" }, force: { type: "number" } }, execute(ctx, p) { _call(_player(ctx), "dash", p.direction, p.force); } },
    teleport: {
      schema: { x: { type: "number" }, y: { type: "number" } },
      execute(ctx, p) {
        if (_has(_player(ctx), "teleport")) { _call(_player(ctx), "teleport", p.x, p.y); return; }
        if (_state(ctx)) { if (p.x !== undefined) _state(ctx).x = p.x; if (p.y !== undefined) _state(ctx).y = p.y; }
      }
    },
    set_player_scale: { schema: { scale: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setScale", p.scale); } },
    multiply_player_scale: { schema: { factor: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "multiplyScale", p.factor); } },
    set_player_rotation: { schema: { degrees: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setRotation", p.degrees); } },
    rotate_player: { schema: { degrees: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "rotate", p.degrees); } },
    reset_rotation: { schema: {}, execute(ctx) { _call(_player(ctx), "resetRotation"); } },
    enable_mini_mode: { schema: {}, execute(ctx) { _call(_player(ctx), "setMini", true); } },
    disable_mini_mode: { schema: {}, execute(ctx) { _call(_player(ctx), "setMini", false); } },
    enable_dual_mode: { schema: {}, execute(ctx) { _call(_player(ctx), "setDual", true); } },
    disable_dual_mode: { schema: {}, execute(ctx) { _call(_player(ctx), "setDual", false); } },
    switch_active_player: { schema: {}, execute(ctx) { _call(_player(ctx), "switchActivePlayer"); } },
    change_player_appearance: {
      schema: { sprite: { type: "string" }, color: { type: "number" }, color2: { type: "number" } },
      execute(ctx, p) { _call(_player(ctx), "setAppearance", p.sprite, p.color, p.color2); }
    },
    change_player_trail: {
      schema: { trail: { type: "string" }, enabled: { type: "boolean" } },
      execute(ctx, p) { _call(_player(ctx), "setTrail", p.trail, p.enabled); }
    },
    set_player_control: { schema: { enabled: { type: "boolean", required: true } }, execute(ctx, p) { _call(_player(ctx), "setControl", p.enabled); } },
    apply_temporary_effect: {
      schema: { effect: { type: "string", required: true }, duration: { type: "number" } },
      execute(ctx, p) { _call(_player(ctx), "applyEffect", p.effect, p.duration); }
    },
    reset_player_properties: { schema: {}, execute(ctx) { _call(_player(ctx), "resetProperties"); } }
  });

  /* ---------------------------- B. Gamemode ----------------------- */
  const _gamemodeAction = (mode) => ({
    schema: {},
    execute(ctx) { _call(_player(ctx), "setGamemode", mode); }
  });
  Object.assign(BUILTIN_ACTIONS, {
    change_to_cube: _gamemodeAction("cube"),
    change_to_ship: _gamemodeAction("ship"),
    change_to_ball: _gamemodeAction("ball"),
    change_to_ufo: _gamemodeAction("ufo"),
    change_to_wave: _gamemodeAction("wave"),
    change_to_robot: _gamemodeAction("robot"),
    change_to_spider: _gamemodeAction("spider"),
    change_to_swing: _gamemodeAction("swing"),
    change_to_custom_gamemode: { schema: { id: { type: "string", required: true } }, execute(ctx, p) { _call(_player(ctx), "setCustomGamemode", p.id); } },
    change_movement_physics: { schema: { profile: { type: "string" } }, execute(ctx, p) { _call(_player(ctx), "setMovementPhysics", p.profile); } },
    change_jump_behavior: { schema: { behavior: { type: "string" } }, execute(ctx, p) { _call(_player(ctx), "setJumpBehavior", p.behavior); } },
    change_gravity_behavior: { schema: { behavior: { type: "string" } }, execute(ctx, p) { _call(_player(ctx), "setGravityBehavior", p.behavior); } },
    change_rotation_behavior: { schema: { behavior: { type: "string" } }, execute(ctx, p) { _call(_player(ctx), "setRotationBehavior", p.behavior); } },
    change_collision_behavior: { schema: { behavior: { type: "string" } }, execute(ctx, p) { _call(_player(ctx), "setCollisionBehavior", p.behavior); } },
    change_input_behavior: { schema: { behavior: { type: "string" } }, execute(ctx, p) { _call(_player(ctx), "setInputBehavior", p.behavior); } },
    change_player_animation: { schema: { animation: { type: "string" } }, execute(ctx, p) { _call(_player(ctx), "setAnimation", p.animation); } }
  });

  /* ---------------------------- C. Portal ------------------------- */
  Object.assign(BUILTIN_ACTIONS, {
    transform_to_gamemode: { schema: { mode: { type: "string", required: true, enum: GAMEMODE_ENUM } }, execute(ctx, p) { _call(_player(ctx), "setGamemode", p.mode); } },
    set_portal_destination: { schema: { x: { type: "number" }, y: { type: "number" }, objectId: { type: "string" } }, execute(ctx, p) { _call(_player(ctx), "setPortalDestination", p.x, p.y, p.objectId); } },
    teleport_to_coordinates: { schema: { x: { type: "number", required: true }, y: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "teleport", p.x, p.y); } },
    teleport_to_object: { schema: { objectId: { type: "string", required: true } }, execute(ctx, p) { _call(_player(ctx), "teleportToObject", p.objectId); } },
    activate_another_portal: { schema: { portalId: { type: "string" }, objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "activate", p.portalId || p.objectId); } },
    enable_portal_effects: { schema: {}, execute(ctx) { _call(_player(ctx), "setPortalEffects", true); } },
    disable_portal_effects: { schema: {}, execute(ctx) { _call(_player(ctx), "setPortalEffects", false); } },
    set_temporary_transformations: { schema: { transformations: { type: "array" } }, execute(ctx, p) { _call(_player(ctx), "setTemporaryTransformations", p.transformations); } },
    restore_previous_player_state: { schema: {}, execute(ctx) { _call(_player(ctx), "restoreState"); } }
  });

  /* ---------------------------- D. Physics ------------------------ */
  Object.assign(BUILTIN_ACTIONS, {
    set_gravity_strength: { schema: { value: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setGravityStrength", p.value); } },
    set_gravity_direction: { schema: { direction: { type: "string", required: true, enum: GRAVITY_ENUM } }, execute(ctx, p) { _call(_player(ctx), "setGravity", p.direction); } },
    set_acceleration: { schema: { value: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setAcceleration", p.value); } },
    set_friction: { schema: { value: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setFriction", p.value); } },
    set_max_velocity: { schema: { value: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setMaxVelocity", p.value); } },
    set_min_velocity: { schema: { value: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setMinVelocity", p.value); } },
    set_jump_strength: { schema: { value: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setJumpStrength", p.value); } },
    set_dash_strength: { schema: { value: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setDashStrength", p.value); } },
    set_air_resistance: { schema: { value: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setAirResistance", p.value); } },
    set_movement_multiplier: { schema: { value: { type: "number", required: true } }, execute(ctx, p) { _call(_player(ctx), "setMovementMultiplier", p.value); } },
    set_collision_behavior: { schema: { behavior: { type: "string" }, enabled: { type: "boolean" } }, execute(ctx, p) { _call(_player(ctx), "setCollisionBehavior", p.behavior, p.enabled); } },
    enable_custom_physics_profile: { schema: { profile: { type: "string", required: true } }, execute(ctx, p) { _call(_player(ctx), "setPhysicsProfile", p.profile, true); } },
    disable_custom_physics_profile: { schema: {}, execute(ctx) { _call(_player(ctx), "setPhysicsProfile", null, false); } },
    apply_impulse: { schema: { x: { type: "number", default: 0 }, y: { type: "number", default: 0 } }, execute(ctx, p) { _call(_player(ctx), "applyImpulse", p.x, p.y); } },
    apply_continuous_force: { schema: { x: { type: "number", default: 0 }, y: { type: "number", default: 0 } }, execute(ctx, p) { _call(_player(ctx), "applyForce", p.x, p.y, true); } },
    apply_directional_force: { schema: { angle: { type: "number" }, magnitude: { type: "number" } }, execute(ctx, p) { _call(_player(ctx), "applyDirectionalForce", p.angle, p.magnitude); } },
    apply_rotational_force: { schema: { value: { type: "number" } }, execute(ctx, p) { _call(_player(ctx), "applyRotationalForce", p.value); } }
  });

  /* ---------------------------- E. Object ------------------------- */
  Object.assign(BUILTIN_ACTIONS, {
    move_object: { schema: { objectId: { type: "string" }, x: { type: "number" }, y: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.objects, "move", p.objectId, p.x, p.y); } },
    rotate_object: { schema: { objectId: { type: "string" }, degrees: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.objects, "rotate", p.objectId, p.degrees); } },
    scale_object: { schema: { objectId: { type: "string" }, scale: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.objects, "scale", p.objectId, p.scale); } },
    change_object_color: { schema: { objectId: { type: "string" }, color: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.objects, "setColor", p.objectId, p.color); } },
    change_object_opacity: { schema: { objectId: { type: "string" }, opacity: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.objects, "setOpacity", p.objectId, p.opacity); } },
    enable_object: { schema: { objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "enable", p.objectId); } },
    disable_object: { schema: { objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "disable", p.objectId); } },
    show_object: { schema: { objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "show", p.objectId); } },
    hide_object: { schema: { objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "hide", p.objectId); } },
    destroy_object: { schema: { objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "destroy", p.objectId); } },
    spawn_object: { schema: { preset: { type: "string" }, x: { type: "number" }, y: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.objects, "spawn", p.preset, p.x, p.y); } },
    clone_object: { schema: { objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "clone", p.objectId); } },
    change_object_animation: { schema: { objectId: { type: "string" }, animation: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "setAnimation", p.objectId, p.animation); } },
    change_object_sprite: { schema: { objectId: { type: "string" }, sprite: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "setSprite", p.objectId, p.sprite); } },
    set_object_group: { schema: { objectId: { type: "string" }, group: { type: "integer" } }, execute(ctx, p) { _call(ctx && ctx.objects, "setGroup", p.objectId, p.group); } },
    activate_object: { schema: { objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "activate", p.objectId); } },
    reset_object: { schema: { objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.objects, "reset", p.objectId); } }
  });

  /* ----------------------------- F. Group ------------------------- */
  Object.assign(BUILTIN_ACTIONS, {
    activate_group: { schema: { group: { type: "integer", required: true } }, execute(ctx, p) { _call(ctx && ctx.groups, "activate", p.group); } },
    deactivate_group: { schema: { group: { type: "integer", required: true } }, execute(ctx, p) { _call(ctx && ctx.groups, "deactivate", p.group); } },
    toggle_group: { schema: { group: { type: "integer", required: true } }, execute(ctx, p) { _call(ctx && ctx.groups, "toggle", p.group); } },
    activate_multiple_groups: { schema: { groups: { type: "array", required: true } }, execute(ctx, p) { _call(ctx && ctx.groups, "activateMany", p.groups); } },
    activate_spawn_group: { schema: { group: { type: "integer" } }, execute(ctx, p) { _call(ctx && ctx.groups, "activateSpawn", p.group); } },
    stop_group: { schema: { group: { type: "integer", required: true } }, execute(ctx, p) { _call(ctx && ctx.groups, "stop", p.group); } },
    reset_group: { schema: { group: { type: "integer", required: true } }, execute(ctx, p) { _call(ctx && ctx.groups, "reset", p.group); } },
    set_group_variable: { schema: { group: { type: "integer" }, key: { type: "string" }, value: {} }, execute(ctx, p) { _call(ctx && ctx.groups, "setVariable", p.group, p.key, p.value); } },
    check_group_state: { schema: { group: { type: "integer" } }, execute(ctx, p) { _call(ctx && ctx.groups, "checkState", p.group); } }
  });

  /* ---------------------------- G. Camera ------------------------- */
  Object.assign(BUILTIN_ACTIONS, {
    set_camera_zoom: { schema: { zoom: { type: "number", required: true } }, execute(ctx, p) { _call(ctx && ctx.camera, "setZoom", p.zoom); } },
    add_camera_zoom: { schema: { amount: { type: "number", required: true } }, execute(ctx, p) { _call(ctx && ctx.camera, "addZoom", p.amount); } },
    set_camera_rotation: { schema: { degrees: { type: "number", required: true } }, execute(ctx, p) { _call(ctx && ctx.camera, "setRotation", p.degrees); } },
    set_camera_offset: { schema: { x: { type: "number" }, y: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.camera, "setOffset", p.x, p.y); } },
    follow_player: { schema: {}, execute(ctx) { _call(ctx && ctx.camera, "followPlayer"); } },
    follow_object: { schema: { objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.camera, "followObject", p.objectId); } },
    lock_camera: { schema: {}, execute(ctx) { _call(ctx && ctx.camera, "lock"); } },
    unlock_camera: { schema: {}, execute(ctx) { _call(ctx && ctx.camera, "unlock"); } },
    set_camera_target: { schema: { x: { type: "number" }, y: { type: "number" }, objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.camera, "setTarget", p.objectId, p.x, p.y); } },
    shake_camera: { schema: { intensity: { type: "number" }, duration: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.camera, "shake", p.intensity, p.duration); } },
    reset_camera: { schema: {}, execute(ctx) { _call(ctx && ctx.camera, "reset"); } },
    set_camera_boundaries: { schema: { left: { type: "number" }, right: { type: "number" }, top: { type: "number" }, bottom: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.camera, "setBoundaries", p); } },
    change_camera_behavior: { schema: { behavior: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.camera, "setBehavior", p.behavior); } }
  });

  /* ----------------------------- H. Audio ------------------------- */
  Object.assign(BUILTIN_ACTIONS, {
    play_sound: { schema: { sound: { type: "string", required: true }, id: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.audio, "playSound", p.sound || p.id); } },
    stop_sound: { schema: { sound: { type: "string" }, id: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.audio, "stopSound", p.sound || p.id); } },
    play_music: { schema: { music: { type: "string" }, id: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.audio, "playMusic", p.music || p.id); } },
    stop_music: { schema: {}, execute(ctx) { _call(ctx && ctx.audio, "stopMusic"); } },
    set_volume: { schema: { volume: { type: "number", required: true } }, execute(ctx, p) { _call(ctx && ctx.audio, "setVolume", p.volume); } },
    fade_audio: { schema: { to: { type: "number" }, duration: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.audio, "fade", p.to, p.duration); } },
    change_pitch: { schema: { pitch: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.audio, "setPitch", p.pitch); } },
    play_custom_sfx: { schema: { sfx: { type: "string", required: true } }, execute(ctx, p) { _call(ctx && ctx.audio, "playCustomSfx", p.sfx); } },
    play_audio_sequence: { schema: { sequence: { type: "array" } }, execute(ctx, p) { _call(ctx && ctx.audio, "playSequence", p.sequence); } },
    trigger_sound_group: { schema: { group: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.audio, "triggerGroup", p.group); } }
  });

  /* ------------------------- I. Visual effects -------------------- */
  Object.assign(BUILTIN_ACTIONS, {
    spawn_particles: { schema: { color: { type: "number" }, count: { type: "integer" }, x: { type: "number" }, y: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.effects, "spawnParticles", p); } },
    stop_particles: { schema: {}, execute(ctx) { _call(ctx && ctx.effects, "stopParticles"); } },
    change_particle_color: { schema: { color: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.effects, "setParticleColor", p.color); } },
    change_particle_speed: { schema: { speed: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.effects, "setParticleSpeed", p.speed); } },
    change_particle_size: { schema: { size: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.effects, "setParticleSize", p.size); } },
    set_glow: { schema: { enabled: { type: "boolean" }, color: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.effects, "setGlow", p.enabled, p.color); } },
    apply_screen_flash: { schema: { color: { type: "number" }, duration: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.effects, "screenFlash", p.color, p.duration); } },
    apply_screen_shake: { schema: { intensity: { type: "number" }, duration: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.effects, "screenShake", p.intensity, p.duration); } },
    change_background: { schema: { background: { type: "string" }, id: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.effects, "setBackground", p.background || p.id); } },
    change_ground_color: { schema: { color: { type: "number" } }, execute(ctx, p) { _call(ctx && ctx.effects, "setGroundColor", p.color); } },
    apply_custom_shader: { schema: { shader: { type: "string" }, objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.effects, "applyShader", p.objectId, p.shader); } },
    enable_shader: { schema: { shader: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.effects, "setShader", p.shader, true); } },
    disable_shader: { schema: { shader: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.effects, "setShader", p.shader, false); } },
    start_animation: { schema: { animation: { type: "string" }, objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.effects, "startAnimation", p.objectId, p.animation); } },
    stop_animation: { schema: { animation: { type: "string" }, objectId: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.effects, "stopAnimation", p.objectId, p.animation); } }
  });

  /* ---------------------------- J. Level -------------------------- */
  Object.assign(BUILTIN_ACTIONS, {
    set_level_variable: { schema: { key: { type: "string", required: true }, value: {} }, execute(ctx, p) { if (ctx && ctx.variables) ctx.variables.set("global", p.key, p.value); } },
    add_to_variable: { schema: { key: { type: "string", required: true }, amount: { type: "number", default: 1 } }, execute(ctx, p) { if (ctx && ctx.variables) ctx.variables.increment("global", p.key, p.amount); } },
    subtract_from_variable: { schema: { key: { type: "string", required: true }, amount: { type: "number", default: 1 } }, execute(ctx, p) { if (ctx && ctx.variables) ctx.variables.increment("global", p.key, -p.amount); } },
    multiply_variable: { schema: { key: { type: "string", required: true }, factor: { type: "number", default: 1 } }, execute(ctx, p) { if (ctx && ctx.variables) ctx.variables.multiply("global", p.key, p.factor); } },
    divide_variable: { schema: { key: { type: "string", required: true }, divisor: { type: "number", default: 1 } }, execute(ctx, p) { if (ctx && ctx.variables) ctx.variables.divide("global", p.key, p.divisor); } },
    compare_variables: { schema: { left: { type: "string" }, right: { type: "string" }, op: { type: "string" } }, execute(ctx, p) { if (ctx && ctx.variables) ctx._compareResult = (ctx.variables.get("global", p.left) === ctx.variables.get("global", p.right)); } },
    set_checkpoint: { schema: {}, execute(ctx) { _call(ctx && ctx.level, "setCheckpoint"); } },
    reset_checkpoint: { schema: {}, execute(ctx) { _call(ctx && ctx.level, "resetCheckpoint"); } },
    restart_level: { schema: {}, execute(ctx) { _call(ctx && ctx.level, "restart"); } },
    complete_level: { schema: {}, execute(ctx) { _call(ctx && ctx.level, "complete"); } },
    change_level_state: { schema: { state: { type: "string" } }, execute(ctx, p) { _call(ctx && ctx.level, "setState", p.state); } },
    start_timer: { schema: { timer: { type: "string", default: "default" } }, execute(ctx, p) { _call(ctx && ctx.level, "startTimer", p.timer); } },
    stop_timer: { schema: { timer: { type: "string", default: "default" } }, execute(ctx, p) { _call(ctx && ctx.level, "stopTimer", p.timer); } },
    reset_timer: { schema: { timer: { type: "string", default: "default" } }, execute(ctx, p) { _call(ctx && ctx.level, "resetTimer", p.timer); } },
    activate_event: { schema: { event: { type: "string", required: true } }, execute(ctx, p) { _call(ctx && ctx.runtime, "dispatchEvent", p.event); } },
    execute_custom_function: { schema: { function: { type: "string", required: true }, params: { type: "object" } }, execute(ctx, p) { _call(ctx && ctx.runtime, "callFunction", p.function, p.params); } }
  });

  /* ---------------------------------------------------------------------
   * Built-in templates (§4-7). These are starting points users customize.
   * ------------------------------------------------------------------- */
  const BUILTIN_TEMPLATES = {};

  const _orb = (id, name, desc, actions, extra) => Object.assign({
    type: "custom_orb",
    id: `template_orb_${id}`,
    name,
    description: desc,
    activation: { type: "player_input", primaryEvent: "on_orb_activation", cooldown: 250, maxActivations: 1 },
    events: { on_orb_activation: { actions } }
  }, extra || {});

  Object.assign(BUILTIN_TEMPLATES, {
    normal_orb: _orb("normal", "Normal Orb", "Standard jump activation.", [{ action: "jump" }]),
    gravity_orb: _orb("gravity", "Gravity Orb", "Changes gravity on activation.", [{ action: "reverse_gravity" }]),
    dash_orb: _orb("dash", "Dash Orb", "Launches the player in a direction.", [{ action: "dash", params: { direction: "horizontal" } }]),
    teleport_orb: _orb("teleport", "Teleport Orb", "Teleports the player.", [{ action: "teleport", params: { x: 120, y: 0 } }]),
    gamemode_orb: _orb("gamemode", "Gamemode Orb", "Changes player gamemode.", [{ action: "set_gamemode", params: { mode: "wave" } }]),
    speed_orb: _orb("speed", "Speed Orb", "Changes player speed.", [{ action: "set_speed", params: { value: 2 } }]),
    mini_orb: _orb("mini", "Mini Orb", "Changes player scale.", [{ action: "set_player_scale", params: { scale: 0.5 } }]),
    bounce_orb: _orb("bounce", "Bounce Orb", "Applies configurable bounce force.", [{ action: "add_velocity", params: { y: 600 } }]),
    freeze_orb: _orb("freeze", "Freeze Orb", "Temporarily freezes movement.", [{ action: "stop_movement" }, { action: "set_player_control", params: { enabled: false } }]),
    custom_orb: _orb("custom", "Custom Orb", "Starts with no predefined actions.", []),
    portal_orb: {
      type: "custom_portal_orb",
      id: "template_orb_portal",
      name: "Portal Orb",
      description: "Combines portal functionality with orb activation.",
      activation: { type: "player_input", primaryEvent: "on_orb_activation", cooldown: 250, maxActivations: 1 },
      events: {
        on_orb_activation: {
          actions: [
            { action: "set_gamemode", params: { mode: "wave" } },
            { action: "reverse_gravity" },
            { action: "set_speed", params: { value: 2 } },
            { action: "set_player_scale", params: { scale: 0.5 } },
            { action: "activate_group", params: { group: 15 } },
            { action: "play_sound", params: { sound: "custom" } },
            { action: "spawn_particles", params: {} }
          ]
        }
      }
    }
  });

  const _pad = (id, name, desc, actions, extra) => Object.assign({
    type: "custom_pad",
    id: `template_pad_${id}`,
    name,
    description: desc,
    activation: { type: "player_touch", primaryEvent: "on_pad_activation", cooldown: 200, maxActivations: 1 },
    events: { on_pad_activation: { actions } }
  }, extra || {});

  Object.assign(BUILTIN_TEMPLATES, {
    normal_pad: _pad("normal", "Normal Pad", "Standard pad jump.", [{ action: "jump" }]),
    gravity_pad: _pad("gravity", "Gravity Pad", "Changes gravity on touch.", [{ action: "reverse_gravity" }]),
    speed_pad: _pad("speed", "Speed Pad", "Changes speed on touch.", [{ action: "set_speed", params: { value: 2 } }]),
    dash_pad: _pad("dash", "Dash Pad", "Launches the player.", [{ action: "dash", params: { direction: "horizontal" } }]),
    teleport_pad: _pad("teleport", "Teleport Pad", "Teleports the player.", [{ action: "teleport", params: { x: 180, y: 0 } }]),
    gamemode_pad: _pad("gamemode", "Gamemode Pad", "Changes gamemode.", [{ action: "set_gamemode", params: { mode: "ship" } }]),
    bounce_pad: _pad("bounce", "Bounce Pad", "Applies bounce force.", [{ action: "add_velocity", params: { y: 720 } }]),
    custom_pad: _pad("custom", "Custom Pad", "Starts empty.", []),
    portal_pad: {
      type: "custom_portal_pad",
      id: "template_pad_portal",
      name: "Portal Pad",
      description: "Hybrid pad with portal transformations.",
      activation: { type: "player_touch", primaryEvent: "on_pad_activation", cooldown: 200, maxActivations: 1 },
      events: {
        on_pad_activation: {
          actions: [
            { action: "set_gamemode", params: { mode: "ship" } },
            { action: "reverse_gravity" },
            { action: "set_speed", params: { value: 1.5 } },
            { action: "add_velocity", params: { y: 400 } },
            { action: "activate_group", params: { group: 25 } },
            { action: "start_animation", params: { animation: "activation" } }
          ]
        }
      }
    }
  });

  const _portal = (id, name, desc, actions, extra) => Object.assign({
    type: "custom_portal",
    id: `template_portal_${id}`,
    name,
    description: desc,
    activation: { type: "player_enter", primaryEvent: "on_portal_entry", cooldown: 0, maxActivations: 1 },
    events: { on_portal_entry: { actions } }
  }, extra || {});

  Object.assign(BUILTIN_TEMPLATES, {
    cube_portal: _portal("cube", "Cube Portal", "Switch to Cube.", [{ action: "set_gamemode", params: { mode: "cube" } }]),
    ship_portal: _portal("ship", "Ship Portal", "Switch to Ship.", [{ action: "set_gamemode", params: { mode: "ship" } }]),
    ball_portal: _portal("ball", "Ball Portal", "Switch to Ball.", [{ action: "set_gamemode", params: { mode: "ball" } }]),
    ufo_portal: _portal("ufo", "UFO Portal", "Switch to UFO.", [{ action: "set_gamemode", params: { mode: "ufo" } }]),
    wave_portal: _portal("wave", "Wave Portal", "Switch to Wave.", [{ action: "set_gamemode", params: { mode: "wave" } }]),
    robot_portal: _portal("robot", "Robot Portal", "Switch to Robot.", [{ action: "set_gamemode", params: { mode: "robot" } }]),
    spider_portal: _portal("spider", "Spider Portal", "Switch to Spider.", [{ action: "set_gamemode", params: { mode: "spider" } }]),
    swing_portal: _portal("swing", "Swing Portal", "Switch to Swing.", [{ action: "set_gamemode", params: { mode: "swing" } }]),
    gravity_portal: _portal("gravity", "Gravity Portal", "Reverse gravity.", [{ action: "reverse_gravity" }]),
    speed_portal: _portal("speed", "Speed Portal", "Change speed.", [{ action: "set_speed", params: { value: 2 } }]),
    mini_portal: _portal("mini", "Mini Portal", "Enable mini mode.", [{ action: "enable_mini_mode" }]),
    dual_portal: _portal("dual", "Dual Portal", "Enable dual mode.", [{ action: "enable_dual_mode" }]),
    custom_gamemode_portal: _portal("custom_gamemode", "Custom Gamemode Portal", "Enter a custom gamemode.", [{ action: "change_to_custom_gamemode", params: { id: "jetpack" } }]),
    teleport_portal: _portal("teleport", "Teleport Portal", "Teleport the player.", [{ action: "teleport_to_object", params: { objectId: "target" } }]),
    hybrid_portal: _portal("hybrid", "Hybrid Portal", "Multiple simultaneous transformations.", [
      { action: "set_gamemode", params: { mode: "ship" } },
      { action: "reverse_gravity" },
      { action: "set_speed", params: { value: 2 } },
      { action: "enable_mini_mode" },
      { action: "rotate_player", params: { degrees: 90 } },
      { action: "set_camera_zoom", params: { zoom: 1.5 } },
      { action: "activate_group", params: { group: 10 } }
    ])
  });

  const _gamemode = (id, name, desc, properties, extra) => Object.assign({
    type: "custom_gamemode",
    id: `template_gamemode_${id}`,
    name,
    description: desc,
    properties
  }, extra || {});

  Object.assign(BUILTIN_TEMPLATES, {
    gamemode_cube: _gamemode("cube", "Cube", "Standard cube physics.", { gravity: 1, input: "tap_to_jump", rotation: true }),
    gamemode_ship: _gamemode("ship", "Ship", "Fly physics.", { gravity: 1, input: "hold_to_fly" }),
    gamemode_ball: _gamemode("ball", "Ball", "Rolling physics.", { gravity: 1, input: "tap_to_flip" }),
    gamemode_ufo: _gamemode("ufo", "UFO", "Bounce-and-fly physics.", { gravity: 1, input: "tap_to_jump" }),
    gamemode_wave: _gamemode("wave", "Wave", "Sawtooth physics.", { gravity: 1, input: "hold_to_fly" }),
    gamemode_robot: _gamemode("robot", "Robot", "Robot jump physics.", { gravity: 1, input: "tap_to_jump" }),
    gamemode_spider: _gamemode("spider", "Spider", "Teleport jump physics.", { gravity: 1, input: "tap_to_jump" }),
    jetpack: {
      type: "custom_gamemode",
      id: "template_gamemode_jetpack",
      name: "Jetpack",
      description: "Hold jump to generate upward thrust; release to fall. Horizontal movement stays automatic.",
      properties: {
        gravity: 1,
        gravityDirection: "down",
        horizontalMovement: "automatic",
        verticalMovement: "thrust",
        acceleration: 0.6,
        friction: 0.9,
        maxVelocity: 12,
        minVelocity: -12,
        jumpStrength: 10,
        dashStrength: 0,
        input: "hold_to_fly",
        collisionBehavior: "custom",
        rotationBehavior: "none",
        deathConditions: ["spike", "ceiling", "floor"],
        miniMode: true,
        dualMode: false,
        playerSprite: "jetpack_01",
        playerAnimation: "jetpack_flame"
      }
    }
  });

  /* ------------------- register all builtin actions ---------------- */
  function registerBuiltinActions(registry) {
    for (const name of Object.keys(BUILTIN_ACTIONS)) {
      registry.register(name, BUILTIN_ACTIONS[name]);
    }
    return registry;
  }

  /* ------------------- custom condition operators (§9/17) ---------- */
  class CustomConditionEvaluator extends TriggerConditionEvaluator {
    constructor(variableStore) {
      super(variableStore);
      this.custom = Object.create(null);
    }
    setCustomOperator(name, fn) { this.custom[name] = fn; return this; }
    evaluate(condition, context) {
      const op = condition && (condition.op || condition.operator);
      if (op && this.custom[op]) return !!this.custom[op](condition, context, this);
      return super.evaluate(condition, context);
    }
  }

  /* ----------------------- CustomGameplayEngine -------------------- */
  class CustomGameplayEngine {
    constructor(options = {}) {
      this.variables = options.variables || new TriggerVariableStore(options.initialVariables);
      this.conditions = new CustomConditionEvaluator(this.variables);
      this.actions = new TriggerActionRegistry();
      registerBuiltinActions(this.actions);
      this.functions = new CustomFunctionRegistry();
      this.scheduler = options.scheduler || new TriggerScheduler();
      this.executor = new TriggerActionExecutor(this.actions, this.conditions, this.functions, this.scheduler);
      this.dispatcher = new TriggerEventDispatcher(this.executor);
      this.serializer = new CustomObjectSerializer(options.schemaVersion);
      this.objects = new CustomObjectRegistry();
      this.templates = Object.assign({}, BUILTIN_TEMPLATES, options.templates || {});
      this.factory = new CustomObjectFactory(this.serializer, this.templates);
    }

    registerAction(name, definition) { this.actions.register(name, definition); return this; }
    registerCondition(name, fn) { this.conditions.setCustomOperator(name, fn); return this; }
    registerFunction(name, definition) { this.functions.registerFunction(name, definition); return this; }
    registerTemplate(id, template) { this.templates[id] = template; this.factory.registerTemplates({ [id]: template }); return this; }

    createObject(preset) { return this.factory.createFromPreset(preset); }
    createFromTemplate(templateId, overrides) { return this.factory.createFromTemplate(templateId, overrides); }
    registerObject(object) { const o = this.objects.register(object); this.dispatcher.registerObject(o); return o; }

    execute(object, eventName, context, eventInfo) { this.dispatcher.dispatchObject(object, eventName, context, eventInfo); }
    dispatch(eventName, context, eventInfo) { this.dispatcher.dispatchAll(eventName, context, eventInfo); }
    tick(deltaMs) { this.scheduler.tick(deltaMs); this.dispatcher.tick(deltaMs); }

    serialize(object) { return this.serializer.serialize(object); }
    deserialize(data) { return this.serializer.deserialize(data); }
    validatePreset(data) { return this.serializer.validatePreset(data); }
    exportPreset(object) { return JSON.stringify(this.serializer.serialize(object), null, 2); }
    importPreset(json) {
      let data;
      if (typeof json === "string") data = JSON.parse(json);
      else data = json;
      return this.deserialize(data);
    }

    listActions() { return this.actions.names(); }
    listTemplates() { return Object.keys(this.templates); }
    listFunctions() { return this.functions.names(); }
    getActionSchema(name) { const d = this.actions.get(name); return d ? d.schema : null; }
    getTemplate(id) { return this.templates[id] || null; }
  }

  /* ---------------------------------------------------------------------
   * CustomGameplayRuntime — live in-game integration adapter.
   * Builds an execution *context* from the active Phaser scene and lets the
   * engine run custom object actions against the real player/level/camera.
   * ------------------------------------------------------------------- */
  class CustomGameplayRuntime {
    constructor(scene, engine) {
      this.scene = scene;
      this.engine = engine || null;
      this._objectsApi = this._makeObjectsApi();
      this._groupsApi = this._makeGroupsApi();
      this._cameraApi = this._makeCameraApi();
      this._audioApi = this._makeAudioApi();
      this._effectsApi = this._makeEffectsApi();
      this._placed = new Map();
    }

    setEngine(engine) { this.engine = engine; return this; }
    _playerObj() { return this.scene && this.scene._player; }
    _state() { return this.scene && this.scene._state; }

    buildContext(eventInfo, player, state) {
      const scene = this.scene;
      const p = player || this._playerObj();
      const s = state || this._state();
      return {
        scene,
        player: this._makePlayerApi(p, s),
        state: s,
        level: scene && scene._level,
        objects: this._objectsApi,
        groups: this._groupsApi,
        variables: this.engine ? this.engine.variables : null,
        camera: this._cameraApi,
        audio: this._audioApi,
        effects: this._effectsApi,
        event: null,
        eventInfo: eventInfo || {},
        deltaTime: 0,
        runtime: this,
        playerKey: "main"
      };
    }

    _makePlayerApi(player, state) {
      const scene = this.scene;
      player = player || this._playerObj();
      state = state || this._state();
      const self = this;
      const setFlipped = (flipped) => {
        if (!state) return;
        if (player && typeof player.flipGravity === "function") player.flipGravity(!!flipped, 0.5);
        else state.gravityFlipped = !!flipped;
      };
      return {
        setGamemode(mode) { if (scene && scene._setPlayerGamemode) scene._setPlayerGamemode(player, state, mode); },
        setGravity(direction) {
          if (direction === "toggle") { setFlipped(!state.gravityFlipped); return; }
          setFlipped(direction === "up" || direction === "inverted" || direction === "flip");
        },
        reverseGravity() { setFlipped(!state.gravityFlipped); },
        multiplyGravity() { setFlipped(!state.gravityFlipped); },
        setSpeed(value) {
          if (state) state._customSpeedMultiplier = value;
          if (scene && typeof scene._setPlayerSpeed === "function") scene._setPlayerSpeed(value);
        },
        multiplySpeed(f) { if (state) state._customSpeedMultiplier = (state._customSpeedMultiplier || 1) * f; },
        setHorizontalVelocity(v) { if (state) state.xVelocity = v; },
        setVerticalVelocity(v) { if (state) state.yVelocity = v; },
        setScale(scale) { if (state) state.isMini = toNumber(scale, 1) <= 0.5; },
        multiplyScale(factor) { if (state && state.isMini !== undefined) state.isMini = (state.isMini ? 0.5 : 1) * factor <= 0.5; },
        setMini(mini) { if (state) state.isMini = !!mini; },
        setDual(dual) { if (scene && state) scene._isDual = !!dual; },
        switchActivePlayer() {},
        jump(force) { if (player && typeof player.jump === "function") player.jump(force); },
        forceJump(force) { if (player && typeof player.jump === "function") player.jump(force); },
        dash(direction, force) { if (state) state.yVelocity = force || 400; },
        teleport(x, y) {
          if (state) { if (x !== undefined) state.x = x; if (y !== undefined) state.y = y; }
          if (player) player._ignoreTeleportUntilClear = false;
        },
        teleportToObject(objectId) { self._teleportToObject(objectId); },
        setPortalDestination(x, y, objectId) { if (state) state._customPortalDestination = { x, y, objectId }; },
        setRotation(degrees) { if (state) state._customRotation = degrees; },
        rotate(degrees) { if (state) state._customRotation = (state._customRotation || 0) + degrees; },
        resetRotation() { if (state) state._customRotation = 0; },
        stopMovement() { if (state) state.yVelocity = 0; },
        setControl(enabled) { if (state) state.controlEnabled = !!enabled; },
        setAppearance(sprite, color, color2) { if (state) Object.assign(state, { _customSprite: sprite, _customColor: color, _customColor2: color2 }); },
        setTrail(trail, enabled) { if (state) state._customTrail = enabled === false ? null : trail; },
        applyEffect(effect, duration) { if (state) state._tempEffect = { effect, duration }; },
        resetProperties() { if (state) { state.gravityFlipped = false; state.isMini = false; state._customSpeedMultiplier = 1; } }
      };
    }

    _teleportToObject(objectId) {
      const entry = this._placed.get(objectId);
      const state = this._state();
      if (entry && entry.levelObj && state) {
        state.x = entry.levelObj.x;
        state.y = entry.levelObj.y;
      }
    }

    _makeObjectsApi() {
      const self = this;
      const noop = () => {};
      return {
        activate(id) { self._dispatchObjectEvent(id, "on_custom_event", { target: id }); },
        enable: noop, disable: noop, show: noop, hide: noop, destroy: noop, reset: noop,
        move(id, x, y) { const e = self._placed.get(id); if (e && e.levelObj) { e.levelObj.x = x; e.levelObj.y = y; } },
        rotate(id, degrees) { const e = self._placed.get(id); if (e && e.levelObj) e.levelObj.rot = degrees; },
        scale(id, s) { const e = self._placed.get(id); if (e && e.levelObj) e.levelObj.scale = s; },
        setColor: noop, setOpacity: noop, setAnimation: noop, setSprite: noop, setGroup: noop,
        spawn(preset, x, y) { self.placeCustomObject(preset, x, y); },
        clone(id) { const e = self._placed.get(id); if (e) self.placeCustomObject(e.preset, (e.levelObj && e.levelObj.x) || 0, (e.levelObj && e.levelObj.y) || 0); }
      };
    }

    _makeGroupsApi() {
      const scene = this.scene;
      const self = this;
      const activate = (group) => { if (scene && typeof scene._activateGroup === "function") scene._activateGroup(group); };
      const deactivate = (group) => { if (scene && typeof scene._deactivateGroup === "function") scene._deactivateGroup(group); };
      const toggle = (group) => { if (scene && typeof scene._toggleGroup === "function") scene._toggleGroup(group); };
      return {
        activate, deactivate, toggle,
        activateMany(groups) { (groups || []).forEach(activate); },
        activateSpawn(group) { activate(group); },
        stop(group) { deactivate(group); },
        reset(group) { deactivate(group); activate(group); },
        setVariable(group, key, value) { if (self.engine) self.engine.variables.set("group", `${group}.${key}`, value); },
        checkState() { return true; }
      };
    }

    _makeCameraApi() {
      const scene = this.scene;
      return {
        setZoom(z) { if (scene && scene.cameras && scene.cameras.main) scene.cameras.main.setZoom(z); },
        addZoom(a) { if (scene && scene.cameras && scene.cameras.main) scene.cameras.main.setZoom(scene.cameras.main.zoom + a); },
        setRotation(d) { if (scene && scene.cameras && scene.cameras.main) scene.cameras.main.setRotation((d * Math.PI) / 180); },
        setOffset(x, y) { if (scene && scene.cameras && scene.cameras.main) scene.cameras.main.setScroll(x, y); },
        followPlayer() {}, followObject() {}, lock() {}, unlock() {}, setTarget() {},
        shake(intensity, duration) { if (scene && scene.cameras && scene.cameras.main) scene.cameras.main.shake(duration || 200, intensity || 0.01); },
        reset() { if (scene && scene.cameras && scene.cameras.main) { scene.cameras.main.setZoom(1); scene.cameras.main.setRotation(0); } },
        setBoundaries() {}, setBehavior() {}
      };
    }

    _makeAudioApi() {
      const scene = this.scene;
      const playSound = (sound) => { if (scene && scene.sound) { try { scene.sound.play(sound); } catch (e) {} } };
      return {
        playSound, stopSound() {}, playMusic() {}, stopMusic() {}, setVolume() {}, fade() {}, setPitch() {},
        playCustomSfx(sfx) { playSound(sfx); }, playSequence() {}, triggerGroup() {}
      };
    }

    _makeEffectsApi() {
      return {
        spawnParticles() {}, stopParticles() {}, setParticleColor() {}, setParticleSpeed() {},
        setParticleSize() {}, setGlow() {}, screenFlash() {}, screenShake() {}, setBackground() {},
        setGroundColor() {}, applyShader() {}, setShader() {}, startAnimation() {}, stopAnimation() {}
      };
    }

    placeCustomObject(preset, x, y) {
      if (!this.engine) return null;
      const object = this.engine.createObject(preset);
      const levelObj = { id: object.id, x: x || 0, y: y || 0, type: object.type, customObject: object };
      object._levelObj = levelObj;
      this._placed.set(object.id, { preset: object, levelObj });
      this.engine.registerObject(object);
      return object;
    }

    _dispatchObjectEvent(objectId, eventName, eventInfo) {
      if (!this.engine) return;
      const entry = this._placed.get(objectId);
      if (entry && entry.preset) this.engine.execute(entry.preset, eventName, this.buildContext(eventInfo), eventInfo);
    }

    registerLevelObject(object, levelObj) {
      if (!this.engine) return object;
      this._placed.set(object.id, { preset: object, levelObj });
      this.engine.registerObject(object);
      return object;
    }

    _eventNameForType(type) {
      switch (String(type || "")) {
        case "custom_orb": case "custom_portal_orb": return "on_orb_activation";
        case "custom_pad": case "custom_portal_pad": return "on_pad_activation";
        case "custom_portal": return "on_portal_entry";
        case "custom_gamemode": return "on_gamemode_change";
        case "custom_trigger": return "on_custom_event";
        default: return "on_player_touch";
      }
    }

    /* Called by the player collision loop when a custom collider is touched. */
    dispatchCustomActivation(gameObj, playerObject, colliderType) {
      if (!this.engine) return;
      const object = gameObj && (gameObj._wdCustom || (this._placed.get(gameObj._wdCustomId) || {}).preset);
      if (!object) return;
      const state = playerObject && playerObject.p;
      const eventName = this._eventNameForType(colliderType || object.type);
      const context = this.buildContext({ collider: gameObj }, playerObject, state);
      this.engine.execute(object, eventName, context, { collider: gameObj, playerObject });
    }

    tick(deltaMs) { if (this.engine) this.engine.tick(deltaMs); }
    dispatchEvent(eventName, eventInfo) { if (this.engine) this.engine.dispatch(eventName, this.buildContext(eventInfo), eventInfo); }
  }

  /* ---------------------------------------------------------------------
   * Default engine instance + public WebDashers scripting API (§17).
   * ------------------------------------------------------------------- */
  const defaultEngine = new CustomGameplayEngine();

  const WebDashers = {
    version: "1.0.0",
    schemaVersion: SCHEMA_VERSION,
    engine: defaultEngine,

    // Public classes (architecture §16)
    TriggerVariableStore, TriggerConditionEvaluator, TriggerActionRegistry, TriggerActionExecutor,
    CustomFunctionRegistry, TriggerScheduler, TriggerEventDispatcher, CustomObjectSerializer,
    CustomObjectRegistry, CustomObjectFactory, CustomGameplayEngine, CustomGameplayRuntime,

    // Constants
    EVENT_NAMES, KNOWN_OBJECT_TYPES,

    // Scripting / extension API (§17)
    registerAction(name, definition) { return defaultEngine.registerAction(name, definition); },
    registerCondition(name, fn) { return defaultEngine.registerCondition(name, fn); },
    registerFunction(name, definition) { return defaultEngine.registerFunction(name, definition); },
    registerTemplate(id, template) { return defaultEngine.registerTemplate(id, template); },

    // Object lifecycle
    createCustomObject(preset) { return defaultEngine.createObject(preset); },
    createFromTemplate(id, overrides) { return defaultEngine.createFromTemplate(id, overrides); },
    registerObject(object) { return defaultEngine.registerObject(object); },
    execute(object, eventName, context, eventInfo) { return defaultEngine.execute(object, eventName, context, eventInfo); },
    dispatch(eventName, context, eventInfo) { return defaultEngine.dispatch(eventName, context, eventInfo); },
    tick(deltaMs) { return defaultEngine.tick(deltaMs); },

    // Serialization (§13/14)
    serializeObject(object) { return defaultEngine.serialize(object); },
    deserializeObject(data) { return defaultEngine.deserialize(data); },
    exportPreset(object) { return defaultEngine.exportPreset(object); },
    importPreset(json) { return defaultEngine.importPreset(json); },
    validatePreset(data) { return defaultEngine.validatePreset(data); },

    // Introspection
    listActions() { return defaultEngine.listActions(); },
    listTemplates() { return defaultEngine.listTemplates(); },
    listFunctions() { return defaultEngine.listFunctions(); },
    getTemplate(id) { return defaultEngine.getTemplate(id); },
    getActionSchema(name) { return defaultEngine.getActionSchema(name); },

    // Runtime adapter
    createRuntime(scene) { return new CustomGameplayRuntime(scene, defaultEngine); }
  };

  /* ---------------------------------------------------------------------
   * Browser integration: register custom objects in the GD object browser,
   * and define a text-field marker so custom objects serialize in levels.
   * ------------------------------------------------------------------- */
  const CUSTOM_OBJECT_IDS = {
    custom_orb: 1701, custom_pad: 1702, custom_portal: 1703,
    custom_portal_orb: 1704, custom_portal_pad: 1705,
    custom_interactive: 1706, custom_gamemode: 1707, custom_trigger: 1708
  };
  const CUSTOM_LEVEL_MARKER = "WD_CUSTOM:";

  /* Visual definitions so custom objects look like orbs/pads/portals,
     not plain solid blocks. Frames mirror the vanilla GD objects. */
  const CUSTOM_VISUALS = {
    custom_orb: { can_color: false, frame: "ring_01_001.png", gridW: 1.2, gridH: 1.2, default_z_layer: 3, default_z_order: 12 },
    custom_pad: { can_color: false, frame: "bump_01_001.png", gridW: 0.8333333134651184, gridH: 0.13333334028720856, default_z_layer: 3, default_z_order: 12, editorOffsetY: -13 },
    custom_portal: { can_color: false, frame: "portal_01_front_001.png", gridW: 0.8333333134651184, gridH: 2.5, default_z_layer: 5, default_z_order: 2 },
    custom_portal_orb: { can_color: false, frame: "ring_01_001.png", gridW: 1.2, gridH: 1.2, default_z_layer: 3, default_z_order: 12 },
    custom_portal_pad: { can_color: false, frame: "bump_01_001.png", gridW: 0.8333333134651184, gridH: 0.13333334028720856, default_z_layer: 3, default_z_order: 12, editorOffsetY: -13 },
    custom_interactive: { can_color: false, frame: "ring_01_001.png", gridW: 1.2, gridH: 1.2, default_z_layer: 3, default_z_order: 12 },
    custom_gamemode: { can_color: false, frame: "portal_01_front_001.png", gridW: 0.8333333134651184, gridH: 2.5, default_z_layer: 5, default_z_order: 2 },
    custom_trigger: { can_color: false, frame: "ring_01_001.png", gridW: 1, gridH: 1, default_z_layer: 3, default_z_order: 12 }
  };

  function _installBrowserIntegration() {
    if (typeof window === "undefined") return;
    if (typeof window.allobjects === "function") {
      const orig = window.allobjects;
      window.allobjects = function () {
        const defs = orig();
        for (const type of Object.keys(CUSTOM_OBJECT_IDS)) {
          const id = CUSTOM_OBJECT_IDS[type];
          if (!defs[id]) {
            defs[id] = Object.assign({
              type,
              default_detail_color_channel: -1
            }, CUSTOM_VISUALS[type] || CUSTOM_VISUALS.custom_orb);
          }
        }
        return defs;
      };
    }
  }

  function encodeCustomLevelText(object) {
    return CUSTOM_LEVEL_MARKER + JSON.stringify(defaultEngine.serialize(object));
  }
  function decodeCustomLevelText(text) {
    if (typeof text !== "string" || text.indexOf(CUSTOM_LEVEL_MARKER) !== 0) return null;
    try { return defaultEngine.deserialize(JSON.parse(text.slice(CUSTOM_LEVEL_MARKER.length))); }
    catch (err) { return null; }
  }
  function isCustomLevelObject(levelObj) {
    return typeof (levelObj && levelObj.text) === "string" && levelObj.text.indexOf(CUSTOM_LEVEL_MARKER) === 0;
  }

  Object.assign(WebDashers, {
    CUSTOM_OBJECT_IDS,
    CUSTOM_LEVEL_MARKER,
    encodeCustomLevelText,
    decodeCustomLevelText,
    isCustomLevelObject,
    objectIdForType(type) { return CUSTOM_OBJECT_IDS[normalizeTypeString(type)] || CUSTOM_OBJECT_IDS.custom_interactive; },
    /* Scan parsed level objects and register all custom objects. */
    loadCustomObjects(objects) {
      const found = [];
      for (const levelObj of (objects || [])) {
        if (!isCustomLevelObject(levelObj)) continue;
        const object = decodeCustomLevelText(levelObj.text);
        if (!object) continue;
        object._levelObj = levelObj;
        object.position = { x: levelObj.x, y: levelObj.y };
        found.push(defaultEngine.registerObject(object));
      }
      return found;
    },
    /* Build a level object (with serialized custom config in `text`). */
    buildCustomLevelObject(preset, x, y) {
      const object = defaultEngine.createObject(preset);
      return {
        id: CUSTOM_OBJECT_IDS[object.type] || CUSTOM_OBJECT_IDS.custom_interactive,
        x: x || 0,
        y: y || 0,
        rot: 0,
        scale: 1,
        groups: (object.groups || []).join("."),
        color1: 1004,
        color2: 1004,
        text: encodeCustomLevelText(object)
      };
    }
  });

  /* Gameplay bridge: attach a runtime to a live scene + auto-attach. */
  WebDashers.initGameplay = function (scene) {
    if (!scene) return null;
    if (window.WebDashersRuntime && window.WebDashersRuntime.scene === scene) return window.WebDashersRuntime;
    const runtime = new CustomGameplayRuntime(scene, defaultEngine);
    window.WebDashersRuntime = runtime;
    if (Array.isArray(window.levelObjects)) {
      defaultEngine.loadCustomObjects(window.levelObjects).forEach((o) => runtime.registerLevelObject(o, o._levelObj));
    }
    return runtime;
  };

  WebDashers.autoAttach = function () {
    if (typeof Phaser === "undefined") return null;
    const tryAttach = function () {
      if (window.WebDashersRuntime) return;
      const game = Phaser.GAMES && Phaser.GAMES[0];
      if (!game || !game.scene) { setTimeout(tryAttach, 400); return; }
      const scenes = game.scene.getScenes(true) || [];
      const scene = scenes.find((s) => s._state && s._player) || scenes[scenes.length - 1];
      if (!scene || !scene._state || !scene._player) { setTimeout(tryAttach, 400); return; }
      WebDashers.initGameplay(scene);
    };
    setTimeout(tryAttach, 500);
    return window.WebDashersRuntime;
  };

  /* ------------------------------ export --------------------------- */
  const api = {
    WebDashers,
    TriggerEngine: defaultEngine,
    CustomGameplayEngine, CustomGameplayRuntime, TriggerVariableStore,
    TriggerConditionEvaluator, CustomConditionEvaluator, TriggerActionRegistry,
    TriggerActionExecutor, CustomFunctionRegistry, TriggerScheduler,
    TriggerEventDispatcher, CustomObjectSerializer, CustomObjectRegistry,
    CustomObjectFactory, Registry,
    validateParams, validateValue,
    SCHEMA_VERSION, EVENT_NAMES, KNOWN_OBJECT_TYPES,
    BUILTIN_ACTIONS, BUILTIN_TEMPLATES, registerBuiltinActions,
    CUSTOM_OBJECT_IDS, CUSTOM_LEVEL_MARKER,
    encodeCustomLevelText, decodeCustomLevelText, isCustomLevelObject
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.WebDashers = WebDashers;
    global.TriggerEngine = defaultEngine;
    _installBrowserIntegration();
    WebDashers.autoAttach();
  }
})(typeof window !== "undefined" ? window : globalThis);
