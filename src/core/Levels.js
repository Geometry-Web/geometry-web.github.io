/* =====================================================================
 * Levels.js — Geometry Dash level files, read the way the game reads them.
 *
 * GD keeps a level in one string of comma separated key/value pairs — first the
 * level settings (`kA2,kA3,...` / `kS29,kS30,...` for the colours), then one
 * `1,<id>,2,<x>,3,<y>,...` record per object, all separated by `;`. That string
 * reaches the game in three different wrappers and this file reads all of them:
 *
 *   Resources/levels/<id>.txt   base64url( gzip( level string ) )   official levels
 *   *.gmd                       XML plist with the string in `k4`  level exports
 *   CCLocalLevels.dat           base64( gzip( XML plist ) )        GD's own save
 *
 * The module is plain ES5 with no engine calls, so `tools/level-import.js`
 * requires it with Node and the browser gets the exact same reader. Every GD
 * object id it understands lives in OBJECT_TABLE below; ids that are not in the
 * table (decorations, triggers, slopes, the 2.2 object library) are dropped by
 * `normalize()`, which is what keeps a 20k object level down to the few hundred
 * that the play layer actually draws and collides with.
 * ===================================================================== */
(function (root, factory) {
    "use strict";
    var Levels = factory(root);
    var GD = root.GD || (root.GD = {});
    GD.Levels = Levels;
    if (typeof module === "object" && module.exports) module.exports = Levels;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
    "use strict";

    var Levels = {};

    /* One grid cell is 30 units in a level file; the canvas draws a cell at 60px
     * (GD's art is 30px and the play layer scales it by 2, like every sheet). */
    Levels.UNIT = 30;
    Levels.DIR = "levels/";

    /* ------------------------------------------------------------------ levels */
    /* The 22 main levels, in the order the level select shows them. `diff` is the
     * difficulty face id GD uses (difficulty_00..10_btn, see GD.A.difficulty),
     * `stars` is what the level is worth, `song` keys into GD.Audio.musicNames.
     * Star values follow GD 2.2's main-level table. */
    Levels.MAIN = [
        { id: 1,  name: "Stereo Madness",      diff: 1, stars: 1,  song: "StereoMadness" },
        { id: 2,  name: "Back On Track",       diff: 1, stars: 2,  song: "BackOnTrack" },
        { id: 3,  name: "Polargeist",          diff: 2, stars: 3,  song: "Polargeist" },
        { id: 4,  name: "Dry Out",             diff: 2, stars: 4,  song: "DryOut" },
        { id: 5,  name: "Base After Base",     diff: 3, stars: 5,  song: "BaseAfterBase" },
        { id: 6,  name: "Can't Let Go",        diff: 3, stars: 6,  song: "CantLetGo" },
        { id: 7,  name: "Jumper",              diff: 3, stars: 7,  song: "Jumper" },
        { id: 8,  name: "Time Machine",        diff: 3, stars: 8,  song: "TimeMachine" },
        { id: 9,  name: "Cycles",              diff: 3, stars: 9,  song: "Cycles" },
        { id: 10, name: "xStep",               diff: 5, stars: 9,  song: "xStep" },
        { id: 11, name: "Clutterfunk",         diff: 5, stars: 10, song: "Clutterfunk" },
        { id: 12, name: "Theory of Everything", diff: 5, stars: 12, song: "TheoryOfEverything" },
        { id: 13, name: "Electroman Adventures", diff: 5, stars: 10, song: "Electroman" },
        { id: 14, name: "Clubstep",            diff: 6, stars: 10, song: "Clubstep" },
        { id: 15, name: "Electrodynamix",      diff: 5, stars: 12, song: "Electrodynamix" },
        { id: 16, name: "Hexagon Force",       diff: 5, stars: 12, song: "HexagonForce" },
        { id: 17, name: "Blast Processing",    diff: 5, stars: 10, song: "BlastProcessing" },
        { id: 18, name: "Theory of Everything 2", diff: 6, stars: 14, song: "TheoryOfEverything2" },
        { id: 19, name: "Geometrical Dominator", diff: 5, stars: 12, song: "GeometricalDominator" },
        { id: 20, name: "Deadlocked",          diff: 6, stars: 15, song: "Deadlocked" },
        { id: 21, name: "Fingerdash",          diff: 5, stars: 11, song: "Fingerdash" },
        { id: 22, name: "Dash",                diff: 5, stars: 12, song: "Dash" }
    ];

    Levels.main = function (id) {
        for (var i = 0; i < Levels.MAIN.length; i++)
            if (Levels.MAIN[i].id === id) return Levels.MAIN[i];
        return null;
    };
    Levels.isMain = function (id) { return !!Levels.main(parseInt(id, 10)); };

    /* Every level of the main set is credited to RobTop, which is what the level
     * select shows under the name (the server's level string does not carry it). */
    Levels.MAIN_AUTHOR = "RobTop";

    /* ----------------------------------------------------------- object table */
    /* Every GD object id this build understands, as
     *   [id, kind, sprite frame, value]
     * `kind` is what the play layer does with it (see KINDS below), `value` names
     * the flavour where one kind has several (orb colour, portal mode).
     *
     * The block ids 1..7 are the classic auto-tiled block set the 1.0 editor
     * emitted: a row of blocks is made of end caps (3, mirrored with flipX) and
     * middles (2, 5), which is why one wall shows several ids. They all collide
     * as plain 1x1 tiles, and the play layer draws them the way GD does: the
     * `lightsquare` colour fill with a dark `blockOutline` on top (the game's own
     * block art has its interior baked in, which would swallow the level colour).
     * 8 is the spike; everything else in the 1.0-1.6 range (9, 16, 17, 19, 20,
     * 21, 29, 30, 39, 40...) sits a few units off the grid and is decoration, not
     * a hazard, which is why dropping it is safe rather than unfair.
     *
     * Portal ids are the ones the level data itself proves: 47 (ball) only shows
     * up from Cycles on, 111 (UFO) from Theory of Everything on, 660 (wave) from
     * Blast Processing on, 745 (robot) from Geometrical Dominator on, 1331
     * (spider) from Fingerdash on — exactly the levels that introduced each mode.
     * 12/13 are the cube/ship pair. A mode portal is always placed in pairs
     * (enter, then back to the cube), so they are handled as toggles and it does
     * not matter which of the two happens to come first. */
    var OBJECT_TABLE = [
        [1,  "block", "blockOutline_01_001.png"],
        [2,  "block", "blockOutline_01_001.png"],
        [3,  "block", "blockOutline_01_001.png"],
        [4,  "block", "blockOutline_01_001.png"],
        [5,  "block", "blockOutline_01_001.png"],
        [6,  "block", "blockOutline_01_001.png"],
        [7,  "block", "blockOutline_01_001.png"],
        [8,  "spike", "spike_01_001.png"],

        // Jump orbs — tap while airborne.
        [36,   "orb", "ring_01_001.png", "yellow"],
        [84,   "orb", "gravring_01_001.png", "blue"],
        [141,  "orb", "ring_02_001.png", "pink"],
        [1022, "orb", "gravJumpRing_01_001.png", "green"],
        [1333, "orb", "ring_03_001.png", "red"],
        [1704, "orb", "ring_custom_01_001.png", "black"],

        // Jump pads — fire the moment the cube runs into them.
        [35,  "pad", "boost_01_001.png", "yellow"],
        [67,  "pad", "boost_02_001.png", "blue"],
        [140, "pad", "boost_03_001.png", "pink"],

        // Mode portals.
        [12,   "portal", "portal_02_front_001.png", "ship"],
        [13,   "portal", "portal_01_front_001.png", "ship"],
        [47,   "portal", "portal_03_front_001.png", "ball"],
        [111,  "portal", "portal_04_front_001.png", "ufo"],
        [660,  "portal", "portal_05_front_001.png", "wave"],
        [745,  "portal", "portal_06_front_001.png", "robot"],
        [1331, "portal", "portal_07_front_001.png", "spider"],
        [1933, "portal", "portal_08_front_001.png", "swing"],
        [2064, "portal", "portal_09_front_001.png", "jetpack"],

        // Gravity portals: blue flips, yellow flips back.
        [10, "portal", "portal_10_front_001.png", "gravity"],
        [11, "portal", "portal_10_front_001.png", "gravity"],

        // Secret coins (key 12 of the object record is the coin number).
        [142, "coin", "secretCoin_01_001.png"]
    ];

    /* What each kind means to the play layer. */
    var KINDS = {
        block:  { solid: true },
        spike:  { hazard: true },
        orb:    { touch: "orb" },
        pad:    { touch: "pad" },
        portal: { touch: "portal" },
        coin:   { touch: "coin" }
    };

    var DEFS = [];
    var BY_ID = {};

    for (var t = 0; t < OBJECT_TABLE.length; t++) {
        var row = OBJECT_TABLE[t];
        var def = {
            slot: t,
            id: row[0],
            kind: row[1],
            frame: row[2],
            value: row[3] || null,
            solid: !!KINDS[row[1]].solid,
            hazard: !!KINDS[row[1]].hazard,
            touch: KINDS[row[1]].touch || null
        };
        DEFS.push(def);
        BY_ID[def.id] = def;
    }

    Levels.DEFS = DEFS;
    Levels.OBJECTS = BY_ID;

    /* Structural tiles whose id this build cannot name (the 2.x block library,
     * slopes, platform pieces) are still part of the level's shape: they become
     * generic 1x1 solid tiles drawn with the classic block art. See parse(). */
    var GENERIC_BLOCK = {
        slot: DEFS.length, id: 0, kind: "block", frame: "blockOutline_01_001.png",
        value: null, solid: true, hazard: false, touch: null, generic: true
    };
    DEFS.push(GENERIC_BLOCK);
    Levels.GENERIC = GENERIC_BLOCK;

    /* 30 units per cell; a tile's centre is at 15 + 30n. */
    var GRID = 30;

    function onGrid(value) {
        var rest = ((value % GRID) + GRID) % GRID;
        return Math.abs(rest - GRID / 2) <= 1.5;
    }

    function makeObject(def, record, x, y) {
        return {
            def: def,
            x: x,
            y: y,
            rot: parseFloat(record[6]) || 0,
            flipX: record[4] === "1",
            flipY: record[5] === "1",
            coin: parseInt(record[12], 10) || 0
        };
    }


    /* -------------------------------------------------------------- parsing */
    /* "1,8,2,525,3,15" -> {"1": "8", "2": "525", "3": "15"} */
    function pairs(record) {
        var parts = record.split(",");
        var out = {};
        for (var i = 0; i + 1 < parts.length; i += 2) out[parts[i]] = parts[i + 1];
        return out;
    }

    Levels.pairs = pairs;

    /* Level string -> its settings (everything before the first ";") and its
     * object records (everything after). GD's own files are padded with NULs and
     * whitespace, which would otherwise end up inside the last record. */
    Levels.split = function (text) {
        var s = (text || "").replace(/\u0000/g, "").replace(/^\s+|\s+$/g, "");
        var cut = s.indexOf(";");
        return {
            settings: pairs(cut < 0 ? s : s.slice(0, cut)),
            records: cut < 0 ? [] : s.slice(cut + 1).split(";")
        };
    };

    /* The level's colour channel 1 — what GD tints blocks and spikes with. Old
     * levels keep it in `kS29`, 2.x levels in the first channel of `kS38`; both
     * store it as `1_<r>_2_<g>_3_<b>_4_<player colour>_5_<blending>`. */
    Levels.colour = function (settings) {
        var raw = settings.kS29 || settings.kS38 || "";
        var parts = raw.split("|")[0].split("_");
        var slot = [];
        for (var i = 0; i + 1 < parts.length; i += 2) slot[parseInt(parts[i], 10)] = parts[i + 1];
        var r = parseInt(slot[1], 10), g = parseInt(slot[2], 10), b = parseInt(slot[3], 10);
        if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return [255, 255, 255];
        return [r, g, b];
    };

    /* One object record -> a runtime object, or null when the id is decoration
     * or a 2.x tile that only `parse()` can classify (it needs the whole level to
     * see which tiles touch each other). */
    Levels.object = function (record) {
        var def = BY_ID[parseInt(record[1], 10)];
        if (!def) return null;
        var x = parseFloat(record[2]), y = parseFloat(record[3]);
        if (!isFinite(x) || !isFinite(y)) return null;
        return makeObject(def, record, x, y);
    };

    /* Which unnamed ids are structure rather than decoration.
     *
     * GD's decoration is placed *off* the grid — a 1.0 level puts its ground
     * stripe at y=4, its block detail layers at y=44, 71, 19, 6 — while blocks,
     * slopes and platform pieces sit exactly on the 30 unit grid and are boxed in
     * by their neighbours. So an id qualifies when its tiles sit on the grid and
     * most of them have at least two grid neighbours (a run of tiles), which also
     * filters out the odd grid-aligned decoration pair. `cells` is filled from
     * every object (including the ids we do know), because a wall usually mixes
     * two or three block designs.
     */
    function structuralIds(list) {
        var cells = {};
        var stats = {};
        var i, tile;

        for (i = 0; i < list.length; i++) {
            tile = list[i];
            if (!onGrid(tile.x) || !onGrid(tile.y)) continue;
            cells[Math.round(tile.x / GRID) + ":" + Math.round(tile.y / GRID)] = true;
        }

        for (i = 0; i < list.length; i++) {
            tile = list[i];
            if (tile.def || !onGrid(tile.x) || !onGrid(tile.y)) continue;
            if (!stats[tile.id]) stats[tile.id] = { count: 0, linked: 0 };
            var stat = stats[tile.id];
            stat.count++;
            var cx = Math.round(tile.x / GRID), cy = Math.round(tile.y / GRID);
            var around = 0;
            if (cells[(cx + 1) + ":" + cy]) around++;
            if (cells[(cx - 1) + ":" + cy]) around++;
            if (cells[cx + ":" + (cy + 1)]) around++;
            if (cells[cx + ":" + (cy - 1)]) around++;
            if (around >= 2) stat.linked++;
        }

        var out = {};
        for (var id in stats) {
            if (!Object.prototype.hasOwnProperty.call(stats, id)) continue;
            var s = stats[id];
            if (s.count >= 6 && s.linked / s.count >= 0.5) out[id] = true;
        }
        return out;
    }

    /* Level string (+ optional metadata) -> the level the play layer runs.
     * Objects are sorted left to right, which is what lets the play layer find
     * the ones on screen with a moving index instead of a full scan. */
    Levels.parse = function (data, meta) {
        meta = meta || {};
        var split = Levels.split(data);
        var tiles = [];             // every record, with its id and position
        var objects = [];
        var coins = 0;
        var length = 0;
        var i, record, id, x, y;

        for (i = 0; i < split.records.length; i++) {
            record = pairs(split.records[i]);
            id = parseInt(record[1], 10);
            x = parseFloat(record[2]);
            y = parseFloat(record[3]);
            if (!isFinite(id) || !isFinite(x) || !isFinite(y)) continue;
            tiles.push({ id: id, x: x, y: y, record: record, def: BY_ID[id] || null });
        }

        var structural = structuralIds(tiles);

        for (i = 0; i < tiles.length; i++) {
            var tile = tiles[i];
            var def = tile.def;
            if (!def && structural[tile.id] && onGrid(tile.x) && onGrid(tile.y))
                def = GENERIC_BLOCK;
            if (!def) continue;

            objects.push(makeObject(def, tile.record, tile.x, tile.y));
            if (tile.x > length) length = tile.x;
        }

        objects.sort(function (a, b) { return (a.x - b.x) || (a.y - b.y); });

        for (var c = 0; c < objects.length; c++) {
            if (objects[c].def.kind !== "coin") continue;
            if (!objects[c].coin) objects[c].coin = coins + 1;
            if (objects[c].coin > coins) coins = objects[c].coin;
        }

        return {
            id: meta.id || 0,
            name: meta.name || "Imported Level",
            author: meta.author || "",
            stars: meta.stars || 0,
            diff: meta.diff === undefined ? 0 : meta.diff,
            song: meta.song || null,
            colour: Levels.colour(split.settings),
            length: length + Levels.UNIT * 2,     // a little runway past the end
            coins: coins,
            objects: objects
        };
    };

    /* Baked level JSON <-> runtime level. The baked form stores each object as
     * [slot, x, y, rot, flags(, coin)] so a full 20k object level stays small
     * enough to ship; `slot` is the object's index in Levels.DEFS. */
    Levels.pack = function (level) {
        var objects = [];
        for (var i = 0; i < level.objects.length; i++) {
            var o = level.objects[i];
            var packed = [o.def.slot, o.x, o.y, o.rot || 0,
                          (o.flipX ? 1 : 0) | (o.flipY ? 2 : 0)];
            if (o.coin) packed.push(o.coin);
            objects.push(packed);
        }
        return {
            id: level.id,
            name: level.name,
            author: level.author,
            stars: level.stars,
            diff: level.diff,
            song: level.song,
            colour: level.colour,
            length: level.length,
            coins: level.coins,
            objects: objects
        };
    };

    Levels.unpack = function (data) {
        var objects = [];
        for (var i = 0; i < data.objects.length; i++) {
            var packed = data.objects[i];
            objects.push({
                def: DEFS[packed[0]],
                x: packed[1],
                y: packed[2],
                rot: packed[3] || 0,
                flipX: (packed[4] & 1) === 1,
                flipY: (packed[4] & 2) === 2,
                coin: packed[5] || 0
            });
        }
        return {
            id: data.id,
            name: data.name,
            author: data.author || "",
            stars: data.stars || 0,
            diff: data.diff || 0,
            song: data.song || null,
            colour: data.colour || [255, 255, 255],
            length: data.length,
            coins: data.coins || 0,
            objects: objects
        };
    };

    /* ---------------------------------------------------------------- plists */
    /* Minimal XML plist reader: dict, array, string, integer, real, true, false
     * and data — that covers every level file GD writes, because the .gmd
     * exports and the CCLocalLevels / CCGameManager saves are all <dict> trees
     * of strings. */
    Levels.plist = function (xml) {
        var i = 0;

        function skip() {
            for (;;) {
                var ws = /^\s+/.exec(xml.slice(i, i + 400));
                if (ws) { i += ws[0].length; continue; }
                var head = xml.substr(i, 9);
                if (head === "<!--") {
                    var c = xml.indexOf("-->", i);
                    i = c < 0 ? xml.length : c + 3;
                } else if (head.substr(0, 2) === "<?") {
                    var p = xml.indexOf("?>", i);
                    i = p < 0 ? xml.length : p + 2;
                } else if (head === "<!DOCTYPE") {
                    var d = xml.indexOf(">", i);
                    i = d < 0 ? xml.length : d + 1;
                } else return;
            }
        }

        function tag() {
            if (xml.charAt(i) !== "<") return null;
            var end = xml.indexOf(">", i);
            if (end < 0) return null;
            var body = xml.slice(i + 1, end);
            i = end + 1;
            var closing = body.charAt(0) === "/";
            if (closing) body = body.slice(1);
            var self = /\/$/.test(body);
            if (self) body = body.slice(0, -1);
            return { name: body.split(/\s/)[0], closing: closing, self: self };
        }

        function raw(close) {
            var end = xml.indexOf(close, i);
            if (end < 0) end = xml.length;
            var text = xml.slice(i, end);
            i = end + close.length;
            return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
                       .replace(/&quot;/g, "\"").replace(/&apos;/g, "'")
                       .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); })
                       .replace(/&amp;/g, "&");
        }

        function value() {
            skip();
            var open = tag();
            if (!open || open.closing) return null;
            if (open.self) return /^(true|false)$/.test(open.name) ? open.name === "true" : null;

            switch (open.name) {
                case "plist": return value();
                case "dict": {
                    var dict = {};
                    for (;;) {
                        skip();
                        if (xml.substr(i, 7) === "</dict>") { i += 7; return dict; }
                        var key = tag();
                        if (!key || key.closing) return dict;
                        dict[raw("</key>")] = value();
                    }
                }
                case "array": {
                    var array = [];
                    for (;;) {
                        skip();
                        if (xml.substr(i, 8) === "</array>") { i += 8; return array; }
                        var start = i;
                        array.push(value());
                        if (i === start) return array;      // malformed: stop cleanly
                    }
                }
                case "string": return raw("</string>");
                case "integer": return parseInt(raw("</integer>"), 10);
                case "real": return parseFloat(raw("</real>"));
                case "date": return raw("</date>");
                case "data": return raw("</data>");
                default: return null;
            }
        }

        return value();
    };

    /* Every level inside a parsed plist. `k4` is the object string, `k2` the
     * name, `k5` the author — the same keys GD uses in a .gmd export and in
     * CCLocalLevels.dat, so one walker reads both. */
    Levels.fromPlist = function (data) {
        var levels = [];
        (function walk(node) {
            if (!node || typeof node !== "object") return;
            if (typeof node.k4 === "string" && node.k4.indexOf(",") > 0) {
                levels.push({
                    name: node.k2 ? String(node.k2) : "Imported Level",
                    author: node.k5 ? String(node.k5) : "",
                    data: node.k4
                });
            }
            for (var key in node) {
                if (Object.prototype.hasOwnProperty.call(node, key)) walk(node[key]);
            }
        })(data);
        return levels;
    };

    /* Any level file as text -> [{name, author, data}]. Handles a plist (XML)
     * and a bare level string; the base64(gzip(...)) wrappers go through
     * readText() below, because inflating is asynchronous in the browser. */
    Levels.sources = function (text) {
        var s = (text || "").replace(/\u0000/g, "").replace(/^[\s\uFEFF]+/, "").replace(/\s+$/, "");
        if (!s) return [];
        if (s.charAt(0) === "<") return Levels.fromPlist(Levels.plist(s));
        return [{ name: "Imported Level", author: "", data: s }];
    };

    Levels.base64Bytes = function (text) {
        var bin = atob(text.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"));
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    };

    /* gzip -> text. The browser ships exactly one decompressor and it is a
     * stream, so the result comes back through `callback` (an empty list when
     * the browser has no DecompressionStream at all). */
    Levels.inflate = function (bytes, callback) {
        if (typeof DecompressionStream === "undefined" || typeof Response === "undefined") {
            callback([]);
            return;
        }
        try {
            var stream = new DecompressionStream("gzip");
            var writer = stream.writable.getWriter();
            writer.write(bytes);
            writer.close();
            new Response(stream.readable).text().then(function (text) {
                callback(Levels.sources(text));
            }, function (error) {
                Levels.log("inflate: " + error);
                callback([]);
            });
        } catch (error) {
            Levels.log("inflate: " + error);
            callback([]);
        }
    };

    /* Text we already have (a fetched file, a dropped file) -> levels. */
    Levels.readText = function (text, callback) {
        var s = (text || "").replace(/\u0000/g, "").replace(/^[\s\uFEFF]+/, "").replace(/\s+$/, "");
        if (s.length > 64 && /^[A-Za-z0-9+/=_-]+$/.test(s))
            Levels.inflate(Levels.base64Bytes(s), callback);
        else
            callback(Levels.sources(s));
    };

    /* A file the player picked: whatever wrapper it is in, one callback with the
     * levels it holds. */
    Levels.readFile = function (file, callback) {
        if (typeof FileReader === "undefined") { callback([]); return; }
        var reader = new FileReader();
        reader.onload = function () {
            var bytes = new Uint8Array(reader.result);
            if (bytes[0] === 0x1f && bytes[1] === 0x8b) {        // gzip magic
                Levels.inflate(bytes, callback);
                return;
            }
            var text = "";
            for (var i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
            try { text = decodeURIComponent(escape(text)); } catch (e) { /* keep bytes */ }
            Levels.readText(text, callback);
        };
        reader.onerror = function () { callback([]); };
        reader.readAsArrayBuffer(file);
    };

    /* ------------------------------------------------------------- logging */
    Levels.log = function (message) {
        if (root.cc && root.cc.log) root.cc.log("GD.Levels: " + message);
    };

    /* -------------------------------------------------- runtime: the baked set */
    /* tools/level-import.js writes levels/manifest.json (one entry per level)
     * plus one levels/<n>.json per level. Both are read synchronously, the same
     * way GD.looseSize() reads a PNG header, because the level select needs its
     * list on its very first frame. */
    Levels.fetch = function (path) {
        if (typeof XMLHttpRequest === "undefined") return null;
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", path, false);
            xhr.send(null);
            if (xhr.status && (xhr.status < 200 || xhr.status >= 300)) return null;
            return xhr.responseText || null;
        } catch (e) {
            Levels.log("fetch " + path + ": " + e);
            return null;
        }
    };

    Levels.catalog = function () {
        if (Levels._catalog !== undefined) return Levels._catalog;
        Levels._catalog = null;
        var text = Levels.fetch(Levels.DIR + "manifest.json");
        if (text) {
            try { Levels._catalog = JSON.parse(text).levels || []; }
            catch (e) { Levels.log("manifest: " + e); }
        }
        return Levels._catalog;
    };

    /* One baked level, cached — a late level is a few hundred KB of JSON and the
     * play layer asks for it once per run-in. */
    Levels.load = function (id) {
        if (!Levels._levels) Levels._levels = {};
        var key = "" + id;
        if (Levels._levels[key] !== undefined) return Levels._levels[key];

        var text = null;
        var list = Levels.catalog() || [];
        for (var i = 0; i < list.length; i++) {
            if (("" + list[i].id) === key) { text = Levels.fetch(Levels.DIR + list[i].file); break; }
        }

        var level = null;
        if (text) {
            try { level = Levels.unpack(JSON.parse(text)); }
            catch (e) { Levels.log("level " + key + ": " + e); }
        }
        Levels._levels[key] = level;
        return level;
    };

    /* Levels the player imported at runtime (a .gmd, a .dat, a level string)
     * live in one localStorage entry next to the save file, in the same packed
     * shape as the baked ones. */
    var IMPORT_KEY = "geometryweb.levels.v1";
    var imported = null;

    function storage() {
        try { return root.localStorage || null; } catch (e) { return null; }
    }

    Levels.imported = function () {
        if (imported) return imported;
        imported = [];
        var store = storage();
        if (!store) return imported;
        try {
            var saved = JSON.parse(store.getItem(IMPORT_KEY) || "[]");
            if (saved instanceof Array) imported = saved;
        } catch (e) { Levels.log("imported: " + e); }
        return imported;
    };

    /* Stores `level` (newest first) and returns its level-select entry. A save
     * that does not fit in localStorage still returns a usable entry — the level
     * just has to be imported again after a reload. */
    Levels.remember = function (level) {
        var list = Levels.imported();
        var packed = Levels.pack(level);
        packed.name = level.name || "Imported Level";

        for (var i = 0; i < list.length; i++) {
            if (list[i].name !== packed.name) continue;
            list[i] = packed;                       // re-import replaces the old copy
            break;
        }
        if (i === list.length) list.unshift(packed);
        if (list.length > 8) list.length = 8;

        var store = storage();
        if (store) {
            try { store.setItem(IMPORT_KEY, JSON.stringify(list)); }
            catch (e) { Levels.log("remember: " + e); }
        }
        return { id: "local:0", local: 0, name: packed.name, stars: packed.stars,
                 diff: packed.diff, song: packed.song, author: packed.author };
    };

    /* Everything the level select lists: the baked main levels, then whatever the
     * player imported. */
    Levels.list = function () {
        var out = (Levels.catalog() || []).slice();
        var mine = Levels.imported();
        for (var i = 0; i < mine.length; i++) {
            out.push({ id: "local:" + i, local: i, name: mine[i].name,
                       stars: mine[i].stars || 0, diff: mine[i].diff || 0,
                       song: mine[i].song || null, author: mine[i].author || "" });
        }
        return out;
    };

    /* The runtime level behind a level-select entry. */
    Levels.entry = function (entry) {
        if (!entry) return null;
        if (entry.local !== undefined) {
            var packed = Levels.imported()[entry.local];
            return packed ? Levels.unpack(packed) : null;
        }
        return Levels.load(entry.id);
    };

    return Levels;
});




