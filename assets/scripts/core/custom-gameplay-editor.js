/* =============================================================================
 * Web Dashers — Custom Gameplay editor panel (§2/§8/§15)
 * A DOM overlay that integrates with the existing editor. Exposes:
 *   window.WebDashersEditor.open() / .close() / .toggle() / .openFor(object)
 * No external plugins or source edits required for basic custom mechanics.
 * ========================================================================== */
(function (global) {
  "use strict";
  if (typeof window === "undefined" || !window.WebDashers) return;

  const W = window.WebDashers;
  const LS_KEY = "wd_custom_gameplay_presets_v1";

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "value") node.value = v;
      else if (k === "selected") node.selected = !!v;
      else if (k === "checked") node.checked = !!v;
      else if (k.indexOf("on") === 0 && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    if (children) for (const c of (Array.isArray(children) ? children : [children])) {
      if (c) node.appendChild(c);
    }
    return node;
  }

  function loadPresets() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch (e) { return []; }
  }
  function savePresets(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  const TYPES = [
    { id: "custom_orb", label: "Orb" },
    { id: "custom_pad", label: "Pad" },
    { id: "custom_portal", label: "Portal" },
    { id: "custom_portal_orb", label: "Hybrid Orb/Portal" },
    { id: "custom_portal_pad", label: "Hybrid Pad/Portal" },
    { id: "custom_interactive", label: "Interactive Object" },
    { id: "custom_gamemode", label: "Custom Gamemode Object" },
    { id: "custom_trigger", label: "Trigger Object" }
  ];

  const editor = {
    current: null,
    root: null,
    open() { this._ensure(); this.root.style.display = "block"; this._render(); },
    close() { if (this.root) this.root.style.display = "none"; },
    toggle() { if (this.root && this.root.style.display === "block") this.close(); else this.open(); },
    openFor(object) { this.current = object; this.open(); }
  };

  editor._ensure = function () {
    if (this.root) return;
    const style = el("style", { text: [
      ".wd-cg-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999999;display:none;font-family:Arial,Helvetica,sans-serif;color:#fff}",
      ".wd-cg-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(960px,94vw);height:min(640px,90vh);background:#10142b;border:1px solid #3a4a7a;border-radius:12px;display:flex;flex-direction:column;overflow:hidden}",
      ".wd-cg-head{display:flex;gap:8px;align-items:center;padding:10px 12px;background:#1a2140;border-bottom:1px solid #3a4a7a}",
      ".wd-cg-head button,.wd-cg-btn{padding:6px 10px;border:1px solid #4a5a9a;background:#26315f;color:#fff;border-radius:6px;cursor:pointer;font-size:13px}",
      ".wd-cg-btn.primary{background:#2e7d32;border-color:#4caf50}",
      ".wd-cg-btn.danger{background:#7d2e2e;border-color:#af4c4c}",
      ".wd-cg-tabs{display:flex;gap:4px;padding:8px 12px;background:#141a38;border-bottom:1px solid #2a3566;flex-wrap:wrap}",
      ".wd-cg-tab{padding:6px 12px;cursor:pointer;border-radius:6px;background:#1f2748;font-size:13px}",
      ".wd-cg-tab.active{background:#3a4a7a}",
      ".wd-cg-body{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}",
      ".wd-cg-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
      ".wd-cg-label{min-width:120px;font-size:13px;color:#aab4dd}",
      ".wd-cg-input,.wd-cg-select,.wd-cg-textarea{background:#0c1024;border:1px solid #33417a;color:#fff;border-radius:6px;padding:6px 8px;font-size:13px}",
      ".wd-cg-card{border:1px solid #33417a;border-radius:8px;padding:10px;background:#161d3d}",
      ".wd-cg-actions{display:flex;flex-direction:column;gap:8px}",
      ".wd-cg-action-card{display:flex;gap:8px;align-items:flex-start;border:1px solid #2a3566;border-radius:8px;padding:8px;background:#12172f}",
      ".wd-cg-action-card select{flex:1}",
      ".wd-cg-action-card textarea{width:260px;height:60px;font-family:monospace;font-size:12px}",
      ".wd-cg-scroll{max-height:260px;overflow:auto;display:flex;flex-direction:column;gap:6px}",
      ".wd-cg-preset{border:1px solid #2a3566;border-radius:8px;padding:8px;display:flex;gap:8px;align-items:center;justify-content:space-between}",
      ".wd-cg-modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#10142b;border:1px solid #3a4a7a;border-radius:12px;padding:18px;min-width:420px}"
    ].join("\n") });

    const panel = el("div", { class: "wd-cg-panel" });
    this._head = el("div", { class: "wd-cg-head" });
    this._tabs = el("div", { class: "wd-cg-tabs" });
    this._body = el("div", { class: "wd-cg-body" });
    panel.append(this._head, this._tabs, this._body);
    this.root = el("div", { class: "wd-cg-overlay" }, [panel]);
    document.head.appendChild(style);
    document.body.appendChild(this.root);
  };

  editor._ensureCurrent = function () {
    if (!this.current) this.current = { type: "custom_orb", id: "custom_" + Date.now().toString(36), name: "Untitled Orb", description: "", activation: { type: "player_input" }, events: {}, conditions: [], groups: [] };
    return this.current;
  };

  editor._field = function (label, value, onchange, opts) {
    opts = opts || {};
    const input = el("input", { class: "wd-cg-input", type: opts.type || "text", value: value == null ? "" : String(value) });
    input.addEventListener("input", () => onchange(input.value));
    return el("div", { class: "wd-cg-row" }, [el("span", { class: "wd-cg-label", text: label }), input]);
  };

  editor._render = function () {
    const cur = this._ensureCurrent();
    this._head.innerHTML = "";
    this._head.append(
      el("strong", { text: "Custom Gameplay" }),
      el("button", { text: "Save Preset", class: "wd-cg-btn primary", onclick: () => this._saveCurrent() }),
      el("button", { text: "Export JSON", class: "wd-cg-btn", onclick: () => this._exportCurrent() }),
      el("button", { text: "Import JSON", class: "wd-cg-btn", onclick: () => this._importPrompt() }),
      el("button", { text: "Place in Level", class: "wd-cg-btn primary", onclick: () => this._placeCurrent() }),
      el("button", { text: "Test", class: "wd-cg-btn", onclick: () => this._testCurrent() }),
      el("button", { text: "Presets", class: "wd-cg-btn", onclick: () => { this._activeTab = "presets"; this._renderTabs(); this._renderBody(); } }),
      el("button", { text: "× Close", class: "wd-cg-btn danger", onclick: () => this.close() })
    );
    this._renderTabs();
    this._renderBody();
  };

  editor._renderTabs = function () {
    this._activeTab = this._activeTab || "general";
    const tabs = ["general", "appearance", "activation", "functions", "conditions", "effects", "advanced", "presets"];
    this._tabs.innerHTML = "";
    for (const t of tabs) {
      const b = el("div", { class: "wd-cg-tab" + (this._activeTab === t ? " active" : ""), text: t[0].toUpperCase() + t.slice(1) });
      b.addEventListener("click", () => { this._activeTab = t; this._renderTabs(); this._renderBody(); });
      this._tabs.appendChild(b);
    }
  };

  editor._renderBody = function () {
    this._body.innerHTML = "";
    const cur = this._ensureCurrent();
    switch (this._activeTab) {
      case "general": this._renderGeneral(cur); break;
      case "appearance": this._renderAppearance(cur); break;
      case "activation": this._renderActivation(cur); break;
      case "functions": this._renderFunctions(cur); break;
      case "conditions": this._renderConditions(cur); break;
      case "effects": this._renderEffects(cur); break;
      case "advanced": this._renderAdvanced(cur); break;
      case "presets": this._renderPresets(); break;
    }
  };

  editor._renderGeneral = function (cur) {
    this._body.append(
      this._field("Name", cur.name, (v) => { cur.name = v; }),
      this._field("ID", cur.id, (v) => { cur.id = v; }),
      this._field("Description", cur.description, (v) => { cur.description = v; }),
      el("div", { class: "wd-cg-row" }, [
        el("span", { class: "wd-cg-label", text: "Category" }),
        el("select", { class: "wd-cg-select" }, TYPES.map((t) => el("option", { value: t.id, text: t.label, selected: cur.type === t.id ? "selected" : null })))
      ]),
      el("div", { class: "wd-cg-row" }, [
        el("span", { class: "wd-cg-label", text: "Groups (comma)" }),
        el("input", { class: "wd-cg-input", value: (cur.groups || []).join(","), oninput: (e) => { cur.groups = e.target.value.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n)); } })
      ])
    );
    const sel = this._body.querySelector("select");
    sel.addEventListener("change", () => { cur.type = sel.value; });
  };

  editor._renderAppearance = function (cur) {
    cur.appearance = cur.appearance || {};
    const a = cur.appearance;
    this._body.append(
      this._field("Sprite", a.sprite, (v) => { a.sprite = v; }),
      this._field("Color", a.color, (v) => { a.color = parseInt(v, 10) || 0; }),
      this._field("Secondary Color", a.color2, (v) => { a.color2 = parseInt(v, 10) || 0; }),
      this._field("Glow", a.glow, (v) => { a.glow = v; }),
      this._field("Opacity", a.opacity, (v) => { a.opacity = parseFloat(v) || 1; }),
      this._field("Animation", a.animation, (v) => { a.animation = v; }),
      this._field("Animation Speed", a.animationSpeed, (v) => { a.animationSpeed = parseFloat(v) || 1; })
    );
  };

  editor._renderActivation = function (cur) {
    cur.activation = cur.activation || {};
    const a = cur.activation;
    const eventSel = el("select", { class: "wd-cg-select" }, W.EVENT_NAMES.map((n) => el("option", { value: n, text: n, selected: a.primaryEvent === n ? "selected" : null })));
    eventSel.addEventListener("change", () => { a.primaryEvent = eventSel.value; });
    this._body.append(
      el("div", { class: "wd-cg-row" }, [el("span", { class: "wd-cg-label", text: "Primary Event" }), eventSel]),
      this._field("Activation Type", a.type, (v) => { a.type = v; }),
      this._field("Activation Radius", a.radius, (v) => { a.radius = parseFloat(v) || 0; }),
      this._field("Cooldown (ms)", a.cooldown, (v) => { a.cooldown = parseInt(v, 10) || 0; }),
      this._field("Max Activations", a.maxActivations, (v) => { a.maxActivations = parseInt(v, 10) || 1; }),
      this._field("Delay (ms)", a.delay, (v) => { a.delay = parseInt(v, 10) || 0; })
    );
  };

  editor._renderEffects = function (cur) {
    cur.effects = cur.effects || {};
    const e = cur.effects;
    this._body.append(
      this._field("Particles", e.particles, (v) => { e.particles = v; }),
      this._field("Sound", e.sound, (v) => { e.sound = v; }),
      this._field("Animation", e.animation, (v) => { e.animation = v; }),
      this._field("Camera Effect", e.camera, (v) => { e.camera = v; }),
      this._field("Screen Effect", e.screen, (v) => { e.screen = v; })
    );
  };

  editor._renderAdvanced = function (cur) {
    this._body.append(
      this._field("Execution Priority", cur.priority, (v) => { cur.priority = parseInt(v, 10) || 0; }),
      el("div", { class: "wd-cg-row" }, [el("span", { class: "wd-cg-label", text: "Custom Properties (JSON)" }),
        el("textarea", { class: "wd-cg-textarea", text: JSON.stringify(cur.properties || {}, null, 2), style: "width:320px;height:90px" })])
    );
    const ta = this._body.querySelector("textarea");
    ta.addEventListener("input", () => { try { cur.properties = JSON.parse(ta.value || "{}"); } catch (e) {} });
  };

  editor._primaryEvent = function (cur) {
    return (cur.activation && cur.activation.primaryEvent) || "on_orb_activation";
  };
  editor._getEventCfg = function (cur) {
    const ev = this._primaryEvent(cur);
    cur.events = cur.events || {};
    if (!cur.events[ev]) cur.events[ev] = { actions: [] };
    if (Array.isArray(cur.events[ev])) cur.events[ev] = { actions: cur.events[ev] };
    return cur.events[ev];
  };
  editor._getActions = function (cur) {
    const cfg = this._getEventCfg(cur);
    if (!Array.isArray(cfg.actions)) cfg.actions = [];
    return cfg.actions;
  };
  editor._actionOptions = function () {
    return ["if", "branch", "loop", "delay", "condition", "call_function"].concat(W.listActions());
  };

  editor._renderFunctions = function (cur) {
    const actions = this._getActions(cur);
    const addBtn = el("button", { class: "wd-cg-btn primary", text: "+ Add Action" });
    addBtn.addEventListener("click", () => { actions.push({ action: "set_gamemode", params: { mode: "cube" } }); this._renderBody(); });
    const wrap = el("div", { class: "wd-cg-actions" }, [addBtn]);

    actions.forEach((a, i) => {
      const select = el("select", { class: "wd-cg-select" }, this._actionOptions().map((n) => el("option", { value: n, text: n, selected: a.action === n ? "selected" : null })));
      select.addEventListener("change", () => { a.action = select.value; });

      const ta = el("textarea", { class: "wd-cg-textarea", text: JSON.stringify(a.params || {}, null, 2) });
      ta.addEventListener("input", () => { try { a.params = JSON.parse(ta.value || "{}"); } catch (e) {} });

      const mk = (txt, fn) => { const b = el("button", { class: "wd-cg-btn", text: txt }); b.addEventListener("click", fn); return b; };
      const card = el("div", { class: "wd-cg-action-card" }, [
        el("span", { text: String(i + 1) + "." }),
        select,
        ta,
        mk("↑", () => { if (i > 0) { [actions[i - 1], actions[i]] = [actions[i], actions[i - 1]]; this._renderBody(); } }),
        mk("↓", () => { if (i < actions.length - 1) { [actions[i + 1], actions[i]] = [actions[i], actions[i + 1]]; this._renderBody(); } }),
        mk("Copy", () => { actions.splice(i + 1, 0, JSON.parse(JSON.stringify(a))); this._renderBody(); }),
        mk("Remove", () => { actions.splice(i, 1); this._renderBody(); })
      ]);
      wrap.appendChild(card);
    });
    this._body.append(wrap);
  };

  editor._renderConditions = function (cur) {
    const cfg = this._getEventCfg(cur);
    const ta = el("textarea", { class: "wd-cg-textarea", text: cfg.condition ? JSON.stringify(cfg.condition, null, 2) : "", style: "width:100%;height:160px" });
    ta.addEventListener("input", () => { try { cfg.condition = ta.value.trim() ? JSON.parse(ta.value) : undefined; } catch (e) {} });
    const note = el("div", { class: "wd-cg-label", html: "JSON condition. Supports <code>op</code> (equal/not_equal/greater_than/less_than/contains/and/or/not) and <code>{ path }</code> / <code>{ variable }</code> operands." });
    const preset = el("button", { class: "wd-cg-btn", text: "Insert gamemode == cube example" });
    preset.addEventListener("click", () => { cfg.condition = { op: "equal", left: { path: "gamemode" }, right: "cube" }; this._renderBody(); });
    this._body.append(note, ta, preset);
  };

  editor._renderPresets = function () {
    const presets = loadPresets();
    const list = el("div", { class: "wd-cg-scroll" });
    for (const p of presets) {
      const mkBtn = (txt, fn) => { const b = el("button", { class: "wd-cg-btn", text: txt }); b.addEventListener("click", fn); return b; };
      const row = el("div", { class: "wd-cg-preset" }, [
        el("span", { text: `${p.name}  (${p.type})` }),
        el("div", { class: "wd-cg-row" }, [
          mkBtn("Load", () => { this.current = JSON.parse(JSON.stringify(p)); this._activeTab = "general"; this._render(); }),
          mkBtn("Rename", () => { const n = prompt("Rename preset", p.name); if (n) { p.name = n; savePresets(presets); this._renderBody(); } }),
          mkBtn("Duplicate", () => { presets.push(JSON.parse(JSON.stringify(p))); savePresets(presets); this._renderBody(); }),
          mkBtn("Delete", () => { savePresets(presets.filter((x) => x.id !== p.id)); this._renderBody(); })
        ])
      ]);
      list.appendChild(row);
    }
    if (!presets.length) list.appendChild(el("div", { class: "wd-cg-label", text: "No saved presets yet." }));
    this._body.append(list);
  };

  editor._saveCurrent = function () {
    const cur = this._ensureCurrent();
    const presets = loadPresets();
    const clean = W.engine ? W.engine.serialize(cur) : JSON.parse(JSON.stringify(cur));
    const idx = presets.findIndex((p) => p.id === cur.id);
    if (idx >= 0) presets[idx] = clean; else presets.push(clean);
    savePresets(presets);
    alert(`Saved preset "${cur.name}".`);
  };
  editor._exportCurrent = function () {
    const cur = this._ensureCurrent();
    const json = W.engine ? W.engine.exportPreset(cur) : JSON.stringify(cur, null, 2);
    prompt("Copy your preset JSON (Ctrl/Cmd+C):", json);
  };
  editor._importPrompt = function () {
    const text = prompt("Paste preset JSON:");
    if (!text) return;
    try {
      this.current = W.engine ? W.engine.importPreset(text) : JSON.parse(text);
      this._activeTab = "general"; this._render();
    } catch (e) { alert("Invalid preset JSON: " + e.message); }
  };
  editor._placeCurrent = function () {
    const cur = this._ensureCurrent();
    const levelObj = W.buildCustomLevelObject(cur, 0, 0);
    if (Array.isArray(window.levelObjects)) window.levelObjects.push(levelObj);
    if (window.WebDashersRuntime && window.WebDashersRuntime.registerLevelObject) {
      const obj = W.engine ? W.engine.createObject(cur) : cur;
      window.WebDashersRuntime.registerLevelObject(obj, levelObj);
    }
    alert(`Custom object "${cur.name}" placed in the level (object list). Position defaults to (0,0); move it with the editor.`);
  };
  editor._testCurrent = function () {
    const cur = this._ensureCurrent();
    const engine = W.engine;
    if (!engine) { alert("Engine not available."); return; }
    const calls = [];
    const state = { gravityFlipped: false, isMini: false, yVelocity: 0 };
    const player = new Proxy({}, { get: (t, p) => (p === Symbol.toPrimitive ? undefined : (...a) => calls.push({ method: String(p), args: a })) });
    const ctx = { player, state, variables: engine.variables, groups: {}, objects: {}, camera: {}, audio: {}, effects: {}, level: {}, runtime: null, eventInfo: {}, playerKey: "main" };
    try {
      engine.execute(engine.createObject(cur), this._primaryEvent(cur), ctx);
      alert(`Test OK. ${calls.length} action(s) executed.`);
    } catch (e) { alert("Test failed: " + e.message); }
  };

  global.WebDashersEditor = editor;
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") { e.preventDefault(); editor.toggle(); }
  });
})(typeof window !== "undefined" ? window : globalThis);

