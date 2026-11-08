/**
 * Geometry Web — game object factory (original).
 * Creates each object's cc.Node (visual) plus its collision hitbox. The hitbox
 * is in world coordinates and is what the collision system and the C++ runtime
 * operate on.
 */
window.GD = window.GD || {};

GD.Objects = (function () {
    var R = GD.Renderer, C = GD.C, T = GD.Textures;

    function ringSprite(key, size, color) {
        return T.sprite(key, size, size, function (ctx, w, h) { T.ringIcon(ctx, w, h, color); });
    }

    // Build a game object {type, x, y, w, h, ... , node, hb/radius}.
    function create(def) {
        var S = C.worldScale;
        var o = { type: def.type, x: def.x || 0, y: def.y || C.groundY, def: def };
        switch (def.type) {
            case 'block':
                o.w = (def.w || 30) * S; o.h = (def.h || 30) * S;
                o.node = GD.Assets.sizedSprite(GD.Assets.FRAMES.block, o.w) || T.sprite('block_' + o.w + 'x' + o.h, o.w, o.h, T.blockIcon);
                o.node.setPosition(cc.p(o.x + o.w / 2, o.y + o.h / 2));
                o.hb = { x: o.x, y: o.y, w: o.w, h: o.h };
                break;
            case 'spike':
                o.w = 24 * S; o.h = 24 * S;
                o.node = GD.Assets.sizedSprite(GD.Assets.FRAMES.spike, o.w) || T.sprite('spike', o.w, o.h, T.spikeIcon);
                o.node.setPosition(cc.p(o.x, o.y));
                // Forgiving hitbox (smaller than the visual triangle).
                o.hb = { x: o.x - 7 * S, y: o.y, w: 14 * S, h: 15 * S };
                break;
            case 'orb':
                o.action = def.action || 'jump';
                var oc = o.action === 'gravity' ? C.colorOrbGravity : C.colorOrbJump;
                var orbFrame = o.action === 'gravity' ? GD.Assets.FRAMES.gravring : GD.Assets.FRAMES.ring;
                var orbSize = 26 * S;
                o.node = new cc.Node();
                o.node.addChild(R.glow(24 * S, oc, 70), 0);
                o.node.addChild(GD.Assets.sizedSprite(orbFrame, orbSize) || T.sprite('orb_' + oc[0] + '_' + oc[1] + '_' + oc[2], orbSize, orbSize, function (ctx, w, h) { T.orbIcon(ctx, w, h, oc); }), 1);
                o.node.setPosition(cc.p(o.x, o.y));
                o.radius = 15 * S;
                break;
            case 'pad':
                o.action = def.action || 'jump';
                var pc = o.action === 'gravity' ? C.colorPadGravity : C.colorPadJump;
                var padSize = 48 * S;
                o.node = new cc.Node();
                o.node.addChild(R.glow(36 * S, pc, 70), 0);
                o.node.addChild(T.sprite('pad_' + pc[0] + '_' + pc[1] + '_' + pc[2], padSize, padSize, function (ctx, w, h) { T.orbIcon(ctx, w, h, pc); }), 1);
                o.node.setPosition(cc.p(o.x, o.y));
                o.radius = 26 * S;
                break;
            case 'portal':
                o.mode = def.mode || 'ship';
                var portalSize = 44 * S;
                o.node = GD.Assets.sizedSprite(GD.Assets.FRAMES.portal, portalSize) || ringSprite('portal_' + o.mode, portalSize, portalColor(o.mode));
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 22 * S, y: o.y - 22 * S, w: 44 * S, h: 44 * S };
                break;
            case 'gravity':
                o.node = ringSprite('gravity', 40 * S, C.colorPortalGravity);
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 20 * S, y: o.y - 20 * S, w: 40 * S, h: 40 * S };
                break;
            case 'size':
                o.mult = def.mult || C.sizeSmall;
                o.node = ringSprite('size', 36 * S, [255, 150, 60]);
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 18 * S, y: o.y - 18 * S, w: 36 * S, h: 36 * S };
                break;
            case 'checkpoint':
                o.node = ringSprite('checkpoint', 32 * S, [100, 230, 200]);
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 16 * S, y: o.y - 16 * S, w: 32 * S, h: 32 * S };
                o.activated = false;
                break;
            case 'speed':
                o.mult = def.mult || 1;
                o.node = ringSprite('speed', 36 * S, [255, 150, 60]);
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 18 * S, y: o.y - 18 * S, w: 36 * S, h: 36 * S };
                break;
            case 'coin':
                var coinSize = 18 * S;
                o.node = new cc.Node();
                o.node.addChild(R.glow(16 * S, C.colorCoin, 85), 0);
                o.node.addChild(T.sprite('coin', coinSize, coinSize, T.coinIcon), 1);
                o.node.setPosition(cc.p(o.x, o.y));
                o.radius = 12 * S;
                o.collected = false;
                break;
            case 'finish':
                var fw = 64 * S, fh = 140 * S;
                o.node = R.rect(fw, fh, C.colorFinish);
                o.node.setPosition(cc.p(o.x + fw / 2, o.y + fh / 2));
                o.hb = { x: o.x, y: o.y, w: fw, h: fh };
                break;
            default:
                o.node = R.circle(10 * S, [255, 0, 0]);
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 10 * S, y: o.y - 10 * S, w: 20 * S, h: 20 * S };
        }
        return o;
    }

    function portalColor(mode) {
        switch (mode) {
            case 'ship': return C.colorPortalShip;
            case 'ball':
            case 'swing': return C.colorPortalGravity;
            case 'wave':
            case 'ufo': return [255, 150, 90];
            case 'robot': return [200, 130, 235];
            case 'spider': return [140, 220, 250];
            case 'cube':
            default: return C.colorPortalCube;
        }
    }

    return { create: create, portalColor: portalColor };
})();
