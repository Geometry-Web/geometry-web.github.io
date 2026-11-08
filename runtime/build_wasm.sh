#!/usr/bin/env bash
# Geometry Web — WebAssembly build (requires Emscripten / emsdk).
#
# Produces runtime/build/gd_runtime.js and runtime/build/gd_runtime.wasm,
# which src/bridge.js loads. Install emsdk first:
#   https://emscripten.org/docs/getting_started/downloads.html
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build

emcc src/gd_runtime.cpp bindings/gd_bindings.cpp -Iinclude \
    -std=c++20 -O3 \
    -sMODULARIZE=1 \
    -sEXPORT_NAME=Module \
    -sEXPORTED_FUNCTIONS='["_gd_step","_malloc","_free"]' \
    -sALLOW_MEMORY_GROWTH=1 \
    -sWASM=1 \
    -o build/gd_runtime.js

echo "Built: build/gd_runtime.js and build/gd_runtime.wasm"
echo "Copy the GeometryWeb folder to an HTTP server and the game will use WASM."
