/* =====================================================================
 * GD.js — shared namespace, constants and drawing helpers.
 *
 * Geometry Dash runs at a 480x320 logical resolution; this build keeps the
 * 960x540 design canvas the project was measured against, so every sprite
 * frame taken from the GD sheets is drawn at ~2x its native size. The UI kit
 * (UI.js) owns those sizes; this file only provides primitives.
 *
 * Coordinate convention (matches main.js / MyApp.js):
 *   origin bottom-left, +Y up, x/y are element CENTRES, 1 unit = 1 canvas px.
 * ===================================================================== */
var GD = window.GD || {};
window.GD = GD;

GD.W = 960;
GD.H = 540;

/* Sprite sheets shipped under res/gd. `suffix` is the version stamp used for
 * cache busting: bump it when the sheet changes so browsers refetch the plist. */
GD.SHEETS = [
    { plist: "res/gd/GJ_GameSheet03.plist" },   // menu / UI chrome
    { plist: "res/gd/GJ_GameSheet04.plist" },   // menu tiles, small icons
    { plist: "res/gd/GJ_GameSheet02.plist" },   // blocks, spikes, portals
    { plist: "res/gd/GJ_GameSheet.plist" },     // gameplay sheet (older split)
    { plist: "res/gd/GJ_GameSheetIcons.plist" } // player icons
];

GD.FONT = {
    big: "res/gd/bigFont.fnt",     // Pusab — GD's main UI font
    gold: "res/gd/goldFont.fnt"    // gold Pusab — counters
};

/* Frame names used by the shared UI kit. Every one of these is present in the
 * shipped sheets (verified with tools/frame-info.js) — nothing is invented. */
GD.A = {
    // Popup / table chrome (GJ_GameSheet03).
    panelTop: "GJ_table_top_001.png",
    panelBottom: "GJ_table_bottom_001.png",
    panelSide: "GJ_table_side_001.png",
    panelCorner: "GJ_table_corner_001.png",
    panelTop02: "GJ_table_top02_001.png",

    // Buttons.
    btnGreen: "GJ_longBtn01_001.png",
    btnBlue: "GJ_longBtn02_001.png",
    btnPurple: "GJ_longBtn03_001.png",
    btnGrey: "GJ_longBtn04_001.png",
    btnRed: "GJ_longBtn05_001.png",
    btnCyan: "GJ_longBtn06_001.png",
    btnYellow: "GJ_longBtn07_001.png",
    close: "GJ_closeBtn_001.png",
    back: "GJ_arrow_02_001.png",
    arrowLeft: "GJ_arrow_01_001.png",
    arrowRight: "GJ_arrow_02_001.png",
    arrowBack: "GJ_arrow_03_001.png",
    checkOn: "GJ_checkOn_001.png",
    checkOff: "GJ_checkOff_001.png",
    tabOn: "GJ_tabOn_001.png",
    tabOff: "GJ_tabOff_001.png",

    // Currency + counters.
    star: "GJ_starsIcon_001.png",
    bigStar: "GJ_bigStar_001.png",
    moon: "GJ_moonsIcon_001.png",
    bigMoon: "GJ_bigMoon_001.png",
    diamond: "GJ_diamondsIcon_001.png",
    bigDiamond: "GJ_bigDiamond_001.png",
    coin: "GJ_coinsIcon_001.png",
    coin2: "GJ_coinsIcon2_001.png",
    key: "GJ_bigKey_001.png",
    orb: "currencyOrbIcon_001.png",
    points: "GJ_pointsIcon_001.png",
    fire: "fireBoost_001.png",

    // Level meta icons.
    download: "GJ_downloadsIcon_001.png",
    like: "GJ_likesIcon_001.png",
    demon: "GJ_demonIcon_001.png",
    featured: "GJ_featuredIcon_001.png",
    epic: "GJ_epicCoin_001.png",
    completed: "GJ_completesIcon_001.png",
    attempts: "GJ_attemptsIcon_001.png",
    lock: "GJ_lock_001.png",
    lockOpen: "GJ_lock_open_001.png",
    lockBig: "GJLargeLock_001.png",
    info: "GJ_infoIcon_001.png",
    time: "GJ_timeIcon_001.png",

    // Difficulty faces live in difficulty_00 .. difficulty_10.
    difficulty: function (id) {
        return "difficulty_" + (id < 10 ? "0" + id : id) + "_btn_001.png";
    }
};


/* ---------------------------------------------------------------- colours */
GD.c3 = function (rgb) {
    if (typeof rgb === "string") return cc.c3b(parseInt(rgb.substr(1, 2), 16),
                                               parseInt(rgb.substr(3, 2), 16),
                                               parseInt(rgb.substr(5, 2), 16));
    return cc.c3b(rgb[0], rgb[1], rgb[2]);
};
GD.c4 = function (rgba) { return cc.c4b(rgba[0], rgba[1], rgba[2], rgba.length > 3 ? rgba[3] : 255); };

/* GD's palette as used by the shipped menus. */
GD.COLOR = {
    white: cc.c3b(255, 255, 255),
    black: cc.c3b(0, 0, 0),
    gold: cc.c3b(255, 220, 90),
    green: cc.c3b(120, 220, 70),
    textGrey: cc.c3b(190, 190, 190),
    lockedGrey: cc.c3b(140, 140, 140),
    blueBgTop: cc.c3b(26, 78, 214),
    blueBgBottom: cc.c3b(12, 110, 243),
    purpleBgTop: cc.c3b(88, 0, 126),
    purpleBgBottom: cc.c3b(140, 0, 190),
    overlay: cc.c4b(0, 0, 0, 160)
};

/* ---------------------------------------------------------------- sprites */
/* Some of GD's UI art ships as standalone PNGs rather than inside a sheet:
 * GJ_button_*, GJ_square*, slider*, GJ_progressBar_001, loadingCircle,
 * GJ_gradientBG, groundSquare_*. Those have no frame-cache entry, so their size
 * is read straight out of the PNG header. The read is synchronous and cached:
 * it runs once per file, keeps the very first frame's layout correct, and the
 * texture itself still loads asynchronously like every other image. */
GD._looseSizes = {};
GD.looseSize = function (file) {
    if (GD._looseSizes[file] !== undefined) return GD._looseSizes[file];

    var size = null;
    try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "res/gd/" + file, false);
        if (xhr.overrideMimeType) xhr.overrideMimeType("text/plain; charset=x-user-defined");
        xhr.send(null);
        var text = xhr.responseText || "";
        if (text.length >= 24) {
            var byte = function (i) { return text.charCodeAt(i) & 0xff; };
            if (byte(0) === 0x89 && byte(1) === 0x50 && byte(2) === 0x4e && byte(3) === 0x47) {
                size = cc.size(((byte(16) << 24) | (byte(17) << 16) | (byte(18) << 8) | byte(19)) >>> 0,
                               ((byte(20) << 24) | (byte(21) << 16) | (byte(22) << 8) | byte(23)) >>> 0);
            }
        }
    } catch (e) {
        cc.log("GD.looseSize: " + file + " -> " + e);
    }
    GD._looseSizes[file] = size;
    return size;
};

/* Native size of a frame or loose PNG (cc.size(0,0) when neither exists). */
GD.frameSize = function (frame) {
    var sf = cc.SpriteFrameCache.getInstance().getSpriteFrame(frame);
    if (sf) {
        var original = sf.getOriginalSize ? sf.getOriginalSize() : null;
        if (original && original.width > 0 && original.height > 0) return original;
        var rect = sf.getRect();
        return cc.size(rect.width, rect.height);
    }
    return GD.looseSize(frame) || cc.size(0, 0);
};

/* Sprite for a sheet frame or a loose PNG; null when the art is not shipped.
 * Loose sprites get their rect set up front so getContentSize() is usable
 * immediately, not just after the image finishes loading. */
GD.frameSprite = function (frame) {
    var cache = cc.SpriteFrameCache.getInstance();
    if (cache.getSpriteFrame(frame)) return cc.Sprite.createWithSpriteFrameName(frame);

    var size = GD.looseSize(frame);
    if (!size || !size.width || !size.height) return null;
    var sprite = cc.Sprite.create("res/gd/" + frame);
    if (!sprite) return null;
    sprite.setTextureRect(cc.rect(0, 0, size.width, size.height));
    return sprite;
};

/* Returns a sprite for `frame`, or a visible placeholder when the art is not in
 * the cache. A placeholder is loud on purpose: silent holes in the art are how
 * "it looks fine" bugs get shipped. */
GD.sprite = function (frame, fallbackScale) {
    var sprite = GD.frameSprite(frame);
    if (sprite) return sprite;

    if (!GD._missing) GD._missing = {};
    if (!GD._missing[frame]) {
        GD._missing[frame] = true;
        cc.log("GD.sprite: missing frame " + frame);
    }
    var box = cc.LayerColor.create(cc.c4b(190, 0, 140, 255), 24, 24);
    box.setContentSize(24, 24);
    var node = cc.Node.create();
    node.addChild(box, 0);
    box.setPosition(0, 0);
    if (fallbackScale) node.setScale(fallbackScale);
    return node;
};

/* True when the frame exists (in a sheet or as a loose PNG) — used by screens
 * that degrade gracefully. */
GD.hasFrame = function (frame) {
    var size = GD.frameSize(frame);
    return !!(size && size.width > 0 && size.height > 0);
};

/* ---------------------------------------------------------------- labels */
/* BM label with GD defaults. opts: {scale, color, width, align, anchor}. */
GD.label = function (text, opts) {
    opts = opts || {};
    var label = cc.LabelBMFont.create("" + (text === undefined || text === null ? "" : text),
                                      opts.font || GD.FONT.big);
    if (opts.scale !== undefined) label.setScale(opts.scale);
    if (opts.color) label.setColor(opts.color);
    if (opts.width) {
        label.setWidth(opts.width);
        if (opts.align !== undefined) label.setAlignment(opts.align);
    }
    if (opts.anchor) label.setAnchorPoint(opts.anchor[0], opts.anchor[1]);
    return label;
};

/* Gold counter text (the Stats / currency numbers). */
GD.gold = function (text, scale) {
    return GD.label(text, { font: GD.FONT.gold, scale: scale === undefined ? 1 : scale,
                            color: cc.c3b(255, 255, 255) });
};

/* --------------------------------------------------------------- geometry */
GD.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
GD.fmt = function (n) {
    var s = "" + Math.floor(n || 0), out = "", c = 0;
    for (var i = s.length - 1; i >= 0; i--) {
        out = s.charAt(i) + out;
        if (++c % 3 === 0 && i > 0 && s.charAt(i - 1) !== "-") out = "," + out;
    }
    return out;
};
/* 12345 -> "12.3K" (GD abbreviates big download counts). */
GD.short = function (n) {
    n = Math.floor(n || 0);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 100000) return Math.floor(n / 1000) + "K";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return "" + n;
};

/* -------------------------------------------------------------- nine-slice */
/* GD stretches most of its chrome with CCScale9Sprite, which this engine build
 * does not ship. Compose the same result from nine sprites cut out of one frame:
 * corners keep their native size, edges stretch along one axis and the centre
 * stretches both ways. `insets` = {left, right, top, bottom} in source pixels.
 *
 * Rect coordinates follow cc.SpriteFrame.getRect(), i.e. y grows DOWN from the
 * top of the frame, which is the space cc.Sprite.setTextureRect() expects. */
GD.nine = function (frame, width, height, insets) {
    var node = cc.Node.create();

    var sf = cc.SpriteFrameCache.getInstance().getSpriteFrame(frame);
    var base = sf ? sf.getRect() : null;
    if (!base) {
        var loose = GD.looseSize(frame);
        if (!loose || !loose.width || !loose.height) return node;   // no art at all
        base = cc.rect(0, 0, loose.width, loose.height);
    }

    var sw = base.width, sh = base.height;
    var i = insets || {};
    var l = i.left === undefined ? sw * 0.3 : i.left;
    var r = i.right === undefined ? sw * 0.3 : i.right;
    var t = i.top === undefined ? sh * 0.3 : i.top;
    var b = i.bottom === undefined ? sh * 0.3 : i.bottom;

    var midW = sw - l - r, midH = sh - t - b;
    var wantMidW = width - l - r, wantMidH = height - t - b;

    // Degenerate target: fall back to a single stretched sprite.
    if (midW <= 0 || midH <= 0 || wantMidW <= 0 || wantMidH <= 0) {
        var only = GD.frameSprite(frame);
        if (only) {
            only.setScaleX(width / sw);
            only.setScaleY(height / sh);
            node.addChild(only);
        }
        return node;
    }

    /* One piece: cut srcW x srcH at (srcX, srcY) measured from the frame's
     * top-left, put it at (dstX, dstY) relative to the node centre. */
    function part(srcX, srcY, srcW, srcH, dstX, dstY, scaleX, scaleY) {
        var s = GD.frameSprite(frame);
        if (!s) return;
        s.setTextureRect(cc.rect(base.x + srcX, base.y + srcY, srcW, srcH));
        // Untrimmed crops must not inherit a trimmed frame's centre offset.
        if (s._unflippedOffsetPositionFromCenter) s._unflippedOffsetPositionFromCenter = cc.p(0, 0);
        s.setScaleX(scaleX);
        s.setScaleY(scaleY);
        s.setPosition(dstX, dstY);
        node.addChild(s);
    }

    var scaleMidW = wantMidW / midW, scaleMidH = wantMidH / midH;
    var xL = -width / 2 + l / 2, xR = width / 2 - r / 2, xM = 0;
    var yT = height / 2 - t / 2, yB = -height / 2 + b / 2, yM = 0;
    var srcMidX = l, srcMidY = t;

    part(0, 0, l, t, xL, yT, 1, 1);                                     // corners
    part(sw - r, 0, r, t, xR, yT, 1, 1);
    part(0, sh - b, l, b, xL, yB, 1, 1);
    part(sw - r, sh - b, r, b, xR, yB, 1, 1);
    part(srcMidX, 0, midW, t, xM, yT, scaleMidW, 1);                    // top / bottom
    part(srcMidX, sh - b, midW, b, xM, yB, scaleMidW, 1);
    part(0, srcMidY, l, midH, xL, yM, 1, scaleMidH);                    // left / right
    part(sw - r, srcMidY, r, midH, xR, yM, 1, scaleMidH);
    part(srcMidX, srcMidY, midW, midH, xM, yM, scaleMidW, scaleMidH);   // centre
    return node;
};

/* --------------------------------------------------------------- sheet prep */
/* Adds every shipped plist to the frame cache exactly once. Layers call this
 * from init(); re-adding is harmless but the flag keeps it off the hot path. */
GD._sheetsLoaded = false;
GD.loadSheets = function () {
    if (GD._sheetsLoaded) return;
    var cache = cc.SpriteFrameCache.getInstance();
    for (var i = 0; i < GD.SHEETS.length; i++) {
        try {
            cache.addSpriteFrames(GD.SHEETS[i].plist);
        } catch (e) {
            cc.log("GD.loadSheets: " + GD.SHEETS[i].plist + " -> " + e);
        }
    }
    GD._sheetsLoaded = true;
};

/* ------------------------------------------------------------- icon kit set */
/* GD 2.2 keeps player icons outside the game sheets: every icon is its own
 * little atlas, Resources/icons/<family>_<n>.png + .plist, holding the icon
 * body, its detail layer and its glow side by side. GJ_GameSheetIcons — the
 * sheet this build used to rely on — is a truncated rip (249 cubes, 79 ships),
 * so the Icon Kit ran out of icons after a few pages.
 *
 * res/gd/icons/ therefore carries the complete SD set (1205 icons: 483 cubes,
 * 169 ships, 118 balls, 149 UFOs, 96 waves, 68 robots, 69 spiders, 43 swings,
 * 8 jetpacks) plus manifest.json — the body frame rect of every icon — built by
 * tools/icon-manifest.js. One PNG per icon and one rect lookup is all the
 * runtime needs: no plist is parsed on the main thread, and only the icons of
 * the page being looked at are fetched. */
GD.ICONS = {
    dir: "res/gd/icons/",
    manifest: "res/gd/icons/manifest.json",
    // Icon-Kit tab pool -> atlas family. Only the jetpack tab differs: the
    // layout calls that pool "pack", the files are called "jetpack".
    family: {
        player: "player", ship: "ship", player_ball: "player_ball", bird: "bird",
        dart: "dart", robot: "robot", spider: "spider", swing: "swing",
        pack: "jetpack"
    }
};

GD._iconManifest = null;    // parsed manifest, or false when it is unavailable
GD._iconPools = {};         // pool -> [icon number, ...] in grid order
GD._iconFrames = {};        // "<family>_<nn>" -> cc.SpriteFrame
GD._iconTextures = {};      // "<family>_<nn>" -> cc.Texture2D

/* ~45 KB of rects that every Icon Kit layout needs before it can draw a slot,
 * so it is read synchronously once — the same trade-off looseSize() makes. */
GD.iconManifest = function () {
    if (GD._iconManifest !== null) return GD._iconManifest || null;
    GD._iconManifest = false;
    try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", GD.ICONS.manifest, false);
        xhr.send(null);
        if (xhr.responseText) GD._iconManifest = JSON.parse(xhr.responseText);
    } catch (e) {
        cc.log("GD.iconManifest: " + GD.ICONS.manifest + " -> " + e);
    }
    return GD._iconManifest || null;
};

/* Icon numbers of a pool, in the order the Icon Kit shows them. Derived from the
 * manifest's frame keys so the manifest stays the single source of truth: the
 * sets have holes in them (this install has no cube 140 or 420) and icon 0 is
 * GD's "no icon" placeholder, which never appears in the kit. */
GD.iconNumbers = function (pool) {
    var cached = GD._iconPools[pool];
    if (cached) return cached;

    var numbers = [];
    var manifest = GD.iconManifest();
    var family = GD.ICONS.family[pool];
    if (manifest && family && manifest.frames) {
        var re = new RegExp("^" + family + "_(\\d+)$");
        for (var name in manifest.frames) {
            var hit = re.exec(name);
            if (hit && Number(hit[1]) > 0) numbers.push(Number(hit[1]));
        }
        numbers.sort(function (a, b) { return a - b; });
    }
    GD._iconPools[pool] = numbers;
    return numbers;
};

// Icons the loose set has for a pool (0 when it is not shipped).
GD.iconCount = function (pool) { return GD.iconNumbers(pool).length; };

// Icon number at a slot index (0-based), or 0 when the slot is past the end.
GD.iconNumberAt = function (pool, index) {
    var numbers = GD.iconNumbers(pool);
    return (index >= 0 && index < numbers.length) ? numbers[index] : 0;
};

// File base name of an icon, e.g. "player_07" or "player_483".
GD.iconBaseName = function (pool, number) {
    var family = GD.ICONS.family[pool];
    if (!family || !number) return null;
    return family + "_" + (number < 10 ? "0" + number : "" + number);
};

/* Texture of an icon's atlas. The first call starts the download; cc.Texture2D
 * decodes off the main thread and marks itself loaded when the image arrives,
 * exactly like the sheet textures. */
GD.iconTexture = function (pool, number) {
    var base = GD.iconBaseName(pool, number);
    if (!base) return null;
    if (GD._iconTextures[base] === undefined) {
        GD._iconTextures[base] =
            cc.TextureCache.getInstance().addImage(GD.ICONS.dir + base + ".png");
    }
    return GD._iconTextures[base];
};

/* Sprite frame of an icon, or null when the loose set is not shipped. The rect
 * comes from the manifest (rotated frames included); a sprite built from a frame
 * whose texture is still decoding finishes itself through the frame's loaded
 * listener, so callers can draw right away. */
GD.iconSpriteFrame = function (pool, number) {
    var base = GD.iconBaseName(pool, number);
    if (!base) return null;
    if (GD._iconFrames[base] !== undefined) return GD._iconFrames[base];

    var manifest = GD.iconManifest();
    var rect = manifest && manifest.frames ? manifest.frames[base] : null;
    var texture = rect ? GD.iconTexture(pool, number) : null;
    if (!texture) { GD._iconFrames[base] = null; return null; }

    GD._iconFrames[base] = cc.SpriteFrame.createWithTexture(
        texture, cc.rect(rect[0], rect[1], rect[2], rect[3]),
        rect[4] === 1, cc.p(0, 0), cc.size(rect[2], rect[3]));
    return GD._iconFrames[base];
};

// True once the icon's atlas is decoded, i.e. the frame can be drawn or tinted.
GD.iconFrameLoaded = function (pool, number) {
    var frame = GD.iconSpriteFrame(pool, number);
    return !!(frame && frame.textureLoaded());
};

// Sprite of an icon, or null when it is not available.
GD.iconSprite = function (pool, number) {
    var frame = GD.iconSpriteFrame(pool, number);
    return frame ? cc.Sprite.createWithSpriteFrame(frame) : null;
};

/* Starts the download of the given icons and calls back once they are all
 * decoded. Icons already in the texture cache cost nothing, and the callback
 * never fires on a 404 — the caller simply keeps showing what it has. */
GD.preloadIcons = function (pool, numbers, callback, target) {
    var pending = [];
    for (var i = 0; i < numbers.length; i++) {
        var texture = GD.iconTexture(pool, numbers[i]);
        if (texture && !texture.isLoaded() && pending.indexOf(texture) === -1) {
            pending.push(texture);
        }
    }
    if (!pending.length) return false;

    var remaining = pending.length;
    for (var j = 0; j < pending.length; j++) {
        pending[j].addLoadedEventListener(function () {
            if (--remaining === 0 && callback) cc.doCallback(callback, target);
        }, null);
    }
    return true;
};

