# Deploying to GitHub Pages

The site is live at **https://geometry-web.github.io/** — repository
`Geometry-Web/geometry-web.github.io` (a *user* site, so the repo root **is** the
site root: `index.html` resolves to `/`).

There is no build step. The tree that is committed is the tree that is served.

## Pipeline

`.github/workflows/deploy.yml` runs on every push to `main` and can also be
started by hand (*Actions → Deploy to GitHub Pages → Run workflow*, or
`gh workflow run deploy.yml`).

| Job | What it does |
| --- | --- |
| `build` | Checks out, verifies the files the site needs are present (`index.html`, `cocos2d.js`, `main.js`, `src/MyApp.js`, `src/resource.js`, `cocos2d/`), then `upload-pages-artifact` with `path: "."`. |
| `deploy` | `deploy-pages` — publishes the artifact to the `github-pages` environment and prints the URL. |

Permissions are the minimum the official actions need: `contents: read` (build),
`pages: write` + `id-token: write` (deploy). A `concurrency` group of `pages`
cancels superseded runs so an older artifact can never overwrite a newer one.

Pages is configured with **Source: GitHub Actions** (`build_type: workflow`), and
HTTPS enforcement is on, so no `gh-pages` branch exists or is needed.

Checking a deployment from the CLI:

```bash
gh run list --workflow deploy.yml          # recent runs
gh run watch <run-id> --exit-status        # block until it finishes
gh api repos/Geometry-Web/geometry-web.github.io/pages   # {"status":"built",...}
```

## Publish path and what gets shipped

`upload-pages-artifact` is pointed at the repository root, so everything tracked
is published **except** `.git*` and the workflow folder itself
(`/.github/workflows/deploy.yml` correctly answers 404 on the live site).

Served: `index.html`, `404.html`, `robots.txt`, `.nojekyll`, `cocos2d.js`,
`main.js`, `src/`, `cocos2d/`, `extensions/`, `res/`, `docs/`, `levels/`,
`GeometryWebicon.png`, `run.bat`.

`.nojekyll` is required: without it Jekyll would drop files and directories whose
names start with an underscore (the engine ships `cocos2d/core/…` plus
underscore-prefixed helpers, and an underscore directory only needs to appear
once for a whole subtree to vanish).

## Rules the code has to follow to survive the move

1. **Relative paths only.** Every asset reference is relative to the page
   (`res/gd/…`, `cocos2d/…`), never `file:///…` and never a Windows path.
2. **Exact case.** GitHub Pages is case-sensitive; Windows dev machines are not.
   `Res/gd/GJ_GameSheet.png` works locally and 404s live.
3. **Cache busting.** `index.html` loads `cocos2d.js?v=17`, and `cocos2d.js`
   appends its own version to each engine file. Bump the number when you change
   boot/engine files, otherwise returning visitors keep the cached copy.
4. **No `file://`.** Opening `index.html` directly cannot work: the loader refuses
   to XHR over `file://`. The page now shows an explicit hint in that case
   instead of staying black.

## Local preview

```bash
cd web
python -m http.server 8080      # or: npx serve .   /   run.bat
# http://localhost:8080/
```

## Assets and licensing — read this before republishing

`res/gd/` contains the original Geometry Dash sprite sheets, fonts and audio.
They are © RobTop Games and are **not** covered by this project's licence; the
code and engine are. `.gitattributes` marks them binary so Pages serves the exact
bytes. If the redistribution is not wanted, remove `res/gd/` from the artifact —
nothing in the tooling or the deploy pipeline depends on any specific external
asset.

Legacy notes from the framework-free build that used to live in this repository
(`frameworks/cocos2d-html5/…`, `src/app.js`, a WebAssembly runtime under
`runtime/build/` that was never committed) are preserved in git history at
commit `e23725b` and are no longer part of the deployment.
