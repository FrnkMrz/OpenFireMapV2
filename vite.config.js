import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

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

// Die CSP in index.html erlaubt localhost für den Dev-Server (Vite-HMR per WebSocket, lokale Pipeline).
// Im Produktions-Build gehören diese Quellen nicht in die ausgelieferte Seite.
const DEV_ONLY_CSP_SOURCES = [' http://localhost:*', ' ws://localhost:*'];

export function stripDevOnlyCspSources(html) {
  return html.replace(/(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/i, (_match, start, policy, end) => {
    let cleaned = policy;
    for (const source of DEV_ONLY_CSP_SOURCES) cleaned = cleaned.split(source).join('');
    return start + cleaned + end;
  });
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
    emptyOutDir: true
  }
});
