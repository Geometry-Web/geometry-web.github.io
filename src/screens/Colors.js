/* =====================================================================
 * Colors.js — the player colour picker.
 *
 * GD's colour screen is a pageable grid of swatches plus the primary/secondary
 * switch and the glow toggle. This keeps the presentation and the data model:
 * the palette is one list, the picked colour lands in
 * `GD.Save.profile.color1/color2` and every screen that draws the player reads
 * it back from there.
 *
 * The first 24 swatches are the classic GD palette; anything bought in
 * Scratch's Shop is appended, so a purchase shows up here immediately.
 * ===================================================================== */
var COLOR_LAYOUT = {
    grid: { firstX: 240, firstY: 340, pitchX: 52, pitchY: 52, columns: 10, rows: 4 },
    swatch: 44
};

/* The classic palette, hand-picked from GD's colour set (fully saturated
 * hues GD ships) plus black/white/grey. */
GD.Data.PALETTE = [
    [255, 255, 255], [190, 190, 190], [120, 120, 120], [60, 60, 60], [0, 0, 0],
    [255, 40, 40], [255, 110, 30], [255, 170, 20], [255, 220, 60], [200, 255, 60],
    [120, 255, 60], [40, 220, 90], [0, 190, 140], [0, 220, 220], [60, 200, 255],
    [40, 120, 255], [80, 80, 255], [140, 80, 255], [200, 80, 255], [255, 90, 220],
    [255, 120, 170], [180, 120, 80], [140, 90, 60], [90, 60, 40],
    [0, 255, 255], [255, 255, 0], [255, 0, 255], [0, 255, 120], [255, 140, 0],
    [120, 0, 255]
];

GD.Data.palette = function () {
    var list = GD.Data.PALETTE.slice();
    var bought = GD.Save.get("unlocked.colors", []);
    for (var i = 0; i < bought.length; i++) list.push(bought[i]);
    return list;
};

function ColorScene(opts) {
    opts = opts || {};
    var which = opts.which === 2 ? 2 : 1;

    return GD.UI.screen({
        title: "COLOURS",
        titleY: 498,
        background: { top: [40, 90, 60], bottom: [10, 24, 18], ground: false },
        back: function () { return ProfileScene(); },
        layout: function (layer) {
            var scene = layer.getParent();
            var body = cc.Node.create();
            layer.addChild(body, 6);
            var tabs = cc.Node.create();
            layer.addChild(tabs, 20);

            function build() {
                body.removeAllChildren(true);
                tabs.removeAllChildren(true);

                var current = GD.Save.profile.color(which);
                var colors = GD.Data.palette();
                var G = COLOR_LAYOUT.grid;

                for (var i = 0; i < colors.length; i++) {
                    (function (rgb, index) {
                        var x = G.firstX + (index % G.columns) * G.pitchX;
                        var y = G.firstY - Math.floor(index / G.columns) * G.pitchY;
                        var chosen = current[0] === rgb[0] && current[1] === rgb[1] &&
                                     current[2] === rgb[2];

                        var cell = cc.LayerColor.create(GD.c4(rgb), COLOR_LAYOUT.swatch,
                                                        COLOR_LAYOUT.swatch);
                        cell.setPosition(x - COLOR_LAYOUT.swatch / 2,
                                         y - COLOR_LAYOUT.swatch / 2);
                        body.addChild(cell, 1);

                        if (chosen) {
                            var ring = cc.LayerColor.create(cc.c4b(255, 255, 255, 255),
                                                            COLOR_LAYOUT.swatch + 8, 4);
                            ring.setPosition(x - (COLOR_LAYOUT.swatch + 8) / 2,
                                             y - COLOR_LAYOUT.swatch / 2 - 6);
                            body.addChild(ring, 2);
                        }

                        GD.UI.hitPad(body, {
                            x: x, y: y, w: G.pitchX - 6, h: G.pitchY - 6, z: 3,
                            onClick: function () {
                                GD.Save.profile.setColor(which, rgb);
                                GD.Audio.sfx("click");
                                build();
                            }
                        });
                    })(colors[i], i);
                }

                // Primary / secondary switch.
                GD.UI.button(tabs, {
                    x: 250, y: 452, w: 190, h: 40, text: "PRIMARY",
                    style: which === 1 ? "green" : "slate", textScale: GD.UI.TEXT.small,
                    z: 21, priority: 0,
                    onClick: function () { which = 1; build(); }
                });
                GD.UI.button(tabs, {
                    x: 460, y: 452, w: 190, h: 40, text: "SECONDARY",
                    style: which === 2 ? "green" : "slate", textScale: GD.UI.TEXT.small,
                    z: 21, priority: 0,
                    onClick: function () { which = 2; build(); }
                });

                GD.UI.button(tabs, {
                    x: 690, y: 452, w: 190, h: 40,
                    text: GD.Save.profile.glow() ? "GLOW: ON" : "GLOW: OFF",
                    style: GD.Save.profile.glow() ? "green" : "grey",
                    textScale: GD.UI.TEXT.small, z: 21, priority: 0,
                    onClick: function () {
                        GD.Save.profile.setGlow(!GD.Save.profile.glow());
                        build();
                    }
                });

                var note = GD.label("Colours bought in Scratch's Shop appear here",
                                    { scale: GD.UI.TEXT.tiny, color: GD.UI.COLOR.locked });
                note.setPosition(GD.W / 2, 90);
                tabs.addChild(note, 1);
            }

            build();
        }
    });
}
