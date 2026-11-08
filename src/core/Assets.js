/**
 * Geometry Web — Geometry Dash asset integration (personal, LOCAL use).
 *
 * Loads the ORIGINAL Geometry Dash resources from your local installation at
 * runtime via cocos2d-html5's native caches (cc.SpriteFrameCache / cc.AudioEngine).
 * No asset file is copied into this project: the game reads them from a folder
 * you serve yourself.
 *
 * IMPORTANT: these are RobTop Games' copyrighted assets. They may only be used
 * for your own personal, non-distributed reconstruction. Do NOT publish or
 * redistribute them.
 */
window.GD = window.GD || {};

GD.Assets = (function () {
    var root = '';
    var loaded = false;

    // Real atlases in Resources/ (each has a matching .png). Verified present.
    var ATLASES = [
        'GJ_GameSheet',     // player icons (d_*), game objects
        'GJ_GameSheet02',   // editor / control buttons
        'GJ_GameSheet03'    // UI icons (GJ_*)
    ];

    // Real UI icon frame names (verified against the installed Resources).
    var ICONS = {
        editor: 'GJ_hammerIcon_001.png',
        music: 'GJ_musicIcon_001.png',
        sfx: 'GJ_sfxIcon_001.png',
        demon: 'GJ_demonIcon_001.png',
        coins: 'GJ_coinsIcon_001.png',
        diamonds: 'GJ_diamondsIcon_001.png'
    };

    function setRoot(p) { root = p || ''; }

    // Load all configured atlases (and start music). Skips any missing file.
    function loadAll(onDone) {
        if (loaded || !root) { if (onDone) onDone(); return; }
        loaded = true;
        var cache = cc.SpriteFrameCache.getInstance();
        ATLASES.forEach(function (name) {
            try {
                cache.addSpriteFrames(root + name + '.plist', root + name + '.png');
            } catch (e) { /* missing atlas: skip */ }
        });
        if (onDone) onDone();
    }

    // Look up a frame by name (with or without the .png suffix).
    function frame(name) {
        try {
            var c = cc.SpriteFrameCache.getInstance();
            return c.getSpriteFrame(name) ||
                (name.indexOf('.png') < 0 ? c.getSpriteFrame(name + '.png') : null);
        } catch (e) { return null; }
    }

    // Build a cc.Sprite from a named frame, or null if not loaded.
    function sprite(name) {
        var f = frame(name);
        if (!f) return null;
        var s = new cc.Sprite();
        return s.initWithSpriteFrame(f) ? s : null;
    }

    // Sprite for a known UI icon key (editor/music/sfx/demon/coins/diamonds).
    function icon(key) { return sprite(ICONS[key]); }

    // Path for a BMFont (for cc.LabelBMFont), e.g. fontPath('bigFont').
    function fontPath(name) { return root + name + '.fnt'; }

    function playMusic(name, loop) {
        try { cc.AudioEngine.getInstance().playMusic(root + name, !!loop); } catch (e) {}
    }
    function playEffect(name) {
        try { cc.AudioEngine.getInstance().playEffect(root + name, false); } catch (e) {}
    }

    return {
        setRoot: setRoot, loadAll: loadAll,
        frame: frame, sprite: sprite, icon: icon, fontPath: fontPath,
        playMusic: playMusic, playEffect: playEffect,
        ATLASES: ATLASES, ICONS: ICONS
    };
})();

