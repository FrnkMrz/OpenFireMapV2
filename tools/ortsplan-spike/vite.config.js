import fs from "node:fs";
import { execSync } from "node:child_process";
import { defineConfig } from "vite";

// Installierte maplibre-gl-Hauptversion (0, falls noch nicht installiert)
let mapMajor = 0;
try {
  mapMajor = +JSON.parse(fs.readFileSync(new URL("./node_modules/maplibre-gl/package.json", import.meta.url), "utf-8")).version.split(".")[0];
} catch { /* noch nicht installiert */ }

// Eigenstaendiger Spike: Daten (PMTiles) liegen in ./data und werden unter / ausgeliefert.
// Stand des Quellcodes (Commit), damit man im Assistenten sieht, welche Version der Server ausliefert (Browser-Zwischenspeicher, alter Checkout)
const rev = () => {
  try {
    const dir = new URL(".", import.meta.url).pathname;
    const sha = execSync("git rev-parse --short HEAD", { cwd: dir, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain -- .", { cwd: dir, stdio: ["ignore", "pipe", "ignore"] }).toString().trim() ? "+" : "";
    return sha + dirty;
  } catch { return "unbekannt"; }
};

export default defineConfig({
  plugins: [{ name: "ortsplan-rev", transformIndexHtml: (html) => html.replace("__REV__", rev()) }],
  publicDir: "data",
  server: { allowedHosts: true },
  // maplibre-gl 6 ist reines ESM und liefert den Worker als eigene Datei (maplibre-gl-worker.mjs); Vites Vorbuendelung
  // wuerde sie weglassen. Version 5 ist UMD und braucht die Vorbuendelung, sonst fehlen die Exporte.
  optimizeDeps: mapMajor >= 6 ? { exclude: ["maplibre-gl"] } : {},
});
