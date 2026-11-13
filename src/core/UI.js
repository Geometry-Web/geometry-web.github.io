/* =====================================================================
 * UI.js — the shared Geometry Dash widget kit.
 *
 * Every screen builds from these components so spacing, outlines, fonts and
 * press animations stay identical across the game. Colours and frame names are
 * the real GD assets (see tools/gallery.html for the reference sheet).
 *
 * Sizing note: GD's art is authored for a 480x320 screen; this build runs a
 * 960x540 canvas, so sprites are drawn at 2x. `GD.UI.nine()` takes design-space
 * sizes and does that 2x internally.
 * ===================================================================== */
GD.UI = {};

GD.UI.STYLE = {
    green: "GJ_button_01.png",
    cyan: "GJ_button_02.png",
    pink: "GJ_button_03.png",
    grey: "GJ_button_04.png",
    slate: "GJ_button_05.png",
    red: "GJ_button_06.png"
};

GD.UI.PANEL = {
    brown: "GJ_square01.png",
    blue: "GJ_square02.png",
    green: "GJ_square03.png",
    purple: "GJ_square04.png",
    grey: "GJ_square05.png",
    light: "GJ_square06.png",
    dark: "GJ_square07.png",
    white: "GJ_squareB_01.png"
};

/* Text sizes, in Pusab label scale. GD's body text on a 960-wide screen is
 * roughly 20px tall, which is scale 0.62 of this font. */
GD.UI.TEXT = { tiny: 0.42, small: 0.55, body: 0.65, big: 0.85, heading: 1.05, title: 1.5, huge: 2.2 };

GD.UI.COLOR = {
    text: cc.c3b(255, 255, 255),
    dim: cc.c3b(200, 200, 200),
    locked: cc.c3b(120, 120, 120),
    gold: cc.c3b(255, 216, 66),
    green: cc.c3b(120, 230, 90),
    red: cc.c3b(255, 90, 80)
};

/* ------------------------------------------------------------ nine-slice */
/* Nine-slice sized in DESIGN pixels (the source art is half that). */
GD.UI.nine = function (frame, width, height, insets) {
    var node = GD.nine(frame, Math.max(2, width / 2), Math.max(2, height / 2), insets);
    node.setScale(2);
    return node;
};

/* The 40x40 GD buttons have a ~9px dark outline; popups use a wider border. */
GD.UI.BTN_INSETS = { left: 9, right: 9, top: 9, bottom: 9 };
GD.UI.PANEL_INSETS = { left: 14, right: 14, top: 14, bottom: 14 };

/* ------------------------------------------------------------- labels */
/* Body label with the GD font, centred on its position. */
GD.UI.label = function (text, scale, color) {
    var label = GD.label(text, { scale: scale === undefined ? GD.UI.TEXT.body : scale });
    if (color) label.setColor(color);
    return label;
};

/* Gold Pusab, used for counters ("1234") like the real game. */
GD.UI.gold = function (text, scale) {
    return GD.gold(text, scale === undefined ? 0.75 : scale);
};

/* -------------------------------------------------------------- header */
/* Screen heading: GD writes the page title in white Pusab over the backdrop. */
GD.UI.heading = function (parent, text, y, opts) {
    opts = opts || {};
    var label = GD.label(text, { scale: opts.scale || GD.UI.TEXT.heading });
    label.setPosition(opts.x === undefined ? GD.W / 2 : opts.x, y === undefined ? 500 : y);
    label.setColor(opts.color || GD.UI.COLOR.text);
    parent.addChild(label, opts.z === undefined ? 40 : opts.z);
    return label;
};

/* ---------------------------------------------------------- background */
/* The blue GD gradient (GJ_gradientBG is a 30x320 vertical ramp) stretched over
 * the canvas, or a real level background image, plus an optional ground strip. */
GD.UI.background = function (parent, opts) {
    opts = opts || {};
    var node = cc.Node.create();
    parent.addChild(node, opts.z === undefined ? 0 : opts.z);
    var W = GD.W, H = GD.H;

    if (opts.frame) {
        var bgSprite = GD.frameSprite(opts.frame);
        if (bgSprite) {
            var s = Math.max(W / bgSprite.getContentSize().width,
                             H / bgSprite.getContentSize().height);
            bgSprite.setScale(s * 1.02);
            bgSprite.setPosition(W / 2, H / 2);
            if (opts.tint) bgSprite.setColor(GD.c3(opts.tint));
            node.addChild(bgSprite, 0);
        }
        return node;
    }

    var ramp = GD.frameSprite("GJ_gradientBG.png");
    if (!ramp) {
        node.addChild(cc.LayerColor.create(cc.c4b(0, 64, 168, 255), W, H), 0);
        return node;
    }
    // The ramp is white at the top and dark at the bottom; tint it per screen.
    var top = opts.top || [12, 110, 243];
    var bottom = opts.bottom || [26, 40, 140];
    ramp.setAnchorPoint(0, 0.5);
    ramp.setScaleX(W / ramp.getContentSize().width * 2);
    ramp.setScaleY(H / ramp.getContentSize().height * 1.05);
    ramp.setPosition(0, H / 2);
    ramp.setColor(GD.c3(top));
    node.addChild(ramp, 0);

    var shade = cc.LayerColor.create(cc.c4b(bottom[0], bottom[1], bottom[2], 150), W, H);
    node.addChild(shade, 1);

    if (opts.ground !== false) {
        // `groundHeight` = y of the ground's top surface (0 = hidden below the
        // screen, which is what the menu screens want).
        GD.UI.ground(node, opts.groundHeight || 0);
    }
    return node;
};

/* Ground strip built from the real ground tile so screens share the game's
 * floor look instead of a flat rectangle. The tile is 128px of art; drawn at
 * half size it repeats every 64 design px, which is GD's ground pitch. */
GD.UI.ground = function (parent, y) {
    var strip = cc.Node.create();
    strip.setPosition(0, y === undefined ? 0 : y);
    parent.addChild(strip, 2);

    var probe = GD.frameSprite("groundSquare_01_001.png");
    if (!probe) {
        strip.addChild(cc.LayerColor.create(cc.c4b(0, 0, 0, 90), GD.W, 90), 0);
        return strip;
    }

    var scale = 0.5;
    var w = probe.getContentSize().width * scale;
    var h = probe.getContentSize().height * scale;
    for (var x = -w; x < GD.W + w; x += w) {
        var tile = GD.frameSprite("groundSquare_01_001.png");
        tile.setAnchorPoint(0.5, 1);
        tile.setScale(scale);
        tile.setPosition(x + w / 2, 0);
        strip.addChild(tile, 0);
    }
    strip.height = h;
    return strip;
};

/* --------------------------------------------------------- menu backdrop */
/* The tiled magenta grid the GD menus sit on: a darker base with lighter
 * squares on a fixed pitch (the pattern stays put when the window resizes).
 * Squares that hang off the edge keep the grid seamless top and bottom. */
GD.UI.menuBackground = function (parent, opts) {
    opts = opts || {};
    var base = opts.base || [150, 0, 112];
    var tile = opts.tile || [201, 2, 152];
    var cell = opts.cell || 172;        // grid pitch
    var gap = opts.gap === undefined ? 18 : opts.gap;

    var node = cc.Node.create();
    parent.addChild(node, opts.z === undefined ? 0 : opts.z);

    node.addChild(cc.LayerColor.create(GD.c4(base), GD.W, GD.H), 0);

    var side = cell - gap;
    for (var gy = 0; gy * cell < GD.H + cell; gy++) {
        for (var gx = 0; gx * cell < GD.W + cell; gx++) {
            var square = cc.LayerColor.create(GD.c4(tile), side, side);
            square.setPosition(gx * cell + gap / 2, gy * cell + gap / 2);
            node.addChild(square, 1);
        }
    }
    return node;
};

/* ---------------------------------------------------------------- buttons */
/* A GD button: nine-sliced GJ_button art, optional icon, white Pusab caption.
 * Returns a cc.Layer whose origin is its bottom-left (hit testing happens in
 * node space, so nested transforms and popups keep working).
 *
 * opts: { x, y, w, h, text, style, icon, iconScale, textScale, onClick, z,
 *         priority, enabled, sound }
 */
GD.UI.button = function (parent, opts) {
    opts = opts || {};
    var w = opts.w || 200;
    var h = opts.h || 46;
    var frame = GD.UI.STYLE[opts.style || "green"] || opts.style || GD.UI.STYLE.green;

    var layer = cc.Layer.create();
    layer.setContentSize(w, h);
    layer.setAnchorPoint(0, 0);
    layer.setPosition((opts.x || 0) - w / 2, (opts.y || 0) - h / 2);
    layer._isGDButton = true;
    layer._enabled = opts.enabled !== false;
    layer._sound = opts.sound === undefined ? "click" : opts.sound;

    var content = cc.NodeRGBA.create();
    content.setPosition(w / 2, h / 2);
    // Press feedback tints/dims the whole button, so the colour and opacity must
    // cascade into the nine-slice parts and the caption.
    content.setCascadeColorEnabled(true);
    content.setCascadeOpacityEnabled(true);
    layer.addChild(content, 0);
    layer._content = content;

    var face = GD.UI.nine(frame, w, h, GD.UI.BTN_INSETS);
    content.addChild(face, 0);
    layer._face = face;

    var hasIcon = !!opts.icon;
    if (hasIcon) {
        var icon = GD.sprite(opts.icon);
        // Without an explicit scale the icon is fitted to the button face, so
        // wide art (arrows, play icons) cannot spill past the frame.
        var iconScale = opts.iconScale;
        if (iconScale === undefined) {
            var isize = icon.getContentSize();
            var maxH = h * 0.62, maxW = w * 0.34;
            iconScale = Math.min(isize.height > 0 ? maxH / isize.height : 1,
                                 isize.width > 0 ? maxW / isize.width : 1);
        }
        icon.setScale(iconScale);
        if (opts.iconColor) icon.setColor(GD.c3(opts.iconColor));
        // Icon sits left of the caption, or centred when there is no caption.
        icon.setPosition(opts.text ? -w / 2 + h * 0.62 : 0, 0);
        content.addChild(icon, 1);
        layer._icon = icon;
    }
    if (opts.text !== undefined && opts.text !== "") {
        var caption = GD.label(opts.text, {
            scale: opts.textScale === undefined ? GD.UI.TEXT.body : opts.textScale
        });
        caption.setPosition(hasIcon ? w * 0.09 : 0, 0);
        content.addChild(caption, 2);
        layer._caption = caption;
    }

    layer.setEnabled = function (on) {
        layer._enabled = !!on;
        layer._content.setOpacity(on ? 255 : 120);
        return layer;
    };
    layer.setCaption = function (text) {
        if (layer._caption) layer._caption.setString(text);
        return layer;
    };

    function inside(touch) {
        var p = layer.convertTouchToNodeSpace(touch);
        return p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h;
    }
    function release() {
        layer._pressed = false;
        content.stopAllActions();
        content.runAction(cc.ScaleTo.create(0.08, 1));
        content.setColor(cc.c3b(255, 255, 255));
    }

    layer.onTouchBegan = function (touch) {
        if (!layer._enabled) return false;
        if (!inside(touch)) return false;
        layer._pressed = true;
        content.stopAllActions();
        content.runAction(cc.ScaleTo.create(0.055, 0.93));
        content.setColor(cc.c3b(205, 205, 205));
        return true;
    };
    layer.onTouchMoved = function (touch) {
        if (layer._pressed && !inside(touch)) release();
    };
    layer.onTouchEnded = function (touch) {
        if (!layer._pressed) return;
        var hit = inside(touch);
        release();
        if (!hit) return;
        if (layer._sound) GD.Audio.sfx(layer._sound);
        if (opts.onClick) opts.onClick(layer);
    };
    layer.onTouchCancelled = release;

    layer.setTouchMode(cc.TOUCH_ONE_BY_ONE);
    layer.setTouchPriority(opts.priority === undefined ? 0 : opts.priority);
    layer.setTouchEnabled(true);
    if (opts.enabled === false) layer.setEnabled(false);

    parent.addChild(layer, opts.z === undefined ? 10 : opts.z);
    return layer;
};

/* Sprite button (round icon buttons: pause, close, arrows, tabs). */
GD.UI.iconButton = function (parent, opts) {
    opts = opts || {};
    var scale = opts.scale === undefined ? 1 : opts.scale;
    var sprite = GD.sprite(opts.frame);
    var size = sprite.getContentSize();
    // The placeholder node for missing art has no size; keep the button usable.
    if (!size.width || !size.height) size = cc.size(48, 48);
    var w = size.width * scale, h = size.height * scale;

    var layer = cc.Layer.create();
    layer.setContentSize(w, h);
    layer.setAnchorPoint(0, 0);
    layer.setPosition((opts.x || 0) - w / 2, (opts.y || 0) - h / 2);
    layer._enabled = opts.enabled !== false;

    var content = cc.NodeRGBA.create();
    content.setPosition(w / 2, h / 2);
    content.setCascadeColorEnabled(true);
    content.setCascadeOpacityEnabled(true);
    layer.addChild(content, 0);
    layer._content = content;

    sprite.setScale(scale);
    if (opts.color) sprite.setColor(GD.c3(opts.color));
    content.addChild(sprite, 0);
    layer._sprite = sprite;

    layer.setEnabled = function (on) {
        layer._enabled = !!on;
        layer._content.setOpacity(on ? 255 : 110);
        return layer;
    };
    layer.setHighlight = function (on) {
        content.stopAllActions();
        content.runAction(cc.ScaleTo.create(0.08, on ? 0.9 : 1));
    };
    layer.onTouchBegan = function (touch) {
        if (!layer._enabled) return false;
        var p = layer.convertTouchToNodeSpace(touch);
        if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) return false;
        layer._pressed = true;
        layer.setHighlight(true);
        return true;
    };
    layer.onTouchEnded = function (touch) {
        if (!layer._pressed) return;
        layer._pressed = false;
        layer.setHighlight(false);
        var p = layer.convertTouchToNodeSpace(touch);
        if (p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h) {
            GD.Audio.sfx(opts.sound === undefined ? "click" : opts.sound);
            if (opts.onClick) opts.onClick(layer);
        }
    };
    layer.onTouchCancelled = function () {
        layer._pressed = false;
        layer.setHighlight(false);
    };

    layer.setTouchMode(cc.TOUCH_ONE_BY_ONE);
    layer.setTouchPriority(opts.priority === undefined ? 0 : opts.priority);
    layer.setTouchEnabled(true);
    if (opts.enabled === false) layer.setEnabled(false);
    parent.addChild(layer, opts.z === undefined ? 10 : opts.z);
    return layer;
};

/* ----------------------------------------------------------------- panels */
/* A GD popup frame (GJ_square*) with a title. `opts.content` is a cc.Node placed
 * inside the frame, usable as the parent for rows of controls. */
GD.UI.panel = function (parent, opts) {
    opts = opts || {};
    var w = opts.w || 420, h = opts.h || 260;
    var frame = GD.UI.PANEL[opts.style || "brown"] || opts.style || GD.UI.PANEL.brown;

    var node = cc.NodeRGBA.create();
    node.setPosition(opts.x || GD.W / 2, opts.y || GD.H / 2);

    var face = GD.UI.nine(frame, w, h, opts.insets || GD.UI.PANEL_INSETS);
    node.addChild(face, 0);
    node._face = face;

    var content = cc.Node.create();
    node.addChild(content, 2);
    node.content = content;

    if (opts.title) {
        var title = GD.label(opts.title, { scale: opts.titleScale || GD.UI.TEXT.big });
        title.setPosition(0, h / 2 - (opts.titlePad || 34));
        content.addChild(title, 1);
        node._title = title;
    }
    parent.addChild(node, opts.z === undefined ? 20 : opts.z);
    return node;
};

/* ------------------------------------------------------------ icon counters
 * The little "star + number" chips used in the menu corners, the profile and
 * every level card. */
GD.UI.counter = function (parent, opts) {
    opts = opts || {};
    var node = cc.Node.create();
    node.setPosition(opts.x || 0, opts.y || 0);
    parent.addChild(node, opts.z === undefined ? 30 : opts.z);

    var scale = opts.iconScale === undefined ? 0.75 : opts.iconScale;
    var icon = GD.sprite(opts.icon);
    icon.setScale(scale);
    icon.setAnchorPoint(1, 0.5);
    icon.setPosition(opts.iconX === undefined ? 0 : opts.iconX, 0);
    node.addChild(icon, 0);

    var value = GD.gold(GD.fmt(opts.value || 0), opts.textScale === undefined ? 0.62 : opts.textScale);
    value.setAnchorPoint(0, 0.5);
    value.setPosition((opts.iconX === undefined ? 0 : opts.iconX) + (opts.gap === undefined ? 6 : opts.gap), 0);
    node.addChild(value, 1);

    node.valueLabel = value;
    node.setValue = function (v) {
        node.valueLabel.setString(GD.fmt(v));
        node.valueLabel.stopAllActions();
        node.valueLabel.setScale(opts.textScale === undefined ? 0.62 : opts.textScale);
        node.valueLabel.runAction(cc.Sequence.create(
            cc.ScaleTo.create(0.1, (opts.textScale === undefined ? 0.62 : opts.textScale) * 1.25),
            cc.ScaleTo.create(0.1, opts.textScale === undefined ? 0.62 : opts.textScale)));
        return node;
    };
    return node;
};

/* ---------------------------------------------------------------- toggles */
/* GD's tick box (GJ_checkOn / GJ_checkOff) with a caption to its right. */
GD.UI.toggle = function (parent, opts) {
    opts = opts || {};
    var on = !!opts.value;
    var node = cc.Node.create();
    node.setPosition(opts.x || 0, opts.y || 0);

    var box = GD.sprite(on ? "GJ_checkOn_001.png" : "GJ_checkOff_001.png");
    box.setScale(opts.scale === undefined ? 1 : opts.scale);
    box.setAnchorPoint(0, 0.5);
    box.setPosition(0, 0);
    node.addChild(box, 0);

    var label = null;
    if (opts.text) {
        label = GD.label(opts.text, { scale: opts.textScale === undefined ? GD.UI.TEXT.body : opts.textScale });
        label.setAnchorPoint(0, 0.5);
        label.setPosition(box.getContentSize().width * (opts.scale === undefined ? 1 : opts.scale) + 10, 0);
        node.addChild(label, 1);
    }

    var layer = cc.Layer.create();
    var w = (label ? label.getContentSize().width + 60 : 40) * 1.0;
    layer.setContentSize(w, 40);
    layer.setPosition(-4, -20);
    node.addChild(layer, 2);

    node.isOn = function () { return on; };
    node.setValue = function (v) {
        on = !!v;
        var sf = cc.SpriteFrameCache.getInstance()
            .getSpriteFrame(on ? "GJ_checkOn_001.png" : "GJ_checkOff_001.png");
        if (sf) box.setDisplayFrame(sf);
    };

    layer.onTouchBegan = function (touch) {
        var p = layer.convertTouchToNodeSpace(touch);
        if (p.x < 0 || p.y < 0 || p.x > w || p.y > 40) return false;
        node.setValue(!on);
        GD.Audio.sfx("click");
        if (opts.onChange) opts.onChange(on);
        return true;
    };
    layer.onTouchEnded = function () { };
    layer.setTouchMode(cc.TOUCH_ONE_BY_ONE);
    layer.setTouchPriority(opts.priority === undefined ? 0 : opts.priority);
    layer.setTouchEnabled(true);

    parent.addChild(node, opts.z === undefined ? 30 : opts.z);
    return node;
};

/* ----------------------------------------------------------------- sliders */
/* GD's volume slider: a groove with a gold thumb you drag. Reports 0..1. */
GD.UI.slider = function (parent, opts) {
    opts = opts || {};
    var width = opts.w || 260;
    var value = GD.clamp(opts.value === undefined ? 0.5 : opts.value, 0, 1);

    var node = cc.Node.create();
    node.setPosition(opts.x || 0, opts.y || 0);
    parent.addChild(node, opts.z === undefined ? 30 : opts.z);

    var groove = GD.sprite("slidergroove.png");
    groove.setScaleX(width / groove.getContentSize().width);
    node.addChild(groove, 0);

    var thumb = GD.sprite("sliderthumb.png");
    var thumbScale = opts.thumbScale === undefined ? 1 : opts.thumbScale;
    thumb.setScale(thumbScale);
    node.addChild(thumb, 2);

    var thumbSel = GD.sprite("sliderthumbsel.png");
    thumbSel.setScale(thumbScale);
    thumbSel.setVisible(false);
    node.addChild(thumbSel, 3);

    function place() {
        var x = -width / 2 + width * value;
        thumb.setPosition(x, 0);
        thumbSel.setPosition(x, 0);
    }

    var layer = cc.Layer.create();
    layer.setContentSize(width + 40, 46);
    layer.setPosition(-(width + 40) / 2, -23);
    node.addChild(layer, 4);

    function update(touch) {
        var p = layer.convertTouchToNodeSpace(touch);
        value = GD.clamp((p.x - 20) / width, 0, 1);
        place();
        if (opts.onChange) opts.onChange(value);
    }

    layer.onTouchBegan = function (touch) {
        var p = layer.convertTouchToNodeSpace(touch);
        if (p.x < 0 || p.y < 0 || p.x > width + 40 || p.y > 46) return false;
        thumb.setVisible(false);
        thumbSel.setVisible(true);
        update(touch);
        return true;
    };
    layer.onTouchMoved = function (touch) { update(touch); };
    layer.onTouchEnded = function () {
        thumb.setVisible(true);
        thumbSel.setVisible(false);
        if (opts.onRelease) opts.onRelease(value);
    };
    layer.onTouchCancelled = function () {
        thumb.setVisible(true);
        thumbSel.setVisible(false);
    };
    layer.setTouchMode(cc.TOUCH_ONE_BY_ONE);
    layer.setTouchPriority(opts.priority === undefined ? 0 : opts.priority);
    layer.setTouchEnabled(true);

    node.getValue = function () { return value; };
    node.setValue = function (v) { value = GD.clamp(v, 0, 1); place(); };
    place();
    return node;
};

/* ------------------------------------------------------------ progress bar */
/* GJ_progressBar_001 is a 340x20 white capsule: GD scales it horizontally as
 * the fill. Drawing it a second time, dimmed, gives the empty track so the
 * filled portion stays readable on dark panels. */
GD.UI.progress = function (parent, opts) {
    opts = opts || {};
    var width = opts.w || 300;
    var height = opts.h || 18;
    var frame = opts.frame || "GJ_progressBar_001.png";

    var node = cc.Node.create();
    node.setPosition(opts.x || 0, opts.y || 0);
    parent.addChild(node, opts.z === undefined ? 30 : opts.z);

    var size = GD.frameSize(frame);
    var nw = size.width || width, nh = size.height || height;

    var track = GD.frameSprite(frame);
    if (track) {
        track.setColor(cc.c3b(0, 0, 0));
        track.setOpacity(110);
        track.setScaleX(width / nw);
        track.setScaleY(height / nh);
        node.addChild(track, 0);
    } else {
        node.addChild(cc.LayerColor.create(cc.c4b(0, 0, 0, 150), width, height), 0);
    }

    var fill = GD.frameSprite(frame);
    if (fill) {
        fill.setAnchorPoint(0, 0.5);
        fill.setPosition(-width / 2, 0);
        fill.setVisible(false);
        node.addChild(fill, 1);
    }

    var value = 0;
    node.setValue = function (v) {
        value = GD.clamp(v, 0, 100);
        if (!fill) return node;
        var filled = width * value / 100;
        fill.setVisible(filled > 0.5);
        fill.setScaleX(Math.max(filled, 1) / nw);
        fill.setScaleY(height / nh);
        return node;
    };
    node.getValue = function () { return value; };
    if (opts.value) node.setValue(opts.value);
    return node;
};


/* ------------------------------------------------------------------ popups */
/* GD's popups share one anatomy: the screen dims, a GJ_square frame scales in,
 * the title sits at the top, content in the middle, a row of buttons along the
 * bottom. Every dialog in this build goes through `GD.UI.popup`, which also owns
 * modal touch blocking so nothing behind it can be pressed. */
GD.UI.modalRoot = function (scene) {
    if (scene.__modalRoot) return scene.__modalRoot;
    var root = cc.Node.create();
    root.__depth = 0;
    scene.addChild(root, 1000);
    scene.__modalRoot = root;
    return root;
};

/* opts: { title, w, h, style, content(panel, handle), buttons[], closable,
 *         x, y, onClose, veil } */
GD.UI.popup = function (scene, opts) {
    opts = opts || {};
    var root = GD.UI.modalRoot(scene);
    var depth = root.__depth++;
    var blockerPrio = -2000 - depth * 20;
    var buttonPrio = blockerPrio - 5;

    var w = opts.w || 420;
    var h = opts.h || 260;

    // Dimmed backdrop + outside-tap handler.
    var blocker = cc.Layer.create();
    blocker.setTouchMode(cc.TOUCH_ONE_BY_ONE);
    blocker.setTouchPriority(blockerPrio);
    blocker.setTouchEnabled(true);
    root.addChild(blocker, depth * 4);

    if (opts.veil !== false) {
        blocker.addChild(cc.LayerColor.create(cc.c4b(0, 0, 0, 120), GD.W, GD.H), 0);
    }

    var panel = GD.UI.panel(root, {
        x: opts.x === undefined ? GD.W / 2 : opts.x,
        y: opts.y === undefined ? GD.H / 2 : opts.y,
        w: w, h: h,
        style: opts.style || "brown",
        title: opts.title,
        titleScale: opts.titleScale,
        z: depth * 4 + 1
    });
    panel.setScale(0.55);
    panel.setOpacity(0);
    panel.setCascadeOpacityEnabled(true);
    panel.runAction(cc.Sequence.create(
        cc.Spawn.create(cc.EaseBackOut.create(cc.ScaleTo.create(0.18, 1)),
                        cc.FadeIn.create(0.12))));

    var handle = {
        depth: depth,
        panel: panel,
        content: panel.content,
        buttons: [],
        closed: false
    };

    handle.close = function (silent) {
        if (handle.closed) return;
        handle.closed = true;
        panel.stopAllActions();
        panel.runAction(cc.Sequence.create(
            cc.Spawn.create(cc.EaseBackIn.create(cc.ScaleTo.create(0.12, 0.6)),
                            cc.FadeOut.create(0.12)),
            cc.CallFunc.create(function () {
                if (panel.getParent()) panel.getParent().removeChild(panel, true);
                if (blocker.getParent()) blocker.getParent().removeChild(blocker, true);
                root.__depth = Math.max(0, root.__depth - 1);
                if (opts.onClose && !silent) opts.onClose();
            })));
        if (silent && opts.onClose) opts.onClose();
    };

    // Buttons along the bottom edge. They are children of the panel so they
    // scale/fade with it and disappear with it on close.
    var list = opts.buttons || [];
    if (list.length) {
        var bw = list.length === 1 ? Math.min(220, w - 80) : Math.min(180, (w - 80) / list.length - 10);
        var gap = 16;
        var totalW = list.length * bw + (list.length - 1) * gap;
        var startX = (GD.W / 2) - totalW / 2 + bw / 2 - panel.getPositionX();
        var by = -h / 2 + 34;
        for (var i = 0; i < list.length; i++) {
            (function (spec, index) {
                var btn = GD.UI.button(panel, {
                    x: startX + index * (bw + gap),
                    y: by,
                    w: spec.w || bw,
                    h: spec.h || 44,
                    text: spec.text,
                    style: spec.style || (index === 0 ? "green" : "grey"),
                    textScale: spec.textScale || GD.UI.TEXT.small,
                    priority: buttonPrio,
                    z: 3,
                    sound: spec.sound,
                    onClick: function (node) {
                        if (spec.close === false) {
                            if (spec.onClick) spec.onClick(handle, node);
                            return;
                        }
                        if (spec.onClick && spec.onClick(handle, node) === false) return;
                        handle.close();
                    }
                });
                handle.buttons.push(btn);
            })(list[i], i);
        }
    }

    blocker.onTouchBegan = function (touch) {
        if (opts.closable === false) return true;
        // A press outside the panel closes it, like GD's drop-down layers.
        var local = panel.convertToNodeSpace(touch.getLocation());
        if (Math.abs(local.x) > w / 2 || Math.abs(local.y) > h / 2) handle.close();
        return true;
    };

    if (opts.content) opts.content(panel.content, handle, buttonPrio);
    return handle;
};

/* Ready-made dialogs ------------------------------------------------------- */
/* Plain message box with a single button. */
GD.UI.alert = function (scene, title, message, onClose) {
    return GD.UI.popup(scene, {
        title: title,
        w: 430, h: 220,
        content: function (content) {
            var text = GD.label(message, {
                scale: GD.UI.TEXT.body, width: 340, align: cc.TEXT_ALIGNMENT_CENTER
            });
            text.setPosition(0, 8);
            content.addChild(text, 1);
        },
        buttons: [{ text: "OK", style: "green", onClick: onClose }]
    });
};

/* Yes/No box; the two buttons sit side by side exactly like GD's. */
GD.UI.confirm = function (scene, opts) {
    opts = opts || {};
    return GD.UI.popup(scene, {
        title: opts.title || "Are you sure?",
        w: 470, h: 230,
        content: function (content) {
            var text = GD.label(opts.message || "", {
                scale: GD.UI.TEXT.body, width: 380, align: cc.TEXT_ALIGNMENT_CENTER
            });
            text.setPosition(0, 10);
            content.addChild(text, 1);
        },
        buttons: [
            { text: opts.okText || "Yes", style: opts.okStyle || "green", onClick: opts.onOk },
            { text: opts.cancelText || "No", style: "grey", onClick: opts.onCancel }
        ]
    });
};

/* Small strip that drops in under the top edge: "Saved", "+2 stars", ... */
/* Only one toast lives on screen at a time: a new one replaces the old so the
 * strips never overlap when actions fire quickly (slider drag + release). */
GD.UI.toast = function (scene, text, opts) {
    opts = opts || {};
    var root = GD.UI.modalRoot(scene);
    var width = opts.w || 300;

    if (scene.__toast) {
        scene.__toast.stopAllActions();
        if (scene.__toast.getParent()) scene.__toast.getParent().removeChild(scene.__toast, true);
        scene.__toast = null;
    }

    var node = cc.NodeRGBA.create();
    node.setPosition(GD.W / 2, GD.H - 56);
    node.setOpacity(0);
    node.setCascadeOpacityEnabled(true);
    root.addChild(node, 900);
    scene.__toast = node;

    node.addChild(GD.UI.nine(GD.UI.PANEL[opts.style || "dark"], width, 54, GD.UI.PANEL_INSETS), 0);
    var text_ = GD.label(text, { scale: opts.scale || GD.UI.TEXT.body });
    node.addChild(text_, 1);

    node.runAction(cc.Sequence.create(
        cc.Spawn.create(cc.FadeIn.create(0.15), cc.MoveBy.create(0.15, cc.p(0, -12))),
        cc.DelayTime.create(opts.duration === undefined ? 1.4 : opts.duration),
        cc.FadeOut.create(0.25),
        cc.CallFunc.create(function () { scene.__toast = null; }),
        cc.RemoveSelf.create()));
    return node;
};

/* Full-screen spinner (loadingCircle.png) used while a level loads. */
GD.UI.loading = function (scene, text) {
    var root = GD.UI.modalRoot(scene);

    var layer = cc.Layer.create();
    layer.setTouchMode(cc.TOUCH_ONE_BY_ONE);
    layer.setTouchEnabled(true);
    layer.onTouchBegan = function () { return true; };
    layer.onTouchEnded = function () { };
    layer.onTouchMoved = function () { };
    root.addChild(layer, 950);

    layer.addChild(cc.LayerColor.create(cc.c4b(0, 0, 0, 170), GD.W, GD.H), 0);

    var spinner = GD.sprite("loadingCircle.png");
    spinner.setScale(1.5);
    spinner.setPosition(GD.W / 2, GD.H / 2 + (text ? 18 : 0));
    layer.addChild(spinner, 1);
    spinner.runAction(cc.RepeatForever.create(cc.RotateBy.create(0.9, -360)));

    if (text) {
        var label = GD.label(text, { scale: GD.UI.TEXT.body });
        label.setPosition(GD.W / 2, GD.H / 2 - 52);
        layer.addChild(label, 2);
    }

    layer.close = function () {
        spinner.stopAllActions();
        if (layer.getParent()) layer.getParent().removeChild(layer, true);
    };
    return layer;
};
