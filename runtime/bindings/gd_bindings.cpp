// Geometry Web — C ABI binding for the WebAssembly bridge (and native test).
//
// The JavaScript bridge (src/bridge.js) passes:
//   state: float[13] = x, y, vy, onGround, inAir, dead, finished,
//                       mode, gravity, rotation, size, speed, airTime
//   input: int[2]    = pressed, held
//   dt:    float[1]
#include "gd_runtime.hpp"

extern "C" {

void gd_step(float* state, const int* input, float* dt) {
    gd::State s;
    s.x = state[0]; s.y = state[1]; s.vy = state[2];
    s.onGround = state[3] != 0.f; s.inAir = state[4] != 0.f;
    s.dead = state[5] != 0.f; s.finished = state[6] != 0.f;
    s.mode = static_cast<gd::Mode>(static_cast<int>(state[7]));
    s.gravity = static_cast<int>(state[8]);
    s.rotation = state[9]; s.size = state[10]; s.speed = state[11]; s.airTime = state[12];
    s.charge = state[13];

    gd::Input in{ input[0] != 0, input[1] != 0 };
    gd::Config cfg;
    gd::step(s, in, *dt, cfg);

    state[0] = s.x; state[1] = s.y; state[2] = s.vy;
    state[3] = s.onGround ? 1.f : 0.f; state[4] = s.inAir ? 1.f : 0.f;
    state[5] = s.dead ? 1.f : 0.f; state[6] = s.finished ? 1.f : 0.f;
    state[7] = static_cast<float>(static_cast<int>(s.mode));
    state[8] = static_cast<float>(s.gravity);
    state[9] = s.rotation; state[10] = s.size; state[11] = s.speed; state[12] = s.airTime;
    state[13] = s.charge;
}

} // extern "C"
