/* =====================================================================
 * Unlocks.js — the reward side of the game: achievements, the wallet, the
 * shops, the vaults, map packs, gauntlets and daily quests.
 *
 * All of it is local. Every entry names the save-file counter it reads
 * (`stat`) or the unlock key it writes, so a screen never has to hard-code a
 * rule: it asks this table and `GD.Save` whether the player has it.
 *
 * Honesty notes:
 *   - Achievement goals are this build's own (they read the counters the play
 *     layer actually writes), not a copy of RobTop's list.
 *   - Vault codes are this build's own too. GD's real codes are community
 *     trivia that cannot be verified offline, and shipping invented ones as
 *     "official" would be a lie; the vault screen says where they come from.
 *   - Shop stock is drawn from the real icon sets, so what you buy is a real
 *     icon you can then wear.
 * ===================================================================== */
GD.Data = GD.Data || {};

/* --------------------------------------------------------------- achievements
 * `stat` is a GD.Save.stats counter, `target` the value that unlocks it. */
GD.Data.ACHIEVEMENTS = [
    { id: "jump_100",    name: "First Hops",      desc: "Jump 100 times.",           stat: "totalJumps",           target: 100,   reward: { diamonds: 5 } },
    { id: "jump_1000",   name: "Jumper",          desc: "Jump 1,000 times.",         stat: "totalJumps",           target: 1000,  reward: { diamonds: 15 } },
    { id: "jump_10000",  name: "Rubber Cube",     desc: "Jump 10,000 times.",        stat: "totalJumps",           target: 10000, reward: { diamonds: 50 } },
    { id: "attempt_50",  name: "Keep Trying",     desc: "Make 50 attempts.",         stat: "totalAttempts",        target: 50,    reward: { diamonds: 5 } },
    { id: "attempt_500", name: "Persistent",      desc: "Make 500 attempts.",        stat: "totalAttempts",        target: 500,   reward: { diamonds: 20 } },
    { id: "orb_100",     name: "Ring Bearer",     desc: "Touch 100 jump orbs.",      stat: "totalOrbs",            target: 100,   reward: { diamonds: 10 } },
    { id: "level_1",     name: "Getting Started", desc: "Complete any level.",       stat: "completedLevels",      target: 1,     reward: { diamonds: 10 } },
    { id: "level_5",     name: "Five Down",       desc: "Complete 5 levels.",        stat: "completedLevels",      target: 5,     reward: { diamonds: 25 } },
    { id: "level_10",    name: "Halfway There",   desc: "Complete 10 levels.",       stat: "completedLevels",      target: 10,    reward: { diamonds: 40 } },
    { id: "star_10",     name: "Star Collector",  desc: "Earn 10 stars.",            stat: "collectedStars",       target: 10,    reward: { diamonds: 10 } },
    { id: "star_50",     name: "Star Hoarder",    desc: "Earn 50 stars.",            stat: "collectedStars",       target: 50,    reward: { diamonds: 30 } },
    { id: "star_100",    name: "Constellation",   desc: "Earn 100 stars.",           stat: "collectedStars",       target: 100,   reward: { diamonds: 60 } },
    { id: "coin_3",      name: "Coin Hunter",     desc: "Collect 3 secret coins.",   stat: "collectedSecretCoins", target: 3,     reward: { diamonds: 10 } },
    { id: "coin_15",     name: "Coin Vault",      desc: "Collect 15 secret coins.",  stat: "collectedSecretCoins", target: 15,    reward: { diamonds: 40 } },
    { id: "demon_1",     name: "Demon Slayer",    desc: "Complete a demon level.",   stat: "completedDemonLevels", target: 1,     reward: { diamonds: 35 } },
    { id: "like_1",      name: "Supporter",       desc: "Like an online level.",     stat: "likedLevels",          target: 1,     reward: { diamonds: 5 } },
    { id: "pack_1",      name: "Pack Rat",        desc: "Finish a map pack.",        stat: "completedMapPacks",    target: 1,     reward: { diamonds: 20 } },
    { id: "gauntlet_1",  name: "Gauntlet Runner", desc: "Finish a gauntlet.",        stat: "completedGauntlets",   target: 1,     reward: { diamonds: 25 } }
];

GD.Data.achievement = function (id) {
    var list = GD.Data.ACHIEVEMENTS;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
};

/* Progress of one achievement: {value, target, unlocked, percent}. */
GD.Data.achievementState = function (ach) {
    var value = GD.Save.stats.get(ach.stat);
    var saved = GD.Save.achievement(ach.id);
    var target = ach.target || 1;
    return {
        value: value,
        target: target,
        unlocked: !!saved.unlocked,
        percent: GD.clamp(value / target * 100, 0, 100)
    };
};

/* Called after any run/action: unlocks what is due and pays its reward.
 * Returns the newly unlocked achievements so a screen can toast them. */
GD.Data.checkAchievements = function (scene) {
    var unlocked = [];
    for (var i = 0; i < GD.Data.ACHIEVEMENTS.length; i++) {
        var ach = GD.Data.ACHIEVEMENTS[i];
        var state = GD.Data.achievementState(ach);
        if (state.unlocked || state.value < state.target) continue;
        if (!GD.Save.unlockAchievement(ach.id)) continue;
        GD.Data.payReward(ach.reward);
        unlocked.push(ach);
    }
    if (unlocked.length && scene) GD.Audio.sfx("achievement");
    return unlocked;
};

/* Puts a {diamonds, orbs, keys} bundle into the wallet. */
GD.Data.payReward = function (reward) {
    if (!reward) return;
    var wallet = GD.Save.wallet();
    if (reward.diamonds) wallet.diamonds += reward.diamonds;
    if (reward.orbs) wallet.orbs += reward.orbs;
    if (reward.keys) wallet.keys += reward.keys;
    GD.Save.set("wallet", wallet);
};

/* ---------------------------------------------------------------- currencies
 * The spendable currencies. Stars are progress, not money, so they stay in the
 * stats counters where the profile reads them. */
GD.Data.currencyName = function (key) {
    return key === "orbs" ? "Orbs" : key === "keys" ? "Keys" : "Diamonds";
};

GD.Data.currencyIcon = function (key) {
    return key === "orbs" ? "currencyOrbIcon_001.png"
         : key === "keys" ? "GJ_bigKey_001.png"
         : "GJ_diamondsIcon_001.png";
};

GD.Data.canAfford = function (price, currency) {
    var wallet = GD.Save.wallet();
    return (wallet[currency || "diamonds"] || 0) >= price;
};

/* Takes `price` out of the wallet; false when it does not cover it. */
GD.Data.spend = function (price, currency) {
    var key = currency || "diamonds";
    var wallet = GD.Save.wallet();
    if ((wallet[key] || 0) < price) return false;
    wallet[key] -= price;
    GD.Save.set("wallet", wallet);
    return true;
};

/* -------------------------------------------------------------------- shops
 * `kind` is what the purchase gives you:
 *   icon  — a real icon number for `pool` (the Icon Kit then shows it)
 *   color — a colour triple added to the palette
 *   item  — a cosmetic/reward bundle stored under `unlocked`
 */
GD.Data.SHOPS = [
    {
        id: "community", name: "COMMUNITY SHOP", note: "Icon packs from the community.",
        currency: "diamonds",
        items: [
            { id: "cube_20",  name: "Cube 20",  kind: "icon", pool: "player",      icon: 20, price: 40 },
            { id: "cube_45",  name: "Cube 45",  kind: "icon", pool: "player",      icon: 45, price: 60 },
            { id: "cube_88",  name: "Cube 88",  kind: "icon", pool: "player",      icon: 88, price: 80 },
            { id: "ship_12",  name: "Ship 12",  kind: "icon", pool: "ship",        icon: 12, price: 50 },
            { id: "ball_9",   name: "Ball 9",   kind: "icon", pool: "player_ball", icon: 9,  price: 50 },
            { id: "ufo_14",   name: "UFO 14",   kind: "icon", pool: "bird",        icon: 14, price: 55 },
            { id: "wave_7",   name: "Wave 7",   kind: "icon", pool: "dart",        icon: 7,  price: 55 },
            { id: "robot_5",  name: "Robot 5",  kind: "icon", pool: "robot",       icon: 5,  price: 60 }
        ]
    },
    {
        id: "mechanic", name: "THE MECHANIC", note: "Heavy machinery, heavy prices.",
        currency: "diamonds",
        items: [
            { id: "spider_4",  name: "Spider 4",  kind: "icon", pool: "spider", icon: 4,  price: 70 },
            { id: "spider_9",  name: "Spider 9",  kind: "icon", pool: "spider", icon: 9,  price: 90 },
            { id: "swing_3",   name: "Swing 3",   kind: "icon", pool: "swing",  icon: 3,  price: 70 },
            { id: "jet_2",     name: "Jetpack 2", kind: "icon", pool: "pack",   icon: 2,  price: 80 },
            { id: "robot_11",  name: "Robot 11",  kind: "icon", pool: "robot",  icon: 11, price: 95 },
            { id: "item_weld", name: "Welder Trail", kind: "item", price: 120 }
        ]
    },
    {
        id: "scratch", name: "SCRATCH'S SHOP", note: "Trade diamonds for colours.",
        currency: "diamonds",
        items: [
            { id: "color_lime",    name: "Lime",     kind: "color", color: [120, 255, 40],  price: 30 },
            { id: "color_magenta", name: "Magenta",  kind: "color", color: [255, 40, 200],  price: 30 },
            { id: "color_ice",     name: "Ice Blue", kind: "color", color: [120, 220, 255], price: 30 },
            { id: "color_ember",   name: "Ember",    kind: "color", color: [255, 110, 30],  price: 30 },
            { id: "color_mint",    name: "Mint",     kind: "color", color: [120, 255, 200], price: 40 },
            { id: "color_violet",  name: "Violet",   kind: "color", color: [170, 90, 255],  price: 40 }
        ]
    },
    {
        id: "diamond", name: "DIAMOND SHOP", note: "Keys, orbs and the expensive shelf.",
        currency: "diamonds",
        items: [
            { id: "key_1",       name: "Treasure Key", kind: "item", price: 25, reward: { keys: 1 } },
            { id: "orb_500",     name: "500 Orbs",     kind: "item", price: 20, reward: { orbs: 500 } },
            { id: "key_5",       name: "5 Keys",       kind: "item", price: 100, reward: { keys: 5 } },
            { id: "color_black", name: "Black",        kind: "color", color: [30, 30, 30], price: 150 }
        ]
    }
];

GD.Data.shop = function (id) {
    var list = GD.Data.SHOPS;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
};

/* Applies a purchase. Called only after the price has been taken, so it never
 * has to check the wallet again. */
GD.Data.grant = function (item) {
    if (!item) return;
    if (item.kind === "icon") {
        GD.Save.unlock("icon:" + item.pool + ":" + item.icon);
    } else if (item.kind === "color") {
        var palette = GD.Save.get("unlocked.colors", []);
        palette.push(item.color);
        GD.Save.set("unlocked.colors", palette);
        GD.Save.profile.setColor(1, item.color);
    } else if (item.reward) {
        GD.Data.payReward(item.reward);
    }
    GD.Save.unlock("bought:" + item.id);
};

GD.Data.owned = function (item) {
    return GD.Save.isUnlocked("bought:" + item.id);
};

/* -------------------------------------------------------------------- vaults
 * Three secret rooms, each with its own art and its own code list. The reward
 * of a code is paid once; `GD.Save.unlock("vault:<id>:<code>")` remembers it. */
GD.Data.VAULTS = [
    {
        id: "vault", name: "THE VAULT",
        note: "A locked door under the menu. Crack the codes.",
        background: { top: [46, 30, 16], bottom: [12, 8, 4], ground: false },
        art: "dungeon_gate_001.png",
        codes: [
            { code: "blocktopia", reward: { diamonds: 5 }, text: "5 diamonds" },
            { code: "ahead",      reward: { diamonds: 8 }, text: "8 diamonds" },
            { code: "mule",       reward: { orbs: 200 },   text: "200 orbs" },
            { code: "sparky",     reward: { keys: 1 },     text: "1 key" }
        ]
    },
    {
        id: "secrets", name: "VAULT OF SECRETS",
        note: "The quieter room. Different codes.",
        background: { top: [20, 34, 60], bottom: [6, 10, 20], ground: false },
        art: "GJ_secretLock2_001.png",
        codes: [
            { code: "spooky",      reward: { keys: 1 },      text: "1 key" },
            { code: "neverending", reward: { diamonds: 10 }, text: "10 diamonds" },
            { code: "river",       reward: { orbs: 300 },    text: "300 orbs" },
            { code: "robotop",     reward: { diamonds: 12 }, text: "12 diamonds" }
        ]
    },
    {
        id: "time", name: "CHAMBER OF TIME",
        note: "Where the clock runs backwards.",
        background: { top: [54, 26, 70], bottom: [14, 6, 22], ground: false },
        art: "towerDoor_locked_001.png",
        codes: [
            { code: "silentclub", reward: { keys: 2 },      text: "2 keys" },
            { code: "volcano",    reward: { diamonds: 20 }, text: "20 diamonds" },
            { code: "keeper",     reward: { orbs: 500 },    text: "500 orbs" }
        ]
    }
];

GD.Data.vault = function (id) {
    var list = GD.Data.VAULTS;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
};

/* Tries a code. Returns {ok, text} so the screen can answer either way. */
GD.Data.redeemCode = function (vault, code) {
    var text = ("" + code).toLowerCase().replace(/\s+/g, "");
    for (var i = 0; i < vault.codes.length; i++) {
        var entry = vault.codes[i];
        if (entry.code !== text) continue;
        if (GD.Save.isUnlocked("vault:" + vault.id + ":" + entry.code))
            return { ok: false, text: "Already redeemed." };
        GD.Save.unlock("vault:" + vault.id + ":" + entry.code);
        GD.Data.payReward(entry.reward);
        return { ok: true, text: "Unlocked: " + entry.text };
    }
    return { ok: false, text: "That is not a code." };
};

/* ---------------------------------------------------------------- collections
 * Map packs and gauntlets list simulated online levels (they are the only
 * levels besides the main set that this build can run), so finishing a pack is
 * a real, playable goal. */
function packOf(id, name, base, count, stars, diff) {
    var levels = [];
    for (var i = 0; i < count; i++) levels.push(2000 + base + i);
    return { id: id, name: name, levels: levels, stars: stars, diff: diff };
}

GD.Data.PACKS = [
    packOf("runners", "I Spiked My Runners", 10, 3, 5, 2),
    packOf("chaos",   "Chaos Pack",          20, 3, 7, 3),
    packOf("cosmic",  "Cosmic Pack",         30, 3, 9, 4),
    packOf("frost",   "Frozen Pack",         40, 3, 10, 4),
    packOf("ember",   "Ember Pack",          50, 3, 12, 5),
    packOf("demons",  "Demon Pack",          60, 3, 15, 6),
    packOf("neon",    "Neon Pack",           70, 3, 14, 5),
    packOf("vintage", "Vintage Pack",        80, 3, 12, 5)
];

/* Gauntlets: five levels each, island art from GauntletSheet. */
function gauntletOf(id, name, island, base, stars) {
    var levels = [];
    for (var i = 0; i < 5; i++) levels.push(3000 + base + i);
    return { id: id, name: name, island: "island_" + island + "_001.png",
             levels: levels, stars: stars };
}

GD.Data.GAUNTLETS = [
    gauntletOf("chaos",   "Chaos Gauntlet",   "chaos",   10, 20),
    gauntletOf("crystal", "Crystal Gauntlet", "crystal", 20, 25),
    gauntletOf("death",   "Death Gauntlet",   "death",   30, 30),
    gauntletOf("demon",   "Demon Gauntlet",   "demon",   40, 35),
    gauntletOf("time",    "Time Gauntlet",    "time",    50, 30),
    gauntletOf("lava",    "Lava Gauntlet",    "lava",    60, 30),
    gauntletOf("ice",     "Ice Gauntlet",     "ice",     70, 25),
    gauntletOf("cosmos",  "Cosmos Gauntlet",  "cosmos",  80, 40)
];

/* Progress of a collection, from the save file: a pack counts as done when all
 * of its levels are completed. */
GD.Data.collectionProgress = function (entry) {
    var done = 0;
    for (var i = 0; i < entry.levels.length; i++) {
        if (GD.Save.level("online:" + entry.levels[i]).completed) done++;
    }
    return {
        done: done,
        total: entry.levels.length,
        complete: done === entry.levels.length,
        percent: Math.round(done / entry.levels.length * 100)
    };
};

/* -------------------------------------------------------------------- quests
 * Daily quests read the same counters the achievements do, so "jump 50 times"
 * is finished by actually jumping. A quest is claimed once per save. */
GD.Data.QUESTS = [
    { id: "q_jump",    text: "Jump 50 times today",   stat: "totalJumps",           target: 50, reward: { diamonds: 5 } },
    { id: "q_attempt", text: "Make 10 attempts",      stat: "totalAttempts",        target: 10, reward: { diamonds: 5 } },
    { id: "q_orb",     text: "Touch 5 jump orbs",     stat: "totalOrbs",            target: 5,  reward: { diamonds: 8 } },
    { id: "q_play",    text: "Finish a level",        stat: "completedLevels",      target: 1,  reward: { diamonds: 10 } },
    { id: "q_coin",    text: "Collect a secret coin", stat: "collectedSecretCoins", target: 1,  reward: { diamonds: 8 } }
];

GD.Data.questState = function (quest) {
    var value = GD.Save.stats.get(quest.stat);
    return {
        value: value,
        target: quest.target,
        done: value >= quest.target,
        claimed: GD.Save.isUnlocked("quest:" + quest.id),
        percent: GD.clamp(value / quest.target * 100, 0, 100)
    };
};

GD.Data.claimQuest = function (quest) {
    var state = GD.Data.questState(quest);
    if (!state.done || state.claimed) return false;
    GD.Save.unlock("quest:" + quest.id);
    GD.Data.payReward(quest.reward);
    return true;
};

/* --------------------------------------------------------------- daily chest
 * One chest per calendar day; `chestDay` in the save is the day index that was
 * last opened, so it rolls over at local midnight without a timer. */
GD.Data.dayIndex = function () { return Math.floor(Date.now() / 86400000); };

GD.Data.chestState = function () {
    var day = GD.Data.dayIndex();
    var last = GD.Save.get("daily.chestDay", 0);
    return { available: last !== day, day: day };
};

GD.Data.openChest = function () {
    var state = GD.Data.chestState();
    if (!state.available) return null;
    // The same chest gives the same reward if the popup is reopened: seeded by
    // the day, so it feels random without ever changing under the player.
    var random = (state.day * 2654435761) % 1000 / 1000;
    var reward = {
        diamonds: 10 + Math.floor(random * 15),
        orbs: 100 + Math.floor(random * 400)
    };
    GD.Save.set("daily.chestDay", state.day);
    GD.Data.payReward(reward);
    return reward;
};
