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
        'GJ_GameSheet',       // game objects (blocks, spikes, rings, wave)
        'GJ_GameSheet02',     // editor / control buttons, portals
        'GJ_GameSheet03',     // UI icons (GJ_*), mode buttons
        'GJ_GameSheetIcons',  // default cube icons (player_NN_001.png)
        'icons/ship_01', 'icons/bird_01', 'icons/robot_01',
        'icons/spider_01', 'icons/swing_01'
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

    // Real game-object / player frame names (verified against the plists).
    var FRAMES = {
        cube: 'player_01_001.png',         // default cube icon
        ship: 'ship_01_001.png',
        ball: 'd_ball_01_001.png',
        ufo: 'bird_01_001.png',
        wave: 'd_animWave_01_001.png',
        robot: 'robot_01_01_001.png',
        spider: 'spider_01_01_001.png',
        swing: 'swing_01_001.png',
        block: 'block001_01_001.png',
        spike: 'spike_01_001.png',
        ring: 'ring_01_001.png',            // jump orb/ring
        gravring: 'gravring_01_001.png',    // gravity orb/ring
        portal: 'portal_01_front_001.png'   // portal (front layer)
    };

    function setRoot(p) { root = p || ''; }

    // Load all configured atlases (and start music). Skips any missing file.
    function loadAll(onDone) {
        if (loaded || !root) {
            if (!root) console.log('[GD.Assets] assetsRoot is empty -> procedural art only.');
            if (onDone) onDone();
            return;
        }
        loaded = true;
        console.log('[GD.Assets] root =', root);
        var cache = cc.SpriteFrameCache.getInstance();
        ATLASES.forEach(function (name) {
            var plistPath = root + name + '.plist';
            var pngPath = root + name + '.png';
            try {
                cache.addSpriteFrames(plistPath, pngPath);
                console.log('[GD.Assets] atlas queued:', name);
            } catch (e) {
                console.warn('[GD.Assets] FAILED to queue atlas:', name, e);
            }
        });
        // Deferred check: did the frames actually register (async texture load)?
        setTimeout(function () {
            var ok = !!cc.SpriteFrameCache.getInstance().getSpriteFrame(FRAMES.cube);
            console.log('[GD.Assets] cube frame present after load:', ok);
            if (onDone) onDone();
        }, 1200);
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

    // Build a sprite from a named frame, scaled to the given target width.
    function sizedSprite(name, size) {
        var s = sprite(name);
        if (!s) return null;
        var w = s.getContentSize().width || size;
        if (w > 0 && Math.abs(w - size) > 0.5) s.setScale(size / w);
        return s;
    }

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
        frame: frame, sprite: sprite, sizedSprite: sizedSprite, icon: icon, fontPath: fontPath,
        playMusic: playMusic, playEffect: playEffect,
        ATLASES: ATLASES, ICONS: ICONS, FRAMES: FRAMES
    };
})();

