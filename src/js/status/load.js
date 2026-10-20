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

export const PIPELINE_URL = 'https://pipeline.openfiremap.org';
export const MANIFEST_PATH = 'eu/regions.json';
export const METADATA_PATH = 'metadata.json';
export const LOAD_TIMEOUT_MS = 10000;

/**
 * Das Manifest ist Pflicht (ohne es gibt es nichts zu zeigen), metadata.json optional: fehlt sie,
 * entfallen nur die fünf DACHLiLu-Länder und der Lauf-Abschnitt.
 * @returns {Promise<{manifest: Object, metadata: Object|null, metadataFailed: boolean}>}
 */
export async function loadPipelineData(fetcher = fetchJson) {
  const [manifestRes, metadataRes] = await Promise.allSettled([
    fetcher(`${PIPELINE_URL}/${MANIFEST_PATH}`, { timeoutMs: LOAD_TIMEOUT_MS }),
    fetcher(`${PIPELINE_URL}/${METADATA_PATH}`, { timeoutMs: LOAD_TIMEOUT_MS })
  ]);
  if (manifestRes.status !== 'fulfilled') throw manifestRes.reason;
  const manifest = manifestRes.value;
  if (!manifest || typeof manifest !== 'object' || !manifest.regions || typeof manifest.regions !== 'object') {
    throw new Error('Manifest ohne regions');
  }
  const metadata = metadataRes.status === 'fulfilled' && metadataRes.value && typeof metadataRes.value === 'object'
    ? metadataRes.value
    : null;
  return { manifest, metadata, metadataFailed: metadata == null };
}
