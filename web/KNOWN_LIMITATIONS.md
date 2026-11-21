# Known limitations

## Evidence

The installed desktop files provide a native reference for controlled play and capture. A timed native reference run and frame-by-frame alignment are pending. Physics constants and target test ranges in the web source are reconstruction decisions. No exact cross-version compatibility has been demonstrated.

## Recovered baseline

- The reference build contains packaged native assets, while the web project supplies its own primitives and synthesized sounds. Rendering equivalence, full sprite atlas handling and the official songs are outside the recovered baseline.
- Baseline collision uses axis-aligned boxes and a forgiving spike box. Arbitrarily rotated hazards, slopes, simultaneous contacts, and extreme-speed transitions need individual fixtures.
- Baseline checkpoints capture position, mode, gravity and speed. Full in-flight state, fired triggers and collected objects require deterministic rewind verification.
- The recovered editor covers placement, erase, undo, save and basic playtest. Advanced selection, history, group editing, checkpoint playtests and safe recovery require further work. Check current feature status for changes.
- Audio schedules a looping pattern. Song offsets, seeking, audio-device latency and drift relative to simulation require measured tests.
- Runtime tests exercise small fixtures. Large-level frame time, browser compatibility and rendering after WebGL context loss require measurements on named devices.
- The optional API requires a separate running Node service. GitHub Pages serves the static frontend only. The legacy standalone HTML is a generated snapshot and can diverge from current source. Build the Vite entry point for acceptance.
- Historical project status and feature tracker files describe the recovered revision. The dated test record in FEATURE_STATUS.md distinguishes unit coverage from full browser acceptance.

## Current behavior

The web edition now restores player, trigger, coin and tween state at practice checkpoints. It supports five group actions, single and multiple object property editing, JSON exchange, local draft recovery and cube icon selection. Remaining work includes layer locking, additional trigger types and song import, full rotated collision shapes and native measurement. Testing from a selection uses a fresh cube at that position. Local statistics count completed runs. The optional API has no deployment in the Pages workflow.
