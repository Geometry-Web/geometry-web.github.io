/* =====================================================================
 * Online.js — the level-browser service, backed by a local simulation.
 *
 * This project is hosted on GitHub Pages, which is a static file host: there is
 * no server to log in to, upload to, comment on or rate against. Every "online"
 * screen therefore talks to this module, and this module generates its data
 * locally, deterministically, from a seed. Three consequences, all deliberate:
 *
 *   1. `GD.Online.simulated` is true and every screen that shows this data says
 *      so, so nobody mistakes it for the real Geometry Dash servers.
 *   2. Creator handles are prefixed `sim_`, exactly so a screenshot can never be
 *      read as a real player's level.
 *   3. The levels are genuinely playable: `playable(level)` builds a real level
 *      out of the same object table the play layer runs, from hand-written
 *      chunk templates that are checked against the cube's jump distance.
 *
 * To go live, only this file needs replacing: each method below maps 1:1 to an
 * endpoint (search, level info, comments, like, download, leaderboard).
 * ===================================================================== */
GD.Online = (function () {
    var API = {
        simulated: true,
        notice: "Local simulation - no connection to Geometry Dash servers."
    };

    /* --------------------------------------------------------------- rng */
    /* mulberry32: tiny, fast and stable, so level #4711 looks identical on
     * every machine and every reload. */
    function rng(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function pick(random, list) {
        return list[Math.floor(random() * list.length) % list.length];
    }

    var FIRST = ["Neon", "Crystal", "Shadow", "Frost", "Turbo", "Hyper", "Cosmic", "Ember",
                 "Storm", "Pixel", "Midnight", "Solar", "Astro", "Frozen", "Chrome", "Static"];
    var SECOND = ["Rush", "Dash", "Pulse", "Drive", "Sprint", "Run", "Wave", "Flight", "Blitz",
                  "Orbit", "Circuit", "Vortex", "Echo", "Spark", "Fracture", "Cascade"];
    var HANDLES = ["sim_aurora", "sim_vertex", "sim_kilo", "sim_nova", "sim_terra",
                   "sim_pixel", "sim_quartz", "sim_riven", "sim_sable", "sim_onyx"];
    var DIFFS = [1, 2, 3, 4, 5, 6, 7, 8];

    /* The categories the browser shows, in GD's order. `icon` is the real sheet
     * frame each tab uses. */
    API.categories = [
        { id: "recent",    name: "Recent",    icon: "GJ_sRecentIcon_001.png" },
        { id: "downloads", name: "Downloads", icon: "GJ_sDownloadIcon_001.png" },
        { id: "likes",     name: "Likes",     icon: "GJ_sLikeIcon_001.png" },
        { id: "trending",  name: "Trending",  icon: "GJ_sTrendingIcon_001.png" },
        { id: "magic",     name: "Magic",     icon: "GJ_sMagicIcon_001.png" },
        { id: "featured",  name: "Featured",  icon: "GJ_sStarsIcon_001.png" },
        { id: "daily",     name: "Daily",     icon: "GJ_dailyRewardBtn_001.png" },
        { id: "weekly",    name: "Weekly",    icon: "GJ_demonIcon_001.png" },
        { id: "top",       name: "Top",       icon: "GJ_sFriendsIcon_001.png" }
    ];


    /* --------------------------------------------------------------- levels */
    /* One level record. Everything is derived from the id, so a level is the
     * same object no matter which category it was reached through. */
    function build(id) {
        var random = rng(id * 2654435761);
        var name = pick(random, FIRST) + " " + pick(random, SECOND);
        var difficulty = DIFFS[Math.floor(random() * DIFFS.length)];
        var stars = difficulty <= 2 ? 1 + Math.floor(random() * 3)
                  : difficulty <= 4 ? 4 + Math.floor(random() * 4)
                  : 8 + Math.floor(random() * 4);
        var lengthUnits = 4200 + Math.floor(random() * 14) * 600;
        return {
            id: id,
            name: name,
            author: pick(random, HANDLES),
            authorID: 900000 + Math.floor(random() * 99999),
            diff: difficulty,
            difficulty: GD.Data.difficultyName(difficulty),
            stars: stars,
            moons: 0,
            coins: 3,
            downloads: 120 + Math.floor(random() * 980000),
            likes: 40 + Math.floor(random() * 140000),
            lengthUnits: lengthUnits,
            length: GD.Data.lengthCategory(lengthUnits),
            song: "StereoMadness",
            songName: pick(random, ["Stereo Madness", "Back On Track", "Jumper",
                                    "Time Machine", "xStep", "Cycles"]) + " (sim)",
            songAuthor: pick(random, HANDLES),
            description: "Simulated level generated from seed #" + id + ". "
                       + GD.Data.difficultyName(difficulty) + ", "
                       + GD.Data.lengthCategory(lengthUnits) + " length.",
            featured: random() < 0.22,
            epic: random() < 0.10,
            twoPlayer: random() < 0.08,
            platformer: false,
            date: "2026-0" + (1 + Math.floor(random() * 9)) + "-1" + Math.floor(random() * 9),
            simulated: true
        };
    }

    var cache = {};
    function level(id) {
        if (!cache[id]) cache[id] = build(id);
        return cache[id];
    }
    API.level = level;

    /* The seeded stream of ids a category lists. "recent" is newest first,
     * "downloads"/"likes"/"trending" re-sort the same pool, "featured"/"magic"
     * filter it, so every tab always has something to show. */
    function idsFor(category, count) {
        var random = rng(("" + category).length * 7919 + 13);
        var out = [];
        var base = category === "daily" ? 50000 : category === "weekly" ? 60000 : 1000;
        for (var i = 0; i < count; i++) out.push(base + Math.floor(random() * 9000));
        return out;
    }

    function pool(category) {
        var list = idsFor(category, 60).map(level);
        if (category === "downloads") {
            list.sort(function (a, b) { return b.downloads - a.downloads; });
        } else if (category === "likes") {
            list.sort(function (a, b) { return b.likes - a.likes; });
        } else if (category === "trending") {
            list.sort(function (a, b) { return (b.likes / b.downloads) - (a.likes / a.downloads); });
        } else if (category === "featured") {
            list = list.filter(function (l) { return l.featured || l.epic; });
        } else if (category === "magic") {
            list = list.filter(function (l) { return l.diff >= 6 || l.stars >= 9; });
        } else if (category === "top") {
            list.sort(function (a, b) { return b.stars - a.stars; });
        }
        return list;
    }

    /* Search + filters. `filters` mirrors GD's search popup:
     *   { text, difficulty, length, stars, completed, twoPlayer } */
    API.query = function (opts) {
        opts = opts || {};
        var list = pool(opts.category || "recent");
        var f = opts.filters || {};

        if (f.text) {
            var needle = ("" + f.text).toLowerCase();
            list = list.filter(function (l) {
                return l.name.toLowerCase().indexOf(needle) >= 0 ||
                       l.author.toLowerCase().indexOf(needle) >= 0 ||
                       ("" + l.id).indexOf(needle) >= 0;
            });
        }
        if (f.difficulty) {
            list = list.filter(function (l) {
                return f.difficulty >= 6 ? l.diff >= 6 : l.diff === f.difficulty;
            });
        }
        if (f.length) list = list.filter(function (l) { return l.length === f.length; });
        if (f.stars) list = list.filter(function (l) { return l.stars >= f.stars; });
        if (f.twoPlayer) list = list.filter(function (l) { return l.twoPlayer; });
        if (f.completed) {
            list = list.filter(function (l) {
                var rec = GD.Save.level("online:" + l.id);
                return f.completed === "done" ? !!rec.completed : !rec.completed;
            });
        }
        return list;
    };

    /* Comments: canned replies picked by seed, marked simulated. */
    API.comments = function (id) {
        var random = rng(id * 31 + 7);
        var texts = [
            "first attempt and I already love this",
            "the orb chain at 40% is evil",
            "how do you pass the second ship part",
            "clean decoration, love the colours",
            "this needs a nerf at the end",
            "finally beat it, two hours well spent",
            "the music fits perfectly",
            "bottom route is way easier"
        ];
        var out = [];
        var count = 2 + Math.floor(random() * 4);
        for (var i = 0; i < count; i++) {
            out.push({
                author: pick(random, HANDLES),
                text: pick(random, texts),
                likes: Math.floor(random() * 400),
                hoursAgo: 1 + Math.floor(random() * 200)
            });
        }
        return out;
    };

    /* ------------------------------------------------------- social state */
    /* Liked / downloaded / saved levels live in the save file, next to the
     * rest of the player's data, so they survive a reload. */
    API.state = function (id) {
        var online = GD.Save.data().online || {};
        return {
            liked: (online.liked || []).indexOf(id) >= 0,
            saved: (online.saved || []).indexOf(id) >= 0
        };
    };

    API.toggleLike = function (id) {
        var online = GD.Save.data().online;
        if (!online.liked) online.liked = [];
        var at = online.liked.indexOf(id);
        if (at >= 0) online.liked.splice(at, 1);
        else { online.liked.push(id); GD.Save.stats.add("likedLevels", 1); }
        GD.Save.set("online.liked", online.liked);
        return API.state(id);
    };

    API.toggleSave = function (id) {
        var online = GD.Save.data().online;
        if (!online.saved) online.saved = [];
        var at = online.saved.indexOf(id);
        if (at >= 0) online.saved.splice(at, 1); else online.saved.push(id);
        GD.Save.set("online.saved", online.saved);
        return API.state(id);
    };

    API.savedLevels = function () {
        var ids = GD.Save.data().online.saved || [];
        return ids.map(level);
    };

    /* ---------------------------------------------------------- leaderboard */
    API.leaderboard = function (kind) {
        var random = rng(kind === "creators" ? 424242 : 987654);
        var rows = [];
        for (var i = 0; i < 25; i++) {
            rows.push({
                rank: i + 1,
                name: i === 4 ? GD.Save.profile.name() : pick(random, HANDLES),
                you: i === 4,
                stars: Math.floor(30000 / (i + 1) + random() * 400),
                creatorPoints: kind === "creators" ? Math.floor(900 / (i + 1)) : 0
            });
        }
        return rows;
    };

    /* ------------------------------------------------------- daily content */
    API.daily = function () {
        var day = Math.floor(Date.now() / 86400000);
        var l = level(50000 + (day % 9000));
        l.name = l.name + " (Daily)";
        return l;
    };

    API.weekly = function () {
        var week = Math.floor(Date.now() / (86400000 * 7));
        var l = level(60000 + (week % 9000));
        l.name = l.name + " (Weekly Demon)";
        return l;
    };

    /* ------------------------------------------------------- playable form */
    /* A simulated level runs exactly like any other: `GD.Generate` turns the
     * record into the packed form the play layer reads. The result is cached so
     * re-opening a level does not rebuild its geometry. */
    var playableCache = {};
    API.playable = function (record) {
        if (!playableCache[record.id]) playableCache[record.id] = GD.Generate.level(record);
        return playableCache[record.id];
    };

    /* Entry for `new PlayScene(entry)`. `key` is the save-file key, so a
     * simulated level keeps its own best % instead of overwriting an official
     * one with the same numeric id. */
    API.entry = function (record) {
        return {
            key: "online:" + record.id,
            online: record.id,
            level: API.playable(record),
            name: record.name,
            stars: record.stars,
            diff: record.diff
        };
    };

    return API;
})();
