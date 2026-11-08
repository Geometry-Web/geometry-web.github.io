/**
 * Geometry Web — level format and built-in levels (original).
 *
 * A level is: { name, speed, objects:[...] }.
 * Object schema (world coordinates, origin bottom-left, y increases upward):
 *   block  : {type:'block',  x, y, w, h}
 *   spike  : {type:'spike',  x, y}            (y = ground line)
 *   orb    : {type:'orb',    x, y, action:'jump'|'gravity'}
 *   pad    : {type:'pad',    x, y, action:'jump'|'gravity'}
 *   portal : {type:'portal', x, y, mode:'ship'|'cube'|'ball'|'wave'}
 *   speed  : {type:'speed',  x, y, mult:0.5|1|2|3}
 *   gravity: {type:'gravity', x, y}            (flips gravity)
 *   size   : {type:'size',   x, y, mult:0.72|1.32}
 *   checkpoint: {type:'checkpoint', x, y}       (respawn point)
 *   coin   : {type:'coin',   x, y}
 *   finish : {type:'finish', x, y}
 */
window.GD = window.GD || {};

GD.Level = (function () {
    function make(name, speed, objects) {
        return { name: name, speed: speed || 1, objects: objects || [] };
    }

    function validate(level) {
        if (!level || typeof level !== 'object') return { ok: false, error: 'not an object' };
        if (!Array.isArray(level.objects)) return { ok: false, error: 'objects not an array' };
        return { ok: true };
    }

    // Hand-authored built-in levels (original layouts).
    var builtin = [
        make('Stereo Start', 1, [
            { type: 'block',  x: 240, y: 60, w: 30, h: 60 },
            { type: 'spike',  x: 360, y: 60 },
            { type: 'spike',  x: 390, y: 60 },
            { type: 'orb',    x: 430, y: 150, action: 'jump' },
            { type: 'spike',  x: 520, y: 60 },
            { type: 'block',  x: 560, y: 60, w: 90, h: 90 },
            { type: 'pad',    x: 700, y: 60, action: 'jump' },
            { type: 'spike',  x: 760, y: 60 },
            { type: 'spike',  x: 790, y: 60 },
            { type: 'portal', x: 900, y: 60, mode: 'ship' },
            { type: 'coin',   x: 980, y: 220 },
            { type: 'coin',   x: 1020, y: 240 },
            { type: 'coin',   x: 1060, y: 260 },
            { type: 'portal', x: 1250, y: 60, mode: 'cube' },
            { type: 'spike',  x: 1400, y: 60 },
            { type: 'block',  x: 1450, y: 60, w: 30, h: 120 },
            { type: 'finish', x: 1650, y: 90 }
        ]),

        make('Gravity Lesson', 1, [
            { type: 'orb',    x: 280, y: 140, action: 'gravity' },
            { type: 'block',  x: 420, y: 60, w: 60, h: 160 },
            { type: 'spike',  x: 470, y: 60 },
            { type: 'orb',    x: 520, y: 150, action: 'jump' },
            { type: 'portal', x: 640, y: 60, mode: 'ball' },
            { type: 'spike',  x: 800, y: 60 },
            { type: 'spike',  x: 830, y: 60 },
            { type: 'pad',    x: 880, y: 60, action: 'gravity' },
            { type: 'spike',  x: 960, y: 60 },
            { type: 'portal', x: 1080, y: 60, mode: 'wave' },
            { type: 'spike',  x: 1240, y: 60 },
            { type: 'portal', x: 1350, y: 60, mode: 'cube' },
            { type: 'finish', x: 1550, y: 90 }
        ]),

        make('Mode Gallery', 1, [
            { type: 'portal', x: 300, y: 60, mode: 'ship' },
            { type: 'spike',  x: 420, y: 60 },
            { type: 'portal', x: 620, y: 60, mode: 'ufo' },
            { type: 'checkpoint', x: 760, y: 130 },
            { type: 'portal', x: 900, y: 60, mode: 'robot' },
            { type: 'block',  x: 1040, y: 60, w: 30, h: 90 },
            { type: 'portal', x: 1220, y: 60, mode: 'spider' },
            { type: 'gravity', x: 1400, y: 130 },
            { type: 'portal', x: 1560, y: 60, mode: 'swing' },
            { type: 'size',   x: 1720, y: 130, mult: 0.72 },
            { type: 'portal', x: 1880, y: 60, mode: 'cube' },
            { type: 'finish', x: 2100, y: 90 }
        ])
    ];

    function loadCustom() {
        try {
            var raw = localStorage.getItem(GD.C.saveKeyLevels);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function saveCustom(levels) {
        try { localStorage.setItem(GD.C.saveKeyLevels, JSON.stringify(levels)); }
        catch (e) { /* storage may be unavailable */ }
    }

    return {
        make: make,
        validate: validate,
        builtin: builtin,
        loadCustom: loadCustom,
        saveCustom: saveCustom
    };
})();
