import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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

// Nur Entwicklung: lokale Ortsplan-Daten (PMTiles, GeoJSON) aus tools/ortsplan-spike/data unter /ortsplan-data/ ausliefern, mit Bereichsanfragen
// (HTTP Range), wie R2. Gehört nicht in den Produktions-Build; die Dateien sind nicht im Repository (siehe tools/ortsplan-spike/README.md).
function ortsplanDevData() {
  return {
    name: 'ortsplan-dev-data',
    apply: 'serve',
    configureServer(server) {
      const dir = resolve(server.config.root, 'tools/ortsplan-spike/data');
      server.middlewares.use('/ortsplan-data', (req, res, next) => {
        const name = decodeURIComponent((req.url || '').split('?')[0].replace(/^\//, ''));
        if (!/^[a-z0-9][a-z0-9.-]*$/i.test(name)) return next();
        const file = resolve(dir, name);
        if (!file.startsWith(dir) || !existsSync(file)) { res.statusCode = 404; return res.end('nicht gefunden'); }
        const size = statSync(file).size;
        const type = name.endsWith('.json') || name.endsWith('.geojson') ? 'application/json' : 'application/octet-stream';
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', type);
        if (range && (range[1] || range[2])) {
          const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
          const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
          if (start > end || start >= size) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${size}`); return res.end(); }
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
          res.setHeader('Content-Length', end - start + 1);
          return createReadStream(file, { start, end }).pipe(res);
        }
        res.setHeader('Content-Length', size);
        return createReadStream(file).pipe(res);
      });
    }
  };
}

export default defineConfig({
  plugins: [preserveRepositoryDocumentation(), stripDevOnlyCsp(), ortsplanDevData()],
  // Required for GitHub Pages if the repo is not at root domain,
  // but usually './' works best for relative paths.
  base: './',
  // maplibre-gl 6 ist reines ESM und liefert den Worker als eigene Datei (maplibre-gl-worker.mjs); Vites Vorbündelung im Dev-Server würde sie weglassen (Ortsplan-Seiten)
  optimizeDeps: { exclude: ['maplibre-gl'] },
  build: {
    // Browser-Ziel wie bisher unter Vite 7. Vite 8 hebt den Standard auf Safari/iOS 16.4 an; Lightning CSS
    // schreibt dann Media Queries als Bereichssyntax "(width>=768px)", die iOS 16.0-16.3 ignoriert.
    target: ['chrome107', 'edge107', 'firefox104', 'safari16', 'ios16'],
    outDir: 'docs',
    emptyOutDir: true,
    // Kartenstart, Symbol-Legende und Pipeline-Statusseite
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        symbols: fileURLToPath(new URL('./symbols/index.html', import.meta.url)),
        status: fileURLToPath(new URL('./status/index.html', import.meta.url)),
        // Ortsplan (nur per Link, nur am Computer): Assistent und Blatt
        ortsplan: fileURLToPath(new URL('./ortsplan/index.html', import.meta.url)),
        ortsplanBlatt: fileURLToPath(new URL('./ortsplan/blatt/index.html', import.meta.url))
      }
    }
  }
});
