/* =====================================================================
 * Online.js (screen) — the level browser, the level info popup and the
 * simulated leaderboard.
 *
 * Everything on this screen comes from `GD.Online`, which is a local
 * simulation (see src/services/Online.js): the banner at the bottom says so,
 * and the creator handles are prefixed `sim_`. What is *not* simulated is the
 * gameplay — "play" runs the level through `GD.Online.entry()`, the real play
 * layer, and the result is stored in the save file like any other run.
 * ===================================================================== */
var ONLINE_LAYOUT = {
    tabs:   { y: 452, h: 34, w: 96, pitch: 98, firstX: 110 },
    list:   { x: 480, top: 404, count: 6, pitch: 56, height: 50 },
    row:    { width: 744, height: 48, faceX: -336, nameX: -296, downX: 96,
              likeX: 200, starX: 296, lengthX: 356 },
    arrows: { up: { x: 906, y: 336, scale: 1.05 }, down: { x: 906, y: 116, scale: 1.05 } },
    buttons: {
        search: { x: 148, y: 44, w: 176, h: 46 },
        saved:  { x: 342, y: 44, w: 176, h: 46 },
        top:    { x: 536, y: 44, w: 176, h: 46 }
    },
    notice: { x: 856, y: 44, scale: 0.42 }
};

/* Small "icon + number" cell used for downloads / likes / stars in a row. */
function onlineStat(row, frame, x, iconScale, textScale) {
    var icon = GD.sprite(frame);
    icon.setScale(iconScale);
    icon.setPosition(x - 16, 0);
    row.addChild(icon, 1);

    var value = GD.label("", { scale: textScale, anchor: [0, 0.5], color: GD.UI.COLOR.gold });
    value.setPosition(x - 2, 0);
    row.addChild(value, 1);
    return value;
}

function onlineRow(row) {
    var R = ONLINE_LAYOUT.row;
    row.addChild(GD.UI.nine(GD.UI.PANEL.dark, R.width, R.height, GD.UI.PANEL_INSETS), 0);

    row.face = GD.sprite(GD.A.difficulty(1));
    row.face.setScale(0.62);
    row.face.setPosition(R.faceX, 0);
    row.addChild(row.face, 1);

    row.name = GD.label("", { scale: GD.UI.TEXT.small, anchor: [0, 0.5] });
    row.name.setPosition(R.nameX, 8);
    row.addChild(row.name, 1);

    row.author = GD.label("", { scale: GD.UI.TEXT.tiny, anchor: [0, 0.5],
                                color: GD.UI.COLOR.dim });
    row.author.setPosition(R.nameX, -12);
    row.addChild(row.author, 1);

    row.downloads = onlineStat(row, GD.A.download, R.downX, 0.5, GD.UI.TEXT.tiny);
    row.likes = onlineStat(row, GD.A.like, R.likeX, 0.5, GD.UI.TEXT.tiny);
    row.stars = onlineStat(row, GD.A.star, R.starX, 0.5, GD.UI.TEXT.tiny);

    row.length = GD.label("", { scale: GD.UI.TEXT.tiny, anchor: [1, 0.5],
                                color: GD.UI.COLOR.dim });
    row.length.setPosition(R.lengthX, 0);
    row.addChild(row.length, 1);
}

function fillOnlineRow(row, level) {
    var frame = GD.safeFrame(GD.A.difficulty(level.diff), GD.A.difficulty(1));
    if (frame) row.face.setDisplayFrame(frame);
    row.name.setString((level.epic ? "[EPIC] " : level.featured ? "[FEATURED] " : "") + level.name);
    row.author.setString("by " + level.author + "  #" + level.id);
    row.downloads.setString(GD.short(level.downloads));
    row.likes.setString(GD.short(level.likes));
    row.stars.setString("" + level.stars);
    row.length.setString(level.length);
}


/* The level info popup: everything GD's own level screen shows, plus the two
 * actions that work offline (like, save) and the two that lead somewhere real
 * (play, comments). */
function onlineLevelPopup(scene, level) {
    if (level && level.source === "server") return onlineServerLevelPopup(scene, level);
    var record = GD.Save.level("online:" + level.id);
    var state = GD.Online.state(level.id);

    var handle = GD.UI.popup(scene, {
        title: level.name,
        w: 620, h: 360,
        style: "brown",
        content: function (content) {
            var face = GD.sprite(GD.A.difficulty(level.diff));
            face.setScale(0.95);
            face.setPosition(-232, 84);
            content.addChild(face, 1);

            function line(text, x, y, scale, color) {
                var label = GD.label(text, { scale: scale || GD.UI.TEXT.small,
                                             color: color || GD.UI.COLOR.text });
                label.setPosition(x, y);
                content.addChild(label, 1);
                return label;
            }

            line(level.difficulty + "  -  " + level.length + "  -  " + level.stars + " stars",
                 -70, 62, GD.UI.TEXT.small, GD.UI.COLOR.gold);
            line(GD.short(level.downloads) + " downloads    " + GD.short(level.likes) + " likes",
                 -70, 36, GD.UI.TEXT.tiny, GD.UI.COLOR.dim);
            line("Song: " + level.songName + " by " + level.songAuthor,
                 0, 10, GD.UI.TEXT.tiny, GD.UI.COLOR.dim);

            var desc = GD.label(level.description, {
                scale: GD.UI.TEXT.tiny, width: 440, align: cc.TEXT_ALIGNMENT_CENTER
            });
            desc.setPosition(40, -34);
            content.addChild(desc, 1);

            var best = record.normal ? "Your best: " + record.normal + "%" : "Not played yet";
            line(best, 0, -76, GD.UI.TEXT.tiny,
                 record.normal ? GD.UI.COLOR.green : GD.UI.COLOR.dim);

            line("Simulated content", 0, -100, GD.UI.TEXT.tiny, GD.UI.COLOR.locked);
        },
        buttons: [
            { text: "PLAY", style: "green", close: false, onClick: function (h) {
                h.close(true);
                cc.Director.getInstance().replaceScene(new PlayScene(GD.Online.entry(level)));
            } },
            { text: state.liked ? "LIKED" : "LIKE", style: "cyan", close: false,
              onClick: function (h) {
                  var now = GD.Online.toggleLike(level.id);
                  GD.UI.toast(scene, now.liked ? "Liked" : "Like removed");
                  h.close(true);
                  onlineLevelPopup(scene, level);
              } },
            { text: state.saved ? "SAVED" : "SAVE", style: "purple", close: false,
              onClick: function (h) {
                  var now = GD.Online.toggleSave(level.id);
                  GD.UI.toast(scene, now.saved ? "Saved to your list" : "Removed");
                  h.close(true);
                  onlineLevelPopup(scene, level);
              } },
            { text: "COMMENTS", style: "grey", close: false, onClick: function (h) {
                h.close(true);
                onlineCommentsPopup(scene, level);
            } }
        ]
    });
    return handle;
}


/* Comment sheet: the seeded comments from GD.Online plus whatever the player
 * posts this session. Posting is local, and says so. */
function onlineCommentsPopup(scene, level) {
    var posted = [];
    GD.UI.popup(scene, {
        title: "COMMENTS",
        w: 560, h: 330,
        content: function (content, h, priority) {
            var container = cc.Node.create();
            content.addChild(container, 1);

            function paint() {
                container.removeAllChildren(true);
                var comments = posted.concat(GD.Online.comments(level.id));
                for (var i = 0; i < comments.length && i < 4; i++) {
                    var c = comments[i];
                    var y = 76 - i * 46;
                    var author = GD.label(c.author, { scale: GD.UI.TEXT.tiny, anchor: [0, 0.5],
                                                      color: GD.UI.COLOR.gold });
                    author.setPosition(-240, y + 8);
                    container.addChild(author, 1);

                    var text = GD.label(c.text, { scale: GD.UI.TEXT.tiny, anchor: [0, 0.5],
                                                 width: 470 });
                    text.setPosition(-240, y - 10);
                    container.addChild(text, 1);
                }
                if (!comments.length) {
                    var empty = GD.label("No comments yet.", { scale: GD.UI.TEXT.small,
                                                              color: GD.UI.COLOR.dim });
                    empty.setPosition(0, 40);
                    container.addChild(empty, 1);
                }
            }

            GD.UI.button(content, {
                x: 0, y: -108, w: 180, h: 40, text: "POST", style: "green",
                textScale: GD.UI.TEXT.tiny, priority: priority, z: 3,
                onClick: function () {
                    GD.UI.textPrompt(scene, {
                        title: "COMMENT", placeholder: "Say something", maxLength: 60,
                        onOk: function (text) {
                            posted.unshift({ author: GD.Save.profile.name(), text: text,
                                             likes: 0, hoursAgo: 0 });
                            paint();
                            GD.UI.toast(scene, "Comment added (local only)");
                        }
                    });
                }
            });

            paint();
        },
        buttons: [{ text: "CLOSE", style: "grey" }]
    });
}


/* The browser itself. */
function OnlineScene(opts) {
    opts = opts || {};
    var state = {
        category: opts.category || "recent",
        filters: opts.filters || {}
    };

    return GD.UI.screen({
        title: "ONLINE LEVELS",
        titleY: 500,
        background: { top: [20, 62, 150], bottom: [10, 18, 62], ground: false },
        back: function () { return new CreatorScene(); },
        layout: function (layer) {
            var scene = layer.getParent();
            var tabContainer = cc.Node.create();
            layer.addChild(tabContainer, 20);
            var list = null;

            function refreshList() {
                if (state.category !== "saved" && GD.OnlineServer && GD.OnlineServer.active()) {
                    /* Live provider: the same rows, but they come from the account
                     * server. A failed request falls back to the labelled demo
                     * rather than an empty screen. */
                    GD.OnlineServer.search({ category: state.category, filters: state.filters })
                        .then(function (result) {
                            list.setItems(result.levels);
                            if (!result.levels.length) GD.UI.toast(scene, "No levels online yet");
                        }, function () {
                            list.setItems(GD.Online.query({
                                category: state.category, filters: state.filters
                            }));
                            GD.UI.toast(scene, "Server offline - showing the local demo");
                        });
                    return;
                }
                var items = state.category === "saved"
                    ? GD.Online.savedLevels()
                    : GD.Online.query({ category: state.category, filters: state.filters });
                list.setItems(items);
                if (!items.length) GD.UI.toast(scene, "Nothing listed here yet");
            }

            function buildTabs() {
                tabContainer.removeAllChildren(true);
                var T = ONLINE_LAYOUT.tabs;
                for (var i = 0; i < GD.Online.categories.length; i++) {
                    (function (cat, index) {
                        GD.UI.button(tabContainer, {
                            x: T.firstX + index * T.pitch, y: T.y, w: T.w, h: T.h,
                            text: cat.name.toUpperCase(),
                            textScale: GD.UI.TEXT.tiny,
                            style: state.category === cat.id ? "green" : "slate",
                            z: 21, priority: 0,
                            onClick: function () {
                                state.category = cat.id;
                                buildTabs();
                                refreshList();
                            }
                        });
                    })(GD.Online.categories[i], i);
                }
            }

            list = GD.UI.list(layer, {
                x: ONLINE_LAYOUT.list.x, top: ONLINE_LAYOUT.list.top,
                count: ONLINE_LAYOUT.list.count, pitch: ONLINE_LAYOUT.list.pitch,
                height: ONLINE_LAYOUT.list.height,
                items: [],
                build: onlineRow,
                fill: fillOnlineRow,
                onSelect: function (level) { if (level) onlineLevelPopup(scene, level); },
                z: 6
            });

            buildTabs();
            refreshList();
            GD.UI.listArrows(layer, list, ONLINE_LAYOUT.arrows, 30);

            var B = ONLINE_LAYOUT.buttons;
            GD.UI.button(layer, {
                x: B.search.x, y: B.search.y, w: B.search.w, h: B.search.h,
                text: "SEARCH", style: "cyan", textScale: GD.UI.TEXT.small, z: 30,
                onClick: function () {
                    GD.UI.textPrompt(scene, {
                        title: "SEARCH LEVELS", placeholder: "name, creator or id",
                        onOk: function (text) {
                            state.filters.text = text;
                            refreshList();
                            GD.UI.toast(scene, text ? "Searching: " + text : "Search cleared");
                        }
                    });
                }
            });

            GD.UI.button(layer, {
                x: B.saved.x, y: B.saved.y, w: B.saved.w, h: B.saved.h,
                text: "SAVED", style: "purple", textScale: GD.UI.TEXT.small, z: 30,
                onClick: function () {
                    state.category = "saved";
                    buildTabs();


                    refreshList();
                }
            });

            GD.UI.button(layer, {
                x: B.top.x, y: B.top.y, w: B.top.w, h: B.top.h,
                text: "LEADERBOARD", style: "grey", textScale: GD.UI.TEXT.tiny, z: 30,
                onClick: function () { GD.Nav.go(LeaderboardScene()); }
            });

            var notice = GD.label("SIMULATED LEVELS - no connection to GD servers",
                                  { scale: ONLINE_LAYOUT.notice.scale, color: GD.UI.COLOR.locked,
                                    width: 380, align: cc.TEXT_ALIGNMENT_RIGHT });
            notice.setPosition(ONLINE_LAYOUT.notice.x, ONLINE_LAYOUT.notice.y);
            layer.addChild(notice, 30);
        }
    });
}

/* Global ranking (simulated), one row per player. */
function LeaderboardScene() {
    return GD.UI.screen({
        title: "LEADERBOARD",
        titleY: 500,
        background: { top: [90, 40, 140], bottom: [22, 10, 50], ground: false },
        layout: function (layer) {
            var rows = GD.Online.leaderboard("players");

            var list = GD.UI.list(layer, {
                x: 480, top: 420, count: 8, pitch: 46, height: 42,
                items: rows,
                build: function (row) {
                    row.addChild(GD.UI.nine(GD.UI.PANEL.dark, 660, 40, GD.UI.PANEL_INSETS), 0);
                    row.rank = GD.label("", { scale: GD.UI.TEXT.small, anchor: [1, 0.5] });
                    row.rank.setPosition(-270, 0);
                    row.addChild(row.rank, 1);
                    row.gamer = GD.label("", { scale: GD.UI.TEXT.small, anchor: [0, 0.5] });
                    row.gamer.setPosition(-250, 0);
                    row.addChild(row.gamer, 1);
                    row.stars = GD.label("", { scale: GD.UI.TEXT.small, anchor: [1, 0.5],
                                               color: GD.UI.COLOR.gold });
                    row.stars.setPosition(310, 0);
                    row.addChild(row.stars, 1);
                },
                fill: function (row, entry) {
                    row.rank.setString("#" + entry.rank);
                    row.gamer.setString(entry.name + (entry.you ? "  (you)" : ""));
                    row.gamer.setColor(entry.you ? GD.UI.COLOR.green : GD.UI.COLOR.text);
                    row.stars.setString(GD.fmt(entry.stars) + " stars");
                },
                onSelect: function (entry) {
                    GD.UI.alert(layer.getParent(), entry.name,
                        entry.rank + "  -  " + GD.fmt(entry.stars) + " stars\nSimulated ranking.");
                },
                z: 6
            });

            GD.UI.listArrows(layer, list,
                { up: { x: 850, y: 340, scale: 1.0 }, down: { x: 850, y: 116, scale: 1.0 } }, 30);

            var note = GD.label("Simulated rankings", { scale: GD.UI.TEXT.tiny,
                                                        color: GD.UI.COLOR.locked });
            note.setPosition(GD.W / 2, 44);
            layer.addChild(note, 30);
        }
    });
}
