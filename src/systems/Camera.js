/**
 * Geometry Web — camera controller (original).
 * Keeps the player about a third of the way from the left edge and smoothly
 * follows vertical motion by translating the world layer.
 */
window.GD = window.GD || {};

GD.Camera = (function () {
    function create(world) {
        return { x: 0, y: 0, world: world };
    }

    function update(cam, targetX, targetY) {
        var C = GD.C;
        var sx = C.designW * 0.34;             // desired screen-x of the player
        cam.x = GD.math.lerp(cam.x, targetX - sx, 0.12);
        cam.x = Math.max(cam.x, 0);            // never scroll left of the start
        cam.y = GD.math.lerp(cam.y, targetY - C.designH * 0.5, 0.08);
        cam.y = GD.math.clamp(cam.y, -C.designH * 0.4, C.designH * 0.4);
        if (cam.world) { cam.world.setPosition(cc.p(-cam.x, -cam.y)); }
    }

    return { create: create, update: update };
})();
