# Deploying to GitHub Pages

## Before you publish (important)

- **Do NOT commit or serve Geometry Dash's actual asset files.** `src/core/Assets.js`
  can load them from a local path, but those `.plist` / `.png` / `.mp3` / `.ogg` /
  `.fnt` files are RobTop Games' copyrighted assets and must not be published.
  Keep `assetsRoot: ''` (the default) for any public deployment. `Resources/` is
  already in `.gitignore`.
- **"Geometry Dash" is a trademark.** For a public site, rename the title text in
  `src/menus/MenuScene.js` (it currently reads "GEOMETRY DASH").

## Steps

1. Create a GitHub repository.
2. Push this `GeometryWeb/` folder as the **repo root**, so `index.html` sits at
   the root:
   ```bash
   cd E:\GDWEB\GeometryWeb
   git init
   git add .
   git commit -m "initial"
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Deploy from a branch → `main` → `/ (root)`**.
4. Open `https://<you>.github.io/<repo>/`.

The site is fully static HTML + JS; `.nojekyll` is included so Jekyll doesn't
rewrite anything. The WebAssembly runtime (`runtime/build/`) is git-ignored, so
the game runs on the pure-JS simulation fallback automatically.
