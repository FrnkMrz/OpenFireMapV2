// Quellen der Ortsplan-Seiten (Basiskarte, Feuerwehr-Ebenen, Einbahn-Ebene, Datenstände) an einer Stelle.
// Im Betrieb liegt alles bei der Pipeline-Domain (Config.pipeline.url); die Basiskarte nennt eine Zeigerdatei (Config.ortsplan.basemapManifest).
// Entwicklung (Vite-Dev-Server) mit ?area=<name>: lokale Dateien aus tools/ortsplan-spike/data unter /ortsplan-data/ (siehe vite.config.mjs).
import { Config } from "../config.js";

const AREA_RE = /[^a-z0-9-]/gi;

/** Seitenadressen (absolut: die Seite liegt unter der Wurzel der Domain). */
export const WIZARD_PATH = "/ortsplan/";
export const SHEET_PATH = "/ortsplan/blatt/";

const getJson = (url, timeoutMs = 8000) => fetch(url, { signal: AbortSignal.timeout(timeoutMs) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

let memo = null;

/**
 * Liefert die Quellen für die aktuelle Adresse (einmal je Seite berechnet).
 * @returns {Promise<{dev:boolean, area:string, info:object|null, basemapUrl:string|null, basemapMeta:object|null, fireUrl:string, onewayUrl:string|null, fireMeta:object|null}>}
 */
export function getSources(q = new URLSearchParams(location.search)) {
  if (!memo) memo = build(q);
  return memo;
}

async function build(q) {
  const area = (q.get("area") || "").replace(AREA_RE, "");
  if (area && import.meta.env?.DEV === true) {
    const root = `${location.origin}/ortsplan-data`;
    const info = await getJson(`${root}/${area}.json`);
    const fireMeta = (await getJson(`${root}/${area}.meta.json`)) || (await getJson(`${root}/meta.json`));
    const baseOverride = q.get("base"); // nur Entwicklung: andere Basiskarte (z. B. R2-Messung, tools/ortsplan-spike/r2bench.mjs)
    return { dev: true, area, info, basemapUrl: baseOverride && /^https?:\/\//.test(baseOverride) ? baseOverride : `${root}/${area}.pmtiles`, basemapMeta: null, fireUrl: `${root}/${area}-ofm.pmtiles`, onewayUrl: `${root}/${area}-oneway.geojson`, fireMeta };
  }
  const root = Config.pipeline.url;
  const basemapMeta = await getJson(`${root}/${Config.ortsplan.basemapManifest}`, Config.ortsplan.manifestTimeoutMs);
  const file = typeof basemapMeta?.file === "string" && !basemapMeta.file.includes("..") && !basemapMeta.file.startsWith("/") ? basemapMeta.file : null;
  const fireMeta = await getJson(`${root}/metadata.json`, Config.ortsplan.manifestTimeoutMs);
  // Wie die Hauptkarte (pipeline.js): Build-Zeit als ?v=, damit nach einem Neubau nie eine ältere Datei aus dem Zwischenspeicher kommt
  const fireVersion = typeof fireMeta?.generated_at === "string" ? fireMeta.generated_at : null;
  return {
    dev: false,
    area: "",
    info: null,
    basemapUrl: file ? `${root}/${file}` : null,
    basemapMeta: file ? basemapMeta : null,
    fireUrl: `${root}/${Config.pipeline.pmtilesFile}${fireVersion ? `?v=${encodeURIComponent(fireVersion)}` : ""}`,
    onewayUrl: Config.ortsplan.onewayFile ? `${root}/${Config.ortsplan.onewayFile}` : null,
    fireMeta,
  };
}
