/**
 * Geometry Web — level editor (original, functional basics).
 * Palette (keys 1-7): block, spike, orb, pad, portal, coin, finish.
 * Click places the selected type (grid-snapped); clicking an existing object
 * selects it (arrows move, Del removes). P = test, S = save, L = load, Esc menu.
 */
window.GD = window.GD || {};
GD.scenes = GD.scenes || {};

GD.scenes.EditorScene = cc.Scene.extend({
    ctor: function () {
        this._super();
        this.objects = [];      // [{def, obj}]
        this.selected = -1;
        this.palette = 'block';
        this.camX = 0; this.camY = 0; this.zoom = 1;
        this.grid = 30;
    },

    onEnter: function () {
        this._super();
        this._setup();
        this.scheduleUpdate();
        this._bindDom();
    },

    onExit: function () {
        this._unbindDom();
        this._super();
    },

    _setup: function () {
        var C = GD.C, R = GD.Renderer;
        var s = cc.Director.getInstance().getWinSize();
        this.bg = R.gradient(s.width, s.height, C.colorBgTop, C.colorBgBottom, 36);
        this.bg.setPosition(cc.p(s.width / 2, s.height / 2));
        this.addChild(this.bg, 0);

        this.world = new cc.Layer();
        this.addChild(this.world, 1);
        this._drawGrid();

        this.hud = new cc.Layer();
        this.addChild(this.hud, 10);
        this.info = R.label('', 16, [220, 225, 240]);
        this.info.setPosition(cc.p(12, s.height - 12));
        this.info.setAnchorPoint(cc.p(0, 1));
        this.hud.addChild(this.info);
        this._updateInfo();
    },

    _drawGrid: function () {
        var g = cc.DrawNode.create();
        var w = 2400, h = 540;
        for (var x = 0; x <= w; x += this.grid) {
            g.drawSegment(cc.p(x, 0), cc.p(x, h), 1, GD.Renderer.f(255, 255, 255, 22));
        }
        for (var y = 0; y <= h; y += this.grid) {
            g.drawSegment(cc.p(0, y), cc.p(w, y), 1, GD.Renderer.f(255, 255, 255, 22));
        }
        g.drawSegment(cc.p(0, GD.C.groundY), cc.p(w, GD.C.groundY), 2, GD.Renderer.f(120, 180, 255, 255));
        this.world.addChild(g, 0);
    },

    _bindDom: function () {
        var self = this;
        this._canvas = document.getElementById('gameCanvas') || document;
        this._onDown = function (e) { self._mouseDown(e); };
        this._onWheel = function (e) { self._wheel(e); };
        this._canvas.addEventListener('mousedown', this._onDown, false);
        this._canvas.addEventListener('touchstart', this._onDown, { passive: false });
        this._canvas.addEventListener('wheel', this._onWheel, { passive: false });
    },

    _unbindDom: function () {
        if (!this._canvas) return;
        this._canvas.removeEventListener('mousedown', this._onDown, false);
        this._canvas.removeEventListener('touchstart', this._onDown);
        this._canvas.removeEventListener('wheel', this._onWheel, false);
    },

    _clientXY: function (e) {
        var t = (e.touches && e.touches[0]) || e;
        var rect = (this._canvas.getBoundingClientRect)
            ? this._canvas.getBoundingClientRect() : { left: 0, top: 0 };
        return cc.p(t.clientX - rect.left, t.clientY - rect.top);
    },

    // Convert a client coordinate into world (design) coordinates.
    _toWorld: function (p) {
        var gl = cc.Director.getInstance().convertToGL(p);
        return { x: gl.x / this.zoom + this.camX, y: gl.y / this.zoom + this.camY };
    },

    _snap: function (v) { return Math.round(v / this.grid) * this.grid; },

    _mouseDown: function (e) {
        e.preventDefault();
        var w = this._toWorld(this._clientXY(e));
        var wx = this._snap(w.x), wy = this._snap(w.y);
        for (var i = 0; i < this.objects.length; i++) {
            var o = this.objects[i];
            if (Math.abs(o.def.x - wx) < this.grid && Math.abs(o.def.y - wy) < this.grid) {
                this._select(i);
                return;
            }
        }
        this._place(this.palette, wx, wy);
    },

    _wheel: function (e) {
        e.preventDefault();
        var delta = (e.deltaY < 0) ? 1.1 : 0.9;
        this.zoom = GD.math.clamp(this.zoom * delta, 0.4, 2.5);
        this._applyWorld();
    },

    _applyWorld: function () {
        this.world.setScale(this.zoom);
        this.world.setPosition(cc.p(-this.camX * this.zoom, -this.camY * this.zoom));
    },

    _place: function (type, x, y) {
        var def = { type: type, x: x, y: y };
        if (type === 'block') { def.w = 30; def.h = 30; }
        if (type === 'orb' || type === 'pad') { def.action = 'jump'; }
        if (type === 'portal') { def.mode = 'ship'; }
        var obj = GD.Objects.create(def);
        this.world.addChild(obj.node, 2);
        this.objects.push({ def: def, obj: obj });
        this._select(this.objects.length - 1);
    },

    _select: function (i) {
        this.selected = i;
        this._updateInfo();
    },

    _removeSelected: function () {
        if (this.selected < 0) return;
        var o = this.objects[this.selected];
        this.world.removeChild(o.obj.node, true);
        this.objects.splice(this.selected, 1);
        this.selected = -1;
        this._updateInfo();
    },

    _nudgeSelected: function (dx, dy) {
        if (this.selected < 0) return;
        var o = this.objects[this.selected];
        o.def.x += dx; o.def.y += dy;
        var n = o.obj.node;
        if (o.def.type === 'block') {
            n.setPosition(cc.p(o.def.x + o.def.w / 2, o.def.y + o.def.h / 2));
        } else {
            n.setPosition(cc.p(o.def.x, o.def.y));
        }
        this._updateInfo();
    },

    _paletteFor: function (k) {
        return ['block', 'spike', 'orb', 'pad', 'portal', 'coin', 'finish'][k - 1];
    },

    _updateInfo: function () {
        var names = { block: 'Block', spike: 'Spike', orb: 'Orb', pad: 'Pad', portal: 'Portal', coin: 'Coin', finish: 'Finish' };
        var sel = (this.selected >= 0) ? ('selected: ' + names[this.objects[this.selected].def.type]) : 'no selection';
        this.info.setString('Palette: ' + names[this.palette] + ' | ' + sel +
            ' | 1-7 palette  click place/select  arrows move  Del remove  P test  S save  L load  Esc menu');
    },

    _save: function () {
        var defs = this.objects.map(function (o) { return o.def; });
        var level = GD.Level.make('Custom', 1, defs);
        var customs = GD.Level.loadCustom();
        customs.push(level);
        GD.Level.saveCustom(customs);
        GD.Audio.play('coin');
    },

    _load: function () {
        var customs = GD.Level.loadCustom();
        if (customs.length === 0) return;
        var defs = customs[customs.length - 1].objects;
        for (var i = 0; i < this.objects.length; i++) this.world.removeChild(this.objects[i].obj.node, true);
        this.objects = [];
        for (var j = 0; j < defs.length; j++) {
            var d = defs[j];
            var obj = GD.Objects.create(d);
            this.world.addChild(obj.node, 2);
            this.objects.push({ def: d, obj: obj });
        }
        this.selected = -1;
        this._updateInfo();
    },

    _test: function () {
        var defs = this.objects.map(function (o) { return o.def; });
        var level = GD.Level.make('Test', 1, defs);
        cc.Director.getInstance().replaceScene(new GD.scenes.GameScene(level, -1));
    },

    update: function (dt) {
        GD.Input.poll();
        var step = this.grid;
        for (var k = 1; k <= 7; k++) {
            if (GD.Input.keyPressed(48 + k)) { this.palette = this._paletteFor(k); this._updateInfo(); }
        }

        if (this.selected >= 0) {
            if (GD.Input.keyPressed(37)) this._nudgeSelected(-step, 0);
            if (GD.Input.keyPressed(39)) this._nudgeSelected(step, 0);
            if (GD.Input.keyPressed(38)) this._nudgeSelected(0, step);
            if (GD.Input.keyPressed(40)) this._nudgeSelected(0, -step);
            if (GD.Input.keyPressed(46) || GD.Input.keyPressed(8)) this._removeSelected();
        } else {
            if (GD.Input.keyHeld(37)) { this.camX -= 720 * dt; this._applyWorld(); }
            if (GD.Input.keyHeld(39)) { this.camX += 720 * dt; this._applyWorld(); }
            if (GD.Input.keyHeld(38)) { this.camY += 720 * dt; this._applyWorld(); }
            if (GD.Input.keyHeld(40)) { this.camY -= 720 * dt; this._applyWorld(); }
        }

        if (GD.Input.keyPressed(80)) this._test();   // P
        if (GD.Input.keyPressed(83)) this._save();   // S
        if (GD.Input.keyPressed(76)) this._load();   // L
        if (GD.Input.escapePressed) {
            cc.Director.getInstance().replaceScene(new GD.scenes.MenuScene());
            return;
        }
        GD.Input.clear();
    }
});

