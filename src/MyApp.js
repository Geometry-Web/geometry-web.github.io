/* Geometry Web — Geometry Dash 1.0 main menu, pixel-accurate recreation (960x540).
 *
 * Coordinate convention: cocos2d-html5 space (origin bottom-left, +Y up).
 * Canvas is 960x540. x/y are element CENTERS (sprite anchor 0.5,0.5).
 * width/height are the asset's native pixel size before `scale`.
 * Positions measured from the GD 1.0 reference screenshot (1728x970) and
 * remapped to 960x540 by a uniform 0.5556 factor.
 */
var MENU_LAYOUT = {
    canvas: { width: 960, height: 540 },
    colors: {
        backgroundBase: [150, 0, 112],   // darker magenta (grid gaps)
        backgroundTile: [201, 2, 152]    // main magenta tiles
    },
    elements: {
        // Top
        closeButton:  { frame: "GJ_closeBtn_001.png",  x: 30,  y: 512, width: 46,  height: 48,  scale: 0.85 },
        logo:         { x: 480, y: 452, scale: 2.6 },

        // Center row
        garageButton: { frame: "GJ_garageBtn_001.png", x: 295, y: 272, width: 68,  height: 68,  scale: 2.0 },
        playButton:   { frame: "GJ_playBtn_001.png",   x: 480, y: 230, width: 106, height: 106, scale: 1.5 },
        buildButton:  { frame: "GJ_createBtn_001.png", x: 665, y: 272, width: 101, height: 101, scale: 1.4 },
        dailyButton:  { frame: "GJ_dailyBtn_001.png",  x: 900, y: 278, width: 101, height: 101, scale: 0.8 },

        // Social (bottom-left)
        socialFb:     { frame: "gj_fbIcon_001.png",     x: 42,  y: 88, width: 32, height: 32, scale: 1.2 },
        socialTw:     { frame: "gj_twIcon_001.png",     x: 92,  y: 88, width: 32, height: 31, scale: 1.2 },
        socialYt:     { frame: "gj_ytIcon_001.png",     x: 142, y: 88, width: 32, height: 32, scale: 1.2 },
        socialTwitch: { frame: "gj_twitchIcon_001.png", x: 192, y: 88, width: 32, height: 30, scale: 1.2 },
        robtopLogo:   { frame: "robtoplogo_small.png",  x: 72,  y: 35, width: 100, height: 28, scale: 1.2 },
        socialDiscord:{ frame: "gj_discordIcon_001.png",x: 192, y: 35, width: 32, height: 31, scale: 1.2 },

        // Bottom round buttons
        achButton:    { frame: "GJ_achBtn_001.png",     x: 289, y: 85, width: 51, height: 52, scale: 1.2 },
        optionsButton:{ frame: "GJ_optionsBtn_001.png", x: 386, y: 85, width: 51, height: 52, scale: 1.2 },
        statsButton:  { frame: "GJ_statsBtn_001.png",   x: 481, y: 85, width: 51, height: 52, scale: 1.2 },
        creatorButton:{ frame: "GJ_ngBtn_001.png",      x: 578, y: 85, width: 51, height: 52, scale: 1.2 },
        secretButton: { frame: "GJ_creatorBtn_001.png", x: 672, y: 85, width: 68, height: 68, scale: 0.9 },

        // News (bottom-right)
        newsButton:   { frame: "GJ_newsBtn_001.png",    x: 878, y: 85, width: 79, height: 68, scale: 1.1 }
    }
};

/* Geometry Dash "Create" hub (CreatorLayer) — the 15-button category grid.
 *
 * Same coordinate convention as MENU_LAYOUT (960x540, centers, +Y up).
 * Positions measured from the GD 2.2 Create-hub reference screenshot and
 * remapped to 960x540 (5x3 grid, 147 x 144 pitch, ~107px tiles).
 */
var CREATE_LAYOUT = {
    canvas: { width: 960, height: 540 },
    colors: {
        backgroundTop: [26, 78, 214],    // darker blue at the top
        backgroundBottom: [12, 110, 243], // brighter blue at the bottom
        lockedTint: [170, 178, 170],     // multiplies the sprite -> greyed out
        lockedShade: [0, 0, 0, 60],      // dark veil over locked buttons
        alertFill: [226, 37, 37],
        alertOutline: [24, 16, 16]
    },
    grid: {
        scale: 1.06,        // 101x101 button sprite -> ~107px on screen
        columns: 5,
        centerX: 454,       // GD sits the grid slightly left of centre
        centerY: 294,       // middle row
        pitchX: 147,
        pitchY: 144,
        alertDX: -45,       // "new content" badge offset from the button center
        alertDY: 13
    },
    chrome: {
        backArrow: { frame: "GJ_arrow_03_001.png",           x: 42,  y: 498, scale: 1.35 },
        lockIcon:  { frame: "GJLargeLock_001.png",           x: 918, y: 504, scale: 0.62 },
        doorIcon:  { frame: "secretDoorBtn_closed_001.png",  x: 926, y: 32,  scale: 1.35 }
    },
    sideArt: { frame: "GJ_sideArt_001.png", scale: 1.7 },
    // Row-major, 5 per row. "scene" is the title of the screen it opens.
    buttons: [
        { frame: "GJ_createBtn_001.png",    scene: "CREATE LEVEL" },                    // tools
        { frame: "GJ_savedBtn_001.png",     scene: "SAVED LEVELS" },                    // folder
        { frame: "GJ_highscoreBtn_001.png", scene: "SCORES" },                          // podium
        { frame: "GJ_challengeBtn_001.png", scene: "QUESTS" },                          // scroll
        { frame: "GJ_versusBtn_001.png",    scene: "VERSUS", locked: true,
          lockFrame: "GJ_secretLock_001.png", lockScale: 0.85, lockDY: 20 },              // swords
        { frame: "GJ_mapBtn_001.png",       scene: "THE MAP", locked: true },           // map
        { frame: "GJ_dailyBtn_001.png",     scene: "DAILY LEVEL", alert: true },        // crown
        { frame: "GJ_weeklyBtn_001.png",    scene: "WEEKLY LEVEL", alert: true },       // demon mask
        { frame: "GJ_eventBtn_001.png",     scene: "EVENT LEVEL" },                     // demon head
        { frame: "GJ_gauntletsBtn_001.png", scene: "GAUNTLETS" },                       // lava pit
        { frame: "GJ_featuredBtn_001.png",  scene: "FEATURED" },                        // star
        { frame: "GJ_listsBtn_001.png",     scene: "LISTS" },                           // book
        { frame: "GJ_pathsBtn_001.png",     scene: "PATHS" },                           // hexagon
        { frame: "GJ_mapPacksBtn_001.png",  scene: "MAP PACKS" },                       // face cards
        { frame: "GJ_searchBtn_001.png",    scene: "SEARCH" }                           // magnifier
    ]
};

/* Geometry Dash "Icon Kit" (GarageLayer, opened by the paint-palette button).
 *
 * Positions measured from the GD 2.2 icon-kit reference screenshot
 * (1920x1080) halved to 960x540 and flipped into cocos2d space (+Y up).
 *
 * The seven numbers in the top-right corner are the player's STATS (stars,
 * moons, secret coins, user coins, mana orbs, diamonds, ...): they are plain
 * data in `profile.stats`, so editing a value only changes one number here.
 */
/* Frame names of the icon families the Icon Kit shows. `%n` is the 1-based icon
 * number, zero padded to two digits. Robot and spider keep every animation
 * frame in the same sheet, hence the extra `_01` before the suffix; swing,
 * jetpack and streak only ship one effect sprite each.
 *
 * The number of icons a family has lives in GARAGE_LAYOUT.tabs.items, so a tab
 * never asks for a frame the sheet does not contain.
 */
var ICON_FRAME_PATTERNS = {
    player:      "player_%n_001.png",
    ship:        "ship_%n_001.png",
    player_ball: "player_ball_%n_001.png",
    bird:        "bird_%n_001.png",
    dart:        "dart_%n_001.png",
    robot:       "robot_%n_01_001.png",
    spider:      "spider_%n_01_001.png",
    swing:       "swing_01_001.png",
    pack:        "pack_01_001.png",
    fireBoost:   "fireBoost_001.png"
};

// Frame name of the `number`-th icon (1-based) of a family, or null.
function iconFrameName(pool, number) {
    var pattern = ICON_FRAME_PATTERNS[pool];
    if (!pattern) return null;
    return pattern.replace("%n", number < 10 ? "0" + number : "" + number);
}

/* Icons a tab can show. The complete loose set under res/gd/icons wins (see
 * GD.iconCount); `count` below describes only what the truncated game sheet
 * packs, and is the fallback for builds without the loose set. */
function tabIconCount(tab) {
    if (!tab || !tab.pool) return 0;
    return GD.iconCount(tab.pool) || tab.count || 0;
}

var GARAGE_LAYOUT = {
    font: "res/gd/bigFont.fnt",
    colors: {
        backgroundBase: [122, 122, 122],   // darker grey (grid gaps)
        backgroundTile: [136, 136, 136],   // main grey tiles
        panel: [22, 22, 22, 90],           // dark plate behind the icon grid
        slot: [16, 16, 16, 110],           // one icon slot
        slotBorder: [255, 255, 255, 235],  // outline of an icon slot
        separator: [255, 255, 255, 90],    // thin rule above the tabs
        iconTint: [0, 255, 255]            // player colour 1 (cyan preview)
    },
    profile: {
        // The name is not part of the layout: it comes from PLAYER_PROFILE so
        // the value the player types into the preview sticks between sessions.
        // Top-right counter column, top to bottom. `key` is the PLAYER_STATS
        // counter the number is read from, so the Icon Kit always shows the
        // same values as the Stats table.
        stats: [
            { frame: "GJ_starsIcon_001.png",        key: "collectedStars" },      // stars
            { frame: "GJ_moonsIcon_001.png",        key: "collectedMoons" },      // moons
            { frame: "GJ_coinsIcon_001.png",        key: "collectedSecretCoins" },// secret coins
            { frame: "GJ_coinsIcon2_001.png",       key: "collectedUserCoins" },  // user coins
            { frame: "currencyOrbIcon_001.png",     key: "totalOrbs" },           // mana orbs
            { frame: "GJ_diamondsIcon_001.png",     key: "collectedDiamonds" },   // diamonds
            { frame: "currencyDiamondIcon_001.png", key: "collectedDiamonds" }    // diamonds (2.2)
        ]
    },
    statColumn: { iconX: 942, numberX: 928, topY: 519, pitch: 32.4, iconScale: 1.05, fontScale: 0.62 },
    chrome: {
        backArrow: { frame: "GJ_arrow_03_001.png",  x: 42,  y: 497, scale: 1.35 },
        shardsBtn: { frame: "GJ_shardsBtn_001.png", x: 48,  y: 410, scale: 1.45 },
        paintBtn:  { frame: "GJ_paintBtn_001.png",  x: 48,  y: 353, scale: 1.45 },
        shopSign:  { frame: "shopRope_001.png",     x: 245, y: 468, scale: 1.30 }
    },
    sideArt: { frame: "GJ_sideArt_001.png", scale: 1.7 },
    preview: {
        name:      { x: 480, y: 457, scale: 1.05 },
        // The name is also a button: pressing it renames the player in place.
        // `nameHit` is the (minimum) pressable box around the text, `padX` adds
        // room on each side of long names, `nameCursor` is the blinking caret
        // and `nameHint` the instructions shown while the field is open.
        nameHit:    { width: 170, height: 58, padX: 40 },
        nameCursor: { width: 4, height: 38, gap: 3 },
        nameHint:   { x: 480, y: 505, scale: 0.5, text: "Type a name, then Enter - Esc cancels" },
        cube:      { frame: "player_01_001.png", x: 480, y: 397, scale: 2.2 },
        separator: { x: 480, y: 356, width: 620, height: 2 }
    },
    // The eleven icon-type tabs under the preview. `pool` is the family (see
    // ICON_FRAME_PATTERNS) and `count` the number of frames the shipped sheet
    // has for it; the complete loose set in res/gd/icons (483 cubes, 169 ships,
    // ...) is what the kit actually pages through when it is present. `pool:
    // null` marks a tab the rip has no frames for.
    tabs: {
        y: 330, startX: 188, pitch: 57.8, scale: 1.15,
        items: [
            { off: "gj_iconBtn_off_001.png",    on: "gj_iconBtn_on_001.png",    pool: "player",      count: 248 },
            { off: "gj_shipBtn_off_001.png",    on: "gj_shipBtn_on_001.png",    pool: "ship",        count: 79 },
            { off: "gj_ballBtn_off_001.png",    on: "gj_ballBtn_on_001.png",    pool: "player_ball", count: 53 },
            { off: "gj_birdBtn_off_001.png",    on: "gj_birdBtn_on_001.png",    pool: "bird",        count: 51 },
            { off: "gj_dartBtn_off_001.png",    on: "gj_dartBtn_on_001.png",    pool: "dart",        count: 35 },
            { off: "gj_robotBtn_off_001.png",   on: "gj_robotBtn_on_001.png",   pool: "robot",       count: 26 },
            { off: "gj_spiderBtn_off_001.png",  on: "gj_spiderBtn_on_001.png",  pool: "spider",      count: 17 },
            { off: "gj_swingBtn_off_001.png",   on: "gj_swingBtn_on_001.png",   pool: "swing",       count: 1 },
            { off: "gj_jetpackBtn_off_001.png", on: "gj_jetpackBtn_on_001.png", pool: "pack",        count: 1 },
            { off: "gj_streakBtn_off_001.png",  on: "gj_streakBtn_on_001.png",  pool: "fireBoost",   count: 1 },
            { off: "gj_heartOff_001.png",       on: "gj_heartOn_001.png",       pool: null,          count: 0 }
        ]
    },
    hint: { x: 480, y: 262, scale: 0.58, text: "Tap an icon to use it!" },
    grid: {
        panel: { x: 475, y: 152, width: 615, height: 168 },
        firstX: 195, firstY: 210,     // centre of the top-left slot
        pitchX: 48, pitchY: 57,
        columns: 12, rows: 3,
        slot: 40,                     // dark square drawn behind every icon
        iconScale: 0.85,              // widest frame (40px) -> 34px in a 40px slot
        empty: { scale: 0.6, text: "No icons in this tab yet!" }
    },
    paging: {
        arrowLeft:  { frame: "GJ_arrow_01_001.png", x: 103, y: 168, scale: 1.4 },
        arrowRight: { frame: "GJ_arrow_01_001.png", x: 851, y: 168, scale: 1.4, flipped: true },
        // The dots are centred under the grid and rebuilt per tab, because each
        // icon family needs a different number of pages.
        dots: { y: 55, pitch: 38.6, scale: 0.85,
                on: "gj_navDotBtn_on_001.png", off: "gj_navDotBtn_off_001.png" }
    }
};

/* Geometry Dash "Stats" page (StatsLayer) — the green-framed brown table.
 *
 * Same coordinate convention as the other layouts (960x540, +Y up). The frame
 * was measured from the GD 2.2 stats screenshot: the table spans x 165..795,
 * a banner (it carries its own cyan end tabs) caps the top, two green rails
 * run down the sides and the drawer bar closes the bottom. The counters in
 * between are drawn in goldFont (Pusab) and scroll under a clipping stencil.
 *
 * The menu art stays visible behind the drop-down, exactly like GD draws its
 * StatsLayer over the running MenuLayer background.
 */
var STATS_LAYOUT = {
    font: "res/gd/bigFont.fnt",        // banner title
    valueFont: "res/gd/goldFont.fnt",  // counter labels + numbers
    background: {
        frame: "res/gd/game_bg_01_001.png",
        scale: 1.875,                  // 512x512 sheet -> 960px wide
        tint: [168, 108, 58]           // magenta menu art -> GD brown
    },
    colors: {
        veil: [28, 14, 6, 96],          // dark wash over the background art
        bodyTop: [176, 116, 66],        // brown table surface, lighter at the top
        bodyBottom: [140, 90, 46],
        bandDark: [0, 0, 0, 34],        // every second counter row is veiled
        bandRule: [255, 236, 200, 55],  // rule where a veiled row starts
        outline: [255, 255, 255],       // white chrome of the side rails
        inner: [30, 24, 20],            // dark line inside the white chrome
        railFaceTop: [166, 234, 78],    // green rail face, lighter at the top
        railShade: [92, 168, 22]
    },
    panel: {
        centerX: 480,
        bodyLeft: 165, bodyRight: 795,
        bodyTop: 454, bodyBottom: 72,
        railWidth: 30,
        // Both sprites keep their native 39/38px chrome height; only the
        // coloured middle is stretched sideways to span the table.
        banner:    { frame: "GJ_table_top_001.png",    height: 48, scaleX: 1.68, scaleY: 1.23 },
        // `gap` lifts the 8 transparent rows of the frame above the body edge.
        bottomBar: { frame: "GJ_table_bottom_001.png", scaleX: 1.70, scaleY: 1.05, gap: 8 }
    },
    title: { text: "Stats", y: 478, scale: 1.1 },
    rows: { pitch: 48, bottomPad: 16, labelX: 200, valueX: 760, fontScale: 0.6 },
    // The real stat labels of the game, in the order the panel lists them.
    // `key` is the counter inside PLAYER_STATS (the save file); `value` is only
    // the seed used the very first time the game runs.
    stats: [
        { key: "totalJumps",            label: "Total Jumps:",            value: 75023 },
        { key: "totalAttempts",         label: "Total Attempts:",         value: 2856 },
        { key: "collectedStars",        label: "Collected Stars:",        value: 283 },
        { key: "collectedMoons",        label: "Collected Moons:",        value: 25 },
        { key: "collectedDiamonds",     label: "Collected Diamonds:",     value: 371 },
        { key: "totalOrbs",             label: "Total Orbs Collected:",   value: 10211 },
        { key: "completedLevels",       label: "Completed Levels:",       value: 68 },
        { key: "completedDailyLevels",  label: "Completed Daily Levels:", value: 12 },
        { key: "completedDemonLevels",  label: "Completed Demon Levels:", value: 9 },
        { key: "completedInsaneLevels", label: "Completed Insane Levels:", value: 34 },
        { key: "collectedSecretCoins",  label: "Collected Secret Coins:", value: 3 },
        { key: "collectedUserCoins",    label: "Collected User Coins:",   value: 27 },
        { key: "ratedLevels",           label: "Rated Levels:",           value: 0 },
        { key: "collectedListRewards",  label: "Collected List Rewards:", value: 0 },
        { key: "completedMapPacks",     label: "Completed Map Packs:",    value: 5 },
        { key: "completedGauntlets",    label: "Completed Gauntlets:",    value: 2 },
        { key: "playersDestroyed",      label: "Players Destroyed:",      value: 137 },
        { key: "likedLevels",           label: "Liked/Disliked Levels:",  value: 41 }
    ],
    // Menu art that stays visible around the drop-down.
    menuChrome: ["socialFb", "socialTw", "socialYt", "robtopLogo", "socialDiscord",
                 "dailyButton", "newsButton"],
    chrome: { backArrow: { frame: "GJ_arrow_03_001.png", x: 42, y: 497, scale: 1.35 } }
};
/* -------------------------------------------------------------------------
 * PLAYER_STATS — the save file.
 *
 * Every counter the game shows lives in this one object: the Stats table reads
 * it, the Icon Kit column reads it and the play layer writes into it (jumps,
 * attempts, orbs, completed levels). It is mirrored into localStorage after
 * every change, so whatever you collect in one run is still there the next
 * time the page loads. The keys come from `STATS_LAYOUT.stats`, whose `value`
 * is only the seed of a brand-new save.
 * ---------------------------------------------------------------------- */
var PLAYER_STATS = (function () {
    var KEY = "geometryweb.stats";
    var values = null;              // null until the save is read

    function storage() {
        // Private mode / file:// can throw on access, so never trust it.
        try { return window.localStorage || null; } catch (e) { return null; }
    }

    function seed() {
        var all = {};
        var list = STATS_LAYOUT.stats;
        for (var i = 0; i < list.length; i++) all[list[i].key] = list[i].value;
        return all;
    }

    function load() {
        if (values) return values;
        values = seed();

        var store = storage();
        if (!store) return values;

        try {
            var saved = JSON.parse(store.getItem(KEY) || "null");
            for (var k in values) {
                if (!values.hasOwnProperty(k)) continue;
                if (typeof saved[k] === "number" && isFinite(saved[k]))
                    values[k] = Math.max(0, Math.floor(saved[k]));
            }
        } catch (e) {
            cc.log("PLAYER_STATS: unreadable save (" + e + "), starting over");
        }
        return values;
    }

    function save() {
        var store = storage();
        if (!store) return;
        try { store.setItem(KEY, JSON.stringify(load())); }
        catch (e) { cc.log("PLAYER_STATS: could not write the save (" + e + ")"); }
    }

    return {
        // Current value of one counter (0 for unknown keys).
        get: function (key) { return load()[key] || 0; },

        // Adds `amount` (default 1) and writes the save file.
        add: function (key, amount) {
            var all = load();
            all[key] = Math.max(0, (all[key] || 0) + (amount === undefined ? 1 : amount));
            save();
            return all[key];
        },

        // Overwrites one counter (handy from the browser console).
        set: function (key, value) {
            var all = load();
            all[key] = Math.max(0, Math.floor(value) || 0);
            save();
            return all[key];
        },

        // Wipes the save back to the shipped seed values.
        reset: function () {
            values = seed();
            save();
            return values;
        },

        // Plain snapshot of the whole save.
        all: function () { return load(); }
    };
})();

/* The player's own profile: right now just the name drawn above the Icon Kit
 * preview and edited by pressing it there.
 *
 * It lives in its own localStorage entry next to PLAYER_STATS so a rename
 * survives a reload, and `clean` is the single place that decides what a legal
 * name looks like (one line, collapsed spaces, never empty, 20 chars max — the
 * same limit Geometry Dash puts on an account name).
 */
var PLAYER_PROFILE = (function () {
    var KEY = "geometryweb.profile";
    var DEFAULT_NAME = "Player";
    var MAX_NAME = 20;
    var data = null;                // null until the save is read

    function storage() {
        // Private mode / file:// can throw on access, so never trust it.
        try { return window.localStorage || null; } catch (e) { return null; }
    }

    // Trimmed, collapsed, printable and capped; "" becomes the default name.
    function clean(name) {
        var text = (name === null || name === undefined) ? "" : ("" + name);
        text = text.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        if (text.length > MAX_NAME) text = text.slice(0, MAX_NAME).replace(/\s+$/, "");
        return text || DEFAULT_NAME;
    }

    function load() {
        if (data) return data;
        data = { name: DEFAULT_NAME };

        var store = storage();
        if (!store) return data;

        try {
            var saved = JSON.parse(store.getItem(KEY) || "null");
            if (saved && typeof saved.name === "string") data.name = clean(saved.name);
        } catch (e) {
            cc.log("PLAYER_PROFILE: unreadable save (" + e + "), starting over");
        }
        return data;
    }

    function save() {
        var store = storage();
        if (!store) return;
        try { store.setItem(KEY, JSON.stringify(load())); }
        catch (e) { cc.log("PLAYER_PROFILE: could not write the save (" + e + ")"); }
    }

    return {
        defaultName: DEFAULT_NAME,
        maxNameLength: MAX_NAME,

        // The stored name, or "Player" on a fresh install.
        getName: function () { return load().name; },

        // Stores `name` (cleaned) and returns what was actually kept.
        setName: function (name) {
            load().name = clean(name);
            save();
            return load().name;
        },

        // Cleans a name without storing it (used by the editor as you type).
        clean: clean,

        // Back to "Player", for the console or a future settings screen.
        resetName: function () {
            load().name = DEFAULT_NAME;
            save();
            return DEFAULT_NAME;
        }
    };
})();

/* Geometry Dash's play scene (PlayLayer): one imported level, run at GD's own
 * pace.
 *
 * The world is measured in *level units* — 30 per grid cell, x to the right from
 * the start of the level, y up from the ground — and drawn at `scale`, so one
 * cell is 60px on the 960x540 canvas. The player keeps a fixed screen x and the
 * level scrolls past.
 *
 *   block  — solid 1x1 tile: land on it, crash into its side
 *   spike  — hazard, kills on contact
 *   orb    — tap while touching it for a jump, mid-air
 *   pad    — fires the moment the player runs into it
 *   portal — switches game mode (cube/ship/ball/...) or flips gravity
 *   coin   — one of the level's three secret coins
 */
var PLAY_LAYOUT = {
    font: "res/gd/bigFont.fnt",
    scale: 2,                 // 30 unit art -> 60px, one grid cell
    unit: 30,                 // level units in one cell
    groundY: 90,              // screen y of the ground surface
    playerX: 220,             // screen x of the player
    playerSize: 30,           // units: the icon is 30 units square
    hitHalf: 15,              // half width of the solid hitbox
    hazardHalf: 11,           // tighter box for spikes, like GD's generous hitbox
    playHeight: 300,          // units: GD's play area is ten cells tall
    endPad: 180,              // units of runway past the last object
    viewCells: 7.5,           // cells above the ground that fit on screen
    groundDepth: 460,         // px of ground drawn below the ground line
    respawnDelay: 0.7,        // seconds between a crash and the next attempt
    /* Scroll speed in units per second, by speed portal (0.5x .. 4x) — GD's own
     * numbers. Without a speed portal a level runs at 1x. */
    speeds: [251.16, 311.58, 387.42, 468.0, 576.0],
    speedIndex: 1,
    spin: 540,                // deg/s the cube turns while airborne
    maxFall: 900,             // units/s cap on the fall
    colors: {
        skyTop: [30, 58, 164],
        skyBottom: [88, 134, 228],
        backdrop: [96, 136, 210],   // tints the tiled menu art blue
        groundTop: [150, 98, 58],
        groundBottom: [92, 58, 30],
        groundLine: [214, 172, 112],
        groundStripe: [0, 0, 0, 38],
        trackBack: [12, 10, 8, 170],
        trackFill: [86, 226, 66],
        orbTint: [255, 216, 74],
        cubeTint: [0, 255, 255],    // player colour 1, same as the Icon Kit
        veil: [0, 0, 0, 160]
    },
    hud: {
        backArrow: { frame: "GJ_arrow_03_001.png", x: 42, y: 497, scale: 1.35 },
        track: { x: 300, y: 512, width: 480, height: 14 },
        percent: { x: 812, y: 512, scale: 0.5 },
        // The three secret-coin slots, dimmed until the coin is collected.
        coins: { frame: "secretCoin_01_001.png", x: 858, y: 512, scale: 0.55, pitch: 30 },
        level: { x: 480, y: 466, scale: 0.62 },
        attempt: { x: 480, y: 372, scale: 0.8 },
        complete: { x: 480, y: 330, scale: 1.3 },
        info: { x: 480, y: 270, scale: 0.55 },
        hint: { x: 480, y: 222, scale: 0.5 }
    },
    /* GD's block art has its interior baked in, so a tinted `square_01` can only
     * colour the border. Blocks are therefore a colour fill plus the dark
     * outline on top, which is what the real game draws. */
    blockFill: "lightsquare_01_01_color_001.png",
    blockFillScale: 1,        // fill covers the whole cell
    /* Game modes a portal can switch to. `gravity` and `thrust` are units per
     * second (squared for the accelerations), `tap` is what the input does:
     *   jump  — only on the ground (cube, robot)
     *   flip  — flips gravity anywhere (ball, spider)
     *   hop   — a jump in mid-air too (UFO)
     *   hold  — the input is a thruster that is on while held (ship, swing,
     *           jetpack); the wave steers instead of accelerating. */
    modes: {
        cube:    { gravity: 1900, jump: 500, spin: 540,
                   pool: "player",      frame: "player_%n_001.png" },
        ship:    { gravity: 1300, thrust: 2600, cap: 640, hold: true,
                   pool: "ship",        frame: "ship_%n_001.png" },
        ball:    { gravity: 1900, flip: true, spin: -540,
                   pool: "player_ball", frame: "player_ball_%n_001.png" },
        ufo:     { gravity: 1500, hop: 430,
                   pool: "bird",        frame: "bird_%n_001.png" },
        wave:    { gravity: 0, wave: 0.55,
                   pool: "dart",        frame: "dart_%n_001.png" },
        robot:   { gravity: 2000, jump: 560, spin: 540,
                   pool: "robot",       frame: "robot_%n_01_001.png" },
        spider:  { gravity: 1900, flip: true, snap: true,
                   pool: "spider",      frame: "spider_%n_01_001.png" },
        swing:   { gravity: 1600, thrust: 2400, cap: 620, hold: true,
                   pool: "swing",       frame: "swing_01_001.png" },
        jetpack: { gravity: 1500, thrust: 2400, cap: 620, hold: true,
                   pool: "pack",        frame: "pack_01_001.png" }
    },
    /* What each orb and pad is worth, in units per second. The blue orb flips
     * gravity instead of throwing the player up (`flip: true`). */
    orbs: {
        yellow: { jump: 500 },
        blue:   { flip: true, jump: 300 },
        pink:   { jump: 430 },
        green:  { jump: 560 },
        red:    { jump: 560 },
        black:  { jump: 400 }
    },
    pads: {
        yellow: { jump: 620 },
        blue:   { flip: true, jump: 420 },
        pink:   { jump: 520 }
    }
};


/* -------------------------------------------------------------------------
 * Level select (LevelSelectLayer) — the screen the PLAY tile opens.
 *
 * One row per level: difficulty face, name, stars and the player's best run.
 * The list is virtual (only `rows.count` row nodes ever exist) and scrolls by
 * drag or with the arrow buttons, because a level set is longer than a screen.
 * Sizes are design px on the 960x540 canvas.
 * ---------------------------------------------------------------------- */
var LEVEL_SELECT_LAYOUT = {
    font: "res/gd/bigFont.fnt",
    colors: {
        row: [18, 32, 88, 235],
        rowLine: [255, 255, 255, 48],
        band: [255, 255, 255, 18],
        name: [255, 255, 255],
        dim: [190, 200, 220],
        gold: [255, 216, 66]
    },
    list: { x: 480, y: 262, width: 760, height: 392 },
    rows: {
        top: 452, pitch: 60, count: 6,
        width: 744, height: 54,
        // x offsets are measured from the centre of the list (list.x), because a
        // row node is placed there and its parts hang off it.
        faceX: -330, nameX: -284, starX: 292, bestX: 360,
        faceScale: 0.9, nameScale: 0.62, valueScale: 0.68
    },
    heading: { text: "SELECT LEVEL", y: 492 },
    arrows: {
        up:   { frame: "GJ_arrow_03_001.png", x: 906, y: 400, scale: 1.1, rotation: 90 },
        down: { frame: "GJ_arrow_03_001.png", x: 906, y: 124, scale: 1.1, rotation: -90 }
    },
    back: { frame: "GJ_arrow_03_001.png", x: 42, y: 497, scale: 1.35 },
    importBtn: { x: 128, y: 44, width: 196, height: 54, text: "IMPORT" },
    hint: { x: 700, y: 44, scale: 0.5, text: "Drag or use the arrows" },
    empty: { x: 480, y: 262, scale: 0.6, text: "No levels yet - run tools/level-import.js" }
};






/* Stand-in for screens that are not built yet: the kit's blue gradient, a Pusab
 * title and a BACK button, so unfinished screens still look like the game. */
function makePlaceholderScene(title, backScene) {
    var Layer = cc.Layer.extend({
        init: function () {
            this._super();
            GD.loadSheets();
            GD.UI.background(this, { top: [12, 110, 243], bottom: [30, 45, 150] });
            GD.UI.heading(this, "" + title, 330, { scale: GD.UI.TEXT.title });
            GD.UI.button(this, {
                x: GD.W / 2, y: 200, w: 220, h: 52,
                text: "BACK", style: "green",
                onClick: function () {
                    // Optional: the caller can hand in the scene to return to.
                    cc.Director.getInstance().replaceScene(backScene ? backScene() : new MyScene());
                }
            });
            return true;
        }
    });
    var Scene = cc.Scene.extend({
        onEnter: function () {
            this._super();
            var layer = new Layer();
            this.addChild(layer);
            layer.init();
        }
    });
    return new Scene();
}

/* The menu's X button leaves the game for good: it closes the tab the game
 * lives in. Browsers only honour window.close() on windows a script opened, so
 * when the close is refused the window is taken over (which lets the second
 * close() through in some browsers) and, failing that, the page is replaced
 * with a blank document - the site is gone after this call either way. */
function closeSite() {
    // Nothing should keep ticking behind the exit.
    var director = cc.Director.getInstance();
    if (director.stopAnimation) director.stopAnimation();
    if (director.pause) director.pause();

    // Works outright for script-opened windows and lone history entries.
    try { window.close(); } catch (e) {}
    if (window.closed) return;

    window.setTimeout(function () {
        if (window.closed) return;

        // Taking the window over is what lets a second close() stick.
        try { window.open("", "_self"); } catch (e) {}
        try { window.close(); } catch (e) {}
        if (window.closed) return;

        // Refused again: blank the site out so the game is not left running.
        window.setTimeout(function () {
            if (window.closed || window.location.href === "about:blank") return;
            try { window.location.replace("about:blank"); return; } catch (e) {}
            try {
                document.body.innerHTML = "";
                document.body.style.background = "#000";
            } catch (e) {}
        }, 50);
    }, 0);
}

/* The main menu, built entirely from the GD.UI kit: the magenta grid backdrop,
 * the green Pusab logo and one kit icon button per tile. Going through the kit
 * means every tile shares the same hit area, press animation and click sound as
 * the rest of the game's UI instead of each screen rolling its own cc.Menu. */
var MainMenuLayer = cc.Layer.extend({
    init: function () {
        this._super();

        // Every tile below is a sheet frame; the kit logs anything that is not.
        GD.loadSheets();

        var L = MENU_LAYOUT.elements;

        GD.UI.menuBackground(this, {
            base: MENU_LAYOUT.colors.backgroundBase,
            tile: MENU_LAYOUT.colors.backgroundTile,
            z: 0
        });

        // Logo — the same green Pusab title the real menu draws.
        GD.UI.heading(this, "Geometry Dash", L.logo.y, {
            x: L.logo.x,
            scale: L.logo.scale,
            color: cc.c3b(120, 220, 70),
            z: 4
        });

        // Top / center / side tiles.
        this.button(L.closeButton, this.onQuit);
        this.button(L.garageButton, this.onGarage);
        this.button(L.playButton, this.onPlay);
        this.button(L.buildButton, this.onCreator);
        this.button(L.dailyButton, this.onDaily);

        // Social cluster.
        this.button(L.socialFb, this.onFacebook);
        this.button(L.socialTw, this.onTwitter);
        this.button(L.socialYt, this.onYoutube);
        this.button(L.socialTwitch, this.onTwitch);
        this.button(L.robtopLogo, this.onRobtop);
        this.button(L.socialDiscord, this.onDiscord);

        // Bottom round buttons.
        this.button(L.achButton, this.onAchievements);
        this.button(L.optionsButton, this.onOptions);
        this.button(L.statsButton, this.onStats);
        this.button(L.creatorButton, this.onCreator);
        this.button(L.secretButton, this.onCreator);

        // News.
        this.button(L.newsButton, this.onNews);

        return true;
    },

    /* One menu tile: the kit sprite button takes the layout's frame, centre and
     * scale, and brings its own press/click handling. */
    button: function (spec, onClick) {
        return GD.UI.iconButton(this, {
            x: spec.x,
            y: spec.y,
            frame: spec.frame,
            scale: spec.scale === undefined ? 1 : spec.scale,
            z: 5,
            onClick: onClick
        });
    },

    onPlay: function () { cc.Director.getInstance().replaceScene(new LevelSelectScene()); },
    onGarage: function () { cc.Director.getInstance().replaceScene(new GarageScene()); },
    onCreator: function () { cc.Director.getInstance().replaceScene(new CreatorScene()); },
    onDaily: function () { cc.Director.getInstance().replaceScene(makePlaceholderScene("DAILY LEVEL")); },
    onNews: function () { cc.Director.getInstance().replaceScene(makePlaceholderScene("NEWS")); },
    onAchievements: function () { cc.Director.getInstance().replaceScene(makePlaceholderScene("ACHIEVEMENTS")); },
    onOptions: function () { cc.Director.getInstance().replaceScene(makePlaceholderScene("SETTINGS")); },
    onStats: function () { cc.Director.getInstance().replaceScene(new StatsScene()); },
    onQuit: function () { closeSite(); },
    onFacebook: function () { window.open("https://facebook.com/geometrydash", "_blank"); },
    onTwitter: function () { window.open("https://twitter.com/robtopgames", "_blank"); },
    onYoutube: function () { window.open("https://youtube.com/@RobTopGames", "_blank"); },
    onTwitch: function () { window.open("https://twitch.tv/robtopgames", "_blank"); },
    onDiscord: function () { window.open("https://discord.gg/geometrydash", "_blank"); },
    onRobtop: function () { window.open("https://robtopgames.com", "_blank"); }
});

var MyScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new MainMenuLayer();
        this.addChild(layer);
        layer.init();
    }
});

/* -------------------------------------------------------------------------
 * CreatorLayer — the "Create" hub opened by the CREATE tile / tools button.
 * 15 category buttons in a 5x3 grid over the blue GD gradient, plus the
 * pink back arrow, the locked-world padlock and the corner side art.
 * ---------------------------------------------------------------------- */
var CreatorLayer = cc.Layer.extend({
    init: function () {
        this._super();

        this.addSpriteFrames();
        this.addBackground();
        this.addSideArt();
        this.addGrid();
        this.addChrome();

        return true;
    },

    // Both sheets hold every frame used here; only add them once so the
    // engine does not log "sprite frame has already been added" warnings.
    addSpriteFrames: function () {
        var cache = cc.SpriteFrameCache.getInstance();
        if (!cache.getSpriteFrame("GJ_createBtn_001.png"))
            cache.addSpriteFrames("res/gd/GJ_GameSheet04.plist");
        if (!cache.getSpriteFrame("GJ_arrow_03_001.png"))
            cache.addSpriteFrames("res/gd/GJ_GameSheet03.plist");
    },

    // Vertical blue gradient (dark at the top, brighter at the bottom).
    addBackground: function () {
        var size = cc.Director.getInstance().getWinSize();
        var c = CREATE_LAYOUT.colors;
        var bg = cc.LayerGradient.create(
            cc.c4b(c.backgroundTop[0], c.backgroundTop[1], c.backgroundTop[2], 255),
            cc.c4b(c.backgroundBottom[0], c.backgroundBottom[1], c.backgroundBottom[2], 255),
            cc.p(0, -1)
        );
        bg.setContentSize(size.width, size.height);
        this.addChild(bg, 0);
    },

    // Green pixel stairs: top-left, bottom-left and (mirrored) bottom-right.
    addSideArt: function () {
        var art = CREATE_LAYOUT.sideArt;
        var size = cc.Director.getInstance().getWinSize();

        var topLeft = this.makeSideArtSprite(art);
        topLeft.setAnchorPoint(cc.p(0, 1));
        topLeft.setPosition(0, size.height);
        this.addChild(topLeft, 1);

        var bottomLeft = this.makeSideArtSprite(art);
        bottomLeft.setAnchorPoint(cc.p(0, 0));
        bottomLeft.setPosition(0, 0);
        this.addChild(bottomLeft, 1);

        var bottomRight = this.makeSideArtSprite(art);
        bottomRight.setAnchorPoint(cc.p(1, 0));
        bottomRight.setFlippedX(true);
        bottomRight.setPosition(size.width, 0);
        this.addChild(bottomRight, 1);
    },

    makeSideArtSprite: function (art) {
        var sprite = cc.Sprite.createWithSpriteFrameName(art.frame);
        sprite.setScale(art.scale);
        return sprite;
    },

    addGrid: function () {
        var g = CREATE_LAYOUT.grid;
        var total = CREATE_LAYOUT.buttons.length;
        var rows = Math.ceil(total / g.columns);

        for (var i = 0; i < total; i++) {
            var spec = CREATE_LAYOUT.buttons[i];
            var col = i % g.columns;
            var row = Math.floor(i / g.columns);
            var x = g.centerX + (col - (g.columns - 1) / 2) * g.pitchX;
            var y = g.centerY + ((rows - 1) / 2 - row) * g.pitchY;

            this.addCategoryButton(spec, x, y);
            if (spec.alert) this.addAlertBadge(x + g.alertDX, y + g.alertDY);
        }
    },

    addCategoryButton: function (spec, x, y) {
        var g = CREATE_LAYOUT.grid;
        var c = CREATE_LAYOUT.colors;

        var normal = cc.Sprite.createWithSpriteFrameName(spec.frame);
        var selected = cc.Sprite.createWithSpriteFrameName(spec.frame);
        selected.setScale(1.08);

        if (spec.locked) {
            var tint = cc.c3b(c.lockedTint[0], c.lockedTint[1], c.lockedTint[2]);
            normal.setColor(tint);
            selected.setColor(tint);
        }

        var item = cc.MenuItemSprite.create(normal, selected, this.onCategory, this);
        item.setPosition(x, y);
        item.setScale(g.scale);
        item.categorySpec = spec;
        if (spec.locked) item.setEnabled(false);

        var menu = cc.Menu.create(item);
        menu.setPosition(0, 0);
        this.addChild(menu, 5);

        // Locked tiles are veiled and (VERSUS) stamped with a padlock.
        if (spec.locked) {
            var box = 101 * g.scale;   // native button size
            var shade = c.lockedShade;
            this.addQuad(x - box / 2, y - box / 2, box, box, shade, 6);

            if (spec.lockFrame) {
                var lock = cc.Sprite.createWithSpriteFrameName(spec.lockFrame);
                lock.setPosition(x, y + (spec.lockDY || 0));
                lock.setScale(spec.lockScale || 1);
                this.addChild(lock, 7);
            }
        }
    },

    // Red "new content" exclamation badge (DAILY / WEEKLY).
    addAlertBadge: function (cx, cy) {
        var c = CREATE_LAYOUT.colors;
        this.addQuad(cx - 8, cy - 2, 16, 32, c.alertOutline, 8);
        this.addQuad(cx - 5, cy + 1, 10, 26, c.alertFill, 8);
        this.addQuad(cx - 8, cy - 16, 16, 16, c.alertOutline, 8);
        this.addQuad(cx - 5, cy - 13, 10, 10, c.alertFill, 8);
    },

    addQuad: function (x, y, w, h, rgba, z) {
        var quad = cc.LayerColor.create(
            cc.c4b(rgba[0], rgba[1], rgba[2], rgba.length > 3 ? rgba[3] : 255), w, h);
        quad.setPosition(x, y);
        this.addChild(quad, z || 0);
        return quad;
    },

    addChrome: function () {
        var chrome = CREATE_LAYOUT.chrome;

        // Pink back arrow -> main menu.
        this.addChromeButton(chrome.backArrow, this.onBack);

        var lock = cc.Sprite.createWithSpriteFrameName(chrome.lockIcon.frame);
        lock.setScale(chrome.lockIcon.scale);
        lock.setPosition(chrome.lockIcon.x, chrome.lockIcon.y);
        this.addChild(lock, 3);

        var door = cc.Sprite.createWithSpriteFrameName(chrome.doorIcon.frame);
        door.setScale(chrome.doorIcon.scale);
        door.setPosition(chrome.doorIcon.x, chrome.doorIcon.y);
        this.addChild(door, 3);
    },

    addChromeButton: function (spec, cb) {
        var normal = cc.Sprite.createWithSpriteFrameName(spec.frame);
        var selected = cc.Sprite.createWithSpriteFrameName(spec.frame);
        selected.setScale(1.12);

        var item = cc.MenuItemSprite.create(normal, selected, cb, this);
        if (spec.scale) item.setScale(spec.scale);
        item.setPosition(spec.x, spec.y);

        var menu = cc.Menu.create(item);
        menu.setPosition(0, 0);
        this.addChild(menu, 9);
    },

    onBack: function () {
        cc.Director.getInstance().replaceScene(new MyScene());
    },

    onCategory: function (sender) {
        var spec = sender.categorySpec;
        cc.Director.getInstance().replaceScene(makePlaceholderScene(spec.scene, function () {
            return new CreatorScene();
        }));
    }
});

var CreatorScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new CreatorLayer();
        this.addChild(layer);
        layer.init();
    }
});

/* -------------------------------------------------------------------------
 * GarageLayer — the "Icon Kit" opened by the paint-palette button: player
 * name + stat counters, the big icon preview, the eleven icon-type tabs and
 * the paged icon grid (36 slots a page, drawn from the complete loose icon set
 * in res/gd/icons, with the shipped sheet as a fallback).
 * ---------------------------------------------------------------------- */
var GarageLayer = cc.Layer.extend({
    init: function () {
        this._super();

        this._page = 0;       // current icon-grid page
        this._tab = 0;        // current icon-type tab
        this._selected = -1;  // highlighted slot of the current page
        this._loadingIcons = false; // is a page's icon atlas batch still decoding?
        this._editingName = false;  // is the profile name field open?
        this._nameDraft = "";       // what has been typed so far
        this._nameInput = null;     // the DOM field, only while editing
        this._nameInputEvents = null;

        this.addSpriteFrames();
        this.addBackground();
        this.addSideArt();
        this.addShopSign();
        this.addPreview();
        this.addStats();
        this.addHint();
        this.addGridFrame();
        this.addPaging();
        this.addTabs();
        this.addChrome();

        // Slot sprites + menus are rebuilt whenever the tab or page changes.
        this._gridNode = cc.Node.create();
        this.addChild(this._gridNode, 7);
        this.buildGrid();
        this.updatePreview();

        // The profile name is pressed directly, so the layer needs its own touch
        // handler. Menus keep priority, so only presses outside them reach here.
        this.setTouchMode(cc.TOUCH_ONE_BY_ONE);
        this.setTouchEnabled(true);

        return true;
    },

    onExit: function () {
        // The name field lives in the DOM, so drop it if the scene changes
        // while it is still open (back arrow, for instance).
        this.endNameEdit(false);
        this._super();
    },

    // ---------------------------------------------------------------- assets
    addSpriteFrames: function () {
        var cache = cc.SpriteFrameCache.getInstance();
        if (!cache.getSpriteFrame("GJ_createBtn_001.png"))
            cache.addSpriteFrames("res/gd/GJ_GameSheet04.plist");
        if (!cache.getSpriteFrame("GJ_arrow_03_001.png"))
            cache.addSpriteFrames("res/gd/GJ_GameSheet03.plist");
        if (!cache.getSpriteFrame("player_01_001.png"))
            cache.addSpriteFrames("res/gd/GJ_GameSheetIcons.plist");
        this.fixPaintButton(cache);
    },

    /* The shipped plist stores GJ_paintBtn_001.png as 41x35 at x=989 even
     * though the sheet is only 1024px wide, so the palette comes out stretched
     * and clipped. Re-register the clipped 35x35 rect so it draws 1:1. */
    fixPaintButton: function (cache) {
        var texture = cc.TextureCache.getInstance().textureForKey("res/gd/GJ_GameSheet03.png");
        if (!texture) return;
        cache.addSpriteFrame(
            cc.SpriteFrame.createWithTexture(texture, cc.rect(989, 147, 35, 35)),
            "GJ_paintBtn_001.png");
    },

    // ------------------------------------------------------------ background
    addBackground: function () {
        var size = cc.Director.getInstance().getWinSize();
        var c = GARAGE_LAYOUT.colors;
        this.addChild(cc.LayerColor.create(
            cc.c4b(c.backgroundBase[0], c.backgroundBase[1], c.backgroundBase[2], 255),
            size.width, size.height), 0);

        var cell = 108, gap = 6;
        for (var gy = 0; gy * cell < size.height + cell; gy++) {
            for (var gx = 0; gx * cell < size.width + cell; gx++) {
                var sq = cc.LayerColor.create(
                    cc.c4b(c.backgroundTile[0], c.backgroundTile[1], c.backgroundTile[2], 255),
                    cell - gap, cell - gap);
                sq.setPosition(gx * cell + gap / 2, gy * cell + gap / 2);
                this.addChild(sq, 1);
            }
        }
    },

    // Green pixel stairs, the same corner art the Create hub uses.
    addSideArt: function () {
        var art = GARAGE_LAYOUT.sideArt;
        var size = cc.Director.getInstance().getWinSize();

        var topLeft = cc.Sprite.createWithSpriteFrameName(art.frame);
        topLeft.setScale(art.scale);
        topLeft.setAnchorPoint(cc.p(0, 1));
        topLeft.setPosition(0, size.height);
        this.addChild(topLeft, 2);

        var bottomLeft = cc.Sprite.createWithSpriteFrameName(art.frame);
        bottomLeft.setScale(art.scale);
        bottomLeft.setAnchorPoint(cc.p(0, 0));
        bottomLeft.setPosition(0, 0);
        this.addChild(bottomLeft, 2);

        var bottomRight = cc.Sprite.createWithSpriteFrameName(art.frame);
        bottomRight.setScale(art.scale);
        bottomRight.setAnchorPoint(cc.p(1, 0));
        bottomRight.setFlippedX(true);
        bottomRight.setPosition(size.width, 0);
        this.addChild(bottomRight, 2);
    },

    // ------------------------------------------------- shop sign + preview
    addShopSign: function () {
        var s = GARAGE_LAYOUT.chrome.shopSign;
        var sign = cc.Sprite.createWithSpriteFrameName(s.frame);
        sign.setScale(s.scale);
        sign.setPosition(s.x, s.y);
        this.addChild(sign, 2);
    },

    addPreview: function () {
        var p = GARAGE_LAYOUT.preview;
        var c = GARAGE_LAYOUT.colors;

        // The profile name — press it to rename the player (see onTouchBegan).
        this._nameLabel = this.makeLabel(PLAYER_PROFILE.getName(), p.name.scale);
        this._nameLabel.setPosition(p.name.x, p.name.y);
        this.addChild(this._nameLabel, 4);

        // Caret + instructions, only visible while the name is being edited.
        this._nameCursor = this.addQuadCentered(p.name.x, p.name.y,
            p.nameCursor.width, p.nameCursor.height, c.iconTint, this, 5);
        this._nameCursor.setVisible(false);

        this._nameHint = this.makeLabel(p.nameHint.text, p.nameHint.scale);
        this._nameHint.setPosition(p.nameHint.x, p.nameHint.y);
        this._nameHint.setVisible(false);
        this.addChild(this._nameHint, 5);

        // The selected icon, drawn in the player's colour 1. Starts as the game
        // sheet's default cube — a texture that is guaranteed to be decoded, so
        // the tint below is safe — and updatePreview() swaps in the real icon.
        this._previewCube = cc.Sprite.createWithSpriteFrameName(p.cube.frame);
        this._previewCube.setScale(p.cube.scale);
        this._previewCube.setColor(cc.c3b(c.iconTint[0], c.iconTint[1], c.iconTint[2]));
        this._previewCube.setPosition(p.cube.x, p.cube.y);
        this.addChild(this._previewCube, 4);

        // Thin rule between the preview and the tab row.
        this.addQuadCentered(p.separator.x, p.separator.y, p.separator.width,
            p.separator.height, c.separator, this, 3);
    },

    /* ------------------------------------------------------ profile name
     * The name above the preview is a button. Pressing it opens an inline
     * editor: a real (but invisible) <input> is parked over the label so the
     * browser does the editing — arrow keys, selection, mobile keyboards,
     * IME — while the game mirrors the resulting string in Pusab. Enter (or
     * pressing anywhere else) saves into PLAYER_PROFILE, Esc throws the change
     * away. The drawn caret always sits after the last character.
     */
    // Box that counts as a press on the name. Short names get a minimum width
    // so they stay easy to hit.
    nameHitRect: function () {
        var p = GARAGE_LAYOUT.preview;
        var size = this._nameLabel.getContentSize();
        var w = Math.max(size.width * p.name.scale + p.nameHit.padX, p.nameHit.width);
        var h = p.nameHit.height;
        return cc.rect(p.name.x - w / 2, p.name.y - h / 2, w, h);
    },

    beginNameEdit: function () {
        if (this._editingName) return;
        this._editingName = true;
        this._nameDraft = PLAYER_PROFILE.getName();

        var input = this.makeNameInput();
        var layer = this;
        this._nameInput = input;

        // The field only collects keystrokes: blur (clicking anywhere else) and
        // Enter save, Escape cancels.
        this._nameInputEvents = {
            input: function () {
                layer._nameDraft = input.value;
                layer.refreshNameEdit();
            },
            keydown: function (event) {
                var key = event.key || "";
                if (event.keyCode === 13 || key === "Enter") {
                    event.preventDefault();
                    layer.endNameEdit(true);
                } else if (event.keyCode === 27 || key === "Escape") {
                    event.preventDefault();
                    layer.endNameEdit(false);
                }
            },
            blur: function () { layer.endNameEdit(true); }
        };

        input.addEventListener("input", this._nameInputEvents.input, false);
        input.addEventListener("keydown", this._nameInputEvents.keydown, false);
        input.addEventListener("blur", this._nameInputEvents.blur, false);

        input.value = this._nameDraft;

        // Focus on the next tick: the press that opened the field also makes the
        // browser focus the tabbable canvas, which would blur — and therefore
        // close — the field straight away.
        setTimeout(function () {
            if (layer._nameInput !== input) return;
            input.focus();
            input.select();
        }, 0);

        this.refreshNameEdit();
        this._nameHint.setVisible(true);
        this._nameCursor.setVisible(true);
        this._nameCursor.runAction(cc.RepeatForever.create(cc.Sequence.create(
            cc.FadeTo.create(0.45, 40), cc.FadeTo.create(0.45, 255))));
    },

    // Redraws the name + caret from `_nameDraft` (called on every keystroke).
    refreshNameEdit: function () {
        // A lone space keeps the label — and therefore the caret — on screen
        // while the field is empty.
        this._nameLabel.setString(this._nameDraft === "" ? " " : this._nameDraft);

        var p = GARAGE_LAYOUT.preview;
        var size = this._nameLabel.getContentSize();
        var right = p.name.x + (size.width * p.name.scale) / 2;
        this._nameCursor.setPosition(right + p.nameCursor.gap,
            p.name.y - p.nameCursor.height / 2);
    },

    endNameEdit: function (save) {
        if (!this._editingName) return;
        this._editingName = false;

        var input = this._nameInput;
        var events = this._nameInputEvents;
        if (input) {
            if (events) {
                input.removeEventListener("input", events.input, false);
                input.removeEventListener("keydown", events.keydown, false);
                input.removeEventListener("blur", events.blur, false);
            }
            if (input.parentNode) input.parentNode.removeChild(input);
        }
        this._nameInput = null;
        this._nameInputEvents = null;

        this._nameCursor.stopAllActions();
        this._nameCursor.setOpacity(255);
        this._nameCursor.setVisible(false);
        this._nameHint.setVisible(false);

        this._nameDraft = save ? PLAYER_PROFILE.setName(this._nameDraft)
                               : PLAYER_PROFILE.getName();
        this._nameLabel.setString(this._nameDraft);
    },

    /* The invisible text field. It has to be a real, focused DOM node for the
     * browser to deliver typing, and it sits over the label (in CSS pixels,
     * mapped from the canvas rect) so mobile keyboards open instead of the page
     * scrolling. */
    makeNameInput: function () {
        var rect = this.canvasRect();
        var size = cc.Director.getInstance().getWinSize();
        var p = GARAGE_LAYOUT.preview;
        var scale = rect.height / size.height;

        var input = document.createElement("input");
        input.type = "text";
        input.maxLength = PLAYER_PROFILE.maxNameLength;
        input.setAttribute("autocomplete", "off");
        input.setAttribute("autocapitalize", "off");
        input.setAttribute("spellcheck", "false");

        var s = input.style;
        s.position = "fixed";
        s.left = (rect.left + (p.name.x / size.width) * rect.width) + "px";
        s.top = (rect.top + ((size.height - p.name.y) / size.height) * rect.height) + "px";
        s.width = (360 * scale) + "px";
        s.height = (48 * scale) + "px";
        s.margin = "0";
        s.padding = "0";
        s.border = "0";
        s.outline = "0";
        s.background = "transparent";
        s.color = "transparent";
        s.fontSize = (34 * scale) + "px";
        s.textAlign = "center";
        s.transform = "translate(-50%, -50%)";
        s.opacity = "0";        // the game draws the text, not the browser
        // Never hit-test: the press has to reach the canvas, otherwise the
        // engine never sees the matching mouseup and its touch state sticks.
        s.pointerEvents = "none";
        s.zIndex = "10";

        document.body.appendChild(input);
        return input;
    },

    // The canvas in CSS pixels, so game coordinates can be mapped onto it.
    canvasRect: function () {
        var canvas = document.getElementById("gameCanvas") || cc.canvas;
        if (canvas && canvas.getBoundingClientRect) return canvas.getBoundingClientRect();

        var size = cc.Director.getInstance().getWinSize();
        return { left: 0, top: 0, width: size.width, height: size.height };
    },

    // The seven counters in the top-right corner (stars, moons, coins, ...).
    addStats: function () {
        var s = GARAGE_LAYOUT.statColumn;
        var stats = GARAGE_LAYOUT.profile.stats;

        for (var i = 0; i < stats.length; i++) {
            var y = s.topY - i * s.pitch;

            var icon = cc.Sprite.createWithSpriteFrameName(stats[i].frame);
            icon.setScale(s.iconScale);
            icon.setPosition(s.iconX, y);
            this.addChild(icon, 4);

            var number = this.makeLabel(PLAYER_STATS.get(stats[i].key), s.fontScale);
            number.setAnchorPoint(cc.p(1, 0.5));
            number.setPosition(s.numberX, y);
            this.addChild(number, 4);
        }
    },

    // "Tap an icon to use it!" under the tab row.
    addHint: function () {
        var h = GARAGE_LAYOUT.hint;
        var label = this.makeLabel(h.text, h.scale);
        label.setPosition(h.x, h.y);
        this.addChild(label, 5);
    },

    // -------------------------------------------------------- icon grid box
    addGridFrame: function () {
        var panel = GARAGE_LAYOUT.grid.panel;
        this.addQuadCentered(panel.x, panel.y, panel.width, panel.height,
            GARAGE_LAYOUT.colors.panel, this, 2);
    },

    /* Rebuilds the 12x3 slots of the current tab + page: a square per slot, plus
     * a clickable icon for the slots this page actually fills. On the last page
     * of a short family the remaining squares stay empty. */
    buildGrid: function () {
        this._gridNode.removeAllChildren();

        var g = GARAGE_LAYOUT.grid;
        var total = g.columns * g.rows;
        var cache = cc.SpriteFrameCache.getInstance();

        for (var i = 0; i < total; i++) {
            var col = i % g.columns;
            var row = Math.floor(i / g.columns);
            var x = g.firstX + col * g.pitchX;
            var y = g.firstY - row * g.pitchY;

            this.addQuadCentered(x, y, g.slot, g.slot,
                GARAGE_LAYOUT.colors.slot, this._gridNode, 0);

            // `null` once the page runs past the end of the family.
            var frame = this.iconFrameForSlot(i);
            if (!frame) continue;

            // White outline (thicker while selected) + the icon itself.
            var border = GARAGE_LAYOUT.colors.slotBorder;
            var t = i === this._selected ? 3 : 2;
            var half = g.slot / 2 + 1;
            var side = g.slot + 2;
            this.addQuadCentered(x, y + half, side, t, border, this._gridNode, 1);
            this.addQuadCentered(x, y - half, side, t, border, this._gridNode, 1);
            this.addQuadCentered(x - half, y, t, side, border, this._gridNode, 1);
            this.addQuadCentered(x + half, y, t, side, border, this._gridNode, 1);

            var normal = cc.Sprite.createWithSpriteFrame(frame);
            normal.setScale(g.iconScale);
            var selected = cc.Sprite.createWithSpriteFrame(frame);
            selected.setScale(g.iconScale * 1.12);

            var item = cc.MenuItemSprite.create(normal, selected, this.onSlot, this);
            item.slotIndex = i;
            item.setPosition(x, y);

            var menu = cc.Menu.create(item);
            menu.setPosition(0, 0);
            this._gridNode.addChild(menu, 2);
        }

        if (!tabIconCount(GARAGE_LAYOUT.tabs.items[this._tab])) this.addEmptyGridLabel();

        this.preloadPageIcons();
    },

    /* Icon atlases are fetched on demand, one small PNG per icon, so the first
     * visit to a page shows empty squares for a moment. Once the page's icons
     * have decoded the grid is rebuilt once — `preloadPageIcons` only asks for
     * icons that are still missing, so this cannot loop. */
    preloadPageIcons: function () {
        var g = GARAGE_LAYOUT.grid;
        var pool = GARAGE_LAYOUT.tabs.items[this._tab].pool;
        if (!pool || this._loadingIcons) return;

        var numbers = [];
        var first = this._page * g.columns * g.rows;
        for (var i = 0; i < g.columns * g.rows; i++) {
            var number = GD.iconNumberAt(pool, first + i);
            if (number && !GD.iconFrameLoaded(pool, number)) numbers.push(number);
        }
        if (!numbers.length) return;

        this._loadingIcons = true;
        var started = GD.preloadIcons(pool, numbers, function () {
            this._loadingIcons = false;
            this.buildGrid();
            this.updatePreview();
        }, this);
        // Nothing to wait for (the textures were already requested elsewhere).
        if (!started) this._loadingIcons = false;
    },

    // Explains the empty grid on tabs the shipped sheet has no icons for.
    addEmptyGridLabel: function () {
        var g = GARAGE_LAYOUT.grid;
        var label = this.makeLabel(g.empty.text, g.empty.scale);
        label.setPosition(g.panel.x, g.panel.y);
        this._gridNode.addChild(label, 1);
    },

    /* Sprite frame of the icon shown in a slot, or null when the slot is past
     * the end of the current icon family. The loose set is preferred; frames
     * from the game sheet are the fallback, and there icons are packed 1..n. */
    iconFrameForSlot: function (slot) {
        var g = GARAGE_LAYOUT.grid;
        var tab = GARAGE_LAYOUT.tabs.items[this._tab];
        if (!tab.pool) return null;

        var index = this._page * g.columns * g.rows + slot;
        var number = GD.iconNumberAt(tab.pool, index);
        if (number) {
            var loose = GD.iconSpriteFrame(tab.pool, number);
            if (loose) return loose;
        }

        if (index + 1 > (tab.count || 0)) return null;
        return cc.SpriteFrameCache.getInstance().getSpriteFrame(iconFrameName(tab.pool, index + 1));
    },

    onSlot: function (sender) {
        this._selected = sender.slotIndex;
        this.updatePreview();
        this.buildGrid();
    },

    /* The big preview follows the selection — and the tab, when nothing is
     * selected yet — so it always shows an icon of the family on screen. The
     * preview sprite is tinted with the player's colour, and tinting a texture
     * that is still decoding is not allowed, so the frame is only applied once
     * the atlas has arrived; until then the previous icon stays up. */
    updatePreview: function () {
        var g = GARAGE_LAYOUT.grid;
        var pool = GARAGE_LAYOUT.tabs.items[this._tab].pool;
        var number = 0;

        if (pool) {
            var index = this._selected >= 0 ? this._page * g.columns * g.rows + this._selected : 0;
            number = GD.iconNumberAt(pool, index);
        }

        if (!number) {
            // No loose icons for this tab: keep the default cube.
            number = 1;
            pool = "player";
        }

        if (!GD.iconFrameLoaded(pool, number)) {
            GD.preloadIcons(pool, [number], this.updatePreview, this);
            return;
        }
        this._previewCube.setDisplayFrame(GD.iconSpriteFrame(pool, number));
    },

    // -------------------------------------------------------------- paging
    addPaging: function () {
        var p = GARAGE_LAYOUT.paging;

        this.addPagingArrow(p.arrowLeft, this.onPrevPage, false);
        this.addPagingArrow(p.arrowRight, this.onNextPage, true);

        // Icon families differ in size, so the dots live in their own node and
        // are rebuilt whenever the tab changes.
        this._dotsNode = cc.Node.create();
        this.addChild(this._dotsNode, 5);
        this._dots = [];
        this.buildDots();
    },

    // Pages the current icon family fills (always at least one).
    pageCount: function () {
        var g = GARAGE_LAYOUT.grid;
        var per = g.columns * g.rows;
        var count = tabIconCount(GARAGE_LAYOUT.tabs.items[this._tab]);
        return Math.max(1, Math.ceil(count / per));
    },

    // One dot per page, centred under the grid.
    buildDots: function () {
        this._dotsNode.removeAllChildren();
        this._dots = [];

        var d = GARAGE_LAYOUT.paging.dots;
        var pages = this.pageCount();
        var left = GARAGE_LAYOUT.grid.panel.x - (pages - 1) * d.pitch / 2;

        for (var i = 0; i < pages; i++) {
            var dot = cc.Sprite.createWithSpriteFrameName(i === this._page ? d.on : d.off);
            dot.setScale(d.scale);
            dot.setPosition(left + i * d.pitch, d.y);
            this._dotsNode.addChild(dot, 0);
            this._dots.push(dot);
        }
    },

    refreshDots: function () {
        var cache = cc.SpriteFrameCache.getInstance();
        var d = GARAGE_LAYOUT.paging.dots;
        for (var i = 0; i < this._dots.length; i++)
            this._dots[i].setDisplayFrame(cache.getSpriteFrame(i === this._page ? d.on : d.off));
    },

    addPagingArrow: function (spec, cb, flipped) {
        var normal = cc.Sprite.createWithSpriteFrameName(spec.frame);
        var selected = cc.Sprite.createWithSpriteFrameName(spec.frame);
        selected.setScale(1.12);
        if (flipped) {
            normal.setFlippedX(true);
            selected.setFlippedX(true);
        }

        var item = cc.MenuItemSprite.create(normal, selected, cb, this);
        item.setScale(spec.scale);
        item.setPosition(spec.x, spec.y);

        var menu = cc.Menu.create(item);
        menu.setPosition(0, 0);
        this.addChild(menu, 9);
    },

    onPrevPage: function () { this.goToPage(this._page - 1); },
    onNextPage: function () { this.goToPage(this._page + 1); },

    goToPage: function (page) {
        var next = Math.max(0, Math.min(this.pageCount() - 1, page));
        if (next === this._page) return;

        this._page = next;
        this._selected = -1;

        this.refreshDots();
        this.buildGrid();
        this.updatePreview();
    },

    // ---------------------------------------------------------------- tabs
    addTabs: function () {
        var t = GARAGE_LAYOUT.tabs;
        this._tabItems = [];

        for (var i = 0; i < t.items.length; i++) {
            var item = cc.MenuItemSprite.create(this.makeTabSprite(i), this.makeTabSprite(i),
                this.onTab, this);
            item.tabIndex = i;
            item.setScale(t.scale);
            item.setPosition(t.startX + i * t.pitch, t.y);
            this._tabItems.push(item);
        }

        var menu = cc.Menu.create(this._tabItems);
        menu.setPosition(0, 0);
        this.addChild(menu, 6);
    },

    // The active tab uses the cyan "on" frame, all others the grey "off" one.
    makeTabSprite: function (index) {
        var spec = GARAGE_LAYOUT.tabs.items[index];
        return cc.Sprite.createWithSpriteFrameName(index === this._tab ? spec.on : spec.off);
    },

    refreshTabs: function () {
        for (var i = 0; i < this._tabItems.length; i++) {
            var item = this._tabItems[i];
            item.setNormalImage(this.makeTabSprite(i));

            var hover = this.makeTabSprite(i);
            hover.setScale(1.12);
            item.setSelectedImage(hover);
        }
    },

    onTab: function (sender) {
        if (sender.tabIndex === this._tab) return;
        this._tab = sender.tabIndex;
        this._page = 0;        // families have different page counts
        this._selected = -1;
        this.refreshTabs();
        this.buildDots();
        this.buildGrid();
        this.updatePreview();
    },
    // -------------------------------------------------------------- chrome
    addChrome: function () {
        var chrome = GARAGE_LAYOUT.chrome;

        this.addChromeButton(chrome.backArrow, this.onBack);
        this.addChromeButton(chrome.shardsBtn, this.onShards);
        this.addChromeButton(chrome.paintBtn, this.onPaint);
    },

    addChromeButton: function (spec, cb) {
        var normal = cc.Sprite.createWithSpriteFrameName(spec.frame);
        var selected = cc.Sprite.createWithSpriteFrameName(spec.frame);
        selected.setScale(1.12);

        var item = cc.MenuItemSprite.create(normal, selected, cb, this);
        item.setScale(spec.scale);
        item.setPosition(spec.x, spec.y);

        var menu = cc.Menu.create(item);
        menu.setPosition(0, 0);
        this.addChild(menu, 9);
    },

    // ------------------------------------------------------------- helpers
    makeLabel: function (text, scale) {
        var label = cc.LabelBMFont.create("" + text, GARAGE_LAYOUT.font);
        label.setScale(scale);
        return label;
    },

    // LayerColor is bottom-left anchored, this helper takes the centre.
    addQuadCentered: function (cx, cy, w, h, rgba, parent, z) {
        var quad = cc.LayerColor.create(
            cc.c4b(rgba[0], rgba[1], rgba[2], rgba.length > 3 ? rgba[3] : 255), w, h);
        quad.setPosition(cx - w / 2, cy - h / 2);
        (parent || this).addChild(quad, z || 0);
        return quad;
    },

    // ------------------------------------------------------------ handlers
    /* Pressing the name opens the editor. Nothing else on this screen uses
     * touches, so returning true here only ever happens on the name itself. */
    onTouchBegan: function (touch) {
        if (this._editingName) return false;
        if (!cc.rectContainsPoint(this.nameHitRect(), touch.getLocation())) return false;
        this.beginNameEdit();
        return true;
    },

    onBack: function () {
        cc.Director.getInstance().replaceScene(new MyScene());
    },

    onShards: function () {
        cc.Director.getInstance().replaceScene(makePlaceholderScene("SHARDS", function () {
            return new GarageScene();
        }));
    },

    onPaint: function () {
        cc.Director.getInstance().replaceScene(makePlaceholderScene("COLORS", function () {
            return new GarageScene();
        }));
    }
});

var GarageScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new GarageLayer();
        this.addChild(layer);
        layer.init();
    }
});

/* -------------------------------------------------------------------------
 * StatsLayer — the "Stats" table opened by the main-menu stats button.
 *
 * Mirrors GD's StatsLayer (a GJDropDownLayer): the browned-out menu stays
 * visible behind the drop-down, the green table chrome is assembled from the
 * GJ_table_* frames plus flat quads, and the goldFont counters in between are
 * dragged up and down under a clipping stencil.
 * ---------------------------------------------------------------------- */
var StatsLayer = cc.Layer.extend({
    init: function () {
        this._super();

        this._scroll = 0;        // pixels the row list is scrolled up
        this._dragging = false;
        this._dragY = 0;
        this._dragScroll = 0;

        this.addSpriteFrames();
        this.addBackground();
        this.addMenuChrome();
        this.addTableBody();
        this.addList();
        this.addFrame();
        this.addTitle();
        this.addChrome();

        // Dragging inside the table body scrolls the counters. One-by-one touch
        // mode is required: the default TOUCH_ALL_AT_ONCE mode only calls the
        // onTouches* delegates, never onTouchBegan.
        this.setTouchMode(cc.TOUCH_ONE_BY_ONE);
        this.setTouchEnabled(true);

        return true;
    },

    // ---------------------------------------------------------------- assets
    addSpriteFrames: function () {
        var cache = cc.SpriteFrameCache.getInstance();
        if (!cache.getSpriteFrame("GJ_table_top_001.png"))
            cache.addSpriteFrames("res/gd/GJ_GameSheet03.plist");
        if (!cache.getSpriteFrame("GJ_newsBtn_001.png"))
            cache.addSpriteFrames("res/gd/GJ_GameSheet04.plist");
    },

    // ------------------------------------------------------------ background
    // The menu background art, browned out and darkened like GD's stats page.
    addBackground: function () {
        var size = cc.Director.getInstance().getWinSize();
        var spec = STATS_LAYOUT.background;
        var c = STATS_LAYOUT.colors;

        var bg = cc.Sprite.create(spec.frame);
        bg.setScale(spec.scale);
        bg.setColor(cc.c3b(spec.tint[0], spec.tint[1], spec.tint[2]));
        bg.setPosition(size.width / 2, size.height / 2);
        this.addChild(bg, 0);

        var veil = cc.LayerColor.create(
            cc.c4b(c.veil[0], c.veil[1], c.veil[2], c.veil[3]), size.width, size.height);
        this.addChild(veil, 1);
    },

    // Social icons, RobTop logo, DAILY and NEWS stay visible around the table.
    addMenuChrome: function () {
        var elements = MENU_LAYOUT.elements;
        var keys = STATS_LAYOUT.menuChrome;

        for (var i = 0; i < keys.length; i++) {
            var spec = elements[keys[i]];
            var sprite = cc.Sprite.createWithSpriteFrameName(spec.frame);
            sprite.setPosition(spec.x, spec.y);
            if (spec.scale) sprite.setScale(spec.scale);
            this.addChild(sprite, 2);
        }
    },

    // ------------------------------------------------------------ table body
    // The brown surface the counters scroll over.
    addTableBody: function () {
        var p = STATS_LAYOUT.panel;
        var c = STATS_LAYOUT.colors;

        var body = cc.LayerGradient.create(
            cc.c4b(c.bodyTop[0], c.bodyTop[1], c.bodyTop[2], 255),
            cc.c4b(c.bodyBottom[0], c.bodyBottom[1], c.bodyBottom[2], 255),
            cc.p(0, -1));
        body.setContentSize(p.bodyRight - p.bodyLeft, p.bodyTop - p.bodyBottom);
        body.setPosition(p.bodyLeft, p.bodyBottom);
        this.addChild(body, 3);
    },
    // ---------------------------------------------------------------- rows
    // Every counter is a label + number pair; every other row is veiled so the
    // list reads as table stripes. The rows live in a clipping node that keeps
    // them inside the table body while they scroll.
    addList: function () {
        var p = STATS_LAYOUT.panel;
        var r = STATS_LAYOUT.rows;
        var c = STATS_LAYOUT.colors;
        var stats = STATS_LAYOUT.stats;

        var list = cc.Node.create();
        this._rows = [];

        for (var i = 0; i < stats.length; i++) {
            var row = {};

            if (i % 2 === 0) {
                row.band = this.addQuad(0, 0, p.bodyRight - p.bodyLeft, r.pitch,
                    c.bandDark, list, 0);
                row.rule = this.addQuad(0, 0, p.bodyRight - p.bodyLeft, 2,
                    c.bandRule, list, 0);
            }

            row.label = this.makeLabel(stats[i].label, r.fontScale, list);
            row.label.setAnchorPoint(cc.p(0, 0.5));
            row.value = this.makeLabel("" + PLAYER_STATS.get(stats[i].key), r.fontScale, list);
            row.value.setAnchorPoint(cc.p(1, 0.5));

            this._rows.push(row);
        }

        // Stencil: everything the rows draw is clipped to the table body.
        var stencil = cc.DrawNode.create();
        stencil.drawRect(cc.p(p.bodyLeft, p.bodyBottom), cc.p(p.bodyRight, p.bodyTop),
            cc.c4f(1, 1, 1, 1));

        var clip = cc.ClippingNode.create(stencil);
        // Handing the stencil over through setStencil() makes the clipping node
        // rewrite DrawNode.draw() into a bare path: without it the rectangle is
        // painted onto the canvas as a white block before the clip is applied.
        clip.setStencil(stencil);
        clip.addChild(list);
        this.addChild(clip, 4);

        this.layoutRows();
    },

    // Positions every row for the current scroll offset. Scrolling down raises
    // the first rows past the top edge, so later counters come into view.
    layoutRows: function () {
        var p = STATS_LAYOUT.panel;
        var r = STATS_LAYOUT.rows;

        for (var i = 0; i < this._rows.length; i++) {
            var row = this._rows[i];
            var bandTop = p.bodyTop - i * r.pitch + this._scroll;
            var centerY = bandTop - r.pitch / 2;

            if (row.band) row.band.setPosition(p.bodyLeft, bandTop - r.pitch);
            if (row.rule) row.rule.setPosition(p.bodyLeft, bandTop - 2);
            row.label.setPosition(r.labelX, centerY);
            row.value.setPosition(r.valueX, centerY);
        }
    },

    maxScroll: function () {
        var p = STATS_LAYOUT.panel;
        var r = STATS_LAYOUT.rows;
        var content = STATS_LAYOUT.stats.length * r.pitch + r.bottomPad;
        return Math.max(0, content - (p.bodyTop - p.bodyBottom));
    },

    setScroll: function (value) {
        this._scroll = Math.max(0, Math.min(this.maxScroll(), value));
        this.layoutRows();
    },

    // ----------------------------------------------------------- table frame
    // Banner on top, the two green rails down the sides, drawer bar at the end.
    addFrame: function () {
        var p = STATS_LAYOUT.panel;

        this.addFrameSprite(p.banner, p.bodyTop + p.banner.height);
        this.addFrameSprite(p.bottomBar, p.bodyBottom + p.bottomBar.gap);

        this.addRail(p.bodyLeft);
        this.addRail(p.bodyRight - p.railWidth);
    },

    // The GJ_table_* frames are 394x46 / 389x46 slices: anchored at their top
    // edge, only the coloured middle is stretched to the table width.
    addFrameSprite: function (spec, y) {
        var sprite = cc.Sprite.createWithSpriteFrameName(spec.frame);
        sprite.setAnchorPoint(cc.p(0.5, 1));
        sprite.setScaleX(spec.scaleX);
        sprite.setScaleY(spec.scaleY);
        sprite.setPosition(STATS_LAYOUT.panel.centerX, y);
        this.addChild(sprite, 5);
    },

    // White outline, dark inset, green face with a vertical gradient.
    addRail: function (x) {
        var p = STATS_LAYOUT.panel;
        var c = STATS_LAYOUT.colors;
        var w = p.railWidth;
        var bottom = p.bodyBottom - 8;      // tucks in behind the drawer bar
        var height = p.bodyTop - bottom;

        this.addQuad(x, bottom, w, height, c.outline, null, 5);
        this.addQuad(x + 3, bottom + 3, w - 6, height - 6, c.inner, null, 5);

        var face = cc.LayerGradient.create(
            cc.c4b(c.railFaceTop[0], c.railFaceTop[1], c.railFaceTop[2], 255),
            cc.c4b(c.railShade[0], c.railShade[1], c.railShade[2], 255),
            cc.p(0, -1));
        face.setContentSize(w - 10, height - 10);
        face.setPosition(x + 5, bottom + 5);
        this.addChild(face, 5);
    },

    addTitle: function () {
        var t = STATS_LAYOUT.title;
        var label = cc.LabelBMFont.create(t.text, STATS_LAYOUT.font);
        label.setScale(t.scale);
        label.setPosition(STATS_LAYOUT.panel.centerX, t.y);
        this.addChild(label, 6);
    },

    // ---------------------------------------------------------------- chrome
    addChrome: function () {
        var spec = STATS_LAYOUT.chrome.backArrow;
        var normal = cc.Sprite.createWithSpriteFrameName(spec.frame);
        var selected = cc.Sprite.createWithSpriteFrameName(spec.frame);
        selected.setScale(1.12);

        var item = cc.MenuItemSprite.create(normal, selected, this.onBack, this);
        item.setScale(spec.scale);
        item.setPosition(spec.x, spec.y);

        var menu = cc.Menu.create(item);
        menu.setPosition(0, 0);
        this.addChild(menu, 9);
    },

    // --------------------------------------------------------------- helpers
    makeLabel: function (text, scale, parent) {
        var label = cc.LabelBMFont.create("" + text, STATS_LAYOUT.valueFont);
        label.setScale(scale);
        (parent || this).addChild(label, 1);
        return label;
    },

    // LayerColor is bottom-left anchored, so (x, y) is the lower-left corner.
    addQuad: function (x, y, w, h, rgba, parent, z) {
        var quad = cc.LayerColor.create(
            cc.c4b(rgba[0], rgba[1], rgba[2], rgba.length > 3 ? rgba[3] : 255), w, h);
        quad.setPosition(x, y);
        (parent || this).addChild(quad, z || 0);
        return quad;
    },

    // -------------------------------------------------------------- handlers
    onBack: function () {
        cc.Director.getInstance().replaceScene(new MyScene());
    },

    onTouchBegan: function (touch) {
        var loc = touch.getLocation();
        var p = STATS_LAYOUT.panel;
        if (loc.x < p.bodyLeft || loc.x > p.bodyRight ||
            loc.y < p.bodyBottom || loc.y > p.bodyTop)
            return false;

        this._dragging = true;
        this._dragY = loc.y;
        this._dragScroll = this._scroll;
        return true;
    },

    onTouchMoved: function (touch) {
        if (!this._dragging) return;
        // The list follows the finger: dragging up walks down the counters,
        // exactly like GD's scroll layers.
        this.setScroll(this._dragScroll + touch.getLocation().y - this._dragY);
    },

    onTouchEnded: function () {
        this._dragging = false;
    },

    onTouchCancelled: function () {
        this._dragging = false;
    }
});

var StatsScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new StatsLayer();
        this.addChild(layer);
        layer.init();
    }
});

/* -------------------------------------------------------------------------
 * Level select — the screen the PLAY tile opens.
 *
 * One row per level: the difficulty face, the name, what the level is worth and
 * the player's best run. Only `rows.count` row nodes exist; `refresh()` maps
 * them onto the level list at the current scroll offset, so a 22 level set costs
 * the same as a five level one. `IMPORT` reads a .gmd / .dat / level string and
 * drops it into the same list (see GD.Levels.readFile).
 * ---------------------------------------------------------------------- */
var LevelSelectLayer = cc.Layer.extend({
    init: function () {
        this._super();
        GD.loadSheets();

        this._levels = GD.Levels.list();
        this._scroll = 0;          // top row index, fractional while dragging
        this._drag = null;         // {startY, scroll, moved}

        this.addBackground();
        this.addRows();
        this.addChrome();
        this.refresh();

        this.setTouchMode(cc.TOUCH_ONE_BY_ONE);
        this.setTouchPriority(1);
        this.setTouchEnabled(true);

        GD.Audio.music("menu");
        return true;
    },

    addBackground: function () {
        GD.UI.background(this, { top: [12, 110, 243], bottom: [26, 40, 140], ground: false, z: 0 });

        // A soft band behind the list so the rows read against the gradient.
        var l = LEVEL_SELECT_LAYOUT.list;
        this.addQuad(l.x - l.width / 2, l.y - l.height / 2, l.width, l.height,
                     [0, 0, 0, 60], this, 1);
    },

    /* --------------------------------------------------------------- rows */
    addRows: function () {
        var R = LEVEL_SELECT_LAYOUT.rows;
        this._rows = [];

        for (var i = 0; i < R.count; i++) {
            var root = cc.Node.create();
            this.addChild(root, 4);

            var row = { root: root };
            var panel = GD.UI.nine(GD.UI.PANEL.dark, R.width, R.height, GD.UI.PANEL_INSETS);
            root.addChild(panel, 0);

            // Started from a real frame: setDisplayFrame() needs a texture, and a
            // bare cc.Sprite.create() has none.
            row.face = cc.Sprite.createWithSpriteFrame(this.faceFrame(0));
            row.face.setScale(R.faceScale);
            row.face.setPosition(R.faceX, 0);
            root.addChild(row.face, 1);

            row.name = GD.label("", { scale: R.nameScale, anchor: [0, 0.5] });
            row.name.setPosition(R.nameX, 4);
            root.addChild(row.name, 1);

            row.author = GD.label("", { scale: R.valueScale, anchor: [0, 0.5],
                                        color: LEVEL_SELECT_LAYOUT.colors.dim });
            row.author.setPosition(R.nameX, -16);
            root.addChild(row.author, 1);

            row.starIcon = GD.sprite("GJ_starsIcon_001.png");
            row.starIcon.setScale(0.8);
            row.starIcon.setPosition(R.starX, 0);
            root.addChild(row.starIcon, 1);

            row.stars = GD.label("", { scale: R.valueScale, anchor: [0, 0.5],
                                       color: LEVEL_SELECT_LAYOUT.colors.gold });
            row.stars.setPosition(R.starX + 20, 0);
            root.addChild(row.stars, 1);

            row.best = GD.label("", { scale: R.valueScale, anchor: [1, 0.5],
                                      color: LEVEL_SELECT_LAYOUT.colors.dim });
            row.best.setPosition(R.bestX, 0);
            root.addChild(row.best, 1);

            this._rows.push(row);
        }
    },

    /* Paints one row with a level. `entry` is a manifest entry or an import. */
    fillRow: function (row, entry) {
        var record = GD.Save.level(this.levelKey(entry)) || {};

        row.face.setDisplayFrame(this.faceFrame(entry.diff));
        row.name.setString("" + entry.name);
        row.author.setString(entry.author ? "by " + entry.author : "");
        row.stars.setString(entry.stars ? "" + entry.stars : "");
        row.starIcon.setVisible(!!entry.stars);
        row.stars.setVisible(!!entry.stars);

        var best = record.normal || 0;
        row.best.setString(record.completed ? "100%" : (best ? best + "%" : ""));
    },

    faceFrame: function (diff) {
        var cache = cc.SpriteFrameCache.getInstance();
        return cache.getSpriteFrame(GD.A.difficulty(Math.max(0, Math.min(10, diff || 0))));
    },

    /* The save key of a level: the main set is keyed by id, an imported level by
     * its name (it has no id GD would recognise). */
    levelKey: function (entry) {
        if (!entry) return "official:0";
        return entry.local !== undefined ? "local:" + entry.name : "official:" + entry.id;
    },

    /* Positions the row nodes for the current scroll offset. */
    refresh: function () {
        var R = LEVEL_SELECT_LAYOUT.rows;
        var base = Math.floor(this._scroll);
        var offset = (this._scroll - base) * R.pitch;

        for (var i = 0; i < this._rows.length; i++) {
            var row = this._rows[i];
            var entry = this._levels[base + i];

            row.root.setVisible(!!entry);
            if (!entry) continue;

            row.root.setPosition(LEVEL_SELECT_LAYOUT.list.x, R.top - i * R.pitch - offset);
            this.fillRow(row, entry);
        }
    },

    maxScroll: function () {
        var R = LEVEL_SELECT_LAYOUT.rows;
        return Math.max(0, this._levels.length - R.count);
    },

    setScroll: function (value) {
        this._scroll = GD.clamp(value, 0, this.maxScroll());
        this.refresh();
    },

    /* ------------------------------------------------------------- chrome */
    addChrome: function () {
        var L = LEVEL_SELECT_LAYOUT;
        var layer = this;

        GD.UI.heading(this, L.heading.text, L.heading.y, { scale: GD.UI.TEXT.heading, z: 20 });

        if (!this._levels.length) {
            var empty = GD.label(L.empty.text, { scale: L.empty.scale, width: 700,
                                                 align: cc.TEXT_ALIGNMENT_CENTER });
            empty.setPosition(L.empty.x, L.empty.y);
            this.addChild(empty, 20);
        }

        // Back arrow, same chrome as every other screen (a cc.Menu keeps it in
        // front of the drag handling below).
        var normal = cc.Sprite.createWithSpriteFrameName(L.back.frame);
        var selected = cc.Sprite.createWithSpriteFrameName(L.back.frame);
        selected.setScale(1.12);
        var item = cc.MenuItemSprite.create(normal, selected, this.onBack, this);
        item.setScale(L.back.scale);
        item.setPosition(L.back.x, L.back.y);
        var menu = cc.Menu.create(item);
        menu.setPosition(0, 0);
        this.addChild(menu, 30);

        // Scroll arrows: one page per tap, like GD's own list arrows.
        var up = GD.UI.iconButton(this, {
            frame: L.arrows.up.frame, x: L.arrows.up.x, y: L.arrows.up.y,
            scale: L.arrows.up.scale, z: 20,
            onClick: function () { layer.setScroll(Math.round(layer._scroll) - (L.rows.count - 1)); }
        });
        if (up._sprite) up._sprite.setRotation(L.arrows.up.rotation);

        var down = GD.UI.iconButton(this, {
            frame: L.arrows.down.frame, x: L.arrows.down.x, y: L.arrows.down.y,
            scale: L.arrows.down.scale, z: 20,
            onClick: function () { layer.setScroll(Math.round(layer._scroll) + (L.rows.count - 1)); }
        });
        if (down._sprite) down._sprite.setRotation(L.arrows.down.rotation);

        GD.UI.button(this, {
            x: L.importBtn.x, y: L.importBtn.y, w: L.importBtn.width, h: L.importBtn.height,
            text: L.importBtn.text, style: "cyan", z: 20,
            onClick: function () { layer.onImport(); }
        });

        var hint = GD.label(L.hint.text, { scale: L.hint.scale, color: LEVEL_SELECT_LAYOUT.colors.dim });
        hint.setPosition(L.hint.x, L.hint.y);
        this.addChild(hint, 20);
    },

    onBack: function () {
        GD.Audio.stopMusic();
        cc.Director.getInstance().replaceScene(new MyScene());
    },

    /* -------------------------------------------------------------- import */
    /* A hidden file picker. A `.gmd` export, `CCLocalLevels.dat` and a plain level
     * string all arrive through the same reader; whatever it holds is added to
     * the list and started right away. */
    onImport: function () {
        var layer = this;

        if (!this._fileInput) {
            var input = document.createElement("input");
            input.type = "file";
            input.accept = ".gmd,.dat,.txt,.plist,.xml";
            input.style.display = "none";
            input.addEventListener("change", function () {
                var file = input.files && input.files[0];
                input.value = "";
                if (file) layer.onFile(file);
            });
            document.body.appendChild(input);
            this._fileInput = input;
        }
        this._fileInput.click();
    },

    onFile: function (file) {
        var layer = this;
        var scene = this.getParent() || this;
        var loading = GD.UI.loading(scene, "IMPORTING...");

        GD.Levels.readFile(file, function (sources) {
            loading.close();

            var source = sources && sources[0];
            var level = source ? GD.Levels.parse(source.data, {
                id: "imported", name: source.name, author: source.author
            }) : null;

            if (!level || !level.objects.length) {
                GD.UI.alert(scene, "IMPORT FAILED", "That file has no level this build can read.");
                return;
            }

            var entry = GD.Levels.remember(level);
            layer._levels = GD.Levels.list();
            layer._scroll = Math.max(0, layer._levels.length - LEVEL_SELECT_LAYOUT.rows.count);
            layer.refresh();
            GD.UI.toast(scene, "Imported: " + level.name);
            layer.play(entry);
        });
    },

    /* --------------------------------------------------------------- input */
    onTouchBegan: function (touch) {
        this._drag = { startY: touch.getLocation().y, scroll: this._scroll, moved: false };
        return true;
    },

    onTouchMoved: function (touch) {
        if (!this._drag) return;
        var dy = touch.getLocation().y - this._drag.startY;
        if (Math.abs(dy) > 8) this._drag.moved = true;

        this._scroll = GD.clamp(this._drag.scroll + dy / LEVEL_SELECT_LAYOUT.rows.pitch,
                                0, this.maxScroll());
        this.refresh();
    },

    onTouchEnded: function (touch) {
        var drag = this._drag;
        this._drag = null;
        if (!drag) return;

        // A drag only snap the list to the nearest row; a clean tap plays the row
        // under the pointer.
        if (drag.moved) { this.setScroll(Math.round(this._scroll)); return; }

        var R = LEVEL_SELECT_LAYOUT.rows;
        var base = Math.floor(this._scroll);
        var offset = (this._scroll - base) * R.pitch;
        var y = touch.getLocation().y;

        // Rows are centred on their slot, and the slot moves by the fractional
        // part of the scroll, so the hit test has to use the same maths.
        for (var i = 0; i < this._rows.length; i++) {
            var centre = R.top - i * R.pitch - offset;
            if (y <= centre + R.height / 2 && y >= centre - R.height / 2 &&
                this._levels[base + i]) {
                this.play(this._levels[base + i]);
                return;
            }
        }
    },

    onTouchCancelled: function () {
        this._drag = null;
    },

    play: function (entry) {
        if (!entry) return;
        GD.Audio.sfx("click");
        cc.Director.getInstance().replaceScene(new PlayScene(entry));
    },

    /* ------------------------------------------------------------- helpers */
    // LayerColor is bottom-left anchored, so (x, y) is the lower-left corner.
    addQuad: function (x, y, w, h, rgba, parent, z) {
        var quad = cc.LayerColor.create(
            cc.c4b(rgba[0], rgba[1], rgba[2], rgba.length > 3 ? rgba[3] : 255), w, h);
        quad.setPosition(x, y);
        (parent || this).addChild(quad, z || 0);
        return quad;
    }
});

var LevelSelectScene = cc.Scene.extend({
    onEnter: function () {
        this._super();
        var layer = new LevelSelectLayer();
        this.addChild(layer);
        layer.init();
    }
});

/* -------------------------------------------------------------------------
 * PlayLayer — one imported level, played at GD's pace.
 *
 * The level comes from GD.Levels (levels/<id>.json, or a file the player
 * imported) as a list of objects sorted by x, in level units. A run writes
 * attempts and jumps into PLAYER_STATS (the Stats table) and the best %, coins
 * and completion into GD.Save, so the level select shows what has been done.
 *
 * Physics runs in "player space": y is measured with gravity pulling DOWN, so a
 * gravity portal only has to flip `_gravity` and all the collision code stays
 * one-sided. `worldY()` converts back for drawing.
 * ---------------------------------------------------------------------- */
/* Save-file key of each icon pool (GD keeps one selected icon per mode). */
var PLAYER_PROFILE_KEY = {
    player: "cube", ship: "ship", player_ball: "ball", bird: "ufo", dart: "wave",
    robot: "robot", spider: "spider", swing: "swing", pack: "jetpack"
};

var PlayLayer = cc.Layer.extend({
    init: function (entry) {
        this._super();

        this._entry = entry || null;
        this._level = GD.Levels.entry(this._entry);
        this._objects = this._level ? this._level.objects : [];
        this._key = this.saveKey();

        this._x = 0;             // player position along the level, units
        this._y = 0;             // player bottom, player space
        this._vy = 0;
        this._prevY = 0;
        this._mode = "cube";
        this._gravity = 1;       // 1 = normal, -1 = flipped
        this._onGround = true;
        this._hold = false;      // pointer down (ship / wave / swing thrust)
        this._tap = false;       // a tap waiting to be spent this frame
        this._dead = false;
        this._finished = false;
        this._respawn = 0;
        this._cameraY = 0;
        this._coins = [false, false, false];
        this._speedIndex = PLAY_LAYOUT.speedIndex;

        this.addSpriteFrames();
        this.addSky();
        this.addGround();
        this.initObjects();
        this.addPlayer();
        this.addHud();
        this.addChrome();

        this.setTouchMode(cc.TOUCH_ONE_BY_ONE);
        this.setTouchPriority(1);
        this.setTouchEnabled(true);

        if (!this._level) {
            this.showMissing();
            return true;
        }

        if (this._level.song) GD.Audio.music(this._level.song);
        this.scheduleUpdate();
        this.startRun();
        return true;
    },

    // The save record this level writes to: main levels by id, imports by name.
    saveKey: function () {
        if (!this._entry) return "official:0";
        if (this._entry.local !== undefined) return "local:" + this._entry.name;
        return "official:" + (this._level ? this._level.id : this._entry.id);
    },

    addSpriteFrames: function () {
        GD.loadSheets();
    },

    // Blue gradient with the tiled menu art scrolling behind the level.
    addSky: function () {
        var c = PLAY_LAYOUT.colors;
        var size = cc.Director.getInstance().getWinSize();

        var sky = cc.LayerGradient.create(
            cc.c4b(c.skyTop[0], c.skyTop[1], c.skyTop[2], 255),
            cc.c4b(c.skyBottom[0], c.skyBottom[1], c.skyBottom[2], 255),
            cc.p(0, -1));
        sky.setContentSize(size.width, size.height);
        this.addChild(sky, 0);

        this._backdrop = [];
        for (var i = 0; i < 2; i++) {
            var bg = GD.sprite("game_bg_01_001.png");
            bg.setScale(1.875);                          // 512px sheet -> 960px
            bg.setColor(cc.c3b(c.backdrop[0], c.backdrop[1], c.backdrop[2]));
            bg.setPosition(size.width / 2 + i * size.width, PLAY_LAYOUT.groundY + 225);
            this.addChild(bg, 1);
            this._backdrop.push(bg);
        }
    },

    // Brown ground strip, its lit top edge and the stripes that make the speed
    // readable. Everything moves with the camera (see scrollBackdrop).
    addGround: function () {
        var c = PLAY_LAYOUT.colors;
        var size = cc.Director.getInstance().getWinSize();

        this._ground = cc.LayerGradient.create(
            cc.c4b(c.groundTop[0], c.groundTop[1], c.groundTop[2], 255),
            cc.c4b(c.groundBottom[0], c.groundBottom[1], c.groundBottom[2], 255),
            cc.p(0, -1));
        this._ground.setContentSize(size.width, PLAY_LAYOUT.groundDepth);
        this.addChild(this._ground, 2);

        this._groundLine = this.addQuad(0, 0, size.width, 4, c.groundLine, this, 3);

        this._stripes = [];
        for (var i = 0; i < 18; i++)
            this._stripes.push(this.addQuad(0, 0, 10, PLAY_LAYOUT.groundDepth - 4,
                                            c.groundStripe, this, 3));
    },

    /* Object sprites are pooled: only what is on screen exists. `obj.sprite` is
     * the live sprite of an object (or null), which makes the window scan cheap. */
    initObjects: function () {
        this._live = [];
        this._pool = [];
        this._fillPool = [];

        for (var i = 0; i < this._objects.length; i++) this._objects[i].sprite = null;
    },

    addPlayer: function () {
        var color = GD.Save.get("profile.color1", PLAY_LAYOUT.colors.cubeTint);

        this._player = cc.Sprite.createWithSpriteFrameName("player_01_001.png");
        this._player.setScale(PLAY_LAYOUT.scale);
        this._player.setColor(cc.c3b(color[0], color[1], color[2]));
        this.addChild(this._player, 9);

        this.setMode("cube");
        this.placePlayer();
    },

    /* Switches to a game mode: the icon changes, the physics read the mode table. */
    setMode: function (mode) {
        var spec = PLAY_LAYOUT.modes[mode] || PLAY_LAYOUT.modes.cube;
        var number = GD.Save.get("profile." + (PLAYER_PROFILE_KEY[spec.pool] || "cube"), 1);

        this._mode = PLAY_LAYOUT.modes[mode] ? mode : "cube";
        if (!this._player) return;

        var frame = this.playerFrame(spec, number);
        if (frame) this._player.setDisplayFrame(frame);
    },

    /* The player's own icon for a mode: the loose set once it is decoded, the
     * sheet frame until then (the atlas is only a few KB and arrives right
     * after the level starts). */
    playerFrame: function (spec, number) {
        if (GD.iconFrameLoaded(spec.pool, number)) return GD.iconSpriteFrame(spec.pool, number);

        GD.preloadIcons(spec.pool, [number], function () { this.setMode(this._mode); }, this);

        var name = spec.frame.replace("%n", number < 10 ? "0" + number : "" + number);
        return cc.SpriteFrameCache.getInstance().getSpriteFrame(name);
    },

    /* ------------------------------------------------------------ game loop */
    update: function (dt) {
        if (dt > 0.05) dt = 0.05;       // keep the physics sane after a stall

        if (!this._level) return;

        if (this._finished) {
            this.scrollBackdrop();
            return;
        }

        if (this._dead) {
            this._respawn -= dt;
            if (this._respawn <= 0) this.startRun();
            return;
        }

        this.step(dt);
        this.layoutSprites();
        this.scrollBackdrop();
        this.updateHud();
    },

    /* One physics step: orbs first (a tap on an orb is not also a jump), then
     * the mode's gravity/input, then movement and collision. */
    step: function (dt) {
        var L = PLAY_LAYOUT;
        var spec = L.modes[this._mode] || L.modes.cube;
        var speed = L.speeds[this._speedIndex] || L.speeds[L.speedIndex];

        this._dt = dt;
        if (this._tap) this.useOrb();

        this._x += speed * dt;

        if (spec.wave) {
            // The wave steers: holding points the nose up, letting go points down.
            this._vy = (this._hold ? 1 : -1) * speed * spec.wave;
        } else if (spec.thrust) {
            this._vy += (this._hold ? spec.thrust : -spec.gravity) * dt;
        } else {
            this._vy -= spec.gravity * dt;
        }

        if (this._tap) this.onTap(spec);
        this._tap = false;

        var cap = spec.cap || L.maxFall;
        if (this._vy > cap) this._vy = cap;
        if (this._vy < -cap) this._vy = -cap;

        this._prevY = this._y;
        this._y += this._vy * dt;

        this.collide();
        this.placePlayer();

        if (!this._dead && this._x >= this._level.length) this.completeLevel();
    },

    /* A tap without an orb under it: jump (cube, robot), flip (ball, spider) or
     * hop in mid-air (UFO). Ship, wave, swing and jetpack thrust instead. */
    onTap: function (spec) {
        var L = PLAY_LAYOUT;

        if (spec.flip) {
            this.flipGravity();
            if (spec.snap) this._y = Math.round(this._y / L.unit) * L.unit;
            return;
        }
        if (spec.hop) {
            this._vy = spec.hop;
            this._onGround = false;
            PLAYER_STATS.add("totalJumps");
            return;
        }
        if (spec.jump && this._onGround) {
            this._vy = spec.jump;
            this._y += 1;                  // leave the ground on this very frame
            this._onGround = false;
            PLAYER_STATS.add("totalJumps");
        }
    },

    flipGravity: function () {
        this._gravity = -this._gravity;
        this._vy = -this._vy * 0.5;
        this._onGround = false;
    },

    placePlayer: function () {
        var L = PLAY_LAYOUT;
        this._player.setPosition(L.playerX,
            L.groundY + (this.worldY(this._y) - this._cameraY) * L.scale + L.playerSize);
        this._player.setFlippedY(this._gravity === -1);
    },

    /* Player space -> world units above the ground. */
    worldY: function (y) {
        var L = PLAY_LAYOUT;
        return this._gravity === 1 ? y : L.playHeight - y - L.playerSize;
    },

    /* The objects near the player, as a [from, to) index range of the sorted
     * list. Two cells of margin covers every object this build draws. */
    nearObjects: function (x, pad) {
        return { from: Math.max(0, this.indexOf(x - pad) - 1),
                 to: Math.min(this._objects.length, this.indexOf(x + pad) + 1) };
    },

    indexOf: function (x) {
        var lo = 0, hi = this._objects.length;
        while (lo < hi) {
            var mid = (lo + hi) >> 1;
            if (this._objects[mid].x < x) lo = mid + 1; else hi = mid;
        }
        return lo;
    },

    /* An object's axis aligned box in player space. Rotation and scale are
     * ignored: every tile this build draws is one cell. */
    boxOf: function (obj) {
        var half = PLAY_LAYOUT.unit / 2;
        var bottom = obj.y - half, top = obj.y + half;

        if (this._gravity === 1)
            return { left: obj.x - half, right: obj.x + half, bottom: bottom, top: top };

        var height = PLAY_LAYOUT.playHeight;
        return { left: obj.x - half, right: obj.x + half,
                 bottom: height - top, top: height - bottom };
    },

    /* Collision for this frame.
     *
     * Every solid the player's box overlaps is either a floor (its top is at or
     * below the feet, so the player stands on it), a ceiling (its bottom is at or
     * above the head) or a wall — and GD kills on walls. The `step` tolerance is
     * what makes the 2.x slopes (which this build draws as tiles) walkable
     * instead of fatal.
     *
     * Tiles this build cannot name (GENERIC_BLOCK — the 2.x block library) are
     * the exception: their side is not fatal. GD's id table is not in the level
     * data, so a shape that is really decoration or a spike can look exactly like
     * a block, and a wrong guess would be an invisible wall in the player's face.
     * They are still landable, which is what the platforms are for.
     */
    collide: function () {
        var L = PLAY_LAYOUT;
        var half = L.hitHalf, size = L.playerSize, step = 7;
        var player = { left: this._x - half, right: this._x + half,
                       bottom: this._y, top: this._y + size };
        var range = this.nearObjects(this._x, L.unit * 2);
        var floor = 0, ceiling = L.playHeight;
        var landed = false;
        var i, obj, box;

        for (i = range.from; i < range.to; i++) {
            obj = this._objects[i];
            if (obj.def.solid) {
                box = this.boxOf(obj);
                if (player.right <= box.left || player.left >= box.right) continue;
                if (box.top <= player.bottom + step) {
                    if (box.top > floor) floor = box.top;
                } else if (box.bottom >= player.top - step) {
                    if (box.bottom < ceiling) ceiling = box.bottom;
                } else if (!obj.def.generic) {
                    this.crash();                    // ran into the side
                    return;
                }
                continue;
            }

            if (obj.def.hazard) {
                box = this.boxOf(obj);
                if (this.hits(box, player, L.hazardHalf)) { this.crash(); return; }
                continue;
            }

            if (obj.def.touch && !obj.taken) {
                box = this.boxOf(obj);
                if (!this.hits(box, player, 6)) continue;

                if (obj.def.kind === "pad") this.usePad(obj);
                else if (obj.def.kind === "coin") this.takeCoin(obj);
                else if (obj.def.kind === "portal") this.usePortal(obj);
            }
        }

        // Stand on the floor, stop at the ceiling. `landed` feeds the spin.
        if (this._y <= floor) {
            this._y = floor;
            this._vy = 0;
            this._onGround = true;
            landed = true;
            this.land();
        } else if (this._y >= ceiling - size) {
            this._y = ceiling - size;
            if (this._vy > 0) this._vy = 0;
            this._onGround = false;
        } else {
            this._onGround = false;
        }

        if (!landed && L.modes[this._mode] && L.modes[this._mode].spin)
            this._player.setRotation(this._player.getRotation() +
                L.modes[this._mode].spin * this._gravity * (this._dt || 1 / 60));
    },

    /* Do two boxes overlap, shrunk by `pad` on the object's side? */
    hits: function (box, player, pad) {
        return player.right > box.left + pad && player.left < box.right - pad &&
               player.top > box.bottom + pad && player.bottom < box.top - pad;
    },

    // GD lands the cube flat, on a 90 degree step.
    land: function () {
        var rot = this._player.getRotation();
        this._player.setRotation((Math.round(rot / 90) * 90) % 360);
    },

    /* Touch objects. An orb only fires on a tap while the player is inside it,
     * a pad fires on contact, a portal once on the way through. */
    useOrb: function () {
        var L = PLAY_LAYOUT;
        var range = this.nearObjects(this._x, L.unit + 10);
        var size = L.playerSize;

        for (var i = range.from; i < range.to; i++) {
            var obj = this._objects[i];
            if (obj.def.kind !== "orb" || obj.taken) continue;

            var box = this.boxOf(obj);
            var player = { left: this._x - L.hitHalf, right: this._x + L.hitHalf,
                           bottom: this._y, top: this._y + size };
            if (!this.hits(box, player, 8)) continue;

            var spec = L.orbs[obj.def.value] || L.orbs.yellow;
            if (spec.flip) this.flipGravity();
            if (spec.jump) {
                this._vy = spec.jump;
                this._onGround = false;
            }
            obj.taken = true;
            if (obj.sprite) obj.sprite.setVisible(false);
            PLAYER_STATS.add("totalJumps");
            PLAYER_STATS.add("totalOrbs");
            this._tap = false;
            return;
        }
    },

    usePad: function (obj) {
        var spec = PLAY_LAYOUT.pads[obj.def.value] || PLAY_LAYOUT.pads.yellow;

        obj.taken = true;
        if (spec.flip) this.flipGravity();
        this._vy = spec.jump;
        this._onGround = false;
    },

    usePortal: function (obj) {
        var mode = obj.def.value;

        obj.taken = true;
        if (mode === "gravity") {
            this.flipGravity();
            return;
        }
        // A mode portal is a toggle: it enters that mode, and the pair's other
        // half takes the player back to the cube.
        this.setMode(this._mode === mode ? "cube" : mode);
        this._vy = Math.max(this._vy, 0);
    },

    takeCoin: function (obj) {
        var index = Math.max(0, Math.min(2, (obj.coin || 1) - 1));

        obj.taken = true;
        if (obj.sprite) obj.sprite.setVisible(false);
        this._coins[index] = true;
        PLAYER_STATS.add("collectedSecretCoins");
        this.refreshCoinHud();
    },

    /* -------------------------------------------------------------- drawing */
    /* Lays the world out for the current camera: the level scrolls with the
     * player, and the camera also follows vertically once the player is high
     * enough (ship parts), like GD's own camera. Only the objects inside the
     * window have a sprite. */
    layoutSprites: function () {
        var L = PLAY_LAYOUT;
        var camX = this._x;
        var from = camX - 160, to = camX + 420;
        var i, entry, obj;

        var target = GD.clamp(this.worldY(this._y) - 150, 0,
                              L.playHeight - L.viewCells * L.unit);
        this._cameraY += (target - this._cameraY) * 0.15;

        for (i = this._live.length - 1; i >= 0; i--) {
            entry = this._live[i];
            if (entry.obj.x < from - L.unit || entry.obj.x > to + L.unit) {
                this.release(entry);
                this._live.splice(i, 1);
            }
        }

        for (i = this.indexOf(from); i < this._objects.length && this._objects[i].x <= to; i++) {
            obj = this._objects[i];
            if (obj.sprite) continue;
            this.acquire(obj);
        }

        for (i = 0; i < this._live.length; i++) {
            entry = this._live[i];
            var x = L.playerX + (entry.obj.x - camX) * L.scale;
            var y = L.groundY + (entry.obj.y - this._cameraY) * L.scale;

            entry.sprite.setPosition(x, y);
            if (entry.fill) entry.fill.setPosition(x, y);
        }
    },

    /* Takes a sprite from the pool (or builds one) and points it at `obj`. A
     * solid also gets a colour fill sprite underneath its outline. */
    acquire: function (obj) {
        var L = PLAY_LAYOUT;
        var cache = cc.SpriteFrameCache.getInstance();
        var frame = cache.getSpriteFrame(obj.def.frame) || cache.getSpriteFrame("blockOutline_01_001.png");
        if (!frame) return;

        var sprite = this._pool.pop();
        if (!sprite) sprite = cc.Sprite.createWithSpriteFrame(frame);
        if (!sprite) return;                    // frame's texture is still decoding

        var entry = { obj: obj, sprite: sprite, fill: null };

        if (obj.def.solid) {
            var fillFrame = cache.getSpriteFrame(L.blockFill);
            var fill = fillFrame ? this._fillPool.pop() : null;
            if (fillFrame && !fill) fill = cc.Sprite.createWithSpriteFrame(fillFrame);
            if (fill) {
                fill.setDisplayFrame(fillFrame);
                fill.setScale(L.scale * L.blockFillScale);
                fill.setAnchorPoint(cc.p(0.5, 0.5));
                fill.setRotation(obj.rot || 0);
                fill.setFlippedX(!!obj.flipX);
                fill.setFlippedY(!!obj.flipY);
                fill.setColor(this.shade(this.levelColour(), 0.9));
                fill.setOpacity(255);
                fill.setPosition(-200, -200);
                this.addChild(fill, this.zFor(obj) - 1);
                entry.fill = fill;
            }
        }

        sprite.stopAllActions();
        sprite.setDisplayFrame(frame);
        sprite.setScale(L.scale);
        sprite.setAnchorPoint(cc.p(0.5, 0.5));
        sprite.setRotation(obj.rot || 0);
        sprite.setFlippedX(!!obj.flipX);
        sprite.setFlippedY(!!obj.flipY);
        sprite.setColor(this.tintFor(obj));
        sprite.setOpacity(255);
        sprite.setVisible(!obj.taken);
        sprite.setPosition(-200, -200);         // placed by layoutSprites()

        this.addChild(sprite, this.zFor(obj));
        obj.sprite = sprite;
        this._live.push(entry);
    },

    release: function (entry) {
        entry.obj.sprite = null;
        entry.sprite.removeFromParent();
        this._pool.push(entry.sprite);
        if (entry.fill) {
            entry.fill.removeFromParent();
            this._fillPool.push(entry.fill);
        }
    },

    levelColour: function () {
        return (this._level && this._level.colour) || [255, 255, 255];
    },

    shade: function (colour, factor) {
        return cc.c3b(Math.round(colour[0] * factor), Math.round(colour[1] * factor),
                      Math.round(colour[2] * factor));
    },

    /* Blocks and spikes take the level's own colour channel, like GD: the block
     * outline is the dark shade, the spike keeps the full colour. */
    tintFor: function (obj) {
        if (obj.def.solid) return this.shade(this.levelColour(), 0.45);
        if (obj.def.hazard) return this.shade(this.levelColour(), 1);
        return cc.c3b(255, 255, 255);
    },

    zFor: function (obj) {
        if (obj.def.kind === "coin") return 7;
        if (obj.def.touch) return 6;            // orbs, pads and portals sit in front
        return 4;
    },

    // The tiled backdrop drifts at a quarter of the level speed; the ground and
    // its stripes move with the camera.
    scrollBackdrop: function () {
        var L = PLAY_LAYOUT;
        var size = cc.Director.getInstance().getWinSize();
        var shiftX = (this._x * L.scale * 0.25) % size.width;
        var groundY = L.groundY - this._cameraY * L.scale;
        var i;

        for (i = 0; i < this._backdrop.length; i++)
            this._backdrop[i].setPosition(size.width / 2 + i * size.width - shiftX,
                groundY + 225);

        this._ground.setPosition(0, groundY - L.groundDepth);
        this._groundLine.setPosition(0, groundY - 4);

        var pitch = 80;
        var scroll = (this._x * L.scale) % pitch;
        for (i = 0; i < this._stripes.length; i++)
            this._stripes[i].setPosition(i * pitch - scroll, groundY - L.groundDepth);
    },

    /* ------------------------------------------------------------------ hud */
    // Progress bar, the level name, the three coin slots and the attempt flash.
    addHud: function () {
        var L = PLAY_LAYOUT;
        var h = L.hud;
        var c = L.colors;
        var barY = h.track.y - h.track.height / 2;

        this.addQuad(h.track.x, barY, h.track.width, h.track.height, c.trackBack, this, 8);
        this._fill = this.addQuad(h.track.x, barY, 1, h.track.height, c.trackFill, this, 9);

        this._percent = this.makeLabel("0%", h.percent.scale);
        this._percent.setPosition(h.percent.x, h.percent.y);

        if (this._level) {
            this._title = this.makeLabel("" + this._level.name, h.level.scale);
            this._title.setPosition(h.level.x, h.level.y);
        }

        this._coinIcons = [];
        for (var i = 0; i < 3; i++) {
            var icon = GD.frameSprite(h.coins.frame);
            if (!icon) continue;                    // sheet still decoding
            icon.setScale(h.coins.scale);
            icon.setPosition(h.coins.x + i * h.coins.pitch, h.coins.y);
            icon.setOpacity(90);
            this.addChild(icon, 8);
            this._coinIcons.push(icon);
        }

        this._attemptLabel = this.makeLabel("Attempt 1", h.attempt.scale);
        this._attemptLabel.setPosition(h.attempt.x, h.attempt.y);
    },

    refreshCoinHud: function () {
        for (var i = 0; i < this._coinIcons.length; i++)
            this._coinIcons[i].setOpacity(this._coins[i] ? 255 : 90);
    },

    updateHud: function () {
        var h = PLAY_LAYOUT.hud;
        var percent = this.percent();

        if (!this._fill || !this._percent) return;

        this._fill.setContentSize(Math.max(1, Math.round(h.track.width * percent / 100)),
                                  h.track.height);
        this._percent.setString(Math.max(0, Math.min(100, Math.round(percent))) + "%");
    },

    percent: function () {
        if (!this._level || !this._level.length) return 0;
        return GD.clamp(this._x * 100 / this._level.length, 0, 100);
    },

    // Pink back arrow, exactly like the other screens.
    addChrome: function () {
        var spec = PLAY_LAYOUT.hud.backArrow;
        var normal = cc.Sprite.createWithSpriteFrameName(spec.frame);
        var selected = cc.Sprite.createWithSpriteFrameName(spec.frame);
        selected.setScale(1.12);

        var item = cc.MenuItemSprite.create(normal, selected, this.onBack, this);
        item.setScale(spec.scale);
        item.setPosition(spec.x, spec.y);

        var menu = cc.Menu.create(item);
        menu.setPosition(0, 0);
        this.addChild(menu, 30);
    },

    onBack: function () {
        GD.Audio.stopMusic();
        cc.Director.getInstance().replaceScene(new LevelSelectScene());
    },

    // Opened without level data (a fresh checkout, or a manifest that never
    // loaded): say so instead of running an empty world.
    showMissing: function () {
        var label = this.makeLabel("No level data - run tools/level-import.js", 0.62, this, 20);
        label.setPosition(GD.W / 2, GD.H / 2);
    },

    /* ------------------------------------------------------------- one run */
    startRun: function () {
        var L = PLAY_LAYOUT;
        var i;

        this._x = 0;
        this._y = 0;
        this._vy = 0;
        this._prevY = 0;
        this._gravity = 1;
        this._onGround = true;
        this._hold = false;
        this._tap = false;
        this._dead = false;
        this._finished = false;
        this._cameraY = 0;
        this._speedIndex = L.speedIndex;
        this._coins = [false, false, false];

        for (i = 0; i < this._objects.length; i++) this._objects[i].taken = false;

        // Recycled sprites still show the last run's pickups: drop them all and
        // let the window scan rebuild what is on screen.
        for (i = this._live.length - 1; i >= 0; i--) this.release(this._live[i]);
        this._live = [];

        this.setMode("cube");
        this._player.stopAllActions();
        this._player.setOpacity(255);
        this._player.setRotation(0);
        this._player.setScale(L.scale);

        this.placePlayer();
        this.layoutSprites();
        this.scrollBackdrop();
        this.refreshCoinHud();
        this.updateHud();

        // Every restart is an attempt, exactly like GD counts them.
        this.showAttempt(PLAYER_STATS.add("totalAttempts"));
    },

    showAttempt: function (attempt) {
        var label = this._attemptLabel;
        if (!label) return;

        label.stopAllActions();
        label.setString("Attempt " + attempt);
        label.setOpacity(255);
        label.runAction(cc.Sequence.create(
            cc.DelayTime.create(1.2), cc.FadeOut.create(0.5)));
    },

    crash: function () {
        if (this._dead || this._finished) return;

        this._dead = true;
        this._respawn = PLAY_LAYOUT.respawnDelay;
        this.saveBest();

        // GD blows the cube up; a fast shrink-fade reads the same way.
        GD.Audio.sfx("explode");
        this._player.stopAllActions();
        this._player.runAction(cc.Spawn.create(
            cc.ScaleTo.create(0.25, PLAY_LAYOUT.scale * 0.2),
            cc.FadeOut.create(0.25)));
    },

    /* 100%: the run is over, the record goes into the save file and GD's own
     * end banner comes up. `onTouchBegan` leaves for the level select. */
    completeLevel: function () {
        var L = PLAY_LAYOUT;
        var h = L.hud;
        var size = cc.Director.getInstance().getWinSize();
        var coins = 0;
        var i;

        this._finished = true;
        this._hold = false;
        this._tap = false;

        this._player.stopAllActions();
        this._player.setOpacity(255);
        this._player.setScale(L.scale);
        this._player.setRotation(0);
        this.updateHud();

        var result = GD.Save.completeLevel(this._key, 100, {
            coins: this._coins,
            stars: this._level.stars || 0
        });

        // The Stats table has its own counters next to the per level save, so a
        // first completion is mirrored there too.
        if (result.firstCompletion) {
            PLAYER_STATS.add("completedLevels");
            if (this._level.stars) PLAYER_STATS.add("collectedStars", this._level.stars);
        }

        for (i = 0; i < 3; i++) if (this._coins[i]) coins++;

        GD.Audio.sfx("endStart");

        var veil = this.addQuad(0, 0, size.width, size.height, L.colors.veil, this, 19);
        veil.setOpacity(0);
        veil.runAction(cc.FadeTo.create(0.35, L.colors.veil[3]));

        var banner = this.makeLabel("LEVEL COMPLETE!", h.complete.scale, this, 20);
        banner.setPosition(h.complete.x, h.complete.y);

        var line = "100%";
        if (this._level.stars)
            line += "   " + this._level.stars + (this._level.stars === 1 ? " star" : " stars");
        line += "   " + coins + "/3 coins";

        var info = this.makeLabel(line, h.info.scale, this, 20);
        info.setPosition(h.info.x, h.info.y);

        var hint = this.makeLabel("Tap to continue", h.hint.scale, this, 20);
        hint.setPosition(h.hint.x, h.hint.y);
    },

    // Stores a new best percentage for the level (the level select shows it) and
    // counts the attempt, the way GD's own level record does.
    saveBest: function () {
        var percent = Math.floor(this.percent());
        if (percent < 1) return;

        GD.Save.completeLevel(this._key, percent);
    },

    /* ---------------------------------------------------------------- input */
    onTouchBegan: function () {
        if (this._finished) {
            this.onBack();
            return true;
        }
        this._hold = true;
        this._tap = true;
        return true;
    },

    onTouchEnded: function () {
        this._hold = false;
    },

    onTouchCancelled: function () {
        this._hold = false;
    },

    /* -------------------------------------------------------------- helpers */
    makeLabel: function (text, scale, parent, z) {
        var label = cc.LabelBMFont.create("" + text, PLAY_LAYOUT.font);
        label.setScale(scale);
        (parent || this).addChild(label, z === undefined ? 8 : z);
        return label;
    },

    // LayerColor is bottom-left anchored, so (x, y) is the lower-left corner.
    addQuad: function (x, y, w, h, rgba, parent, z) {
        var quad = cc.LayerColor.create(
            cc.c4b(rgba[0], rgba[1], rgba[2], rgba.length > 3 ? rgba[3] : 255), w, h);
        quad.setPosition(x, y);
        (parent || this).addChild(quad, z || 0);
        return quad;
    }
});

/* The play scene takes the level select's entry: { id } for a baked level,
 * { local: n } for an imported one. */
var PlayScene = cc.Scene.extend({
    ctor: function (entry) {
        this._super();
        this._entry = entry || null;
    },
    onEnter: function () {
        this._super();
        var layer = new PlayLayer();
        this.addChild(layer);
        layer.init(this._entry);
    }
});






