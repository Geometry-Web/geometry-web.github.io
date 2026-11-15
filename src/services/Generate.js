/* =====================================================================
 * Generate.js — a deterministic level builder for the simulated online levels.
 *
 * The play layer runs levels in the packed form `GD.Levels.pack()` writes:
 *
 *   { id, name, author, stars, diff, song, colour, length, coins,
 *     objects: [[slot, x, y, rot, flags(, coinNumber)], ...] }
 *
 * Building one from code is therefore just arithmetic — no encoder needed. The
 * only thing that matters is that the result is *fair*: the cube jumps 65 units
 * high and covers ~164 units of ground at 1x (500 u/s launch, 1900 u/s^2
 * gravity, 311.58 u/s scroll), so every obstacle below sits on the ground, every
 * spike cluster is narrower than one jump (2-3 spikes = 60-90 units) and every
 * chunk is 600 units wide, which leaves at least two clear jumps between
 * hazards at any speed. Nothing floats above head height, so a jump always
 * clears it.
 * ===================================================================== */
GD.Generate = (function () {
    var SLOT = {};
    ["1", "2", "3", "4", "5", "6", "7", "8", "191", "36", "84", "141",
     "1022", "1333", "1704", "35", "67", "140", "12", "13", "47", "111",
     "660", "745", "1331", "1933", "2064", "10", "11", "142"].forEach(function (id) {
        var def = GD.Levels.OBJECTS[Number(id)];
        if (def) SLOT[id] = def.slot;
    });

    var CHUNK = 600;                 // units per chunk (20 cells)
    var GROUND = 15;                 // y of an object standing on the floor

    /* Chunk templates. `items` are [id, dx, dy]; `coin` optionally marks the
     * cell that hides one of the three secret coins. */
    var TEMPLATES = [
        { id: "flat",   items: [] },
        { id: "spike",  items: [["8", 300, GROUND]] },
        { id: "pairs",  items: [["8", 270, GROUND], ["8", 300, GROUND]] },
        { id: "triple", items: [["8", 255, GROUND], ["8", 285, GROUND], ["8", 315, GROUND]] },
        { id: "spike2", items: [["8", 180, GROUND], ["8", 420, GROUND]] },
        { id: "pad",    items: [["35", 300, GROUND]], coin: [320, 130] },
        { id: "orb",    items: [["36", 300, 75]], coin: [330, 105] },
        { id: "pink",   items: [["141", 300, 80], ["8", 470, GROUND]] },
        { id: "coin",   items: [], coin: [300, 60] },
        { id: "double", items: [["191", 200, GROUND], ["191", 470, GROUND]] }
    ];

    var PALETTE = [
        [40, 125, 255], [0, 190, 255], [90, 210, 90], [255, 160, 40],
        [200, 60, 220], [255, 80, 110], [120, 220, 200], [255, 210, 60]
    ];

    /* Seeded stream shared with GD.Online, so a level and its geometry agree. */
    function rng(seed) {
        var a = (seed * 1103515245 + 12345) >>> 0;
        return function () {
            a = (a * 1664525 + 1013904223) >>> 0;
            return a / 4294967296;
        };
    }

    /* level (a GD.Online record) -> packed level the play layer can run. */
    function level(record) {
        var random = rng(record.id || 1);
        var objects = [];
        var chunks = Math.max(6, Math.round((record.lengthUnits || 6000) / CHUNK));
        var hardness = GD.clamp((record.diff || 2) / 8, 0, 1);
        var coinsLeft = 3;

        for (var c = 0; c < chunks; c++) {
            // Difficulty only changes how often a hazard shows up, never how
            // tight one is: the geometry stays inside the jump envelope.
            var roll = random();
            var template = TEMPLATES[0];
            if (c === 0 || c === chunks - 1) {
                template = TEMPLATES[0];          // clear runway in and out
            } else if (roll < 0.28 + hardness * 0.3) {
                template = TEMPLATES[1 + Math.floor(random() * (TEMPLATES.length - 1))];
            }

            for (var i = 0; i < template.items.length; i++) {
                var item = template.items[i];
                var slot = SLOT[item[0]];
                if (slot === undefined) continue;
                objects.push([slot, c * CHUNK + item[1], item[2], 0, 0]);
            }

            if (template.coin && coinsLeft > 0) {
                objects.push([SLOT["142"], c * CHUNK + template.coin[0],
                              template.coin[1], 0, 0, 4 - coinsLeft]);
                coinsLeft--;
            }
        }

        // Every level hides all three coins even if the templates ran out.
        for (var extra = coinsLeft; extra > 0; extra--) {
            objects.push([SLOT["142"], 300 + extra * 900, 60, 0, 0, 4 - extra]);
        }

        objects.sort(function (a, b) { return (a[1] - b[1]) || (a[2] - b[2]); });

        var colour = PALETTE[(record.id || 0) % PALETTE.length];
        return {
            id: "sim:" + (record.id || 0),
            name: record.name || "Simulated Level",
            author: record.author || "sim_author",
            stars: record.stars || 0,
            diff: record.diff || 0,
            song: "StereoMadness",
            colour: colour,
            length: chunks * CHUNK + 300,
            coins: 3,
            objects: objects
        };
    }

    /* A blank level for the editor: a flat runway the player can build on. */
    function blank(name, author) {
        return {
            id: "editor",
            name: name || "My Level",
            author: author || GD.Save.profile.name(),
            stars: 0,
            diff: 0,
            song: "StereoMadness",
            colour: [40, 125, 255],
            length: 4200,
            coins: 0,
            objects: []
        };
    }

    return {
        CHUNK: CHUNK,
        slotOf: function (id) { return SLOT["" + id]; },
        level: level,
        blank: blank
    };
})();
