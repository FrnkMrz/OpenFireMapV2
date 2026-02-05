import { defineConfig } from 'vite';

export default defineConfig({
  // Required for GitHub Pages if the repo is not at root domain,
  // but usually './' works best for relative paths.
  base: './',
  build: {
    outDir: 'docs',
    emptyOutDir: true
  }
});
