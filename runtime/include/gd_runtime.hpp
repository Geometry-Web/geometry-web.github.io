// Geometry Web — independent C++20 gameplay runtime.
//
// This mirrors the movement model in src/sim/Simulation.js (gravity, jump,
// ground, cube/ship/ball/wave) so the exact same math can run natively (for
// testing) or in WebAssembly (for the in-browser sim via the JS bridge).
//
// It is an ORIGINAL implementation written from the same design, not code
// extracted from Geometry Dash.

#pragma once
#include <cstdint>

namespace gd {

enum class Mode : int {
    Cube = 0, Ship = 1, Ball = 2, Ufo = 3,
    Wave = 4, Robot = 5, Spider = 6, Swing = 7
};

struct State {
    float x = 0.f;
    float y = 0.f;
    float vy = 0.f;
    bool onGround = true;
    bool inAir = false;
    bool dead = false;
    bool finished = false;
    Mode mode = Mode::Cube;
    int gravity = 1;        // +1 = down, -1 = up
    float rotation = 0.f;
    float size = 30.f;
    float speed = 320.f;
    float airTime = 0.f;
    float charge = 0.f;
};

struct Input {
    bool pressed = false;
    bool held = false;
};

struct Config {
    float gravity = 4000.f;
    float jumpVelocity = 1040.f;
    float shipGravity = 2933.f;
    float shipThrust = 4800.f;
    float ballGravity = 4000.f;
    float ballFlipVelocity = 933.f;
    float baseSpeed = 427.f;
    float groundY = 60.f;
    float ceilingY = 540.f;
    float jumpRotation = 180.f;
    float shipWidth = 56.f;
    float shipHeight = 32.f;
    float ufoJumpVelocity = 853.f;
    float robotMaxCharge = 0.4f;
    float robotJumpMin = 560.f;
    float robotJumpMax = 1533.f;
    float swingGravity = 3200.f;
    float swingFlipVelocity = 853.f;
    float sizeSmall = 0.72f;
    float sizeBig = 1.32f;
};

struct Rect { float x, y, w, h; };

State createState(Mode mode, float x, float y, const Config& cfg);
void reset(State& s, float x, float y, const Config& cfg);
void setMode(State& s, Mode mode, const Config& cfg);
void step(State& s, const Input& in, float dt, const Config& cfg);

bool overlap(const Rect& a, const Rect& b);

} // namespace gd

// C ABI used by the WebAssembly bridge (and the native test).
extern "C" void gd_step(float* state, const int* input, float* dt);

