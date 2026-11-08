// Geometry Web — native unit tests for the C++ runtime.
// Runs without Emscripten to validate the physics/ABI logic on the host.
#include "gd_runtime.hpp"
#include <cstdio>
#include <cmath>

static int failures = 0;
#define CHECK(cond) do { if (!(cond)) { \
    std::printf("FAIL: %s (line %d)\n", #cond, __LINE__); ++failures; } } while (0)

int main() {
    gd::Config cfg;

    // 1) Cube jump: pressing launches upward off the ground.
    gd::State s = gd::createState(gd::Mode::Cube, 0, 0, cfg);
    gd::step(s, gd::Input{true, false}, 1.0f / 60.0f, cfg);
    CHECK(!s.onGround);
    CHECK(s.vy > 0.0f);

    // 2) Gravity reverses vy while airborne (~0.33s, before the ~0.52s landing).
    for (int i = 0; i < 20; ++i) gd::step(s, gd::Input{false, false}, 1.0f / 60.0f, cfg);
    CHECK(s.vy < 0.0f);
    CHECK(!s.onGround);

    // 3) The player lands back on the ground.
    for (int i = 0; i < 120; ++i) gd::step(s, gd::Input{false, false}, 1.0f / 60.0f, cfg);
    CHECK(s.onGround);
    CHECK(std::fabs(s.y - (cfg.groundY + s.size * 0.5f)) < 1.0f);

    // 4) Mode switch to ship changes the collision size.
    gd::setMode(s, gd::Mode::Ship, cfg);
    CHECK(std::fabs(s.size - cfg.shipHeight) < 0.001f);

    // 5) Ship thrust raises the ship while holding.
    gd::reset(s, 0, 0, cfg);
    gd::setMode(s, gd::Mode::Ship, cfg);
    float y0 = s.y;
    for (int i = 0; i < 20; ++i) gd::step(s, gd::Input{false, true}, 1.0f / 60.0f, cfg);
    CHECK(s.y > y0);

    // 6) AABB overlap helper.
    gd::Rect a{0, 0, 10, 10}, b{5, 5, 10, 10}, c{20, 20, 5, 5};
    CHECK(gd::overlap(a, b));
    CHECK(!gd::overlap(a, c));

    // 7) UFO: tap hops upward (allowed in mid-air).
    gd::reset(s, 0, 0, cfg);
    gd::setMode(s, gd::Mode::Ufo, cfg);
    for (int i = 0; i < 5; ++i) gd::step(s, gd::Input{false, false}, 1.0f / 60.0f, cfg);
    gd::step(s, gd::Input{true, false}, 1.0f / 60.0f, cfg);
    CHECK(s.vy > 0.f);

    // 8) Robot: hold to charge, release to jump.
    gd::reset(s, 0, 0, cfg);
    gd::setMode(s, gd::Mode::Robot, cfg);
    for (int i = 0; i < 12; ++i) gd::step(s, gd::Input{false, true}, 1.0f / 60.0f, cfg);
    CHECK(s.charge > 0.f);
    gd::step(s, gd::Input{false, false}, 1.0f / 60.0f, cfg);
    CHECK(s.vy > 0.f);
    CHECK(!s.onGround);

    // 9) Spider: tap teleports to the floor instantly.
    gd::reset(s, 0, 0, cfg);
    gd::setMode(s, gd::Mode::Spider, cfg);
    s.y = 200.f; s.onGround = false;
    gd::step(s, gd::Input{true, false}, 1.0f / 60.0f, cfg);
    CHECK(s.onGround);
    CHECK(std::fabs(s.y - (cfg.groundY + s.size * 0.5f)) < 1.0f);

    // 10) C ABI round-trip via gd_step (same as the JS bridge).
    float st[14] = { 120.f, 75.f, 0.f, 1.f, 0.f, 0.f, 0.f, 0.f, 1.f, 0.f, 30.f, 320.f, 0.f, 0.f };
    int inp[2] = { 1, 0 };
    float dt = 1.0f / 60.0f;
    gd_step(st, inp, &dt);
    CHECK(st[3] == 0.f);      // left the ground
    CHECK(st[2] > 0.f);       // upward velocity

    if (failures == 0) { std::printf("All native runtime tests passed.\n"); return 0; }
    std::printf("%d test(s) FAILED.\n", failures);
    return 1;
}
