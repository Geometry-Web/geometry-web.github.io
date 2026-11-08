/**
 * Geometry Web — the gameplay scene (original "PlayLayer").
 * Owns the simulation, collision, camera, HUD, death/restart and level finish.
 */
window.GD = window.GD || {};
GD.scenes = GD.scenes || {};

GD.scenes.GameScene = cc.Scene.extend({
    ctor: function (levelDef, levelIndex) {
        this._super();
        this.levelDef = levelDef;
        this.levelIndex = levelIndex || 0;
    },

    onEnter: function () {
        this._super();
        this._setup();
        this.scheduleUpdate();
    },

    onExit: function () {
        GD.Audio.stopMusic();
        this._super();
    },

    _setup: function () {
        var C = GD.C, R = GD.Renderer;
        var s = cc.Director.getInstance().getWinSize();
        this.winSize = s;

        // Persistent progress.
        this.progress = GD.GameState.loadProgress();

        // Gradient background (screen space, fixed).
        this.bg = R.gradient(s.width, s.height, C.colorBgTop, C.colorBgBottom, 36);
        this.bg.setPosition(cc.p(s.width / 2, s.height / 2));
        this.addChild(this.bg, 0);

        // World layer (child of the cc.Follow camera node).
        this.world = new cc.Layer();
        this.camNode = new cc.Node();
        this.camNode.addChild(this.world);
        this.addChild(this.camNode, 3);

        // Load level objects into the world.
        this.loaded = GD.LevelLoader.load(this.levelDef, this.world);
        this.totalCoins = this.loaded.totalCoins;
        this.spawnX = this.loaded.spawnX;
        this.spawnY = this.loaded.spawnY;

        // Parallax scenery (behind the world content, scrolls slower).
        this.parFar = this._buildParallax(C.colorParallaxFar, 120, 0.30, 70);
        this.parNear = this._buildParallax(C.colorParallaxNear, 72, 0.55, 95);
        this.addChild(this.parFar, 1);
        this.addChild(this.parNear, 2);

        // Ground: vertical gradient + bright top edge.
        var groundW = Math.max(C.designW * 2, this.loaded.finishX + 1500);
        this.ground = R.gradient(groundW, C.groundY, C.colorGroundTop, C.colorGroundBottom, 12);
        this.ground.setPosition(cc.p(groundW / 2, C.groundY / 2));
        this.world.addChild(this.ground, 0);
        this.groundLine = R.rect(groundW, 4, C.colorGroundLine);
        this.groundLine.setPosition(cc.p(groundW / 2, C.groundY + 2));
        this.world.addChild(this.groundLine, 1);

        // Player + motion trail.
        this.sim = GD.Sim.createState(GD.Mode.CUBE, this.loaded.spawnX, this.loaded.spawnY);
        this.player = GD.Player.create(this.sim);
        this.world.addChild(this.player.node, 5);
        this.trail = this._buildTrail();
        this.trailHistory = [];

        // Camera: cc.Follow centers the player horizontally and locks the ground
        // to the bottom (rect height == design height -> no vertical scroll).
        var levelW = Math.max(C.designW, this.loaded.finishX + 1500);
        this.camNode.runAction(cc.Follow.create(this.player.node, cc.rect(0, 0, levelW, C.designH)));

        // Particles.
        this.particles = GD.Particles.create(this.world);

        // HUD.
        this._buildHud(s);

        // Game state.
        this.running = true;
        this.dead = false;
        this.finished = false;
        this.attempts = 1;
        this.coins = 0;
        this.deathTimer = 0;
        this.finishTimer = 0;
        this.shake = 0;
        this.pulse = 0;
        this.beatTimer = 0;
        this.paused = false;

        GD.Audio.startMusic();
    },

    // Rolling hills/clouds drawn as soft dots; scroll slower than the world.
    _buildParallax: function (color, spacing, factor, alpha) {
        var C = GD.C, R = GD.Renderer;
        var n = cc.DrawNode.create();
        var cover = Math.max(C.designW * 3, this.loaded.finishX + 2000);
        var border = R.f(color[0], color[1], color[2], alpha);
        var transparent = R.f(color[0], color[1], color[2], 0);
        for (var x = 0; x <= cover; x += spacing) {
            var size = 50 + 130 * Math.abs(Math.sin(x * 0.003));
            var y = C.groundY + 70 + 200 * Math.abs(Math.sin(x * 0.002 + 1.7));
            var hw = size / 2;
            n.drawPoly([cc.p(x - hw, y - hw), cc.p(x + hw, y - hw),
                        cc.p(x + hw, y + hw), cc.p(x - hw, y + hw)], transparent, 6, border);
        }
        n._parallaxFactor = factor;
        return n;
    },

    _buildTrail: function () {
        var R = GD.Renderer, C = GD.C;
        var arr = [];
        for (var i = 0; i < 10; i++) {
            var t = R.glow(C.playerSize * 0.55, C.colorPlayerGlow, 46 - i * 4);
            t.setScale(0.9 - i * 0.06);
            t.setVisible(false);
            this.world.addChild(t, 4);
            arr.push(t);
        }
        return arr;
    },

    _updateTrail: function () {
        var st = this.sim;
        this.trailHistory.push({ x: st.x, y: st.y });
        if (this.trailHistory.length > 12) this.trailHistory.shift();
        for (var i = 0; i < this.trail.length; i++) {
            var t = this.trail[i];
            var idx = this.trailHistory.length - 2 - i;
            if (idx >= 0 && !st.dead) {
                var p = this.trailHistory[idx];
                t.setVisible(true);
                t.setPosition(cc.p(p.x, p.y));
            } else {
                t.setVisible(false);
            }
        }
    },

    _buildHud: function (s) {
        var R = GD.Renderer;
        this.hud = new cc.Layer();
        this.addChild(this.hud, 10);

        // Progress bar (center top).
        this.barW = s.width * 0.5; this.barH = 8;
        var barY = s.height - 46;
        this.barBg = R.rect(this.barW, this.barH, [20, 30, 62]);
        this.barBg.setPosition(cc.p(s.width / 2, barY));
        this.hud.addChild(this.barBg, 0);
        this.barFill = R.rect(this.barW, this.barH, [92, 232, 132]);
        this.barFill.setAnchorPoint(cc.p(0, 0.5));
        this.barFill.setPosition(cc.p(s.width / 2 - this.barW / 2, barY));
        this.hud.addChild(this.barFill, 1);

        // Percentage (above the bar).
        this.progressLabel = R.label('0%', 24, [255, 255, 255]);
        this.progressLabel.setPosition(cc.p(s.width / 2, s.height - 20));
        this.hud.addChild(this.progressLabel);

        // Level name + stats (top-left).
        this.titleLabel = R.label(this.levelDef.name, 18, [200, 210, 235]);
        this.titleLabel.setPosition(cc.p(110, s.height - 24));
        this.hud.addChild(this.titleLabel);
        this.attemptLabel = R.label('Attempt 1', 16, [200, 210, 230]);
        this.attemptLabel.setPosition(cc.p(110, s.height - 48));
        this.hud.addChild(this.attemptLabel);
        this.coinLabel = R.label('Coins 0/0', 16, [255, 224, 90]);
        this.coinLabel.setPosition(cc.p(110, s.height - 70));
        this.hud.addChild(this.coinLabel);

        // Pause button (top-right).
        this.pauseBtn = new cc.Node();
        this.pauseBtn.addChild(R.outlinedSquare(42, [44, 58, 108], [255, 255, 255], 3), 0);
        this.pauseBtn.addChild(GD.Textures.sprite('pauseicon', 22, 22, function (ctx, w, h) { GD.Textures.pauseIcon(ctx, w, h, [255, 255, 255]); }), 1);
        this.pauseBtn.setPosition(cc.p(s.width - 46, s.height - 46));
        this.hud.addChild(this.pauseBtn);

        this.msgLabel = R.label('', 30, [255, 255, 255]);
        this.msgLabel.setPosition(cc.p(s.width / 2, s.height * 0.6));
        this.hud.addChild(this.msgLabel);

        this._buildPauseMenu(s);
    },

    _buildPauseMenu: function (s) {
        var R = GD.Renderer;
        this.pauseLayer = new cc.Layer();
        var dim = R.layer(s.width, s.height, [0, 0, 10, 170]);
        this.pauseLayer.addChild(dim, 0);
        var title = R.label('PAUSED', 44, [255, 255, 255], 'Arial Bold');
        title.setPosition(cc.p(s.width / 2, s.height * 0.6));
        this.pauseLayer.addChild(title);
        var hint = R.label('R restart    Q exit    Esc resume', 20, [185, 205, 235]);
        hint.setPosition(cc.p(s.width / 2, s.height * 0.5));
        this.pauseLayer.addChild(hint);
        this.addChild(this.pauseLayer, 20);
        this.pauseLayer.setVisible(false);
    },

    update: function (dt) {
        dt = Math.min(dt, 1 / 30);   // clamp large frame gaps
        GD.Input.poll();
        var st = this.sim;

        if (this.paused) {
            if (GD.Input.escapePressed || GD.Input.keyPressed(80)) { this._togglePause(); }
            if (GD.Input.restartPressed) { this._togglePause(); this._restart(); }
            if (GD.Input.keyPressed(81)) { this._backToMenu(); }
            GD.Input.clear();
            return;
        }

        if (this.running) {
            st.prevBottom = st.y - st.size / 2;
            GD.bridge.step(st, { pressed: GD.Input.pressed, held: GD.Input.held }, dt);
            var events = GD.Collision.check(st, this.loaded.objects);
            this._handleEvents(events);
            this._fireTriggers(st);
            this._updateHud(st);
        } else if (this.dead) {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) { this._restart(); }
        } else if (this.finished) {
            this.finishTimer -= dt;
            if (this.finishTimer <= 0 || GD.Input.pressed) { this._backToMenu(); }
        }

        // Scenery + effects (update regardless of run state).
        this.parFar.setPosition(cc.p(-st.x * this.parFar._parallaxFactor, 0));
        this.parNear.setPosition(cc.p(-st.x * this.parNear._parallaxFactor, 0));
        this._updateTrail();
        GD.Particles.update(this.particles, dt);

        // Screen shake (offsets the world within the cc.Follow camera node).
        if (this.shake > 0) {
            this.shake = Math.max(0, this.shake - dt * 40);
            var s = this.shake;
            this.world.setPosition(cc.p(
                (Math.random() - 0.5) * s,
                (Math.random() - 0.5) * s));
        } else {
            this.world.setPosition(cc.p(0, 0));
        }

        // Beat pulse (background zoom + ground-edge flash).
        this.beatTimer -= dt;
        if (this.beatTimer <= 0) {
            this.beatTimer = 60 / 128;   // 128 BPM
            this.pulse = 1;
        }
        this.pulse = Math.max(0, this.pulse - dt * 5);
        var pu = this.pulse;
        this.bg.setScale(1 + pu * 0.03);
        this.groundLine.setScaleY(1 + pu * 3);

        GD.Player.sync(this.player);

        if (GD.Input.restartPressed) { this._restart(); }
        if (GD.Input.escapePressed || GD.Input.keyPressed(80)) { this._togglePause(); }
        GD.Input.clear();
    },

    _togglePause: function () {
        this.paused = !this.paused;
        this.pauseLayer.setVisible(this.paused);
        if (this.paused) { GD.Audio.stopMusic(); } else { GD.Audio.startMusic(); }
    },

    _handleEvents: function (events) {
        var st = this.sim, P = GD.Particles, C = GD.C;
        for (var i = 0; i < events.length; i++) {
            var e = events[i];
            switch (e.type) {
                case 'death': this._die(); return;
                case 'orb':
                    GD.Audio.play('orb');
                    P.burst(this.particles, st.x, st.y, C.colorOrbJump, 10, 260, { gravity: 200 });
                    break;
                case 'pad':
                    GD.Audio.play('pad');
                    P.burst(this.particles, st.x, st.y, C.colorPadJump, 14, 340, { gravity: 500 });
                    break;
                case 'portal':
                    GD.Audio.play('portal');
                    P.burst(this.particles, st.x, st.y, C.colorPortalShip, 12, 280, { gravity: 150 });
                    GD.Player.setMode(this.player, this.sim.mode);
                    break;
                case 'speed': GD.Audio.play('portal'); break;
                case 'gravity':
                    GD.Audio.play('gravity');
                    P.burst(this.particles, st.x, st.y, C.colorPortalGravity, 12, 300, { gravity: 150 });
                    break;
                case 'size':
                    GD.Audio.play('portal');
                    break;
                case 'checkpoint':
                    this.spawnX = e.x; this.spawnY = e.y;
                    GD.Audio.play('coin');
                    break;
                case 'coin':
                    this.coins++;
                    GD.Audio.play('coin');
                    P.burst(this.particles, st.x, st.y, C.colorCoin, 8, 220, { gravity: 0 });
                    break;
                case 'finish': this._finish(); break;
            }
        }
    },

    _fireTriggers: function (st) {
        for (var i = 0; i < this.loaded.objects.length; i++) {
            var o = this.loaded.objects[i];
            if (o.type === 'trigger' && !o.fired && st.x >= o.x) {
                GD.Triggers.fire(o, this.loaded.objects);
            }
        }
    },

    _updateHud: function (st) {
        this.attemptLabel.setString('Attempt ' + this.attempts);
        this.coinLabel.setString('Coins ' + this.coins + '/' + this.totalCoins);
        var pct = this.loaded.finishX > 0
            ? Math.round(GD.math.clamp(st.x / this.loaded.finishX, 0, 1) * 100)
            : 0;
        this.progressLabel.setString(pct + '%');
        this.barFill.setScaleX(GD.math.clamp(pct / 100, 0, 1));
    },

    _die: function () {
        if (this.dead) return;
        this.dead = true;
        this.running = false;
        this.sim.dead = true;
        this.deathTimer = GD.C.restartDelay;
        this.shake = 18;
        GD.Audio.play('death');
        GD.Audio.stopMusic();
        GD.Particles.ccBurst(this.world, this.sim.x, this.sim.y, GD.C.colorPlayer, { count: 50, speed: 320, life: 0.8, gravity: -500, size: 8 });
        this.msgLabel.setString('Ouch!');
    },

    _restart: function () {
        // Reset the simulation to the spawn point (last activated checkpoint).
        GD.Sim.reset(this.sim, this.spawnX, this.spawnY);
        GD.Sim.setMode(this.sim, GD.Mode.CUBE);
        GD.Player.setMode(this.player, this.sim.mode);

        for (var i = 0; i < this.loaded.objects.length; i++) {
            var o = this.loaded.objects[i];
            if (o.type === 'coin') { o.collected = false; o.node.setVisible(true); }
            if (o.type === 'trigger') { o.fired = false; }
        }

        this.dead = false;
        this.finished = false;
        this.running = true;
        this.coins = 0;
        this.attempts++;
        this.shake = 0;
        this.trailHistory = [];
        GD.Particles.clear(this.particles);
        this.msgLabel.setString('');
        GD.Audio.startMusic();
    },

    _finish: function () {
        if (this.finished) return;
        this.finished = true;
        this.running = false;
        this.sim.finished = true;
        this.finishTimer = 2.5;
        GD.Audio.play('win');
        GD.Audio.stopMusic();
        this.msgLabel.setString('Level Complete!');

        // Persist best progress.
        var key = this.levelDef.name;
        var best = this.progress[key] || {};
        if (!best.coins || this.coins > best.coins) {
            best.coins = this.coins;
            this.progress[key] = best;
            GD.GameState.saveProgress(this.progress);
        }
    },

    _backToMenu: function () {
        GD.Audio.stopMusic();
        cc.Director.getInstance().replaceScene(new GD.scenes.MenuScene());
    }
});

