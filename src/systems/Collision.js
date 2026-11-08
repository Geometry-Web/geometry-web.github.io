/**
 * Geometry Web — collision & interaction (original).
 * Detects player vs object overlaps, mutates the sim state, and returns events
 * for the scene to turn into audio/particles/UI.
 */
window.GD = window.GD || {};

GD.Collision = (function () {
    var C = GD.C, M = GD.Mode;

    function playerBox(state) {
        var w = (state.mode === M.SHIP) ? C.shipWidth : state.size;
        var h = state.size;
        return { x: state.x - w / 2, y: state.y - h / 2, w: w, h: h };
    }

    function modeOf(m) {
        switch (m) {
            case 'ship': return M.SHIP;
            case 'ball': return M.BALL;
            case 'ufo': return M.UFO;
            case 'wave': return M.WAVE;
            case 'robot': return M.ROBOT;
            case 'spider': return M.SPIDER;
            case 'swing': return M.SWING;
            default: return M.CUBE;
        }
    }

    function check(state, objects) {
        var events = [];
        if (state.dead || state.finished) return events;
        var pb = playerBox(state);
        var prevBottom = state.prevBottom;

        for (var i = 0; i < objects.length; i++) {
            var o = objects[i];
            if (!o || o.collected) continue;

            switch (o.type) {
                case 'block':
                    if (GD.math.aabbOverlap(pb, o.hb)) {
                        var top = o.hb.y + o.hb.h;
                        if (prevBottom >= top - 6 && state.vy <= 0) {
                            state.y = top + state.size / 2;
                            state.vy = 0; state.onGround = true; state.inAir = false;
                            events.push({ type: 'land' });
                        } else {
                            state.dead = true;
                            events.push({ type: 'death' });
                        }
                    }
                    break;
                case 'spike':
                    if (GD.math.aabbOverlap(pb, o.hb)) {
                        state.dead = true;
                        events.push({ type: 'death' });
                    }
                    break;
                case 'orb':
                case 'pad':
                    if (GD.math.dist(state.x, state.y, o.x, o.y) <= (o.radius + state.size / 2)) {
                        applyAction(state, o.action, o.type);
                        events.push({ type: o.type, action: o.action });
                    }
                    break;
                case 'portal':
                    if (GD.math.aabbOverlap(pb, o.hb)) {
                        GD.Sim.setMode(state, modeOf(o.mode));
                        events.push({ type: 'portal', mode: o.mode });
                    }
                    break;
                case 'gravity':
                    if (GD.math.aabbOverlap(pb, o.hb)) {
                        state.gravity = -state.gravity;
                        state.vy = C.ballFlipVelocity * state.gravity;
                        state.onGround = false; state.inAir = true;
                        events.push({ type: 'gravity' });
                    }
                    break;
                case 'size':
                    if (GD.math.aabbOverlap(pb, o.hb)) {
                        var base = (state.mode === M.SHIP) ? C.shipHeight : C.playerSize;
                        state.size = GD.math.clamp(base * o.mult, 12, 60);
                        if (state.onGround && state.gravity > 0) state.y = C.groundY + state.size / 2;
                        events.push({ type: 'size', mult: o.mult });
                    }
                    break;
                case 'checkpoint':
                    if (GD.math.aabbOverlap(pb, o.hb) && !o.activated) {
                        o.activated = true;
                        events.push({ type: 'checkpoint', x: o.x, y: o.y });
                    }
                    break;
                case 'speed':
                    if (GD.math.aabbOverlap(pb, o.hb)) {
                        state.speed = C.baseSpeed * o.mult;
                        events.push({ type: 'speed', mult: o.mult });
                    }
                    break;
                case 'coin':
                    if (GD.math.dist(state.x, state.y, o.x, o.y) <= (o.radius + state.size / 2)) {
                        o.collected = true;
                        o.node.setVisible(false);
                        events.push({ type: 'coin' });
                    }
                    break;
                case 'finish':
                    if (GD.math.aabbOverlap(pb, o.hb)) {
                        state.finished = true;
                        events.push({ type: 'finish' });
                    }
                    break;
            }
        }
        return events;
    }

    function applyAction(state, action, kind) {
        if (action === 'gravity') {
            state.gravity = -state.gravity;
            state.vy = (kind === 'pad' ? C.jumpVelocity * 1.2 : C.ballFlipVelocity) * state.gravity;
            state.onGround = false; state.inAir = true;
        } else {
            state.vy = (kind === 'pad' ? C.jumpVelocity * 1.35 : C.jumpVelocity) * state.gravity;
            state.onGround = false; state.inAir = true; state.airTime = 0;
        }
    }

    return { check: check, playerBox: playerBox };
})();
