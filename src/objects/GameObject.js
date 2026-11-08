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
        var o = { type: def.type, x: def.x || 0, y: def.y || C.groundY, def: def };
        switch (def.type) {
            case 'block':
                o.w = def.w || 30; o.h = def.h || 30;
                o.node = T.sprite('block_' + o.w + 'x' + o.h, o.w, o.h, T.blockIcon);
                o.node.setPosition(cc.p(o.x + o.w / 2, o.y + o.h / 2));
                o.hb = { x: o.x, y: o.y, w: o.w, h: o.h };
                break;
            case 'spike':
                o.w = 24; o.h = 24;
                o.node = T.sprite('spike', o.w, o.h, T.spikeIcon);
                o.node.setPosition(cc.p(o.x, o.y));
                // Forgiving hitbox (smaller than the visual triangle).
                o.hb = { x: o.x - 7, y: o.y, w: 14, h: 15 };
                break;
            case 'orb':
                o.action = def.action || 'jump';
                var oc = o.action === 'gravity' ? C.colorOrbGravity : C.colorOrbJump;
                o.node = new cc.Node();
                o.node.addChild(R.glow(24, oc, 70), 0);
                o.node.addChild(T.sprite('orb_' + oc[0] + '_' + oc[1] + '_' + oc[2], 26, 26, function (ctx, w, h) { T.orbIcon(ctx, w, h, oc); }), 1);
                o.node.setPosition(cc.p(o.x, o.y));
                o.radius = 15;
                break;
            case 'pad':
                o.action = def.action || 'jump';
                var pc = o.action === 'gravity' ? C.colorPadGravity : C.colorPadJump;
                o.node = new cc.Node();
                o.node.addChild(R.glow(36, pc, 70), 0);
                o.node.addChild(T.sprite('pad_' + pc[0] + '_' + pc[1] + '_' + pc[2], 48, 48, function (ctx, w, h) { T.orbIcon(ctx, w, h, pc); }), 1);
                o.node.setPosition(cc.p(o.x, o.y));
                o.radius = 26;
                break;
            case 'portal':
                o.mode = def.mode || 'ship';
                o.node = ringSprite('portal_' + o.mode, 44, portalColor(o.mode));
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 22, y: o.y - 22, w: 44, h: 44 };
                break;
            case 'gravity':
                o.node = ringSprite('gravity', 40, C.colorPortalGravity);
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 20, y: o.y - 20, w: 40, h: 40 };
                break;
            case 'size':
                o.mult = def.mult || C.sizeSmall;
                o.node = ringSprite('size', 36, [255, 150, 60]);
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 18, y: o.y - 18, w: 36, h: 36 };
                break;
            case 'checkpoint':
                o.node = ringSprite('checkpoint', 32, [100, 230, 200]);
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 16, y: o.y - 16, w: 32, h: 32 };
                o.activated = false;
                break;
            case 'speed':
                o.mult = def.mult || 1;
                o.node = ringSprite('speed', 36, [255, 150, 60]);
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 18, y: o.y - 18, w: 36, h: 36 };
                break;
            case 'coin':
                o.node = new cc.Node();
                o.node.addChild(R.glow(16, C.colorCoin, 85), 0);
                o.node.addChild(T.sprite('coin', 18, 18, T.coinIcon), 1);
                o.node.setPosition(cc.p(o.x, o.y));
                o.radius = 12;
                o.collected = false;
                break;
            case 'finish':
                o.node = R.rect(64, 140, C.colorFinish);
                o.node.setPosition(cc.p(o.x + 32, o.y + 70));
                o.hb = { x: o.x, y: o.y, w: 64, h: 140 };
                break;
            default:
                o.node = R.circle(10, [255, 0, 0]);
                o.node.setPosition(cc.p(o.x, o.y));
                o.hb = { x: o.x - 10, y: o.y - 10, w: 20, h: 20 };
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
