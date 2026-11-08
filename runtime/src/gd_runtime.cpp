// Geometry Web — gameplay runtime implementation (original).
#include "gd_runtime.hpp"
#include <algorithm>
#include <cmath>

namespace gd {

namespace {
float clampf(float v, float lo, float hi) {
    return v < lo ? lo : (v > hi ? hi : v);
}

float rotationRate(const Config& cfg) {
    float dur = 2.0f * cfg.jumpVelocity / cfg.gravity;
    return cfg.jumpRotation / std::max(0.01f, dur);
}

float sizeFor(Mode mode, const Config& cfg) {
    return (mode == Mode::Ship) ? cfg.shipHeight : 30.f;
}
} // namespace

State createState(Mode mode, float x, float y, const Config& cfg) {
    State s;
    s.mode = mode;
    s.size = sizeFor(mode, cfg);
    s.x = x > 0.f ? x : 120.f;
    s.y = y > 0.f ? y : (cfg.groundY + s.size * 0.5f);
    s.speed = cfg.baseSpeed;
    return s;
}

void reset(State& s, float x, float y, const Config& cfg) {
    s.size = sizeFor(s.mode, cfg);
    s.x = x > 0.f ? x : 120.f;
    s.y = y > 0.f ? y : (cfg.groundY + s.size * 0.5f);
    s.vy = 0.f; s.onGround = true; s.inAir = false;
    s.dead = false; s.finished = false; s.gravity = 1;
    s.rotation = 0.f; s.airTime = 0.f; s.speed = cfg.baseSpeed;
    s.charge = 0.f;
}

void setMode(State& s, Mode mode, const Config& cfg) {
    s.mode = mode;
    s.size = sizeFor(mode, cfg);
    s.charge = 0.f;
    if (s.gravity > 0) {
        s.y = std::max(s.y, cfg.groundY + s.size * 0.5f);
    }
}

void step(State& s, const Input& in, float dt, const Config& cfg) {
    if (s.dead || s.finished) return;

    int g = s.gravity;                 // +1 down, -1 up
    const float half = s.size * 0.5f;
    const float floor = cfg.groundY + half;
    const float ceil = cfg.ceilingY - half;

    s.x += s.speed * dt;

    switch (s.mode) {
        case Mode::Ship:
            s.vy += (in.held ? cfg.shipThrust : 0.f) * dt - cfg.shipGravity * static_cast<float>(g) * dt;
            s.rotation = clampf(s.vy * 0.02f, -28.f, 28.f);
            break;
        case Mode::Ball:
            if (in.pressed && s.onGround) {
                s.gravity = -s.gravity; g = s.gravity;
                s.vy = cfg.ballFlipVelocity * static_cast<float>(g);
                s.onGround = false; s.inAir = true;
            }
            s.vy -= cfg.ballGravity * static_cast<float>(g) * dt;
            break;
        case Mode::Ufo:
            if (in.pressed) {
                s.vy = cfg.ufoJumpVelocity * static_cast<float>(g);
                s.onGround = false; s.inAir = true;
            }
            s.vy -= cfg.gravity * static_cast<float>(g) * dt;
            s.rotation = 0.f;
            break;
        case Mode::Wave:
            s.vy = (in.held ? 1.f : -1.f) * cfg.baseSpeed;
            s.rotation = 0.f;
            break;
        case Mode::Robot:
            if (in.held && s.onGround) {
                s.charge = std::min(cfg.robotMaxCharge, s.charge + dt);
                if (s.charge >= cfg.robotMaxCharge) {
                    s.vy = cfg.robotJumpMax * static_cast<float>(g);
                    s.charge = 0.f; s.onGround = false; s.inAir = true;
                }
            } else if (!in.held && s.onGround && s.charge > 0.f) {
                float t = s.charge / cfg.robotMaxCharge;
                s.vy = (cfg.robotJumpMin + (cfg.robotJumpMax - cfg.robotJumpMin) * t) * static_cast<float>(g);
                s.charge = 0.f; s.onGround = false; s.inAir = true;
            }
            s.vy -= cfg.gravity * static_cast<float>(g) * dt;
            s.rotation = 0.f;
            break;
        case Mode::Spider:
            if (in.pressed) {
                s.y = (g > 0) ? floor : ceil;
                s.vy = 0.f; s.onGround = true; s.inAir = false;
            }
            s.vy -= cfg.gravity * static_cast<float>(g) * dt;
            s.rotation = 0.f;
            break;
        case Mode::Swing:
            if (in.pressed && s.onGround) {
                s.gravity = -s.gravity; g = s.gravity;
                s.vy = cfg.swingFlipVelocity * static_cast<float>(g);
                s.onGround = false; s.inAir = true;
            }
            s.vy -= cfg.swingGravity * static_cast<float>(g) * dt;
            s.rotation = clampf(s.vy * 0.02f, -20.f, 20.f);
            break;
        default: // Cube
            if (in.pressed && s.onGround) {
                s.vy = cfg.jumpVelocity * static_cast<float>(g);
                s.onGround = false; s.inAir = true; s.airTime = 0.f;
            }
            s.vy -= cfg.gravity * static_cast<float>(g) * dt;
            break;
    }

    s.y += s.vy * dt;

    if (g > 0) {
        if (s.y <= floor) { s.y = floor; s.vy = 0.f; s.onGround = true; s.inAir = false; }
        if (s.y >= ceil) { s.y = ceil; if (s.vy > 0.f) s.vy = 0.f; }
    } else {
        if (s.y >= ceil) { s.y = ceil; s.vy = 0.f; s.onGround = true; s.inAir = false; }
        if (s.y <= floor) { s.y = floor; if (s.vy < 0.f) s.vy = 0.f; }
    }

    if (s.mode == Mode::Cube) {
        if (s.inAir) {
            s.airTime += dt;
            s.rotation += rotationRate(cfg) * dt;
        } else {
            s.rotation = std::round(s.rotation / 90.f) * 90.f;
        }
    }
}

bool overlap(const Rect& a, const Rect& b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

} // namespace gd
