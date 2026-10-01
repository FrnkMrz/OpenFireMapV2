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

export default defineConfig({
  plugins: [preserveRepositoryDocumentation()],
  // Required for GitHub Pages if the repo is not at root domain,
  // but usually './' works best for relative paths.
  base: './',
  build: {
    outDir: 'docs',
    emptyOutDir: true
  }
});
