# Implementation plan

| Milestone | Dependency | Acceptance check |
| --- | --- | --- |
| 1. Recover the project | Reference and Git inventories | Install the web checkout, run its existing tests and build the original modules. |
| 2. Verify rendering | Boot and renderer factory | Open WebGL and Canvas views at desktop and touch sizes. Record clipping, console errors and focus behavior. |
| 3. Calibrate physics | Fixed timestep and reproducible inputs | Compare flat jumps, contact, inversion and speed against measured native traces. |
| 4. Integrate gameplay objects | Player, geometry and object definitions | Test every mode, portal, orb and pad individually, in sequence and after reset. |
| 5. Execute triggers | Runtime objects and persistent level definitions | Test grouped objects, simultaneous activations, timed changes and checkpoint rewind. |
| 6. Strengthen level interchange | Schema and storage | Round-trip real fixtures, invalid input, older records, same-id imports and interrupted saves. |
| 7. Complete the editor | Stable runtime definitions and level storage | Place and transform objects, configure groups, copy, undo, redo and reopen a saved draft. |
| 8. Isolate playtesting | Editor history and deterministic runtime | Test from start and current position, restore a checkpoint and return with the same draft and selection. |
| 9. Complete screens | Navigation and input | Exercise menu, level details, pause, completion, settings, customization and statistics by keyboard and touch. |
| 10. Finish audio and progression | Completion events and persistence | Measure seek, pause and drift. Reload settings and rewards, then repeat a completed level. |
| 11. Measure large levels | Representative gameplay and editor fixture | Record object counts, visible counts, frame-time percentiles and memory at a documented resolution. |
| 12. Validate the Pages build | All earlier gates | Run frontend and service tests, build, serve the output at a nested path, then record each of the 40 acceptance steps against the deployed revision. |

Work from `web/`. The initial regression suite passes. Keep test fixtures independent of installed game data and include changes to status and limitations with each new behavior. GitHub Pages can serve the static build. Select GitHub Actions as the repository's Pages source, build from the web project's directory and upload its `dist` artifact. Configure and host the optional API separately when online features are needed.
