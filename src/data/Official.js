/* =====================================================================
 * Official.js — metadata for the official (RobTop) main levels.
 *
 * The numbers that matter — id, name, author, difficulty id, stars, secret
 * coins, song, object count, level length in units — are NOT written here by
 * hand: they come from `levels/manifest.json`, which `tools/level-import.js`
 * extracts from the level files GD itself ships. Reading them back from the
 * manifest is what keeps the level select from drifting away from the data the
 * play layer runs.
 *
 * What this file adds is the presentation layer the manifest has no room for:
 * the difficulty *names* GD uses for the face ids, the level-length category
 * (Tiny..XL, derived from the run time at 1x) and a one-line description of
 * what the level introduces. Those are original notes for this build, not
 * quotes from the game.
 * ===================================================================== */
GD.Data = GD.Data || {};

GD.Data.DIFFICULTY = {
    0:  { name: "Auto",     face: 0 },
    1:  { name: "Easy",     face: 1 },
    2:  { name: "Normal",   face: 2 },
    3:  { name: "Hard",     face: 3 },
    4:  { name: "Harder",   face: 4 },
    5:  { name: "Insane",   face: 5 },
    6:  { name: "Easy Demon",    face: 6 },
    7:  { name: "Medium Demon",  face: 7 },
    8:  { name: "Hard Demon",    face: 8 },
    9:  { name: "Insane Demon",  face: 9 },
    10: { name: "Extreme Demon", face: 10 }
};

GD.Data.difficultyName = function (diff) {
    var row = GD.Data.DIFFICULTY[diff];
    return row ? row.name : "Normal";
};

/* GD's own length scale, from the run time at 1x (387.42 units/second). */
GD.Data.lengthCategory = function (units) {
    var seconds = units / 387.42;
    if (seconds < 10) return "Tiny";
    if (seconds < 30) return "Short";
    if (seconds < 60) return "Medium";
    if (seconds < 120) return "Long";
    return "XL";
};

/* One line per main level: what it is there to teach. Kept short enough for a
 * level-info panel row. */
GD.Data.OFFICIAL_NOTES = {
    1:  "The first level: cube jumps, a few spikes and the ship's debut.",
    2:  "Straightforward cube rhythm with taller spike stacks.",
    3:  "Introduces tighter timing and the first blue jump pads.",
    4:  "Ship sections come back with narrower corridors.",
    5:  "Alternating cube and ship segments, faster pace.",
    6:  "Long cube stretch, jump orbs over spike fields.",
    7:  "Spike-heavy rhythm level with gravity portals.",
    8:  "Ship corridors, teleporting pads and mixed gravity.",
    9:  "Ball mode's first appearance, with long spike runs.",
    10: "Wave-free, but the fastest speed so far and tight orb chains.",
    11: "Wave introduced, then woven through cube and ship parts.",
    12: "UFO mode debuts here, alongside moving jump pads.",
    13: "Alternating modes with long UFO and wave stretches.",
    14: "RobTop's first demon: precise orb chains in every mode.",
    15: "Speed portals throughout, three times faster than level 1.",
    16: "Dual sections and mirror-like symmetry in the ship.",
    17: "Constant mode switching with fast gravity flips.",
    18: "Second demon, UFO heavy, long and punishing.",
    19: "Robot mode debuts with variable-height jumps.",
    20: "Final demon of the set: mixed modes at 3x speed.",
    21: "Spider mode debuts, with teleport-style surface snaps.",
    22: "2.2's main level: swing and jetpack sections, new orbs."
};

/* The official list, merged with the manifest. Cached: the manifest read is a
 * synchronous XHR and every screen that needs level data asks for it. */
GD.Data._official = null;

GD.Data.official = function () {
    if (GD.Data._official) return GD.Data._official;

    var list = (GD.Levels.catalog() || []).map(function (entry) {
        var diff = entry.diff === undefined ? 0 : entry.diff;
        return {
            id: entry.id,
            name: entry.name,
            author: entry.author || "RobTop",
            diff: diff,
            stars: entry.stars || 0,
            moons: 0,
            coins: entry.coins || 0,
            song: entry.song || null,
            songName: entry.song || "",
            objects: entry.objects || 0,
            units: entry.length || 0,
            length: GD.Data.lengthCategory(entry.length || 0),
            difficulty: GD.Data.difficultyName(diff),
            description: GD.Data.OFFICIAL_NOTES[entry.id] || "",
            twoPlayer: false
        };
    });

    GD.Data._official = list;
    return list;
};

GD.Data.officialById = function (id) {
    var list = GD.Data.official();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
};

/* Song credits for the main levels (composer names, as GD shows them). */
GD.Data.SONG_AUTHORS = {
    StereoMadness: "ForeverBound",
    BackOnTrack: "DJVI",
    Polargeist: "Step",
    DryOut: "DJVI",
    BaseAfterBase: "DJVI",
    CantLetGo: "DJVI",
    Jumper: "Waterflame",
    TimeMachine: "Waterflame",
    Cycles: "DJVI",
    xStep: "DJVI",
    Clutterfunk: "Waterflame",
    TheoryOfEverything: "DJVI",
    Electroman: "Waterflame",
    Clubstep: "DJVI",
    Electrodynamix: "DJVI",
    HexagonForce: "Waterflame",
    BlastProcessing: "Waterflame",
    TheoryOfEverything2: "DJVI",
    GeometricalDominator: "Waterflame",
    Deadlocked: "F-777",
    Fingerdash: "MDK"
    // Dash (2.2) is not in the shipped audio set; it falls back to "Unknown".
};

GD.Data.songAuthor = function (song) {
    return GD.Data.SONG_AUTHORS[song] || "Unknown";
};
