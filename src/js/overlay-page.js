import { PMTiles, leafletRasterLayer } from 'pmtiles';
import { Config } from './config.js';
import { fetchPipelineData, fetchPipelineBoundaries } from './pipeline.js';
import { getMarkerSvg, getHydrantMarkerType, getWaterMarkerKind } from './marker-symbols.js';
import { initI18n, setLang, getLang, t } from './i18n.js';
import { isRectWithinKm } from './geometry.js';
import { buildRasterZip } from './raster-export.js';

const center = [49.5105, 11.345];
const map = L.map('overlay-map', { zoomControl: true, preferCanvas: true }).setView(center, 15);
L.tileLayer(Config.layers.voyager.url, {
  maxZoom: Config.layers.voyager.maxZoom,
  attribution: Config.layers.voyager.attr
}).addTo(map);
const rasterGroup = L.layerGroup().addTo(map);
const vectors = {
  stations: L.layerGroup().addTo(map),
  hydrants: L.layerGroup().addTo(map),
  water: L.layerGroup().addTo(map),
  defibs: L.layerGroup().addTo(map),
  boundaries: L.layerGroup()
};

let rasterLayer = null;
let currentArchiveUrl = null;
let selectedBounds = null;
let drawing = false;
let firstCorner = null;
let drawnRect = null;
let activeController = null;
let downloadBusy = false;
let vectorDebounce = null;
let activeView = 'raster';

const $ = (id) => document.getElementById(id);
const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** power)).toFixed(power ? 1 : 0)} ${units[power]}`;
};

function readRect(bounds) {
  return {
    south: bounds.getSouth(), west: bounds.getWest(),
    north: bounds.getNorth(), east: bounds.getEast()
  };
}

function setZipStatus(key, params = {}) {
  const template = t(key);
  $('zip-status').textContent = Object.entries(params).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, value), template
  );
}

async function loadRasterManifest() {
  const manifestUrl = Config.rasterExport.manifestUrl;
  if (!manifestUrl) {
    $('raster-status').textContent = t('overlay_manifest_missing');
    $('archive-meta').textContent = t('overlay_manifest_missing');
    return;
  }

  try {
    const response = await fetch(manifestUrl, { cache: 'no-store', redirect: 'error' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    if (manifest?.schema_version !== 1 || !/^germany-[0-9a-f]{64}\.pmtiles$/.test(manifest.file) ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(manifest.published_at)) {
      throw new Error('Invalid raster manifest');
    }
    currentArchiveUrl = new URL(manifest.file, response.url || manifestUrl).href;
    const archive = new PMTiles(currentArchiveUrl);
    rasterLayer = leafletRasterLayer(archive, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    if ($('raster-toggle').checked) rasterLayer.addTo(rasterGroup);
    $('raster-status').textContent = t('overlay_raster_ready').replace('{date}', manifest.published_at.slice(0, 10));
    const link = $('download-germany');
    link.href = currentArchiveUrl;
    link.download = manifest.file;
    link.classList.remove('pointer-events-none', 'opacity-50');
    link.removeAttribute('aria-disabled');
    $('archive-meta').textContent = `${t('overlay_published')} ${manifest.published_at.slice(0, 10)} · ${manifest.file}`;
    try {
      const head = await fetch(currentArchiveUrl, { method: 'HEAD', redirect: 'error' });
      const size = formatBytes(Number(head.headers.get('content-length')));
      if (head.ok && size) $('archive-meta').textContent += ` · ${size}`;
      else $('archive-meta').textContent += ` · ${t('overlay_size_unknown')}`;
    } catch {
      $('archive-meta').textContent += ` · ${t('overlay_size_unknown')}`;
    }
  } catch (error) {
    console.error('Overlay-Manifest konnte nicht geladen werden:', error);
    $('raster-status').textContent = t('overlay_manifest_error');
    $('archive-meta').textContent = t('overlay_manifest_error');
  }
}

function markerIcon(element, kind, type, size = 30) {
  if (kind !== 'stations' && map.getZoom() < 17) {
    const className = kind === 'defibs' ? 'defib-dot' : kind === 'water' ? 'tank-dot' : 'hydrant-dot';
    return L.divIcon({ className, iconSize: [10, 10], iconAnchor: [5, 5] });
  }
  const html = getMarkerSvg(type, size, 2, element.tags || {});
  return L.divIcon({ className: 'icon-container', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function category(element) {
  const tags = element.tags || {};
  if (tags.amenity === 'fire_station' || tags.building === 'fire_station') return 'stations';
  if (tags.emergency === 'defibrillator') return 'defibs';
  const water = getWaterMarkerKind(tags.emergency || tags['fire_hydrant:type'], tags) ||
    ['water_tank', 'fire_water_pond', 'suction_point', 'cistern'].includes(tags.emergency) ||
    Boolean(tags.water_source) || tags['fire_hydrant:pressure'] === 'suction';
  return water ? 'water' : (tags.emergency === 'fire_hydrant' ? 'hydrants' : null);
}

function drawElements(elements) {
  for (const layer of Object.values(vectors)) layer.clearLayers();
  let shown = 0;
  for (const element of elements) {
    const kind = category(element);
    if (!kind || !Number.isFinite(element.lat) || !Number.isFinite(element.lon)) continue;
    const tags = element.tags || {};
    const type = kind === 'stations' ? 'station' : kind === 'defibs' ? 'defibrillator' :
      getHydrantMarkerType(tags['fire_hydrant:type'] || tags.emergency, tags);
    L.marker([element.lat, element.lon], {
      icon: markerIcon(element, kind, type), keyboard: false, title: tags.name || t(kind === 'stations' ? 'station' : kind === 'defibs' ? 'defib' : kind === 'water' ? 'marker_water' : 'hydrant')
    }).addTo(vectors[kind]);
    shown++;
  }
  for (const input of document.querySelectorAll('[data-layer]')) {
    const layer = vectors[input.dataset.layer];
    if (!layer) continue;
    if (input.checked) layer.addTo(map); else map.removeLayer(layer);
  }
  $('vector-status').textContent = t('overlay_vector_count').replace('{count}', String(shown));
}

async function loadVectorView() {
  if (activeView !== 'vector' || map.getZoom() < 12) return;
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  $('vector-status').textContent = t('overlay_vector_loading');
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  try {
    const [elements, boundaryElements] = await Promise.all([
      fetchPipelineData(bounds, 'all', { signal: controller.signal, zoom, standalone: true }),
      fetchPipelineBoundaries(bounds, { signal: controller.signal, zoom, standalone: true })
    ]);
    if (controller.signal.aborted) return;
    drawElements(elements);
    boundaryElements.forEach((element) => {
      if (element.geometry?.length < 2) return;
      L.polyline(element.geometry.map(({ lat, lon }) => [lat, lon]), {
        color: '#f59e0b', weight: 1.5, opacity: 0.7
      }).addTo(vectors.boundaries);
    });
    $('vector-status').textContent = t('overlay_vector_count').replace('{count}', String(elements.length));
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.warn('OFM-Vektordemo:', error);
    $('vector-status').textContent = t('overlay_vector_error');
  }
}

function scheduleVectorFetch() {
  if (activeView !== 'vector') return;
  clearTimeout(vectorDebounce);
  vectorDebounce = setTimeout(loadVectorView, 350);
}

function setView(view) {
  activeView = view;
  const isRaster = view === 'raster';
  $('raster-controls').classList.toggle('hidden', !isRaster);
  $('vector-controls').classList.toggle('hidden', isRaster);
  $('view-raster').setAttribute('aria-pressed', String(isRaster));
  $('view-vector').setAttribute('aria-pressed', String(!isRaster));
  $('view-raster').classList.toggle('bg-blue-600', isRaster);
  $('view-raster').classList.toggle('bg-slate-700', !isRaster);
  $('view-vector').classList.toggle('bg-blue-600', !isRaster);
  $('view-vector').classList.toggle('bg-slate-700', isRaster);
  if (isRaster) {
    activeController?.abort();
    Object.values(vectors).forEach((layer) => map.removeLayer(layer));
    if ($('raster-toggle').checked && rasterLayer) rasterLayer.addTo(rasterGroup);
  } else {
    map.removeLayer(rasterGroup);
    for (const input of document.querySelectorAll('[data-layer]')) {
      if (input.checked) vectors[input.dataset.layer].addTo(map);
    }
    loadVectorView();
  }
  setTimeout(() => map.invalidateSize(), 50);
}

function setSelection(bounds, label) {
  selectedBounds = bounds;
  if (drawnRect) map.removeLayer(drawnRect);
  drawnRect = L.rectangle(bounds, { color: '#38bdf8', weight: 2, fillOpacity: 0.08 }).addTo(map);
  $('selection-status').textContent = `${t('overlay_selection_label')} ${label}`;
}

function stopDrawing() {
  drawing = false;
  firstCorner = null;
  map.dragging.enable();
  $('draw-rect').setAttribute('aria-pressed', 'false');
  $('draw-rect').classList.remove('bg-blue-700');
}

map.on('click', (event) => {
  if (!drawing) return;
  if (!firstCorner) {
    firstCorner = event.latlng;
    $('selection-status').textContent = t('overlay_first_corner');
    return;
  }
  const bounds = L.latLngBounds(firstCorner, event.latlng);
  if (!bounds.isValid() || bounds.getNorth() === bounds.getSouth() || bounds.getEast() === bounds.getWest()) return;
  stopDrawing();
  setSelection(bounds, t('overlay_selection_rectangle'));
});
map.on('moveend', scheduleVectorFetch);

$('view-raster').addEventListener('click', () => setView('raster'));
$('view-vector').addEventListener('click', () => setView('vector'));
$('raster-toggle').addEventListener('change', (event) => {
  if (!rasterLayer) return;
  if (event.target.checked) rasterLayer.addTo(rasterGroup);
  else rasterGroup.removeLayer(rasterLayer);
});
document.querySelectorAll('[data-layer]').forEach((input) => input.addEventListener('change', () => {
  const layer = vectors[input.dataset.layer];
  if (input.checked) layer.addTo(map); else map.removeLayer(layer);
}));
$('use-view').addEventListener('click', () => setSelection(map.getBounds(), t('overlay_selection_view_short')));
$('draw-rect').addEventListener('click', () => {
  drawing = !drawing;
  firstCorner = null;
  if (drawing) {
    map.dragging.disable();
    $('draw-rect').setAttribute('aria-pressed', 'true');
    $('draw-rect').classList.add('bg-blue-700');
    $('selection-status').textContent = t('overlay_draw_instructions');
  } else stopDrawing();
});

$('download-zip').addEventListener('click', async () => {
  if (downloadBusy) return;
  const bounds = selectedBounds || map.getBounds();
  const rect = readRect(bounds);
  if (!isRectWithinKm(rect, Config.exportMaxSideKm)) {
    setZipStatus('raster_zip_limit');
    return;
  }
  downloadBusy = true;
  const controller = new AbortController();
  activeController = controller;
  const timer = setTimeout(() => controller.abort(new DOMException('Raster export timed out', 'TimeoutError')), Config.rasterExport.timeoutMs);
  $('download-zip').disabled = true;
  $('cancel-download').classList.remove('hidden');
  $('zip-progress').style.width = '0%';
  setZipStatus('overlay_zip_starting');
  try {
    const maxZoom = Number($('max-zoom').value);
    const blob = await buildRasterZip(rect, maxZoom, controller, (done, total) => {
      const percent = Math.round(100 * done / total);
      $('zip-progress').style.width = `${percent}%`;
      setZipStatus('raster_zip_progress', { done: String(done), total: String(total) });
    });
    controller.signal.throwIfAborted();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `OpenFireMap-Overlay-z${Config.rasterExport.minZoom}-${maxZoom}.zip`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setZipStatus('raster_zip_success');
  } catch (error) {
    if (error.name === 'AbortError') setZipStatus('raster_zip_cancelled');
    else {
      const key = error.message?.startsWith('raster_zip_') ? error.message : 'raster_zip_unavailable';
      setZipStatus(key);
      if (key === 'raster_zip_unavailable') console.error('Raster-ZIP:', error);
    }
  } finally {
    clearTimeout(timer);
    downloadBusy = false;
    if (activeController === controller) activeController = null;
    $('download-zip').disabled = false;
    $('cancel-download').classList.add('hidden');
  }
});
$('cancel-download').addEventListener('click', () => activeController?.abort());

async function setupLanguage() {
  await initI18n();
  const select = $('overlay-language');
  select.value = getLang();
  select.addEventListener('change', async () => { await setLang(select.value); });
  window.addEventListener('ofm:langchange', (event) => { select.value = event.detail.lang; });
}

await setupLanguage();
await loadRasterManifest();
