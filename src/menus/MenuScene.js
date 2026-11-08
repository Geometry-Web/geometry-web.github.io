/**
 * Geometry Web — main menu scene (original).
 */
window.GD = window.GD || {};
GD.scenes = GD.scenes || {};

GD.scenes.MenuScene = cc.Scene.extend({
    ctor: function () {
        this._super();
        this.levels = null;
        this.selected = 0;
    },

    onEnter: function () {
        this._super();
        this._setup();
        this.scheduleUpdate();
    },

    // A bordered square button with a procedural icon drawn inside it.
    _button: function (size, body, iconFn, key) {
        var node = new cc.Node();
        var frame = GD.Renderer.outlinedSquare(size, body, [255, 255, 255], 4);
        node.addChild(frame, 0);
        var icon = GD.Textures.sprite('menuicon_' + key, Math.floor(size * 0.55), Math.floor(size * 0.55), function (ctx, w, h) {
            iconFn(ctx, w, h, [255, 255, 255]);
        });
        node.addChild(icon, 1);
        return node;
    },

    _star: function () {
        return GD.Textures.sprite('star', 26, 26, function (ctx, w, h) {
            GD.Textures.starIcon(ctx, w, h, [255, 224, 90]);
        });
    },

    _setup: function () {
        var C = GD.C, R = GD.Renderer;
        var s = cc.Director.getInstance().getWinSize();

        // Gradient background.
        var bg = R.gradient(s.width, s.height, C.colorBgTop, C.colorBgBottom, 48);
        bg.setPosition(cc.p(s.width / 2, s.height / 2));
        this.addChild(bg, 0);

        // Animated background shapes (large drifting outlines).
        this.bgShapes = cc.DrawNode.create();
        var sc = R.f(C.colorParallaxFar[0], C.colorParallaxFar[1], C.colorParallaxFar[2], 70);
        var tr = R.f(0, 0, 0, 0);
        for (var k = 0; k < 8; k++) {
            var bx = ((k * 137) % 900) - 450;
            var by = ((k * 211) % 400) - 200;
            var bs = 60 + ((k * 53) % 140);
            var hw = bs / 2;
            this.bgShapes.drawPoly([cc.p(bx - hw, by - hw), cc.p(bx + hw, by - hw), cc.p(bx + hw, by + hw), cc.p(bx - hw, by + hw)], tr, 6, sc);
        }
        this.bgShapes.setPosition(cc.p(s.width / 2, s.height / 2));
        this.addChild(this.bgShapes, 1);

        // Title.
        var title = R.label('GEOMETRY DASH', 84, [255, 255, 255], 'Arial Bold');
        title.setPosition(cc.p(s.width / 2, s.height * 0.84));
        this.addChild(title);

        // Player icon preview.
        this.playerPreview = GD.Textures.sprite('preview', C.playerSize * 2.4, C.playerSize * 2.4, GD.Textures.cubeFace);
        this.playerPreview.setPosition(cc.p(s.width / 2, s.height * 0.64));
        this.addChild(this.playerPreview);

        // Big PLAY button.
        this.playBtn = this._button(104, [72, 200, 116], GD.Textures.playIcon, 'play');
        this.playBtn.setPosition(cc.p(s.width / 2, s.height * 0.42));
        this.addChild(this.playBtn);

        // Level select.
        this.levels = GD.Level.builtin.concat(GD.Level.loadCustom());
        this.levelName = R.label('', 24, [255, 255, 255]);
        this.levelName.setPosition(cc.p(s.width / 2, s.height * 0.24));
        this.addChild(this.levelName);

        this.leftBtn = this._button(44, [52, 70, 130], function (ctx, w, h, c) { GD.Textures.arrowIcon(ctx, w, h, c, -1); }, 'left');
        this.leftBtn.setPosition(cc.p(s.width / 2 - 140, s.height * 0.24));
        this.addChild(this.leftBtn);

        this.rightBtn = this._button(44, [52, 70, 130], function (ctx, w, h, c) { GD.Textures.arrowIcon(ctx, w, h, c, 1); }, 'right');
        this.rightBtn.setPosition(cc.p(s.width / 2 + 140, s.height * 0.24));
        this.addChild(this.rightBtn);

        // Difficulty stars.
        this.stars = [];
        for (var i = 0; i < 3; i++) {
            var st = this._star();
            st.setPosition(cc.p(s.width / 2 - 36 + i * 36, s.height * 0.18));
            this.addChild(st);
            this.stars.push(st);
        }

        // Bottom icon buttons (GD-style row).
        var bottomY = s.height * 0.08;
        var defs = [
            { label: 'Level Editor', key: 'editor', icon: GD.Textures.hammerIcon },
            { label: 'Garage', key: 'garage', icon: GD.Textures.cubeBtnIcon },
            { label: 'Quests', key: 'quests', icon: GD.Textures.questIcon },
            { label: 'Settings', key: 'settings', icon: GD.Textures.gearIcon }
        ];
        for (var j = 0; j < defs.length; j++) {
            var b = this._button(52, [44, 58, 108], defs[j].icon, defs[j].key);
            b.setPosition(cc.p(s.width / 2 + (j - 1.5) * 72, bottomY));
            this.addChild(b);
            var lbl = R.label(defs[j].label, 13, [185, 205, 235]);
            lbl.setPosition(cc.p(b.getPositionX(), bottomY - 40));
            this.addChild(lbl);
        }

        this._refresh();
    },

    _refresh: function () {
        var lv = this.levels[this.selected];
        this.levelName.setString('Level ' + (this.selected + 1) + '  -  ' + lv.name);
        var diff = (this.selected % 3) + 1;
        for (var i = 0; i < 3; i++) {
            this.stars[i].setColor(i < diff ? cc.c3b(255, 255, 255) : cc.c3b(70, 84, 120));
        }
    },

    update: function (dt) {
        GD.Input.poll();
        this._bgTime = (this._bgTime || 0) + dt;
        this.bgShapes.setRotation(this._bgTime * 3);
        var i;

        for (i = 0; i < this.levels.length && i < 9; i++) {
            if (GD.Input.keyPressed(49 + i)) { this.selected = i; this._refresh(); }
        }
        if (GD.Input.keyPressed(37)) { this.selected = (this.selected - 1 + this.levels.length) % this.levels.length; this._refresh(); }
        if (GD.Input.keyPressed(39)) { this.selected = (this.selected + 1) % this.levels.length; this._refresh(); }

        if (GD.Input.pressed) { this._start(); }
        if (GD.Input.keyPressed(69)) { this._openEditor(); }   // E
        if (GD.Input.keyPressed(77)) { this._toggleMute(); }   // M

        GD.Input.clear();
    },

    _start: function () {
        var lv = this.levels[this.selected];
        GD.Audio.play('jump');
        cc.Director.getInstance().replaceScene(new GD.scenes.GameScene(lv, this.selected));
    },

    _openEditor: function () {
        GD.Audio.play('portal');
        cc.Director.getInstance().replaceScene(new GD.scenes.EditorScene());
    },

    _toggleMute: function () {
        GD.Audio.setMuted(!GD.Audio.isMuted());
    }
});
