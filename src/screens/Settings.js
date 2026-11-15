/* =====================================================================
 * Settings.js — the options screen.
 *
 * GD's options menu is a list of toggles and two volume sliders that write
 * straight into the save file. This screen is the same shape: every control
 * mutates `GD.Save.settings` on the spot (so a reload keeps it), the volumes are
 * pushed into the audio engine immediately, and the two destructive actions
 * (reset progress, wipe everything) go through the kit's confirm popup.
 *
 * Layout: two columns of rows on the blue gradient, volumes on top, then the
 * gameplay toggles on the left and the graphics ones on the right, with the
 * action buttons along the bottom.
 * ===================================================================== */
var SETTINGS_LAYOUT = {
    left:  { x: 258, labelX: -96, controlX: 0 },
    right: { x: 690, labelX: -118, controlX: 0 },
    row:   { top: 404, pitch: 44 },
    slider: { w: 240 }
};

/* One labelled row: caption on the left, control at the row's centre. */
function settingsSlider(layer, x, y, label, key) {
    var value = GD.Save.settings.get(key);
    var caption = GD.label(label, { scale: GD.UI.TEXT.small, anchor: [1, 0.5] });
    caption.setPosition(x - 150, y);
    layer.addChild(caption, 30);

    return GD.UI.slider(layer, {
        x: x + 26, y: y, w: SETTINGS_LAYOUT.slider.w, value: value, z: 31,
        onChange: function (v) {
            GD.Save.settings.set(key, v);
            GD.Audio.applyVolumes();
        },
        onRelease: function (v) {
            GD.Save.settings.set(key, v);
            GD.Audio.applyVolumes();
            GD.Audio.sfx("click");
        }
    });
}

function settingsToggle(layer, x, y, label, key) {
    return GD.UI.toggle(layer, {
        x: x - 170, y: y, scale: 0.85, text: label, textScale: GD.UI.TEXT.small,
        value: GD.Save.settings.get(key), z: 30,
        onChange: function (on) { GD.Save.settings.set(key, on); }
    });
}

function settingsLabel(layer, x, y, text, opts) {
    opts = opts || {};
    var label = GD.label(text, { scale: opts.scale || GD.UI.TEXT.small,
                                 color: opts.color || GD.UI.COLOR.text });
    label.setPosition(x, y);
    layer.addChild(label, 30);
    return label;
}

function buildSettingsScreen() {
    return GD.UI.screen({
        title: "SETTINGS",
        titleY: 498,
        background: { top: [12, 110, 243], bottom: [20, 34, 120], ground: false },
        layout: function (layer) {
            var L = SETTINGS_LAYOUT;

            // Panel behind the two columns so the text reads over the gradient.
            layer.addQuad(96, 452, 768, 356, [0, 0, 0, 70], 2);

            /* ---- audio ---- */
            settingsLabel(layer, GD.W / 2, 428, "AUDIO", { scale: GD.UI.TEXT.big });
            settingsSlider(layer, 300, 392, "MUSIC", "musicVolume");
            settingsSlider(layer, 660, 392, "SFX", "sfxVolume");

            /* ---- gameplay / graphics ---- */
            settingsLabel(layer, L.left.x, 348, "GAMEPLAY", { scale: GD.UI.TEXT.body });
            settingsLabel(layer, L.right.x, 348, "GRAPHICS", { scale: GD.UI.TEXT.body });

            var leftRows = [
                ["Auto Retry",         "autoRetry"],
                ["Auto Checkpoints",   "autoCheckpoints"],
                ["Show Percentage",    "showPercent"],
                ["Progress Bar",       "progressBar"]
            ];
            for (var i = 0; i < leftRows.length; i++) {
                settingsToggle(layer, L.left.x, 310 - i * 42, leftRows[i][0], leftRows[i][1]);
            }

            var rightRows = [
                ["Disable Shake",      "disableShake"],
                ["Reduced Effects",    "reducedEffects"],
                ["Smooth Fix",         "smoothFix"],
                ["Platformer Controls","platformerControls"]
            ];
            for (var j = 0; j < rightRows.length; j++) {
                settingsToggle(layer, L.right.x, 310 - j * 42, rightRows[j][0], rightRows[j][1]);
            }

            /* ---- actions ---- */
            GD.UI.button(layer, {
                x: 240, y: 96, w: 200, h: 48, text: "ACCOUNT", style: "grey",
                textScale: GD.UI.TEXT.small, z: 30,
                onClick: function () {
                    GD.UI.alert(layer.getParent(), "ACCOUNT",
                        "No account system: this game runs entirely from local storage on a static site.");
                }
            });

            GD.UI.button(layer, {
                x: 470, y: 96, w: 200, h: 48, text: "RESET PROGRESS", style: "red",
                textScale: GD.UI.TEXT.tiny, z: 30,
                onClick: function () {
                    GD.UI.confirm(layer.getParent(), {
                        title: "Reset progress?",
                        message: "Levels, coins, stars and achievements go back to zero.",
                        okText: "Reset", okStyle: "red",
                        onOk: function () {
                            GD.Save.reset();
                            GD.UI.toast(layer.getParent(), "Progress reset");
                        }
                    });
                }
            });

            GD.UI.button(layer, {
                x: 700, y: 96, w: 200, h: 48, text: "DONE", style: "green",
                textScale: GD.UI.TEXT.small, z: 30,
                onClick: function () { GD.Nav.back(new MyScene()); }
            });

            settingsLabel(layer, GD.W / 2, 42,
                          "Settings save automatically. Online features are local simulation.",
                          { scale: GD.UI.TEXT.tiny, color: GD.UI.COLOR.dim });
        }
    });
}

function SettingsScene() { return buildSettingsScreen(); }
