/**
 * Geometry Web — small math helpers (original implementation).
 * Uses plain objects/arrays for portability with the C++ runtime contract.
 */
window.GD = window.GD || {};

GD.math = {
    clamp: function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); },

    lerp: function (a, b, t) { return a + (b - a) * t; },

    // AABB overlap test. Boxes: {x, y, w, h} where (x,y) is bottom-left.
    aabbOverlap: function (a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    },

    // Point-in-box test.
    pointInBox: function (px, py, b) {
        return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
    },

    // Circle vs AABB (simplified: treat circle center + nearest-point distance).
    circleRectHit: function (cx, cy, r, b) {
        var nx = this.clamp(cx, b.x, b.x + b.w);
        var ny = this.clamp(cy, b.y, b.y + b.h);
        var dx = cx - nx, dy = cy - ny;
        return (dx * dx + dy * dy) <= r * r;
    },

    // Distance between two points.
    dist: function (x1, y1, x2, y2) {
        var dx = x2 - x1, dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
};
