import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built app can be served from GitHub Pages or any sub-path.
  base: './',
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
});
