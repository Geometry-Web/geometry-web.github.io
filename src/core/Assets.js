/**
 * Web Dashers — automatic asset detection + fallback.
 *
 * Probes for a local Resources folder and uses real assets when present;
 * otherwise falls back to original artwork per-asset. Never blocks startup,
 * and never assumes assets are present or absent — the files decide.
 */
window.GD = window.GD || {};

GD.Assets = (function () {
    var root = '';
    var initialized = false;

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

    // HTTP probe: does this URL resolve successfully?
    function httpOk(url, cb) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.timeout = 4000;
            xhr.onload = function () { cb(xhr.status >= 200 && xhr.status < 300); };
            xhr.onerror = function () { cb(false); };
            xhr.ontimeout = function () { cb(false); };
            xhr.send();
        } catch (e) { cb(false); }
    }

    // Find a reachable Resources root (explicit config override wins).
    function detectRoot(cb) {
        var explicit = (window.GD && GD.C && GD.C.assetsRoot) || '';
        var roots = explicit ? [explicit] : ['./Resources/', '../Resources/'];
        var i = 0;
        (function next() {
            if (i >= roots.length) { cb(''); return; }
            var r = roots[i++];
            httpOk(r + 'GJ_GameSheet.plist', function (ok) {
                if (ok) cb(r); else next();
            });
        })();
    }

    function loadAll(onDone) {
        if (initialized) { if (onDone) onDone(); return; }
        initialized = true;
        var finish = function () { if (onDone) onDone(); };
        detectRoot(function (r) {
            root = r;
            if (!root) {
                console.log('[Assets] no Resources folder found -> original artwork.');
                setTimeout(finish, 0);
                return;
            }
            console.log('[Assets] resource root:', root);
            ATLASES.forEach(function (name) {
                try {
                    cc.SpriteFrameCache.getInstance().addSpriteFrames(root + name + '.plist', root + name + '.png');
                } catch (e) {
                    console.warn('[Assets] failed to load atlas:', name, e);
                }
            });
            setTimeout(function () {
                console.log('[Assets] cube frame present:', !!frame(FRAMES.cube));
                finish();
            }, 250);
        });
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
        loadAll: loadAll,
        frame: frame, sprite: sprite, sizedSprite: sizedSprite, icon: icon, fontPath: fontPath,
        playMusic: playMusic, playEffect: playEffect,
        ATLASES: ATLASES, ICONS: ICONS, FRAMES: FRAMES
    };
})();

