/* =====================================================================
 * KitShowcase.js — the GD.UI widget kit on one screen (dev page only).
 *
 * Boot it with `index.html?kit` (see main.js). Every component the kit exports
 * is drawn here at the sizes real screens use, so a single screenshot verifies
 * spacing, fonts, nine-slice frames, touch wiring and the modal stack.
 * ===================================================================== */
var KitShowcaseLayer = cc.Layer.extend({
    init: function () {
        this._super();

        this.stars = 1234;

        GD.UI.background(this, { top: [12, 110, 243], bottom: [26, 40, 140] });
        GD.UI.heading(this, "GD.UI WIDGET KIT", 512, { scale: GD.UI.TEXT.heading });

        this.addButtons();
        this.addIconButtons();
        this.addCounters();
        this.addOptionsPanel();
        this.addDialogButtons();

        return true;
    },

    /* Small blue-grey caption that names each section. */
    section: function (text, x, y) {
        var label = GD.label(text, { scale: GD.UI.TEXT.small });
        label.setColor(cc.c3b(178, 202, 255));
        label.setAnchorPoint(0, 0.5);
        label.setPosition(x, y);
        this.addChild(label, 40);
        return label;
    },

    scene: function () { return this.getParent(); },

    toast: function (text) { GD.UI.toast(this.scene(), text); },

    /* ------------------------------------------------------------ buttons */
    addButtons: function () {
        var self = this;
        this.section("BUTTONS - SIX GD STYLES", 40, 468);

        var styles = ["green", "cyan", "pink", "grey", "slate", "red"];
        var xs = [120, 290, 460], ys = [420, 366];
        for (var i = 0; i < styles.length; i++) {
            (function (style, index) {
                GD.UI.button(self, {
                    x: xs[index % 3], y: ys[Math.floor(index / 3)],
                    w: 160, h: 42,
                    text: style.toUpperCase(),
                    style: style,
                    textScale: GD.UI.TEXT.small,
                    onClick: function () { self.toast(style.toUpperCase() + " PRESSED"); }
                });
            })(styles[i], i);
        }

        this.section("ICON + CAPTION - DISABLED - ICON ONLY", 40, 330);
        GD.UI.button(this, {
            x: 120, y: 288, w: 160, h: 42,
            text: "STARS", style: "green", icon: GD.A.star, iconScale: 0.62,
            textScale: GD.UI.TEXT.small,
            onClick: function () { self.toast("ICON BUTTON"); }
        });
        GD.UI.button(this, {
            x: 290, y: 288, w: 160, h: 42,
            text: "DISABLED", style: "grey", textScale: GD.UI.TEXT.small,
            enabled: false
        });
        GD.UI.button(this, {
            x: 460, y: 288, w: 52, h: 42,
            style: "pink", icon: GD.A.arrowLeft, iconScale: 0.8,
            onClick: function () { self.toast("ARROW"); }
        });
    },

    /* --------------------------------------------------------- icon buttons */
    addIconButtons: function () {
        var self = this;
        this.section("ROUND ICON BUTTONS", 40, 246);

        var frames = [GD.A.close, GD.A.arrowBack, GD.A.arrowLeft, GD.A.arrowRight,
                      "GJ_garageBtn_001.png", "GJ_playBtn_001.png"];
        for (var i = 0; i < frames.length; i++) {
            (function (frame, index) {
                GD.UI.iconButton(self, {
                    x: 66 + index * 64, y: 204, frame: frame, scale: 0.85,
                    onClick: function () { self.toast("ICON " + (index + 1)); }
                });
            })(frames[i], i);
        }
    },

    /* ------------------------------------------------------------ counters */
    addCounters: function () {
        var self = this;
        this.section("COUNTERS - TAP +1 TO BUMP", 40, 158);

        this.starCounter = GD.UI.counter(this, {
            x: 90, y: 116, icon: GD.A.star, value: this.stars,
            iconScale: 0.7, textScale: 0.7
        });
        GD.UI.counter(this, {
            x: 230, y: 116, icon: GD.A.moon, value: 56,
            iconScale: 0.7, textScale: 0.7
        });
        GD.UI.counter(this, {
            x: 350, y: 116, icon: GD.A.diamond, value: 7890,
            iconScale: 0.7, textScale: 0.7
        });

        GD.UI.button(this, {
            x: 480, y: 116, w: 100, h: 38,
            text: "+1", style: "cyan", textScale: GD.UI.TEXT.small,
            onClick: function () {
                self.stars += 1;
                self.starCounter.setValue(self.stars);
            }
        });
    },

    /* ------------------------------------------------------- options panel */
    addOptionsPanel: function () {
        var self = this;
        var panel = GD.UI.panel(this, {
            x: 750, y: 345, w: 380, h: 320,
            style: "brown", title: "OPTIONS"
        });

        var settings = [
            { key: "autoRetry", text: "AUTO RETRY" },
            { key: "showPercent", text: "SHOW PERCENT" },
            { key: "platformerControls", text: "PLATFORMER CONTROLS" }
        ];
        for (var i = 0; i < settings.length; i++) {
            (function (spec) {
                GD.UI.toggle(panel.content, {
                    x: -150, y: 70 - i * 46,
                    text: spec.text,
                    textScale: GD.UI.TEXT.small,
                    value: GD.Save.settings.get(spec.key),
                    onChange: function (on) {
                        GD.Save.settings.set(spec.key, on);
                        self.toast((on ? "ON - " : "OFF - ") + spec.text);
                    }
                });
            })(settings[i]);
        }

        var caption = GD.label("MUSIC VOLUME", { scale: GD.UI.TEXT.tiny });
        caption.setPosition(-150, -46);
        caption.setColor(GD.UI.COLOR.dim);
        caption.setAnchorPoint(0, 0.5);
        panel.content.addChild(caption, 1);

        var bar = GD.UI.progress(panel.content, { x: 0, y: -118, w: 300, value: 0 });
        var slider = GD.UI.slider(panel.content, {
            x: 0, y: -70, w: 250,
            value: GD.Save.settings.get("musicVolume"),
            onChange: function (v) { bar.setValue(v * 100); },
            onRelease: function (v) {
                GD.Save.settings.set("musicVolume", v);
                GD.Audio.applyVolumes();
                self.toast("MUSIC " + Math.round(v * 100) + "%");
            }
        });
        bar.setValue(slider.getValue() * 100);
    },

    /* -------------------------------------------------------- modal demos */
    addDialogButtons: function () {
        var self = this;
        this.section("MODAL DIALOGS", 600, 168);

        var specs = [
            {
                text: "ALERT", style: "green",
                run: function () {
                    GD.UI.alert(self.scene(), "NOTICE",
                                "THE WIDGET KIT IS WIRED UP AND READY FOR SCREENS.");
                }
            },
            {
                text: "CONFIRM", style: "cyan",
                run: function () {
                    GD.UI.confirm(self.scene(), {
                        title: "REALLY?",
                        message: "THIS GOES THROUGH GD.UI.POPUP, SO THE LAYER BEHIND IT IS BLOCKED.",
                        onOk: function () { self.toast("YES"); },
                        onCancel: function () { self.toast("NO"); }
                    });
                }
            },
            {
                text: "TOAST", style: "slate",
                run: function () { self.toast("TOAST MESSAGE"); }
            },
            {
                text: "LOADING", style: "pink",
                run: function () {
                    var spinner = GD.UI.loading(self.scene(), "LOADING LEVEL");
                    self.scheduleOnce(function () { spinner.close(); }, 1.2);
                }
            }
        ];
        var xs = [660, 850], ys = [130, 78];
        for (var i = 0; i < specs.length; i++) {
            (function (spec, index) {
                GD.UI.button(self, {
                    x: xs[index % 2], y: ys[Math.floor(index / 2)],
                    w: 170, h: 40,
                    text: spec.text, style: spec.style,
                    textScale: GD.UI.TEXT.small,
                    onClick: spec.run
                });
            })(specs[i], i);
        }
    }
});

var KitShowcaseScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new KitShowcaseLayer();
        this.addChild(layer);
        layer.init();
    }
});

