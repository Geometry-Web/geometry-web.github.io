/**
 * Geometry Web — deterministic gameplay simulation (original).
 *
 * This module implements the movement model (gravity, jump, ground, rotation)
 * for the player modes. It has NO dependency on the rendering framework so the
 * exact same math can be mirrored in C++ (runtime/) and compiled to WebAssembly.
 *
 * Shared contract (also used by runtime/cpp):
 *   state = { x, y, vy, onGround, inAir, dead, finished, mode, gravity,
 *             rotation, size, speed, airTime }
 *   input = { pressed, held }
 *   step(state, input, dt) mutates and returns state.
 *
 * gravity is a SIGN: +1 = normal (down), -1 = flipped (up).
 */
window.GD = window.GD || {};

GD.Sim = (function () {
    var C = GD.C, M = GD.Mode;

    function createState(mode, x, y) {
        var size = (mode === M.SHIP) ? C.shipHeight : C.playerSize;
        return {
            x: x || 120,
            y: y || C.groundY + size / 2,
            vy: 0, onGround: true, inAir: false, dead: false, finished: false,
            mode: (mode == null) ? M.CUBE : mode,
            gravity: 1,
            rotation: 0,
            size: size,
            speed: C.baseSpeed,
            airTime: 0,
            charge: 0
        };
    }

    function reset(state, x, y) {
        var size = (state.mode === M.SHIP) ? C.shipHeight : C.playerSize;
        state.x = x || 120;
        state.y = y || C.groundY + size / 2;
        state.vy = 0; state.onGround = true; state.inAir = false;
        state.dead = false; state.finished = false; state.gravity = 1;
        state.rotation = 0; state.airTime = 0; state.speed = C.baseSpeed;
        state.size = size; state.charge = 0;
        return state;
    }

    function setMode(state, mode) {
        state.mode = mode;
        state.size = (mode === M.SHIP) ? C.shipHeight : C.playerSize;
        state.charge = 0;
        if (state.gravity > 0) state.y = Math.max(state.y, C.groundY + state.size / 2);
        return state;
    }

    function rotationRate() {
        var dur = 2 * C.jumpVelocity / C.gravity;
        return C.jumpRotation / Math.max(0.01, dur);
    }

    function step(state, input, dt) {
        if (state.dead || state.finished) return state;

        var g = state.gravity;                 // +1 down, -1 up
        var half = state.size / 2;
        var floor = C.groundY + half;
        var ceil = C.designH - half;

        state.x += state.speed * dt;

        switch (state.mode) {
            case M.SHIP:
                state.vy += (input.held ? C.shipThrust : 0) * dt - C.shipGravity * g * dt;
                state.rotation = GD.math.clamp(state.vy * 0.02, -28, 28);
                break;
            case M.BALL:
                if (input.pressed && state.onGround) {
                    state.gravity = -state.gravity; g = state.gravity;
                    state.vy = C.ballFlipVelocity * g;
                    state.onGround = false; state.inAir = true;
                }
                state.vy -= C.ballGravity * g * dt;
                break;
            case M.UFO:
                if (input.pressed) {
                    state.vy = C.ufoJumpVelocity * g;
                    state.onGround = false; state.inAir = true;
                }
                state.vy -= C.gravity * g * dt;
                state.rotation = 0;
                break;
            case M.WAVE:
                state.vy = (input.held ? 1 : -1) * C.baseSpeed;
                state.rotation = 0;
                break;
            case M.ROBOT:
                if (input.held && state.onGround) {
                    state.charge = Math.min(C.robotMaxCharge, state.charge + dt);
                    if (state.charge >= C.robotMaxCharge) {
                        state.vy = C.robotJumpMax * g;
                        state.charge = 0; state.onGround = false; state.inAir = true;
                    }
                } else if (!input.held && state.onGround && state.charge > 0) {
                    var t = state.charge / C.robotMaxCharge;
                    state.vy = (C.robotJumpMin + (C.robotJumpMax - C.robotJumpMin) * t) * g;
                    state.charge = 0; state.onGround = false; state.inAir = true;
                }
                state.vy -= C.gravity * g * dt;
                state.rotation = 0;
                break;
            case M.SPIDER:
                if (input.pressed) {
                    state.y = (g > 0) ? floor : ceil;
                    state.vy = 0; state.onGround = true; state.inAir = false;
                }
                state.vy -= C.gravity * g * dt;
                state.rotation = 0;
                break;
            case M.SWING:
                if (input.pressed && state.onGround) {
                    state.gravity = -state.gravity; g = state.gravity;
                    state.vy = C.swingFlipVelocity * g;
                    state.onGround = false; state.inAir = true;
                }
                state.vy -= C.swingGravity * g * dt;
                state.rotation = GD.math.clamp(state.vy * 0.02, -20, 20);
                break;
            default: // CUBE
                if (input.pressed && state.onGround) {
                    state.vy = C.jumpVelocity * g;
                    state.onGround = false; state.inAir = true; state.airTime = 0;
                }
                state.vy -= C.gravity * g * dt;
                break;
        }

        state.y += state.vy * dt;

        if (g > 0) {
            if (state.y <= floor) { state.y = floor; state.vy = 0; state.onGround = true; state.inAir = false; }
            if (state.y >= ceil) { state.y = ceil; if (state.vy > 0) state.vy = 0; }
        } else {
            if (state.y >= ceil) { state.y = ceil; state.vy = 0; state.onGround = true; state.inAir = false; }
            if (state.y <= floor) { state.y = floor; if (state.vy < 0) state.vy = 0; }
        }

        if (state.mode === M.CUBE) {
            if (state.inAir) {
                state.airTime += dt;
                state.rotation += rotationRate() * dt;
            } else {
                state.rotation = Math.round(state.rotation / 90) * 90;
            }
        }

        return state;
    }

    return {
        createState: createState,
        reset: reset,
        setMode: setMode,
        step: step,
        Mode: M
    };
})();
