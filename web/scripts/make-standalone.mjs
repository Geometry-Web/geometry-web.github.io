// Builds a single, self-contained `standalone.html` that runs with NO npm,
// no node_modules, and no build step — just open it in a browser. Uses esbuild
// (already installed) to bundle the TypeScript into one inline IIFE script and
// inlines the CSS. The backend/online features need the server (served over
// http), but the offline game + editor work from a file:// double-click.

import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const result = await build({
  entryPoints: [path.join(root, 'src', 'main.ts')],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  loader: { '.css': 'empty' },
  target: 'es2020',
  logLevel: 'silent',
});

const js = result.outputFiles[0].text;
const css = readFileSync(path.join(root, 'src', 'style.css'), 'utf8');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta name="theme-color" content="#0b0b1e" />
<title>Geometry Dash Recreation</title>
<style>${css}</style>
</head>
<body>
<div id="loading">
  <div class="spinner"></div>
  <div id="loading-text">LOADING...</div>
</div>
<canvas id="game"></canvas>
<script>${js.replace(/<\/script>/g, '<\\/script>')}<\/script>
</body>
</html>`;

const out = path.join(root, 'standalone.html');
writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(1)} KB)`);
