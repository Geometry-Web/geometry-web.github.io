/* =====================================================================
 * Save.js — the single save file for profile, counters and settings.
 *
 * GD keeps everything in one DS_Dictionary (CCUserDefault.plist). Here the same
 * shape lives in one localStorage entry, so a screen can read counters without
 * knowing which system wrote them. The legacy per-feature keys that earlier
 * builds wrote (geometryweb.stats / geometryweb.profile) are imported once and
 * then ignored, so existing players keep their numbers.
 *
 * Everything is defensive: private mode, file:// and quota errors must never
 * throw out of a UI handler.
 * ===================================================================== */
GD.Save = (function () {
    var KEY = "geometryweb.save.v2";
    var LEGACY_STATS = "geometryweb.stats";
    var LEGACY_PROFILE = "geometryweb.profile";

    var DEFAULTS = {
        version: 2,
        profile: {
            name: "Player",
            // One selected icon per game mode (GD stores them per mode).
            cube: 1, ship: 1, ball: 1, ufo: 1, wave: 1,
            robot: 1, spider: 1, swing: 1, jetpack: 1,
            color1: [0, 255, 255],
            color2: [255, 255, 0],
            glow: false,
            registered: false,
            accountID: 0,
            userID: 0
        },
        // Counter keys match the legacy save so nothing is lost on upgrade.
        stats: {
            totalJumps: 0,
            totalAttempts: 0,
            collectedStars: 0,
            collectedMoons: 0,
            collectedDiamonds: 0,
            totalOrbs: 0,
            completedLevels: 0,
            completedDailyLevels: 0,
            completedDemonLevels: 0,
            completedInsaneLevels: 0,
            collectedSecretCoins: 0,
            collectedUserCoins: 0,
            ratedLevels: 0,
            collectedListRewards: 0,
            completedMapPacks: 0,
            completedGauntlets: 0,
            playersDestroyed: 0,
            likedLevels: 0,
            creatorPoints: 0,
            totalKeys: 0
        },
        settings: {
            musicVolume: 1.0,
            sfxVolume: 1.0,
            autoRetry: false,
            autoCheckpoints: false,
            progressBar: true,
            showPercent: true,
            disableShake: false,
            reducedEffects: false,
            smoothFix: true,
            platformerControls: true,
            language: "en"
        },
        levels: {},          // "official:1" -> {normal, practice, attempts, coins, completed}
        achievements: {},    // id -> {unlocked, progress}
        unlocked: {},        // shop / vault items
        daily: { chestDay: 0, lastDailyComplete: 0, questsClaimed: 0 },
        online: { saved: [], liked: [], folders: [] }
    };

    var data = null;
    var listeners = [];

    function storage() {
        try { return window.localStorage || null; } catch (e) { return null; }
    }

    function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

    // Deep merge that keeps unknown keys (forward compatibility).
    function merge(target, source) {
        if (!source || typeof source !== "object") return target;
        for (var k in source) {
            if (!source.hasOwnProperty(k)) continue;
            var v = source[k];
            if (v && typeof v === "object" && !(v instanceof Array) &&
                target[k] && typeof target[k] === "object" && !(target[k] instanceof Array)) {
                merge(target[k], v);
            } else {
                target[k] = v;
            }
        }
        return target;
    }

    function readJSON(store, key) {
        if (!store) return null;
        try {
            var raw = store.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function load() {
        if (data) return data;
        data = clone(DEFAULTS);
        var store = storage();

        var saved = readJSON(store, KEY);
        if (saved) {
            merge(data, saved);
        } else {
            // First run on this build: pull the legacy split saves across.
            var legacyStats = readJSON(store, LEGACY_STATS);
            if (legacyStats) {
                merge(data.stats, legacyStats);
                cc.log("GD.Save: imported legacy counters");
            }
            var legacyProfile = readJSON(store, LEGACY_PROFILE);
            if (legacyProfile && typeof legacyProfile.name === "string") {
                data.profile.name = cleanName(legacyProfile.name);
                cc.log("GD.Save: imported legacy profile name");
            }
            save(true);
        }
        return data;
    }

    function save(silent) {
        var store = storage();
        if (store) {
            try { store.setItem(KEY, JSON.stringify(data)); }
            catch (e) { cc.log("GD.Save: could not write the save (" + e + ")"); }
        }
        if (!silent) notify();
    }

    function notify() {
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](data); } catch (e) { cc.log("GD.Save listener: " + e); }
        }
    }

    function cleanName(name) {
        var text = (name === null || name === undefined) ? "" : ("" + name);
        text = text.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        if (text.length > 20) text = text.slice(0, 20).replace(/\s+$/, "");
        return text || "Player";
    }

    /* Walks a dotted path ("settings.musicVolume"). */
    function walk(path, create) {
        var parts = ("" + path).split(".");
        var node = load();
        for (var i = 0; i < parts.length - 1; i++) {
            if (node[parts[i]] === undefined || typeof node[parts[i]] !== "object") {
                if (!create) return null;
                node[parts[i]] = {};
            }
            node = node[parts[i]];
        }
        return { parent: node, key: parts[parts.length - 1] };
    }

    /* ------------------------------------------------------------- level data */
    function levelRecord(key) {
        var all = load().levels;
        if (!all[key]) {
            all[key] = { normal: 0, practice: 0, attempts: 0,
                         coins: [false, false, false], completed: false };
        }
        return all[key];
    }

    return {
        maxNameLength: 20,
        key: KEY,

        /* Storage may be unavailable (private mode); screens can warn. */
        available: function () { return !!storage(); },

        data: function () { return load(); },

        get: function (path, fallback) {
            var w = walk(path);
            if (!w) return fallback;
            var v = w.parent[w.key];
            return v === undefined ? fallback : v;
        },

        set: function (path, value) {
            var w = walk(path, true);
            if (!w) return value;
            w.parent[w.key] = value;
            save();
            return value;
        },

        /* Subscribe to any save change (counters repaint from here). */
        on: function (fn) { listeners.push(fn); return fn; },
        off: function (fn) {
            for (var i = listeners.length - 1; i >= 0; i--) if (listeners[i] === fn) listeners.splice(i, 1);
        },
        notify: notify,

        /* ----------------------------------------------------------- profile */
        profile: {
            get: function (key, fallback) {
                var p = load().profile;
                return p[key] === undefined ? fallback : p[key];
            },
            set: function (key, value) { load().profile[key] = value; save(); return value; },
            name: function () { return load().profile.name; },
            setName: function (name) {
                load().profile.name = cleanName(name);
                save();
                return load().profile.name;
            },
            cleanName: cleanName,
            color: function (which) {
                var p = load().profile;
                return clone(which === 2 ? p.color2 : p.color1);
            },
            setColor: function (which, rgb) {
                var p = load().profile;
                if (which === 2) p.color2 = rgb.slice(0, 3); else p.color1 = rgb.slice(0, 3);
                save();
                return rgb;
            },
            glow: function () { return !!load().profile.glow; },
            setGlow: function (on) { load().profile.glow = !!on; save(); return !!on; },
            icon: function (mode) { return load().profile[mode] || 1; },
            setIcon: function (mode, id) { load().profile[mode] = id; save(); return id; }
        },

        /* ------------------------------------------------------------ counters */
        stats: {
            get: function (key) { var v = load().stats[key]; return v === undefined ? 0 : v; },
            add: function (key, amount) {
                var all = load().stats;
                all[key] = Math.max(0, (all[key] || 0) + (amount === undefined ? 1 : amount));
                save();
                return all[key];
            },
            set: function (key, value) {
                load().stats[key] = Math.max(0, Math.floor(value) || 0);
                save();
                return load().stats[key];
            },
            all: function () { return load().stats; }
        },

        /* ------------------------------------------------------------ settings */
        settings: {
            get: function (key) {
                var s = load().settings;
                return s[key] === undefined ? DEFAULTS.settings[key] : s[key];
            },
            set: function (key, value) {
                load().settings[key] = value;
                save();
                return value;
            },
            toggle: function (key) {
                var next = !load().settings[key];
                load().settings[key] = next;
                save();
                return next;
            },
            all: function () { return load().settings; }
        },

        /* -------------------------------------------------------------- levels */
        level: function (key) { return levelRecord(key); },

        setLevel: function (key, patch) {
            var rec = levelRecord(key);
            for (var k in patch) if (patch.hasOwnProperty(k)) rec[k] = patch[k];
            save();
            return rec;
        },

        /* Records a run: best %, attempts, practice %, coins.
         * Returns {record, firstCompletion, newBest}. */
        completeLevel: function (key, percent, opts) {
            opts = opts || {};
            var rec = levelRecord(key);
            var firstCompletion = false;
            var newBest = percent > rec.normal;
            rec.attempts += opts.attempts === undefined ? 1 : opts.attempts;

            if (percent >= 100) {
                rec.normal = 100;
                if (!rec.completed) {
                    rec.completed = true;
                    firstCompletion = true;
                    load().stats.completedLevels += 1;
                    if (opts.stars) load().stats.collectedStars += opts.stars;
                    if (opts.moons) load().stats.collectedMoons += opts.moons;
                    if (opts.demon) load().stats.completedDemonLevels += 1;
                    if (opts.insane) load().stats.completedInsaneLevels += 1;
                }
            } else if (newBest) {
                rec.normal = percent;
            }
            if (opts.practice && percent > rec.practice) rec.practice = percent;
            if (opts.coins) {
                for (var i = 0; i < opts.coins.length && i < 3; i++) {
                    if (opts.coins[i] && !rec.coins[i]) {
                        rec.coins[i] = true;
                        load().stats.collectedSecretCoins += 1;
                    }
                }
            }
            save();
            return { record: rec, firstCompletion: firstCompletion, newBest: newBest };
        },

        /* -------------------------------------------------------- achievements */
        achievement: function (id) {
            var all = load().achievements;
            if (!all[id]) all[id] = { unlocked: false, progress: 0 };
            return all[id];
        },
        unlockAchievement: function (id) {
            var a = this.achievement(id);
            if (!a.unlocked) { a.unlocked = true; a.unlockedAt = Date.now(); save(); return true; }
            return false;
        },

        /* ------------------------------------------------------------- unlocks */
        isUnlocked: function (key) { return !!load().unlocked[key]; },
        unlock: function (key) { load().unlocked[key] = true; save(); return true; },

        /* --------------------------------------------------------------- reset */
        reset: function () {
            data = clone(DEFAULTS);
            save();
            return data;
        }
    };
})();


