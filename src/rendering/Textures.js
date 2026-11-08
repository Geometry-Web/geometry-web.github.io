/**
 * Geometry Web — procedural texture/sprite factory (original artwork).
 * Draws each icon onto an offscreen <canvas>, wraps it in a cc.Texture2D
 * (via initWithElement, the same path cc.LabelTTF uses), and returns a real
 * cc.Sprite. All art is generated in code (no copyrighted assets).
 */
window.GD = window.GD || {};

GD.Textures = (function () {
    var cache = {};

    function css(c) {
        var a = (c[3] == null) ? 1 : (c[3] / 255);
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function circle(ctx, cx, cy, r) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.closePath();
    }

    function sprite(key, w, h, drawFn) {
        if (cache[key]) return cc.Sprite.createWithTexture(cache[key]);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        drawFn(ctx, w, h);
        var tex = new cc.Texture2D();
        tex.initWithElement(canvas);
        cache[key] = tex;
        return cc.Sprite.createWithTexture(tex);
    }

    function cubeFace(ctx, w, h) {
        var C = GD.C, p = 2;
        ctx.fillStyle = css(C.colorPlayer);
        roundRect(ctx, p, p, w - 2 * p, h - 2 * p, 5); ctx.fill();
        ctx.strokeStyle = css(C.colorPlayerBorder); ctx.lineWidth = 3;
        roundRect(ctx, p, p, w - 2 * p, h - 2 * p, 5); ctx.stroke();
        var e = w * 0.16, ey = h * 0.30;
        ctx.fillStyle = css([16, 40, 24]);
        roundRect(ctx, w * 0.26 - e / 2, ey - e / 2, e, e, 2); ctx.fill();
        roundRect(ctx, w * 0.74 - e / 2, ey - e / 2, e, e, 2); ctx.fill();
        var mw = w * 0.34, mh = h * 0.13;
        roundRect(ctx, w / 2 - mw / 2, h * 0.64, mw, mh, 2); ctx.fill();
    }

    function robotFace(ctx, w, h) {
        var C = GD.C, p = 2;
        ctx.fillStyle = css([200, 130, 235]);
        roundRect(ctx, p, p, w - 2 * p, h - 2 * p, 5); ctx.fill();
        ctx.strokeStyle = css(C.colorPlayerBorder); ctx.lineWidth = 3;
        roundRect(ctx, p, p, w - 2 * p, h - 2 * p, 5); ctx.stroke();
        var e = w * 0.2, ey = h * 0.3;
        ctx.fillStyle = css([40, 20, 60]);
        roundRect(ctx, w * 0.28 - e / 2, ey - e / 2, e, e, 2); ctx.fill();
        roundRect(ctx, w * 0.72 - e / 2, ey - e / 2, e, e, 2); ctx.fill();
    }

    function ballIcon(ctx, w, h) {
        var C = GD.C;
        ctx.fillStyle = css(C.colorPlayerBorder);
        circle(ctx, w / 2, h / 2, w / 2 - 1); ctx.fill();
        ctx.fillStyle = css(C.colorBall);
        circle(ctx, w / 2, h / 2, w / 2 - 4); ctx.fill();
    }

    function shipIcon(ctx, w, h) {
        var C = GD.C, p = 2;
        ctx.fillStyle = css(C.colorShip);
        roundRect(ctx, p, p, w - 2 * p, h - 2 * p, 6); ctx.fill();
        ctx.strokeStyle = css(C.colorPlayerBorder); ctx.lineWidth = 3;
        roundRect(ctx, p, p, w - 2 * p, h - 2 * p, 6); ctx.stroke();
        ctx.fillStyle = css([20, 40, 70]);
        roundRect(ctx, w * 0.55, h * 0.3, w * 0.3, h * 0.4, 3); ctx.fill();
    }

    function ufoIcon(ctx, w, h) {
        var C = GD.C;
        ctx.fillStyle = css([120, 240, 200]);
        roundRect(ctx, 2, h * 0.35, w - 4, h * 0.4, 5); ctx.fill();
        ctx.fillStyle = css(C.colorPlayerBorder);
        circle(ctx, w / 2, h * 0.35, w * 0.22); ctx.fill();
    }

    function waveIcon(ctx, w, h) {
        var C = GD.C;
        ctx.fillStyle = css([255, 150, 90]);
        roundRect(ctx, w * 0.4, 2, w * 0.2, h - 4, 4); ctx.fill();
        ctx.strokeStyle = css(C.colorPlayerBorder); ctx.lineWidth = 2;
        roundRect(ctx, w * 0.4, 2, w * 0.2, h - 4, 4); ctx.stroke();
    }

    function spiderIcon(ctx, w, h) {
        var C = GD.C;
        ctx.fillStyle = css(C.colorPlayerBorder);
        circle(ctx, w / 2, h / 2, w / 2 - 1); ctx.fill();
        ctx.fillStyle = css([140, 220, 250]);
        circle(ctx, w / 2, h / 2, w / 2 - 4); ctx.fill();
    }

    function swingIcon(ctx, w, h) {
        var C = GD.C;
        ctx.fillStyle = css([250, 180, 90]);
        roundRect(ctx, 2, h * 0.4, w - 4, h * 0.2, 4); ctx.fill();
        ctx.strokeStyle = css(C.colorPlayerBorder); ctx.lineWidth = 2;
        roundRect(ctx, 2, h * 0.4, w - 4, h * 0.2, 4); ctx.stroke();
    }

    function orbIcon(ctx, w, h, color) {
        ctx.fillStyle = css([255, 255, 255]);
        circle(ctx, w / 2, h / 2, w / 2 - 1); ctx.fill();
        ctx.fillStyle = css(color);
        circle(ctx, w / 2, h / 2, w / 2 - 4); ctx.fill();
    }

    function coinIcon(ctx, w, h) {
        orbIcon(ctx, w, h, GD.C.colorCoin);
    }

    function blockIcon(ctx, w, h) {
        var C = GD.C, p = 1;
        ctx.fillStyle = css(C.colorBlock);
        roundRect(ctx, p, p, w - 2 * p, h - 2 * p, 3); ctx.fill();
        ctx.strokeStyle = css(C.colorBlockBorder); ctx.lineWidth = 3;
        roundRect(ctx, p, p, w - 2 * p, h - 2 * p, 3); ctx.stroke();
    }

    function spikeIcon(ctx, w, h) {
        var C = GD.C;
        ctx.beginPath();
        ctx.moveTo(1, 1); ctx.lineTo(w - 1, 1); ctx.lineTo(w / 2, h - 1); ctx.closePath();
        ctx.fillStyle = css(C.colorSpike); ctx.fill();
        ctx.strokeStyle = css(C.colorSpikeBorder); ctx.lineWidth = 3; ctx.stroke();
    }

    function ringIcon(ctx, w, h, color) {
        ctx.strokeStyle = css(color);
        ctx.lineWidth = 6;
        circle(ctx, w / 2, h / 2, w / 2 - 5); ctx.stroke();
    }

    // --- UI icons (original geometric artwork) ---

    function playIcon(ctx, w, h, color) {
        ctx.fillStyle = css(color);
        ctx.beginPath();
        ctx.moveTo(w * 0.32, h * 0.2);
        ctx.lineTo(w * 0.32, h * 0.8);
        ctx.lineTo(w * 0.78, h * 0.5);
        ctx.closePath();
        ctx.fill();
    }

    function pauseIcon(ctx, w, h, color) {
        ctx.fillStyle = css(color);
        roundRect(ctx, w * 0.32, h * 0.2, w * 0.13, h * 0.6, 2); ctx.fill();
        roundRect(ctx, w * 0.55, h * 0.2, w * 0.13, h * 0.6, 2); ctx.fill();
    }

    function arrowIcon(ctx, w, h, color, dir) {
        ctx.fillStyle = css(color);
        ctx.beginPath();
        if (dir < 0) {
            ctx.moveTo(w * 0.3, h * 0.5);
            ctx.lineTo(w * 0.68, h * 0.24);
            ctx.lineTo(w * 0.68, h * 0.76);
        } else {
            ctx.moveTo(w * 0.7, h * 0.5);
            ctx.lineTo(w * 0.32, h * 0.24);
            ctx.lineTo(w * 0.32, h * 0.76);
        }
        ctx.closePath();
        ctx.fill();
    }

    function gearIcon(ctx, w, h, color) {
        ctx.fillStyle = css(color);
        circle(ctx, w / 2, h / 2, w * 0.22); ctx.fill();
        ctx.strokeStyle = css(color);
        ctx.lineWidth = w * 0.09;
        for (var i = 0; i < 8; i++) {
            var a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(w / 2 + Math.cos(a) * w * 0.28, h / 2 + Math.sin(a) * h * 0.28);
            ctx.lineTo(w / 2 + Math.cos(a) * w * 0.42, h / 2 + Math.sin(a) * h * 0.42);
            ctx.stroke();
        }
    }

    function cubeBtnIcon(ctx, w, h, color) {
        ctx.strokeStyle = css(color);
        ctx.lineWidth = w * 0.1;
        roundRect(ctx, w * 0.18, h * 0.18, w * 0.64, h * 0.64, w * 0.12); ctx.stroke();
        ctx.fillStyle = css(color);
        circle(ctx, w * 0.38, h * 0.4, w * 0.06); ctx.fill();
        circle(ctx, w * 0.62, h * 0.4, w * 0.06); ctx.fill();
        roundRect(ctx, w * 0.4, h * 0.58, w * 0.2, h * 0.08, 2); ctx.fill();
    }

    function musicIcon(ctx, w, h, color) {
        ctx.fillStyle = css(color);
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h * 0.75);
        ctx.lineTo(w * 0.7, h * 0.6);
        ctx.lineTo(w * 0.7, h * 0.25);
        ctx.lineTo(w * 0.3, h * 0.4);
        ctx.closePath();
        ctx.fill();
    }

    function starIcon(ctx, w, h, color) {
        ctx.fillStyle = css(color);
        ctx.beginPath();
        var cx = w / 2, cy = h / 2, R = w * 0.45, r = w * 0.18;
        for (var i = 0; i < 10; i++) {
            var rad = (i % 2 === 0) ? R : r;
            var a = -Math.PI / 2 + i * Math.PI / 5;
            var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    function hammerIcon(ctx, w, h, color) {
        ctx.strokeStyle = css(color);
        ctx.lineWidth = w * 0.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w * 0.28, h * 0.78);
        ctx.lineTo(w * 0.7, h * 0.34);
        ctx.stroke();
        ctx.fillStyle = css(color);
        roundRect(ctx, w * 0.52, h * 0.16, w * 0.32, h * 0.3, 3);
        ctx.fill();
    }

    function questIcon(ctx, w, h, color) {
        ctx.strokeStyle = css(color);
        ctx.lineWidth = w * 0.09;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h * 0.78);
        ctx.lineTo(w * 0.3, h * 0.2);
        ctx.stroke();
        ctx.fillStyle = css(color);
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h * 0.2);
        ctx.lineTo(w * 0.76, h * 0.32);
        ctx.lineTo(w * 0.3, h * 0.46);
        ctx.closePath();
        ctx.fill();
    }

    return {
        sprite: sprite, css: css,
        cubeFace: cubeFace, robotFace: robotFace, ballIcon: ballIcon,
        shipIcon: shipIcon, ufoIcon: ufoIcon, waveIcon: waveIcon,
        spiderIcon: spiderIcon, swingIcon: swingIcon,
        orbIcon: orbIcon, coinIcon: coinIcon, blockIcon: blockIcon,
        spikeIcon: spikeIcon, ringIcon: ringIcon,
        playIcon: playIcon, pauseIcon: pauseIcon, arrowIcon: arrowIcon,
        gearIcon: gearIcon, cubeBtnIcon: cubeBtnIcon, musicIcon: musicIcon,
        starIcon: starIcon, hammerIcon: hammerIcon, questIcon: questIcon
    };
})();
