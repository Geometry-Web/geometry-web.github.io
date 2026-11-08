# Build & test

## 1. Run the game (browser)

The game is pure JavaScript + cocos2d-html5, so it needs only a static server:

```bash
python serve.py          # or: python -m http.server 8000
```

Open `http://localhost:8000/`. Use a Chromium/Firefox browser.

## 2. JavaScript tests

```bash
node tests/run_tests.js
```

Loads `src/config.js`, `src/math.js`, `src/sim/Simulation.js` in a sandbox and
asserts the movement model (jump, gravity, landing, ship thrust, scroll, AABB).

## 3. C++ runtime — native build + tests (Windows / MSVC)

Requires CMake and Visual Studio 2022 (both detected in this environment).

```powershell
powershell -File runtime/build_native.ps1
```

This configures with CMake (Visual Studio 17 2022 generator), builds
`gd_runtime` + `native_test`, and runs the native unit tests. Output:
`runtime/build/Release/native_test.exe`.

## 4. C++ runtime — WebAssembly build (requires Emscripten)

Emscripten (`emsdk`) is **not installed** in this environment, so the WASM step
cannot be run here. Install it first, then:

```bash
cd runtime
./build_wasm.sh
```

This runs `emcc` and produces:
- `runtime/build/gd_runtime.js` (Emscripten glue, `Module` global)
- `runtime/build/gd_runtime.wasm`

The game (`src/bridge.js`) auto-loads `runtime/build/gd_runtime.js`; when present,
the C++ runtime steps the simulation in WebAssembly. Until it is built, the game
transparently falls back to the pure-JS simulation, so it is always playable.

Build flags used (see `runtime/build_wasm.sh`):
`-O3 -sMODULARIZE=1 -sEXPORT_NAME=Module -sEXPORTED_FUNCTIONS=[_gd_step,_malloc,_free] -sALLOW_MEMORY_GROWTH=1 -sWASM=1`

The C ABI is `void gd_step(float* state, const int* input, float* dt)` where
`state` is `float[13]` (x, y, vy, onGround, inAir, dead, finished, mode,
gravity, rotation, size, speed, airTime) and `input` is `int[2]` (pressed, held).

## 5. CMake-only (alternative)

```powershell
cd runtime
& 'C:\Program Files\CMake\bin\cmake.exe' -S . -B build -G 'Visual Studio 17 2022' -A x64
& 'C:\Program Files\CMake\bin\cmake.exe' --build build --config Release
```

For WASM via CMake, configure with the Emscripten toolchain file
(`-DCMAKE_TOOLCHAIN_FILE=$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake`);
the `gd_runtime_wasm` target then becomes active.
