/**
 * Geometry Web — rendering helpers built on cocos2d-html5 nodes (original).
 *
 * Every game object is a cc.Node (a DrawNode or LayerColor) so the game uses
 * the actual Cocos2d node/scene graph for rendering. Shapes are drawn in local
 * coordinates centered at (0,0) so they can be positioned/rotated/scaled.
 */
window.GD = window.GD || {};

GD.Renderer = (function () {
    // 0..255 color -> cocos2d Color4F (0..1 floats) for DrawNode.
    function f(r, g, b, a) {
        return cc.c4f(r / 255, g / 255, b / 255, (a == null ? 255 : a) / 255);
    }
    // 0..255 color -> cocos2d Color4B for LayerColor.
    function b(r, g, b, a) {
        return cc.c4b(r, g, b, a == null ? 255 : a);
    }

    // Filled square (for cube / blocks) centered at origin.
    function square(size, color) {
        var n = cc.DrawNode.create();
        var s = size / 2;
        var c = f(color[0], color[1], color[2], color[3]);
        n.drawPoly([cc.p(-s, -s), cc.p(s, -s), cc.p(s, s), cc.p(-s, s)], c, 0, c);
        return n;
    }

    // Filled rectangle centered at origin.
    function rect(w, h, color) {
        var n = cc.DrawNode.create();
        var hw = w / 2, hh = h / 2;
        var c = f(color[0], color[1], color[2], color[3]);
        n.drawPoly([cc.p(-hw, -hh), cc.p(hw, -hh), cc.p(hw, hh), cc.p(-hw, hh)], c, 0, c);
        return n;
    }

    // Filled circle (ball / orbs / pads) centered at origin.
    function circle(r, color) {
        var n = cc.DrawNode.create();
        n.drawDot(cc.p(0, 0), r, f(color[0], color[1], color[2], color[3]));
        return n;
    }

    // Triangle pointing up, base centered at origin (spikes).
    function spike(w, h, color, borderColor) {
        var n = cc.DrawNode.create();
        var hw = w / 2;
        var c = f(color[0], color[1], color[2], color[3]);
        var bc = borderColor ? f(borderColor[0], borderColor[1], borderColor[2], borderColor[3]) : c;
        n.drawPoly([cc.p(-hw, 0), cc.p(hw, 0), cc.p(0, h)], c, borderColor ? 3 : 0, bc);
        return n;
    }

    // Hollow ring (portals): outer disc with an inner disc punched in the
    // background color. Approximation that reads as a portal.
    function ring(r, thickness, color, bgColor) {
        var n = cc.DrawNode.create();
        n.drawDot(cc.p(0, 0), r, f(color[0], color[1], color[2], color[3]));
        n.drawDot(cc.p(0, 0), r - thickness, f(bgColor[0], bgColor[1], bgColor[2], bgColor[3]));
        return n;
    }

    // Solid full-screen/rect layer.
    function layer(w, h, color) {
        return cc.LayerColor.create(b(color[0], color[1], color[2], color[3]), w, h);
    }

    // Text label.
    function label(text, size, color, font) {
        var l = cc.LabelTTF.create(text, font || 'Arial', size || 24);
        l.setColor(b(color[0], color[1], color[2], color[3]));
        return l;
    }

    // Vertical gradient (top -> bottom) as a single DrawNode of thick segments.
    function gradient(w, h, cTop, cBottom, bands) {
        var n = cc.DrawNode.create();
        bands = bands || 32;
        var bh = h / bands;
        for (var i = 0; i < bands; i++) {
            var t = i / (bands - 1);
            var r = (cTop[0] + (cBottom[0] - cTop[0]) * t) | 0;
            var g = (cTop[1] + (cBottom[1] - cTop[1]) * t) | 0;
            var b2 = (cTop[2] + (cBottom[2] - cTop[2]) * t) | 0;
            var y = -h / 2 + i * bh + bh / 2;
            n.drawSegment(cc.p(-w / 2, y), cc.p(w / 2, y), bh / 2 + 1, f(r, g, b2, 255));
        }
        return n;
    }

    // Filled square with a visible border.
    function outlinedSquare(size, color, borderColor, borderWidth) {
        var n = cc.DrawNode.create();
        var s = size / 2;
        var c = f(color[0], color[1], color[2], color[3]);
        var bc = f(borderColor[0], borderColor[1], borderColor[2], borderColor[3]);
        n.drawPoly([cc.p(-s, -s), cc.p(s, -s), cc.p(s, s), cc.p(-s, s)], c, borderWidth || 3, bc);
        return n;
    }

    // Filled circle with a border (a larger disc behind a smaller one).
    function outlinedCircle(r, color, borderColor, borderWidth) {
        var n = cc.DrawNode.create();
        var bw = borderWidth || 3;
        n.drawDot(cc.p(0, 0), r, f(borderColor[0], borderColor[1], borderColor[2], borderColor[3]));
        n.drawDot(cc.p(0, 0), Math.max(1, r - bw), f(color[0], color[1], color[2], color[3]));
        return n;
    }

    // Soft semi-transparent glow disc.
    function glow(r, color, alpha) {
        var n = cc.DrawNode.create();
        n.drawDot(cc.p(0, 0), r, f(color[0], color[1], color[2], alpha == null ? 70 : alpha));
        return n;
    }

    // Filled rectangle with a visible border.
    function outlinedRect(w, h, color, borderColor, borderWidth) {
        var n = cc.DrawNode.create();
        var hw = w / 2, hh = h / 2;
        var c = f(color[0], color[1], color[2], color[3]);
        var bc = f(borderColor[0], borderColor[1], borderColor[2], borderColor[3]);
        n.drawPoly([cc.p(-hw, -hh), cc.p(hw, -hh), cc.p(hw, hh), cc.p(-hw, hh)], c, borderWidth || 3, bc);
        return n;
    }

    return {
        f: f, b: b,
        square: square, rect: rect, circle: circle,
        spike: spike, ring: ring, layer: layer, label: label,
        gradient: gradient, outlinedSquare: outlinedSquare,
        outlinedCircle: outlinedCircle, outlinedRect: outlinedRect, glow: glow
    };
})();
