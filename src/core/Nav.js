/* =====================================================================
 * Nav.js — screen transitions and the shared screen shell.
 *
 * Every screen in this build is a plain `cc.Scene` that a menu button builds
 * and hands to `cc.Director.replaceScene()`. Two things were repeated in all of
 * them: the fade between screens, and the chrome (gradient, Pusab title, back
 * arrow, ground, music). This file owns both, so a new screen only writes the
 * part that is actually its own.
 *
 * Load order: after UI.js (the shell draws from the kit) and before the
 * screens. Screens are looked up by name at call time, never at load time, so
 * the order of the screen files does not matter.
 * ===================================================================== */
GD.Nav = (function () {
    var FADE = 0.14;          // seconds of black on each side of the swap
    var busy = false;         // a fade is in flight

    /* Black rectangle over the whole canvas that the transition animates. */
    function veil(scene, onDone) {
        var layer = cc.Layer.create();
        layer.setTouchMode(cc.TOUCH_ONE_BY_ONE);
        layer.setTouchPriority(-9000);      // above menus, below popups
        layer.setTouchEnabled(true);
        layer.onTouchBegan = function () { return true; };
        layer.onTouchEnded = function () { };
        layer.onTouchMoved = function () { };

        var shade = cc.LayerColor.create(cc.c4b(0, 0, 0, 255), GD.W, GD.H);
        shade.setOpacity(0);
        layer.addChild(shade, 0);
        scene.addChild(layer, 8000);

        shade.runAction(cc.Sequence.create(
            cc.FadeTo.create(FADE, 255),
            cc.CallFunc.create(function () { if (onDone) onDone(); }),
            cc.CallFunc.create(function () {
                busy = false;
                if (layer.getParent()) layer.getParent().removeChild(layer, true);
            })));
    }

    /* Fades the running scene out, swaps, then the new scene fades itself in.
     * `scene` may be a scene or a factory (a zero-argument function building
     * one), so an expensive screen is only built once the screen is black. */
    function go(scene, opts) {
        opts = opts || {};
        var director = cc.Director.getInstance();
        var next = typeof scene === "function" ? scene : function () { return scene; };
        var current = director.getRunningScene();

        // Mid-fade presses are dropped: the double scene swap is what would
        // otherwise leave a half-built screen behind.
        if (busy && !opts.force) return;
        if (!current || opts.instant) { busy = false; director.replaceScene(next()); return; }

        busy = true;
        veil(current, function () {
            var built = next();
            if (opts.onBuild) opts.onBuild(built);
            director.replaceScene(built);
        });
    }

    return {
        FADE: FADE,
        go: go,
        /* Back one screen. `scene` is what to go back to; the back sound plays
         * first, like every GD back arrow. */
        back: function (scene) {
            GD.Audio.sfx("back");
            go(scene);
        },

        isBusy: function () { return busy; }
    };
})();

/* ---------------------------------------------------------------- screen shell
 * One declarative entry point for the screens added on top of the three
 * hand-laid ones in MyApp.js. `opts`:
 *
 *   title       Pusab heading across the top
 *   subtitle    smaller line under it
 *   music       GD.Audio.music() name, or null to leave whatever plays
 *   background  GD.UI.background() options, or {menu: GD.UI.menuBackground opts}
 *   back        scene factory for the back arrow (defaults to the main menu)
 *   backAt      optional {x, y, scale} for the arrow
 *   layout      function (layer, ctx) that adds the screen's own content
 *
 * Returns a ready-to-use cc.Scene. The layer adds the kit's helpers plus
 * `addQuad(x, y, w, h, rgba, z)` addressed by its TOP-LEFT corner, so layout
 * code reads the same way in every screen. */
GD.UI.screen = function (opts) {
    opts = opts || {};

    var ScreenLayer = cc.Layer.extend({
        init: function () {
            this._super();
            GD.loadSheets();
            if (opts.sheets) GD.ensureSheets(opts.sheets);

            var bg = opts.background || { top: [12, 110, 243], bottom: [22, 36, 128], ground: false };
            if (bg.menu) GD.UI.menuBackground(this, bg.menu);
            else GD.UI.background(this, bg);

            var titleY = opts.titleY === undefined ? 500 : opts.titleY;
            if (opts.title) {
                GD.UI.heading(this, opts.title, titleY,
                              { scale: opts.titleScale || GD.UI.TEXT.heading, z: 30 });
            }
            if (opts.subtitle) {
                var sub = GD.label(opts.subtitle, { scale: GD.UI.TEXT.small, color: GD.UI.COLOR.dim });
                sub.setPosition(GD.W / 2, titleY - 26);
                this.addChild(sub, 30);
            }

            var backAt = opts.backAt || { x: 42, y: 497, scale: 1.35 };
            GD.UI.iconButton(this, {
                x: backAt.x, y: backAt.y, frame: "GJ_arrow_03_001.png",
                scale: backAt.scale, z: 60, onClick: function () {
                    GD.Nav.back(opts.back ? opts.back() : new MyScene());
                }
            });

            if (opts.layout) opts.layout(this, { scene: this.getParent() });
            if (opts.music !== null) GD.Audio.music(opts.music || "menu");

            // Fade in from the transition's black frame.
            var shade = cc.LayerColor.create(cc.c4b(0, 0, 0, 255), GD.W, GD.H);
            this.addChild(shade, 7900);
            shade.runAction(cc.Sequence.create(cc.FadeTo.create(GD.Nav.FADE, 0),
                                               cc.RemoveSelf.create()));
            return true;
        },

        /* (x, y) = top-left corner of the strip, in canvas coordinates. */
        addQuad: function (x, y, w, h, rgba, z) {
            var quad = cc.LayerColor.create(
                cc.c4b(rgba[0], rgba[1], rgba[2], rgba.length > 3 ? rgba[3] : 255), w, h);
            quad.setPosition(x, y - h);
            this.addChild(quad, z === undefined ? 5 : z);
            return quad;
        }
    });

    var ScreenScene = cc.Scene.extend({
        onEnter: function () {
            this._super();
            var layer = new ScreenLayer();
            this.addChild(layer);
            layer.init();
        }
    });

    return new ScreenScene();
};
