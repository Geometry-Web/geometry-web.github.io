# Feature status

## Recovered baseline

This table records the initial inspection and test run of commit `2018a6e` recovered into `web/`. The executable tests passed on Node 24.14.0, with 17 frontend cases across five files and six separate backend cases. Tested rows describe the scope of those cases. Browser acceptance and native-reference comparison are separate gates.

| System | Status | Evidence or remaining work |
| --- | --- | --- |
| Frame stepping | Tested | Two accumulator tests cover 60 Hz and bounded catch-up. |
| WebGL, Canvas fallback, camera, HUD, particles | Implemented | Browser rendering, context loss and visual comparisons need coverage. |
| Cube, ship, ball and wave simulation | Tested | Jump dimensions, thrust, gravity switch and direction change at the player level. |
| Robot, UFO, spider and swing | Implemented | Dedicated trajectories and native capture pending. |
| Blocks, hazards and finish | Tested | Intersection helpers, swept hazards, death and jump-to-completion fixture. |
| Mode, gravity and speed portals | Implemented | One mode transition tested. Matrix across all portal types pending. |
| Three orb and pad colors, coin | Implemented | Input edges, ordering and reset require coverage. |
| Dual, mini, mirror, slopes, hazards with arbitrary orientations | Not started | Extend runtime and renderer together. |
| Timed group triggers and dependencies | Not started | Test runtime changes, durations, ordering and restart. |
| Practice and checkpoints | Implemented | Compare full resumed state with an uninterrupted run. |
| Level JSON format | Tested | Empty level, round-trip, invalid input and level length. |
| Local level persistence | Implemented | IndexedDB save, load and list. Reload and storage failure exercises pending. |
| Editor placement, erasure, grid, pan, zoom and undo | Implemented | Browser interaction and saved input need integration tests. |
| Multiselect, transforms, groups, layers, clipboard and redo | Not started | Validate edits against a round-tripped fixture. |
| Playtest from the start | Implemented | Check return path and editor isolation. |
| Current-position playtest and autosave recovery | Not started | Need state reconstruction and interrupted-edit scenarios. |
| Music, sound effects and volume controls | Implemented | Audio restrictions, drift, pause and resume need measurement. |
| Local completion counters | Implemented | Completion path writes local counters. Practice isolation and unlocks need coverage. |
| Icon workshop and achievements | Not started | Need customization, persistence and a visible unlock condition. |
| Online service | Tested | Six service cases cover accounts, sharing, conflicts, listings, comments and friends. Hosted integration pending. |
| Deployment and responsive browser QA | Investigating | Relative Vite base exists. Check the built artifact at a project subpath. |
| Accessibility, diagnostics and performance | Investigating | Keyboard and pointer input and a monitor exist. Reduced motion, focus recovery and large-level costs need dedicated verification. |

## Acceptance record

The 40-step end-to-end acceptance sequence requires a deployed browser run. Individual baseline unit tests exercise death, jump, portal and completion steps. All other end-to-end steps remain unverified at the baseline. Use the live results appended below when assessing later milestones.

## Current web edition

| Feature | Status | Evidence |
| --- | --- | --- |
| Placement, selection, properties, clipboard, undo and redo | Tested | Edge pointer and keyboard workflow, JSON export and reimport equality. |
| IndexedDB save, reopen and playtest return | Tested | Browser test reopens a saved draft and checks the exported result. |
| Cube icon patterns and saved selection | Tested | Edge reload test. Core unlocks after the first normal clear. |
| Move, rotate, scale, toggle and spawn triggers | Tested | Runtime tests cover a timed move, cyclic spawn, reset and checkpoint replay. |
| Seventeen size, speed, mode and gravity portals | Tested | Parameterized entry, repeat-overlap and restart tests. |
| Three pads and three orbs | Tested | Contact, press and one-shot tests. |
| Practice checkpoint restoration | Tested | Browser death and respawn, deterministic state replay in unit tests. |
| Draft recovery and playtest from selection | Implemented | Draft JSON is separate from explicit IndexedDB saves. Selection test starts a fresh simulation at the selected position. |
| WebGL and Canvas rendering | Tested | Production bundle served below a subpath. Browser checks include grid pixels, viewport sizes and pause. |
| Synthesized beat, volume and reduced motion | Implemented | Beat index follows simulation time, including restored checkpoints. Physical output latency remains unmeasured. |

42 frontend cases and 6 optional API cases passed locally. The Edge suite is under `tests/browser`. Native-reference parity, a full set of triggers, dual and mirror modes, arbitrary rotated collisions, layer editing, and sustained large-level performance remain open.
