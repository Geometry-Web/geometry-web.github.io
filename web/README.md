# Geometry Dash Web

Run the browser game from the repository's **web** directory with Node.js and npm.

    npm ci
    npm run dev

Use Space, W, Up or a pointer to control the player. Escape pauses, R restarts, and Z creates a checkpoint during practice. In the editor, choose a placement tool and click the canvas. Drag to pan and scroll to zoom. Use Select object and Shift-click to extend a selection. Filter objects by layer, with -1 showing every layer. Select an object to edit its position, rotation, scale, group or trigger parameters. Save writes the level to IndexedDB. The level browser includes an Edit button for saved levels. Export and Import exchange versioned JSON files.

## Test and build

    npm test
    npm run build
    node scripts/make-standalone.mjs

The production output is in **web/dist**. The separate **web/standalone.html** build can be opened directly. Browser-based storage works most reliably on a stable HTTP origin. Run the optional service tests using Node 24 in **web/server** with **npm test**.

The browser suite uses Python with Playwright and Chromium. Run **python tests/browser/acceptance.py --dist dist** from **web**. Use BROWSER_EXECUTABLE for a local Edge or Chromium executable. Set GAME_CANVAS_FALLBACK=1 to exercise the Canvas renderer.

## GitHub Pages

Select GitHub Actions as the repository Pages source. The root workflow **.github/workflows/deploy.yml** installs dependencies in **web**, builds the Vite project and uploads **web/dist**. Pushing to main or dispatching the workflow starts deployment. Game levels, progression, settings and drafts are local to the browser. The optional online service requires a separately hosted API.

## Project records

ARCHITECTURE.md describes module ownership. REVERSE_ENGINEERING.md records reference material and measurement procedures. FEATURE_STATUS.md lists test evidence, KNOWN_LIMITATIONS.md records unresolved behavior, and IMPLEMENTATION_PLAN.md gives the milestone order. PROJECT_STATUS.md and FEATURE_TRACKER.md describe the historical recovered baseline.
