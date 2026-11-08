cmake_minimum_required(VERSION 3.16)
project(gd_runtime CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Core runtime library (host-native or WASM; no Emscripten-specific code here).
add_library(gd_runtime src/gd_runtime.cpp)
target_include_directories(gd_runtime PUBLIC include)

# Native unit test (host build only).
add_executable(native_test ../tests/native_test.cpp bindings/gd_bindings.cpp)
target_link_libraries(native_test PRIVATE gd_runtime)

# WebAssembly target: only built when configuring with the Emscripten toolchain.
if(EMSCRIPTEN)
    add_executable(gd_runtime_wasm src/gd_runtime.cpp bindings/gd_bindings.cpp)
    target_include_directories(gd_runtime_wasm PRIVATE include)
    set_target_properties(gd_runtime_wasm PROPERTIES
        OUTPUT_NAME gd_runtime
        SUFFIX ".js"
        LINK_FLAGS "-sMODULARIZE=1 -sEXPORT_NAME=Module -sEXPORTED_FUNCTIONS=['_gd_step','_malloc','_free'] -sALLOW_MEMORY_GROWTH=1 -sWASM=1 -O3")
endif()
