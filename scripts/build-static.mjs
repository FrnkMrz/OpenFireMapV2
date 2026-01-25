// scripts/build-static.js
// Kopiert Quellcode und statische Dateien nach docs/ (GitHub Pages Output)

import fs from "node:fs";
import path from "node:path";

function rm(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function cpDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) cpDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const root = process.cwd();

// 1) src/static -> docs
const srcStatic = path.join(root, "src", "static");
const docs = path.join(root, "docs");
cpDir(srcStatic, docs);

// 2) src/js -> docs/assets/js
const srcJs = path.join(root, "src", "js");
const docsJs = path.join(root, "docs", "assets", "js");
rm(docsJs);
cpDir(srcJs, docsJs);

console.log("Static build ok: src/static -> docs, src/js -> docs/assets/js");
