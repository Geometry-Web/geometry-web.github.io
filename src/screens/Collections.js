/* =====================================================================
 * Collections.js — map packs, gauntlets, lists, the daily/weekly/event
 * screens and the news panel.
 *
 * Map packs and gauntlets are listed from `GD.Data.PACKS` / `GD.Data.GAUNTLETS`
 * and their levels come from the simulated online provider, so every entry here
 * is playable and its progress is the real save-file record of those levels.
 * ===================================================================== */
var COLLECTION_LAYOUT = {
    grid: { firstX: 190, firstY: 350, pitchX: 194, pitchY: 168, columns: 4 }
};

/* One pack / gauntlet card: art on top, name, stars and progress under it. */
function collectionCard(layer, opts) {
    var card = cc.Node.create();
    card.setPosition(opts.x, opts.y);
    layer.addChild(card, 6);

    var art = GD.sprite(opts.frame);
    var size = art.getContentSize();
    if (!size.width || !size.height) size = cc.size(120, 90);
    art.setScale(Math.min(96 / size.width, 60 / size.height));
    art.setPosition(0, 34);
    card.addChild(art, 1);

    var name = GD.label(opts.name, { scale: GD.UI.TEXT.tiny, width: 160,
                                     align: cc.TEXT_ALIGNMENT_CENTER });
    name.setPosition(0, -18);
    card.addChild(name, 2);

    var progress = GD.Data.collectionProgress(opts.entry);
    var info = GD.label(progress.done + " / " + progress.total + "   " +
                        opts.entry.stars + " stars",
                        { scale: GD.UI.TEXT.tiny, color: progress.complete
                            ? GD.UI.COLOR.green : GD.UI.COLOR.gold });
    info.setPosition(0, -42);
    card.addChild(info, 2);

    if (opts.locked) {
        var lock = GD.sprite("GJ_lock_001.png");
        lock.setScale(0.7);
        lock.setPosition(0, 34);
        card.addChild(lock, 3);
        if (art.setColor) art.setColor(cc.c3b(110, 110, 110));
    }

    /* Hit pad: the card art is not a button, so an invisible press target sits
     * on top of it and owns the press. */
    GD.UI.hitPad(layer, {
        x: opts.x, y: opts.y - 4, w: 170, h: 130, z: 8,
        onClick: function () { opts.onClick(); }
    });

    // A frame around the card so it reads as one tile.
    var frame = GD.UI.nine(GD.UI.PANEL[opts.locked ? "grey" : "dark"], 170, 130,
                           GD.UI.PANEL_INSETS);
    frame.setPosition(opts.x, opts.y - 4);
    layer.addChild(frame, 3);

    return card;
}

/* Detail popup shared by packs and gauntlets: the level list, one row per
 * level, each row starts the level. */
function collectionPopup(scene, entry, kind) {
    GD.UI.popup(scene, {
        title: entry.name,
        w: 600, h: 380,
        content: function (content, handle, priority) {
            var progress = GD.Data.collectionProgress(entry);

            var summary = GD.label(kind + "  -  " + progress.done + " / " + progress.total +
                                   " complete  -  " + entry.stars + " stars",
                                   { scale: GD.UI.TEXT.small, color: GD.UI.COLOR.gold });
            summary.setPosition(0, 118);
            content.addChild(summary, 1);

            for (var i = 0; i < entry.levels.length && i < 5; i++) {
                (function (index) {
                    var level = GD.Online.level(entry.levels[index]);
                    var record = GD.Save.level("online:" + level.id);
                    var y = 74 - index * 46;

                    var row = GD.label((index + 1) + ".  " + level.name + "  -  " +
                                       level.stars + " stars" +
                                       (record.completed ? "  (done)" : ""),
                                       { scale: GD.UI.TEXT.small, anchor: [0, 0.5],
                                         color: record.completed ? GD.UI.COLOR.green
                                                                 : GD.UI.COLOR.text });
                    row.setPosition(-250, y);
                    content.addChild(row, 1);

                    GD.UI.button(content, {
                        x: 232, y: y, w: 96, h: 36, text: "PLAY", style: "green",
                        textScale: GD.UI.TEXT.tiny, priority: priority, z: 3,
                        onClick: function () {
                            handle.close(true);
                            cc.Director.getInstance().replaceScene(
                                new PlayScene(GD.Online.entry(level)));
                        }
                    });
                })(i);
            }
        },
        buttons: [{ text: "CLOSE", style: "grey" }]
    });
}

/* ------------------------------------------------------------- map packs */
function PacksScene() {
    return GD.UI.screen({
        title: "MAP PACKS",
        titleY: 498,
        background: { top: [30, 100, 190], bottom: [12, 30, 70], ground: false },
        back: function () { return new CreatorScene(); },
        layout: function (layer) {
            var scene = layer.getParent();
            var G = COLLECTION_LAYOUT.grid;

            for (var i = 0; i < GD.Data.PACKS.length; i++) {
                (function (pack, index) {
                    collectionCard(layer, {
                        x: G.firstX + (index % G.columns) * G.pitchX,
                        y: G.firstY - Math.floor(index / G.columns) * G.pitchY,
                        frame: GD.A.difficulty(pack.diff),
                        name: pack.name,
                        entry: pack,
                        onClick: function () { collectionPopup(scene, pack, "PACK"); }
                    });
                })(GD.Data.PACKS[i], i);
            }

            var note = GD.label("Packs are played with simulated online levels",
                                { scale: GD.UI.TEXT.tiny, color: GD.UI.COLOR.locked });
            note.setPosition(GD.W / 2, 44);
            layer.addChild(note, 30);
        }
    });
}



/* -------------------------------------------------------------- gauntlets */
function GauntletsScene() {
    return GD.UI.screen({
        title: "GAUNTLETS",
        titleY: 498,
        background: { top: [120, 40, 30], bottom: [30, 10, 8], ground: false },
        sheets: ["gauntlet"],
        back: function () { return new CreatorScene(); },
        layout: function (layer) {
            var scene = layer.getParent();
            var G = COLLECTION_LAYOUT.grid;
            var stars = GD.Save.stats.get("collectedStars");

            for (var i = 0; i < GD.Data.GAUNTLETS.length; i++) {
                (function (gauntlet, index) {
                    var need = gauntlet.stars * 2;              // 40..80 stars
                    var locked = stars < need;
                    collectionCard(layer, {
                        x: G.firstX + (index % G.columns) * G.pitchX,
                        y: G.firstY - Math.floor(index / G.columns) * G.pitchY,
                        frame: gauntlet.island,
                        name: gauntlet.name,
                        entry: gauntlet,
                        locked: locked,
                        onClick: function () {
                            if (locked) {
                                GD.UI.alert(scene, "LOCKED",
                                    "Needs " + need + " stars. You have " + stars + ".");
                                return;
                            }
                            collectionPopup(scene, gauntlet, "GAUNTLET");
                        }
                    });
                })(GD.Data.GAUNTLETS[i], i);
            }

            var note = GD.label("Locked gauntlets unlock with stars",
                                { scale: GD.UI.TEXT.tiny, color: GD.UI.COLOR.locked });
            note.setPosition(GD.W / 2, 44);
            layer.addChild(note, 30);
        }
    });
}

/* ------------------------------------------------------------------ lists
 * A list is a name plus a set of saved online levels. Creating and deleting
 * lists writes into the save file, so they survive a reload. */
GD.Data.savedLists = function () {
    var data = GD.Save.data();
    if (!data.lists) data.lists = [];
    return data.lists;
};

function ListsScene() {
    return GD.UI.screen({
        title: "LISTS",
        titleY: 498,
        background: { top: [110, 90, 30], bottom: [28, 22, 8], ground: false },
        back: function () { return new CreatorScene(); },
        layout: function (layer) {
            var scene = layer.getParent();
            var lists = GD.Data.savedLists();

            var list = GD.UI.list(layer, {
                x: 480, top: 430, count: 5, pitch: 62, height: 56,
                items: lists,
                build: function (row) {
                    row.addChild(GD.UI.nine(GD.UI.PANEL.dark, 700, 56, GD.UI.PANEL_INSETS), 0);
                    row.title = GD.label("", { scale: GD.UI.TEXT.small, anchor: [0, 0.5] });
                    row.title.setPosition(-320, 8);
                    row.addChild(row.title, 1);
                    row.sub = GD.label("", { scale: GD.UI.TEXT.tiny, anchor: [0, 0.5],
                                             color: GD.UI.COLOR.dim });
                    row.sub.setPosition(-320, -14);
                    row.addChild(row.sub, 1);
                },
                fill: function (row, entry) {
                    row.title.setString(entry.name);
                    row.sub.setString(entry.levels.length + " levels");
                },
                onSelect: function (entry) {
                    GD.UI.confirm(scene, {
                        title: entry.name,
                        message: entry.levels.length + " saved levels. Delete this list?",
                        okText: "Delete", okStyle: "red",
                        onOk: function () {
                            var all = GD.Data.savedLists();
                            for (var i = 0; i < all.length; i++) {
                                if (all[i] !== entry) continue;
                                all.splice(i, 1);
                                GD.Save.set("lists", all);
                                GD.Nav.go(ListsScene());
                                return;
                            }
                        }
                    });
                },
                z: 6
            });

            GD.UI.listArrows(layer, list,
                { up: { x: 880, y: 360, scale: 1.0 }, down: { x: 880, y: 130, scale: 1.0 } }, 30);

            GD.UI.button(layer, {
                x: 250, y: 60, w: 250, h: 48, text: "NEW LIST", style: "green",
                textScale: GD.UI.TEXT.small, z: 30,
                onClick: function () {
                    GD.UI.textPrompt(scene, {
                        title: "NEW LIST", placeholder: "list name", maxLength: 20,
                        onOk: function (name) {
                            var all = GD.Data.savedLists();
                            all.push({ name: name,
                                       levels: (GD.Save.data().online.saved || []).slice(0, 3) });
                            GD.Save.set("lists", all);
                            GD.Nav.go(ListsScene());
                        }
                    });
                }
            });

            GD.UI.button(layer, {
                x: 540, y: 60, w: 250, h: 48, text: "FROM SAVED", style: "cyan",
                textScale: GD.UI.TEXT.small, z: 30,
                onClick: function () {
                    var saved = GD.Save.data().online.saved || [];
                    if (!saved.length) {
                        GD.UI.alert(scene, "NO SAVED LEVELS",
                                    "Save a level in the online browser first.");
                        return;
                    }
                    var all = GD.Data.savedLists();
                    all.push({ name: "Saved " + (all.length + 1), levels: saved.slice(0, 5) });
                    GD.Save.set("lists", all);
                    GD.Nav.go(ListsScene());
                }
            });

            if (!lists.length) {
                var empty = GD.label("No lists yet - create one below",
                                     { scale: GD.UI.TEXT.small, color: GD.UI.COLOR.dim });
                empty.setPosition(GD.W / 2, 300);
                layer.addChild(empty, 20);
            }
        }
    });
}



/* ------------------------------------------------------- daily / weekly / event
 * One screen, four tabs. The daily and weekly levels come from the simulated
 * provider and change with the date; the quests read the real counters; the
 * daily chest pays its reward once per calendar day. */
function DailyScene(opts) {
    opts = opts || {};
    var tab = opts.tab || "daily";

    return GD.UI.screen({
        title: "DAILY & EVENTS",
        titleY: 498,
        background: { top: [200, 130, 30], bottom: [60, 34, 8], ground: false },
        back: function () { return new CreatorScene(); },
        layout: function (layer) {
            var scene = layer.getParent();
            var body = cc.Node.create();
            layer.addChild(body, 6);
            var tabButtons = cc.Node.create();
            layer.addChild(tabButtons, 20);

            function play(level) {
                GD.Audio.sfx("click");
                cc.Director.getInstance().replaceScene(new PlayScene(GD.Online.entry(level)));
            }

            function buildTabs() {
                tabButtons.removeAllChildren(true);
                var tabs = [["daily", "DAILY"], ["weekly", "WEEKLY"],
                            ["event", "EVENT"], ["quests", "QUESTS"]];
                for (var i = 0; i < tabs.length; i++) {
                    (function (id, name, index) {
                        GD.UI.button(tabButtons, {
                            x: 250 + index * 150, y: 448, w: 140, h: 38,
                            text: name, textScale: GD.UI.TEXT.small,
                            style: tab === id ? "green" : "slate", z: 21, priority: 0,
                            onClick: function () { tab = id; buildTabs(); buildBody(); }
                        });
                    })(tabs[i][0], tabs[i][1], i);
                }
            }

            function buildBody() {
                body.removeAllChildren(true);
                if (tab === "quests") buildQuests();
                else buildLevel();
            }


            function buildQuests() {
                for (var q = 0; q < GD.Data.QUESTS.length; q++) {
                    (function (quest, index) {
                        var state = GD.Data.questState(quest);
                        var y = 380 - index * 56;

                        var panel = GD.UI.nine(GD.UI.PANEL.dark, 720, 50, GD.UI.PANEL_INSETS);
                        panel.setPosition(GD.W / 2, y);
                        body.addChild(panel, 1);

                        var text = GD.label(quest.text, { scale: GD.UI.TEXT.small,
                                                          anchor: [0, 0.5] });
                        text.setPosition(180, y);
                        body.addChild(text, 2);

                        GD.UI.progress(body, { x: 470, y: y, w: 150, h: 12,
                                               value: state.percent, z: 2 });

                        var claimable = state.done && !state.claimed;
                        GD.UI.button(body, {
                            x: 706, y: y, w: 130, h: 38,
                            text: state.claimed ? "CLAIMED" : "CLAIM",
                            style: claimable ? "green" : "grey",
                            textScale: GD.UI.TEXT.tiny, z: 3, enabled: claimable,
                            onClick: function () {
                                if (!GD.Data.claimQuest(quest)) return;
                                GD.Audio.sfx("reward");
                                GD.UI.toast(scene, "Quest claimed");
                                buildBody();
                            }
                        });
                    })(GD.Data.QUESTS[q], q);
                }

                var chest = GD.Data.chestState();
                GD.UI.button(body, {
                    x: GD.W / 2, y: 76, w: 320, h: 46,
                    text: chest.available ? "OPEN DAILY CHEST" : "CHEST OPENED TODAY",
                    style: chest.available ? "green" : "grey",
                    textScale: GD.UI.TEXT.small, z: 3, enabled: chest.available,
                    onClick: function () {
                        var reward = GD.Data.openChest();
                        if (!reward) return;
                        GD.Audio.sfx("chestOpen");
                        GD.UI.alert(scene, "DAILY CHEST",
                            "+" + reward.diamonds + " diamonds\n+" + reward.orbs + " orbs");
                        buildBody();
                    }
                });
            }

            function buildLevel() {
                var level = tab === "daily" ? GD.Online.daily()
                          : tab === "weekly" ? GD.Online.weekly()
                          : GD.Online.level(4242);

                var heading = GD.label(tab === "weekly" ? "WEEKLY DEMON"
                                     : tab === "event" ? "EVENT LEVEL" : "DAILY LEVEL",
                                     { scale: GD.UI.TEXT.big, color: GD.UI.COLOR.gold });
                heading.setPosition(GD.W / 2, 392);
                body.addChild(heading, 2);

                var face = GD.sprite(GD.A.difficulty(level.diff));
                face.setScale(0.9);
                face.setPosition(190, 300);
                body.addChild(face, 2);

                var name = GD.label(level.name, { scale: GD.UI.TEXT.body });
                name.setPosition(560, 316);
                body.addChild(name, 2);

                var info = GD.label("by " + level.author + "  -  " + level.difficulty +
                                    "  -  " + level.stars + " stars  -  " + level.length,
                                    { scale: GD.UI.TEXT.small, color: GD.UI.COLOR.dim });
                info.setPosition(560, 284);
                body.addChild(info, 2);

                var record = GD.Save.level("online:" + level.id);
                var best = GD.label(record.normal ? "Your best: " + record.normal + "%"
                                                  : "Not played yet",
                                    { scale: GD.UI.TEXT.small,
                                      color: record.normal ? GD.UI.COLOR.green : GD.UI.COLOR.dim });
                best.setPosition(560, 256);
                body.addChild(best, 2);

                GD.UI.button(body, {
                    x: GD.W / 2, y: 190, w: 240, h: 52, text: "PLAY", style: "green",
                    z: 3, onClick: function () { play(level); }
                });

                var note = GD.label(tab === "daily" ? "Changes every day at midnight"
                                    : tab === "weekly" ? "Changes every week"
                                    : "Simulated event level",
                                    { scale: GD.UI.TEXT.tiny, color: GD.UI.COLOR.locked });
                note.setPosition(GD.W / 2, 132);
                body.addChild(note, 2);
            }


            buildTabs();
            buildBody();
        }
    });
}

/* -------------------------------------------------------------------- news
 * GD's news panel: what this build is, what it is not, and where the source and
 * the assets come from. The one screen that is honest by design. */
function NewsScene() {
    return GD.UI.screen({
        title: "NEWS",
        titleY: 498,
        background: { top: [20, 110, 90], bottom: [8, 30, 26], ground: false },
        layout: function (layer) {
            var lines = [
                "Geometry Web - a Geometry Dash 2.2 recreation on cocos2d-html5.",
                "",
                "Running: main menu, level select with the 22 official levels,",
                "Icon Kit (9 modes + colours), stats/profile, settings, online",
                "browser, map packs, gauntlets, lists, shops, vaults, treasure",
                "room, daily quests and chests, and a level editor.",
                "",
                "Everything online is a local simulation: this is a static site,",
                "so there are no accounts, uploads or real comments.",
                "",
                "Art, audio and level data are (c) RobTop Games and are used for",
                "this non-commercial recreation. Engine: cocos2d-html5 v2.2.3."
            ];
            for (var i = 0; i < lines.length; i++) {
                var label = GD.label(lines[i], { scale: GD.UI.TEXT.small, anchor: [0.5, 1] });
                label.setPosition(GD.W / 2, 452 - i * 24);
                if (i === 0) label.setColor(GD.UI.COLOR.gold);
                layer.addChild(label, 20);
            }

            GD.UI.button(layer, {
                x: 300, y: 70, w: 250, h: 48, text: "GITHUB", style: "grey",
                textScale: GD.UI.TEXT.small, z: 30,
                onClick: function () {
                    window.open("https://github.com/Geometry-Web/geometry-web.github.io", "_blank");
                }
            });

            GD.UI.button(layer, {
                x: 660, y: 70, w: 250, h: 48, text: "ROBTOP GAMES", style: "cyan",
                textScale: GD.UI.TEXT.small, z: 30,
                onClick: function () { window.open("https://robtopgames.com", "_blank"); }
            });
        }
    });
}

