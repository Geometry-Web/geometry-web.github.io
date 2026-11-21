# Browser architecture

Run the commands below from the recovered `web` directory.

```sh
npm ci
npm run dev
npm test
npm run build
```

Vite starts at `index.html` and imports `src/main.ts`. Startup creates the renderer, input manager, synthesized audio, local storage and performance monitor, then injects them into `Game`. The production build emits static files under `dist/` with relative asset URLs. A Pages upload should contain that directory alone. The optional Node server runs separately and uses built-in HTTP, cryptography and SQLite modules.

| Owner | Responsibilities and dependencies |
| --- | --- |
| Game | Owns the active screen, simulation, camera, HUD, overlays and editor lifecycle. Translates runtime events into sounds, particles and presentation changes. |
| GameLoop and FixedStepper | Schedule 120 Hz updates independently of display refresh. The recovered loop limits accumulated frame time and caps catch-up at 12 steps. |
| Renderer, WebGL2Renderer, Canvas2DRenderer, Camera | Shared world-space drawing interface. The factory tries WebGL 2, then Canvas 2D. Camera supplies coordinate conversion. |
| Player and LevelRuntime | Player updates per-mode motion from input and bounds. Runtime classifies objects, resolves collisions and interactions, owns attempt state and reports gameplay events. Neither requires a DOM. |
| Level, LevelSerializer, builtinLevels | Define and validate the versioned level shape, read/write JSON and construct original demo levels. |
| Editor | Owns the editable level, viewport gestures, editing history and palette. Uses the same camera, renderer, level types and local persistence services. |
| AudioEngine | Creates a Web Audio graph on a user gesture. Separate music and effect gains feed the output. A look-ahead scheduler queues synthesized notes on the audio clock. |
| Storage | IndexedDB database `gdr-storage`, version 1, stores levels in `levels` keyed by `id`. Settings and counters use JSON under localStorage keys prefixed `gdr:`. |
| OnlineScreen and ApiClient | Optional account and level-sharing interface. Calls the separate service in `server/`. Core simulation and editor work locally. |

## Level interchange

Schema version 1 holds id, name, description, creator, difficulty, starting speed, timestamps, an optional song id and an ordered object list. Objects carry a numeric type id and center coordinates with optional rotation, uniform scale, groups and extra properties. Positions use world units with positive Y upward. Inspect `src/levels/Level.ts` for the exact TypeScript fields and validator.

## Extending the recovered engine

For a movement mode add its mapping and control behavior, then test it as a pure player step and through a portal in a level. For an object add its type, runtime activation or collision behavior, game drawing and editor availability. Check restart and practice behavior as well as JSON round-trip. When adding persistent fields, load fixtures from the previous format and test recovery before changing the schema version.
