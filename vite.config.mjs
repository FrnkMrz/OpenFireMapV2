import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { stripDevOnlyCspSources } from './scripts/strip-dev-csp.mjs';

function collectMarkdownFiles(directory, root = directory, files = []) {
  if (!existsSync(directory)) return files;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(path, root, files);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push({ relativePath: path.slice(root.length + 1), content: readFileSync(path) });
    }
  }

  return files;
}

function preserveRepositoryDocumentation() {
  let markdownFiles = [];
  let outputDirectory = null;

  return {
    name: 'preserve-repository-documentation',
    configResolved(config) {
      const docsDirectory = resolve(config.root, 'docs');
      markdownFiles = collectMarkdownFiles(docsDirectory);
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      for (const file of markdownFiles) {
        const target = resolve(outputDirectory, file.relativePath);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, file.content);
      }
    }
  };
}

function stripDevOnlyCsp() {
  return {
    name: 'strip-dev-only-csp',
    apply: 'build',
    transformIndexHtml: (html) => stripDevOnlyCspSources(html)
  };
}

export default defineConfig({
  plugins: [preserveRepositoryDocumentation(), stripDevOnlyCsp()],
  // Required for GitHub Pages if the repo is not at root domain,
  // but usually './' works best for relative paths.
  base: './',
  build: {
    // Browser-Ziel wie bisher unter Vite 7. Vite 8 hebt den Standard auf Safari/iOS 16.4 an; Lightning CSS
    // schreibt dann Media Queries als Bereichssyntax "(width>=768px)", die iOS 16.0-16.3 ignoriert.
    target: ['chrome107', 'edge107', 'firefox104', 'safari16', 'ios16'],
    outDir: 'docs',
    emptyOutDir: true,
    // Kartenstart, Symbol-Legende, Versions-Hub und Pipeline-Statusseite
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        symbols: fileURLToPath(new URL('./symbols/index.html', import.meta.url)),
        version: fileURLToPath(new URL('./version/index.html', import.meta.url)),
        status: fileURLToPath(new URL('./status/index.html', import.meta.url))
      }
    }
  }
});
