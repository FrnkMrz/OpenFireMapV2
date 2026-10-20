/**
 * ==========================================================================================
 * DATEI: status/load.js
 * ZWECK: Lädt die öffentlichen Pipeline-Dateien für die Statusseite: das Karten-Manifest
 *        (eu/regions.json) und metadata.json des DACHLiLu-Builds. Beide liegen mit
 *        `cache-control: no-cache` in Cloudflare R2 und erlauben CORS für openfiremap.org.
 *
 * Die Basis-URL steht hier und nicht über config.js: config.js zieht das Abdeckungspolygon der
 * Karte mit, das die Statusseite nicht braucht. Ein Test hält beide Werte gleich.
 * ==========================================================================================
 */

import { fetchJson } from '../net.js';
import { parseManifest } from '../europe-manifest.js';

export const PIPELINE_URL = 'https://pipeline.openfiremap.org';
export const MANIFEST_PATH = 'eu/regions.json';
export const METADATA_PATH = 'metadata.json';
export const LOAD_TIMEOUT_MS = 10000;

/**
 * Das Manifest ist Pflicht (ohne es gibt es nichts zu zeigen), metadata.json optional: fehlt sie,
 * entfallen nur die fünf DACHLiLu-Länder und der Lauf-Abschnitt.
 * Das Manifest wird wie in der Karte geprüft (`parseManifest`); abgelehnte Einträge stehen in `rejected`.
 * @returns {Promise<{manifest: Object, rejected: string[], metadata: Object|null, metadataFailed: boolean}>}
 */
export async function loadPipelineData(fetcher = fetchJson) {
  const [manifestRes, metadataRes] = await Promise.allSettled([
    fetcher(`${PIPELINE_URL}/${MANIFEST_PATH}`, { timeoutMs: LOAD_TIMEOUT_MS }),
    fetcher(`${PIPELINE_URL}/${METADATA_PATH}`, { timeoutMs: LOAD_TIMEOUT_MS })
  ]);
  if (manifestRes.status !== 'fulfilled') throw manifestRes.reason;
  // Dieselbe strenge Prüfung wie in der Karte: nur Einträge, die die Karte laden würde, gelten als veröffentlicht
  const raw = manifestRes.value;
  const parsed = parseManifest(raw);
  if (!parsed) throw new Error('Manifest ungültig (Version oder regions)');
  const regions = {};
  for (const id of Object.keys(parsed.regions)) regions[id] = raw.regions[id];
  const manifest = { version: raw.version, regions };
  const metadata = metadataRes.status === 'fulfilled' && metadataRes.value && typeof metadataRes.value === 'object'
    ? metadataRes.value
    : null;
  return { manifest, rejected: parsed.rejected, metadata, metadataFailed: metadata == null };
}
