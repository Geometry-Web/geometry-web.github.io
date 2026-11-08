window.GD = window.GD || {};

/**
 * Geometry Web — lightweight particle effects (original).
 * Small pooled dots that fly out, fall, and shrink. Used for jump dust,
 * death bursts, coin sparkles and orb/pad flashes.
 */
GD.Particles = (function () {
    var R = GD.Renderer;

    function create(layer) {
        return { layer: layer, items: [] };
    }

    function burst(sys, x, y, color, count, speed, opts) {
        opts = opts || {};
        var layer = sys.layer;
        for (var i = 0; i < count; i++) {
            var ang = (Math.PI * 2) * (i / count) + (Math.random() * 0.5);
            var spd = speed * (0.4 + Math.random() * 0.8);
            var node = R.circle(opts.size || 4, color);
            node.setPosition(cc.p(x, y));
            layer.addChild(node, 9);
            sys.items.push({
                node: node,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: opts.life || 0.5,
                age: 0,
                gravity: opts.gravity != null ? opts.gravity : 700
            });
        }
    }

    function update(sys, dt) {
        var layer = sys.layer;
        for (var i = sys.items.length - 1; i >= 0; i--) {
            var p = sys.items[i];
            p.age += dt;
            if (p.age >= p.life) {
                layer.removeChild(p.node, true);
                sys.items.splice(i, 1);
                continue;
            }
            p.vy -= p.gravity * dt;
            p.node.setPosition(cc.p(
                p.node.getPositionX() + p.vx * dt,
                p.node.getPositionY() + p.vy * dt));
            p.node.setScale(Math.max(0.05, 1 - p.age / p.life));
        }
    }

    function clear(sys) {
        for (var i = 0; i < sys.items.length; i++) sys.layer.removeChild(sys.items[i].node, true);
        sys.items = [];
    }

    var _dotTex = null;
    function dotTexture() {
        if (_dotTex) return _dotTex;
        var canvas = document.createElement('canvas');
        canvas.width = 16; canvas.height = 16;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.beginPath(); ctx.arc(8, 8, 7, 0, Math.PI * 2); ctx.fill();
        var tex = new cc.Texture2D();
        tex.initWithElement(canvas);
        _dotTex = tex;
        return tex;
    }

    // One-shot burst using the real cocos2d cc.ParticleSystem.
    function ccBurst(layer, x, y, color, opts) {
        opts = opts || {};
        var ps = cc.ParticleSystem.createWithTotalParticles(opts.count || 40);
        ps.setPositionType(cc.PARTICLE_TYPE_FREE);
        ps.setDuration(opts.duration != null ? opts.duration : 0.15);
        ps.setLife(opts.life || 0.6);
        ps.setLifeVar(0.25);
        ps.setSpeed(opts.speed || 260);
        ps.setSpeedVar(90);
        ps.setStartSize(opts.size || 7);
        ps.setStartSizeVar(3);
        ps.setEndSize(1);
        ps.setAngle(90);
        ps.setAngleVar(360);
        ps.setGravity(cc.p(0, opts.gravity != null ? opts.gravity : -600));
        var r = color[0] / 255, g = color[1] / 255, b = color[2] / 255;
        ps.setStartColor(cc.c4f(r, g, b, 1));
        ps.setEndColor(cc.c4f(r, g, b, 0));
        ps.setTexture(dotTexture());
        ps.setPosition(cc.p(x, y));
        layer.addChild(ps, 9);
        var lifeSec = (opts.duration != null ? opts.duration : 0.15) + (opts.life || 0.6) + 0.5;
        setTimeout(function () {
            try { layer.removeChild(ps, true); } catch (e) { /* already removed */ }
        }, lifeSec * 1000);
    }

    return { create: create, burst: burst, update: update, clear: clear, ccBurst: ccBurst };
})();
