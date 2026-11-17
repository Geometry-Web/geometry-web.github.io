/* =====================================================================
 * Editor.js — the level editor.
 *
 * Not a mockup: it writes the same runtime level the play layer runs, so
 * "PLAYTEST" starts the level you just built and "SAVE" stores it through
 * `GD.Levels.remember()` (localStorage), where the level select and the play
 * scene already look for imported levels.
 *
 * Model:
 *   objects[]  {id, x, y, rot} in LEVEL UNITS (30 per cell); y = 15 is a cell
 *              standing on the ground.
 *   cameraX    left edge of the view, in units.
 *   zoom       1 = one cell is 60px, the play layer's own scale.
 *
 * Modes: BUILD (tap places the selected object), EDIT (tap selects, then the
 * toolbar moves/rotates/deletes it), PAN (drag scrolls the camera).
 * Undo/redo keep snapshots of the object list, capped so a long session cannot
 * grow without bound.
 * ===================================================================== */
var EDITOR_LAYOUT = {
    groundY: 96,
    palette: { w: 62, h: 52, count: 8, rowPitch: 56, firstTop: 430 },
    zoom: { min: 0.4, max: 2 },
    undoLimit: 60
};

/* Every object the palette offers, grouped like GD's own tabs. */
var EDITOR_PALETTE = [
    { name: "BLOCKS",  ids: [1] },
    { name: "SPIKES",  ids: [8, 191] },
    { name: "ORBS",    ids: [36, 84, 141, 1022, 1333, 1704] },
    { name: "PADS",    ids: [35, 67, 140] },
    { name: "PORTALS", ids: [12, 47, 111, 660, 745, 1331, 1933, 2064, 10] },
    { name: "COINS",   ids: [142] }
];

function EditorScene() {
    var state = {
        objects: [],
        cameraX: -180,
        zoom: 1,
        mode: "build",
        selected: -1,
        tab: 0,
        pick: 0,
        name: "My Level",
        undo: [],
        redo: []
    };

    return GD.UI.screen({
        title: "EDITOR",
        titleY: 512,
        titleScale: GD.UI.TEXT.body,
        sheets: ["editor"],
        background: { top: [22, 44, 96], bottom: [8, 14, 36], ground: false },
        back: function () { return new CreatorScene(); },
        layout: function (layer) {
            var scene = layer.getParent();
            var world = cc.Node.create();
            layer.addChild(world, 4);

            function unitPx() { return 2 * state.zoom; }
            function screenX(x) { return (x - state.cameraX) * unitPx(); }
            function screenY(y) { return EDITOR_LAYOUT.groundY + y * unitPx(); }

            function cloneObject(o) { return { id: o.id, x: o.x, y: o.y, rot: o.rot }; }

            /* ------------------------------------------------------- painting */
            function paint() {
                world.removeAllChildren(true);

                var ground = cc.LayerColor.create(cc.c4b(0, 0, 0, 120), GD.W, 70);
                ground.setPosition(0, 0);
                world.addChild(ground, 0);

                var line = cc.LayerColor.create(cc.c4b(120, 200, 255, 120), GD.W, 2);
                line.setPosition(0, EDITOR_LAYOUT.groundY);
                world.addChild(line, 1);

                var cell = 30;
                var first = Math.floor(state.cameraX / cell) * cell;
                for (var gx = first; gx < state.cameraX + GD.W / unitPx(); gx += cell) {
                    var v = cc.LayerColor.create(cc.c4b(255, 255, 255, 26), 1, GD.H);
                    v.setPosition(screenX(gx + 15), 0);
                    world.addChild(v, 1);
                }

                for (var i = 0; i < state.objects.length; i++) {
                    var o = state.objects[i];
                    var sx = screenX(o.x);
                    if (sx < -80 || sx > GD.W + 80) continue;
                    var def = GD.Levels.OBJECTS[o.id];
                    if (!def) continue;

                    var node;
                    if (def.solid) {
                        node = cc.Node.create();
                        var side = 30 * unitPx();
                        var fill = cc.LayerColor.create(cc.c4b(40, 125, 255, 255), side, side);
                        fill.setPosition(-side / 2, -side / 2);
                        node.addChild(fill, 0);
                        var outline = GD.frameSprite(def.frame);
                        if (outline) {
                            outline.setScale(state.zoom);
                            node.addChild(outline, 1);
                        }
                    } else {
                        node = GD.frameSprite(def.frame) || cc.Node.create();
                        if (node.setScale) node.setScale(state.zoom);
                    }
                    node.setPosition(sx, screenY(o.y));
                    world.addChild(node, 3);

                    if (i === state.selected) {
                        var box = cc.LayerColor.create(cc.c4b(255, 240, 60, 80),
                                                       30 * unitPx(), 30 * unitPx());
                        box.setPosition(sx - 15 * unitPx(), screenY(o.y) - 15 * unitPx());
                        world.addChild(box, 4);
                    }
                }
            }
            /* --------------------------------------------------------- edits */
            function snapshot() {
                state.undo.push(state.objects.map(cloneObject));
                if (state.undo.length > EDITOR_LAYOUT.undoLimit) state.undo.shift();
                state.redo.length = 0;
            }

            function snapX(px) {
                var units = state.cameraX + px / unitPx();
                return Math.floor(units / 30) * 30 + 15;
            }
            function snapY(py) {
                var units = (py - EDITOR_LAYOUT.groundY) / unitPx();
                return Math.max(15, Math.floor(units / 30) * 30 + 15);
            }

            function placeAt(px, py) {
                var group = EDITOR_PALETTE[state.tab];
                var id = group.ids[Math.min(state.pick, group.ids.length - 1)];
                snapshot();
                state.objects.push({ id: id, x: snapX(px), y: snapY(py), rot: 0 });
                state.selected = state.objects.length - 1;
                GD.Audio.sfx("click");
                paint();
            }

            function objectAt(px, py) {
                var best = -1, bestDist = 26 * unitPx();
                for (var i = 0; i < state.objects.length; i++) {
                    var o = state.objects[i];
                    var dx = screenX(o.x) - px;
                    var dy = screenY(o.y) - py;
                    var d = Math.sqrt(dx * dx + dy * dy);
                    if (d < bestDist) { bestDist = d; best = i; }
                }
                return best;
            }

            function moveSelected(dx, dy) {
                if (state.selected < 0) return;
                snapshot();
                var o = state.objects[state.selected];
                o.x = Math.max(0, o.x + dx);
                o.y = Math.max(15, o.y + dy);
                paint();
            }

            function rotateSelected() {
                if (state.selected < 0) return;
                snapshot();
                var o = state.objects[state.selected];
                o.rot = ((o.rot || 0) + 90) % 360;
                paint();
            }

            function deleteSelected() {
                if (state.selected < 0) return;
                snapshot();
                state.objects.splice(state.selected, 1);
                state.selected = -1;
                GD.Audio.sfx("back");
                paint();
            }

            function duplicateSelected() {
                if (state.selected < 0) return;
                snapshot();
                var o = state.objects[state.selected];
                state.objects.push({ id: o.id, x: o.x + 30, y: o.y, rot: o.rot });
                state.selected = state.objects.length - 1;
                paint();
            }

            function undo() {
                if (!state.undo.length) return;
                state.redo.push(state.objects.map(cloneObject));
                state.objects = state.undo.pop();
                state.selected = -1;
                paint();
            }

            function redo() {
                if (!state.redo.length) return;
                state.undo.push(state.objects.map(cloneObject));
                state.objects = state.redo.pop();
                state.selected = -1;
                paint();
            }
            /* --------------------------------------------------- level output */
            function runtimeLevel() {
                var objects = [];
                var coins = 0;
                for (var i = 0; i < state.objects.length; i++) {
                    var o = state.objects[i];
                    var def = GD.Levels.OBJECTS[o.id];
                    if (!def) continue;
                    var obj = { def: def, x: o.x, y: o.y, rot: o.rot || 0,
                                flipX: false, flipY: false, coin: 0 };
                    if (def.kind === "coin") { coins++; obj.coin = coins; }
                    objects.push(obj);
                }
                objects.sort(function (a, b) { return (a.x - b.x) || (a.y - b.y); });

                var length = 1200;
                for (var k = 0; k < objects.length; k++)
                    if (objects[k].x > length) length = objects[k].x;

                return {
                    id: "editor",
                    name: state.name,
                    author: GD.Save.profile.name(),
                    stars: 0,
                    diff: 0,
                    song: "StereoMadness",
                    colour: [40, 125, 255],
                    length: length + 600,
                    coins: coins,
                    objects: objects
                };
            }

            function playtest() {
                if (!state.objects.length) {
                    GD.UI.alert(scene, "EMPTY LEVEL", "Place at least one object first.");
                    return;
                }
                cc.Director.getInstance().replaceScene(new PlayScene({
                    key: "editor:" + state.name,
                    level: runtimeLevel(),
                    name: state.name
                }));
            }

            function saveLevel() {
                if (!state.objects.length) {
                    GD.UI.alert(scene, "EMPTY LEVEL", "Place at least one object first.");
                    return;
                }
                GD.UI.textPrompt(scene, {
                    title: "SAVE LEVEL", value: state.name, maxLength: 20,
                    onOk: function (text) {
                        state.name = text;
                        GD.Levels.remember(runtimeLevel());
                        GD.Audio.sfx("highscore");
                        GD.UI.toast(scene, "Saved as " + state.name);
                    }
                });
            }

            /* Publishes the level to the account server. The packed object list is
             * exactly what GD.Levels.unpack() reads back, so the uploaded level is
             * playable without a re-import. Sharing happens from the SHARED screen
             * (or straight after publishing, via the same dialog). */
            function uploadLevel() {
                if (!state.objects.length) {
                    GD.UI.alert(scene, "EMPTY LEVEL", "Place at least one object first.");
                    return;
                }
                GD.Account.require(scene, function () {
                    var packed = GD.Levels.pack(runtimeLevel());
                    var runtime = runtimeLevel();
                    var form = GD.UI.form(scene, {
                        title: "PUBLISH LEVEL",
                        okText: "PUBLISH",
                        fields: [
                            { key: "name", label: "LEVEL NAME", value: state.name, maxLength: 50 },
                            { key: "description", label: "DESCRIPTION", maxLength: 300 }
                        ],
                        onSubmit: function (values, api) {
                            return GD.Api.post("/levels", {
                                name: values.name,
                                description: values.description,
                                data: JSON.stringify(packed),
                                dataFormat: "json",
                                difficulty: Math.min(10, Math.max(0, runtime.diff || 0)),
                                length: "medium",
                                visibility: "private",
                                song: runtime.song
                            }).then(function (response) {
                                state.name = response.level.name;
                                GD.UI.toast(scene, "Published #" + response.level.id);
                                openShareDialog(scene, response.level.id, response.level.name, null);
                                return false;
                            }, function (error) {
                                api.setError(error.message);
                                return true;
                            });
                        }
                    });
                    return form;
                });
            }
            /* ------------------------------------------------------ palette UI */
            var palette = cc.Node.create();
            layer.addChild(palette, 20);

            function buildPalette() {
                palette.removeAllChildren(true);
                var P = EDITOR_LAYOUT.palette;

                var tabs = EDITOR_PALETTE;
                for (var t = 0; t < tabs.length; t++) {
                    (function (group, index) {
                        GD.UI.button(palette, {
                            x: 120 + index * 112, y: 466, w: 104, h: 30,
                            text: group.name, textScale: GD.UI.TEXT.tiny,
                            style: state.tab === index ? "green" : "slate",
                            z: 21, priority: 0,
                            onClick: function () {
                                state.tab = index;
                                state.pick = 0;
                                buildPalette();
                            }
                        });
                    })(tabs[t], t);
                }

                var ids = tabs[state.tab].ids;
                for (var i = 0; i < ids.length && i < P.count; i++) {
                    (function (index) {
                        var def = GD.Levels.OBJECTS[ids[index]];
                        var x = 36 + (index % 2) * 54;
                        var y = P.firstTop - Math.floor(index / 2) * P.rowPitch;
                        var active = index === state.pick;
                        var bg = cc.LayerColor.create(
                            cc.c4b(active ? 90 : 20, active ? 200 : 20, active ? 90 : 20, 220),
                            P.w - 16, P.h - 14);
                        bg.setPosition(x - (P.w - 16) / 2, y - (P.h - 14) / 2);
                        palette.addChild(bg, 1);

                        var art = GD.frameSprite(def.frame);
                        if (art) {
                            var size = art.getContentSize();
                            art.setScale(size.width ? Math.min(34 / size.width, 34 / size.height) : 1);
                            art.setPosition(x, y);
                            palette.addChild(art, 2);
                        }

                        GD.UI.iconButton(palette, {
                            x: x, y: y, frame: "GJ_square05.png", scale: 0.0001,
                            z: 3, onClick: function () { state.pick = index; buildPalette(); }
                        });
                    })(i);
                }
            }

            /* ------------------------------------------------------ toolbar UI */
            function toolButton(frame, x, onClick) {
                GD.UI.iconButton(layer, { x: x, y: 40, frame: frame, scale: 1.0,
                                          z: 20, onClick: onClick });
            }

            GD.UI.button(layer, {
                x: 80, y: 40, w: 120, h: 36, text: "BUILD MODE", style: "green",
                textScale: GD.UI.TEXT.tiny, z: 20,
                onClick: function () { state.mode = "build"; GD.UI.toast(scene, "Build mode"); }
            });
            GD.UI.button(layer, {
                x: 204, y: 40, w: 112, h: 36, text: "EDIT MODE", style: "cyan",
                textScale: GD.UI.TEXT.tiny, z: 20,
                onClick: function () { state.mode = "edit"; GD.UI.toast(scene, "Edit mode"); }
            });
            GD.UI.button(layer, {
                x: 292, y: 40, w: 56, h: 36, text: "PAN", style: "slate",
                textScale: GD.UI.TEXT.tiny, z: 20,
                onClick: function () { state.mode = "pan"; GD.UI.toast(scene, "Drag to pan"); }
            });

            toolButton("GJ_undoBtn_001.png", 346, undo);
            toolButton("GJ_redoBtn_001.png", 392, redo);
            toolButton("GJ_rotationControlBtn01_001.png", 438, rotateSelected);
            toolButton("GJ_copyBtn_001.png", 484, duplicateSelected);
            toolButton("GJ_deleteBtn_001.png", 530, deleteSelected);
            toolButton("GJ_zoomOutBtn_001.png", 586, function () {
                state.zoom = GD.clamp(state.zoom / 1.25, EDITOR_LAYOUT.zoom.min,
                                      EDITOR_LAYOUT.zoom.max);
                paint();
            });
            toolButton("GJ_zoomInBtn_001.png", 632, function () {
                state.zoom = GD.clamp(state.zoom * 1.25, EDITOR_LAYOUT.zoom.min,
                                      EDITOR_LAYOUT.zoom.max);
                paint();
            });

            GD.UI.button(layer, {
                x: 730, y: 40, w: 128, h: 36, text: "PLAYTEST", style: "purple",
                textScale: GD.UI.TEXT.tiny, z: 20, onClick: playtest
            });
            GD.UI.button(layer, {
                x: 846, y: 40, w: 104, h: 36, text: "SAVE", style: "green",
                textScale: GD.UI.TEXT.tiny, z: 20, onClick: saveLevel
            });
            GD.UI.button(layer, {
                x: 926, y: 40, w: 112, h: 36, text: "UPLOAD", style: "blue",
                textScale: GD.UI.TEXT.tiny, z: 20, onClick: uploadLevel
            });

            var hint = GD.label("Tap the canvas to place - EDIT mode selects an object",
                                { scale: GD.UI.TEXT.tiny, color: GD.UI.COLOR.locked });
            hint.setPosition(700, 74);
            layer.addChild(hint, 20);
            /* ---------------------------------------------------------- input
             * One touch target for the canvas: a tap places (BUILD), selects
             * (EDIT) or starts a pan (PAN). The kit buttons keep priority 0 so
             * they are always handled first. */
            layer.onTouchBegan = function (touch) {
                var p = touch.getLocation();
                if (state.mode === "pan") {
                    layer._pan = { startX: p.x, camera: state.cameraX };
                    return true;
                }
                if (state.mode === "edit") {
                    state.selected = objectAt(p.x, p.y);
                    paint();
                    return true;
                }
                placeAt(p.x, p.y);
                return true;
            };
            layer.onTouchMoved = function (touch) {
                if (!layer._pan) return;
                var p = touch.getLocation();
                state.cameraX = layer._pan.camera - (p.x - layer._pan.startX) / unitPx();
                paint();
            };
            layer.onTouchEnded = function () { layer._pan = null; };
            layer.onTouchCancelled = function () { layer._pan = null; };

            layer.setTouchMode(cc.TOUCH_ONE_BY_ONE);
            layer.setTouchPriority(1);
            layer.setTouchEnabled(true);

            buildPalette();
            paint();
        }
    });
}
