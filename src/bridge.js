/**
 * Geometry Web — WebAssembly bridge (original).
 *
 * Tries to load the compiled C++ gameplay runtime (runtime/build/gd_runtime.js +
 * .wasm, produced by Emscripten). If it is present, the C++ runtime steps the
 * simulation; otherwise the game transparently falls back to the pure-JS
 * simulation (GD.Sim), so the game is always playable.
 *
 * NOTE: the WASM path requires building the runtime (see runtime/ and
 * docs/BUILD.md). Until then, ready === false and the JS sim is used.
 */
window.GD = window.GD || {};

GD.bridge = (function () {
    var ready = false;
    var attempted = false;
    var mod = null;

    function init(onReady) {
        if (attempted) { if (ready && onReady) onReady(); return; }
        attempted = true;

        if (typeof WebAssembly === 'undefined') {
            console.log('[bridge] WebAssembly unavailable; using JS simulation.');
            return;
        }

        var s = document.createElement('script');
        s.src = 'runtime/build/gd_runtime.js';   // Emscripten glue
        s.onload = function () {
            var m = window.Module;
            if (!m) { console.log('[bridge] glue loaded but no Module; using JS sim.'); return; }
            m.onRuntimeInitialized = function () {
                ready = true;
                mod = m;
                console.log('[bridge] C++ runtime ready (WASM simulation active).');
                if (onReady) onReady();
            };
        };
        s.onerror = function () {
            console.log('[bridge] no WASM runtime found; using JS simulation.');
        };
        document.body.appendChild(s);
    }

    // Step the simulation. Falls back to JS when the WASM runtime is absent.
    // state: GD.Sim state object; input: {pressed, held}; dt: seconds.
    function step(state, input, dt) {
        if (ready && mod && mod._gd_step) {
            // Mirror the JS state into the C ABI (float[12]) and back.
            var st = new Float32Array(14);
            st[0] = state.x; st[1] = state.y; st[2] = state.vy;
            st[3] = state.onGround ? 1 : 0; st[4] = state.inAir ? 1 : 0;
            st[5] = state.dead ? 1 : 0; st[6] = state.finished ? 1 : 0;
            st[7] = state.mode; st[8] = state.gravity;
            st[9] = state.rotation; st[10] = state.size; st[11] = state.speed;
            st[12] = state.airTime || 0; st[13] = state.charge || 0;
            var inp = new Int32Array([input.pressed ? 1 : 0, input.held ? 1 : 0]);
            var dtf = new Float32Array([dt]);
            var stPtr = mod._malloc(st.length * 4);
            var inPtr = mod._malloc(inp.length * 4);
            var dtPtr = mod._malloc(4);
            mod.HEAPF32.set(st, stPtr >> 2);
            mod.HEAP32.set(inp, inPtr >> 2);
            mod.HEAPF32.set(dtf, dtPtr >> 2);
            mod._gd_step(stPtr, inPtr, dtPtr);
            var out = new Float32Array(mod.HEAPF32.buffer, stPtr, 14);
            state.x = out[0]; state.y = out[1]; state.vy = out[2];
            state.onGround = out[3] !== 0; state.inAir = out[4] !== 0;
            state.dead = out[5] !== 0; state.finished = out[6] !== 0;
            state.mode = out[7]; state.gravity = out[8];
            state.rotation = out[9]; state.size = out[10]; state.speed = out[11];
            state.airTime = out[12]; state.charge = out[13];
            mod._free(stPtr); mod._free(inPtr); mod._free(dtPtr);
            return state;
        }
        return GD.Sim.step(state, input, dt);
    }

    return {
        init: init,
        step: step,
        get ready() { return ready; }
    };
})();
