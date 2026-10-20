/**
 * ==========================================================================================
 * DATEI: status/status.js
 * ZWECK: Einstieg der Pipeline-Statusseite (/status/): lädt Manifest und metadata.json, rechnet
 *        (model.js) und zeichnet Kennzahlen, Gruppen, Zeitleiste, Dichte-Diagramm, Tabelle und
 *        den DACHLiLu-Lauf in Deutsch oder Englisch. Aktualisiert sich alle 10 Minuten selbst
 *        (so lange gelten die Pipeline-Dateien bei der Karte als frisch).
 * ==========================================================================================
 */

import { loadPipelineData } from './load.js';
import { buildRows, summarize, timelineRows } from './model.js';
import { LANG_KEY, TEXTS, countryName, createFormatters, detectLang } from './texts.js';
import { renderDensity, renderRunBar, renderTimeline } from './charts.js';
import population from '../../data/status-population.json';
import dachSnapshot from '../../data/status-dach-snapshot.json';

const REFRESH_MS = 10 * 60 * 1000;
const $ = (s) => document.querySelector(s);

function readStored() {
  try { return localStorage.getItem(LANG_KEY); } catch { return null; }
}
function storeLang(lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* Speicher gesperrt: Wahl gilt nur für diesen Besuch */ }
}

const S = {
  lang: detectLang({ search: location.search, stored: readStored(), browser: navigator.language }),
  data: null,        // { rows, usedSnapshot, hasDach, summary, metadata }
  fetchedMs: null,
  refreshFailed: false, // letzte Aktualisierung gescheitert, alte Daten stehen noch
  sort: { main: { k: 'hydrants', dir: -1 }, runs: { k: 'uploadMs', dir: -1 } },
  query: ''
};

const t = (k) => TEXTS[S.lang][k];
const fmt = () => createFormatters(S.lang);
const name = (r) => countryName(r, S.lang);
const dash = (v, f) => (v == null ? '—' : f(v));

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (v != null) node.setAttribute(k, v);
  }
  node.append(...children.filter((c) => c != null));
  return node;
}

// -- Texte ---------------------------------------------------------------------------------

function applyTexts() {
  document.documentElement.lang = S.lang;
  document.title = t('doc_title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('.st-lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
}

// -- Abschnitte ----------------------------------------------------------------------------

function kpiCard(label, value, note, isDate) {
  return h('div', { class: 'st-card st-kpi' },
    h('div', { class: 'st-label' }, label),
    h('div', { class: `st-big${isDate ? ' dt' : ''}` }, value),
    h('div', { class: 'st-label' }, note));
}

/** Hängt an die Beschriftung, wie viele Länder in der Summe fehlen (keine Angabe im Manifest). */
function withUnknown(note, n) {
  return n > 0 ? `${note}, ${t('k_unknown').replace('{n}', String(n))}` : note;
}

function renderKpis() {
  const f = fmt();
  const tot = S.data.summary.total;
  $('#st-kpis').replaceChildren(
    kpiCard(t('k_regions'), f.int(tot.regions), t('k_regions_n')),
    kpiCard(t('k_hyd'), f.compact(tot.hydrants), withUnknown(t('k_hyd_n'), tot.hydrantsUnknown)),
    kpiCard(t('k_fs'), f.compact(tot.fireStations), withUnknown(t('k_fs_n'), tot.fireStationsUnknown)),
    kpiCard(t('k_per'), dash(tot.per1000, f.dens), `${f.mio(tot.populationM)} ${t('mio')} · ${t('k_per_n')}`),
    kpiCard(t('k_oldest'), dash(tot.oldestOsmMs, f.dt), t('k_oldest_n'), true),
    kpiCard(t('k_latest'), dash(tot.latestUploadMs, f.dt), t('k_latest_n'), true)
  );
}

function renderCharts() {
  const f = fmt();
  const ctx = { t, fmt: f, name };
  renderTimeline($('#st-timeline'), timelineRows(S.data.rows), ctx);
  const dens = S.data.rows.filter((r) => r.per1000 != null).sort((a, b) => b.per1000 - a.per1000);
  renderDensity($('#st-density'), dens, S.data.summary.total.per1000, ctx);
}

// Spalten beider Tabellen: k = Sortierschlüssel, get = Sortierwert, text = Anzeige, left = linksbündig
const ZOOM = (r) => (r.minzoom != null && r.maxzoom != null ? `${r.minzoom}–${r.maxzoom}` : '—');
const runName = (r) => name(r);
const runFile = (r) => (r.file ? (r.shared ? `${r.file} (${t('run_shared')})` : r.file) : '—');
const TABLES = {
  main: {
    sel: '#st-table',
    cols: (f, maxD) => [
      { k: 'name', label: 'c_name', left: true, get: name, text: name },
      { k: 'hydrants', label: 'c_hyd', text: (r) => dash(r.hydrants, f.int) },
      { k: 'fireStations', label: 'c_fs', text: (r) => dash(r.fireStations, f.int) },
      { k: 'populationM', label: 'c_pop', text: (r) => dash(r.populationM, f.mio) },
      { k: 'per1000', label: 'c_per', text: (r) => dash(r.per1000, f.dens), bar: (r) => (r.per1000 != null && maxD ? (100 * r.per1000) / maxD : null) },
      { k: 'inhPerHydrant', label: 'c_inh', text: (r) => dash(r.inhPerHydrant, (v) => f.int(Math.round(v))) },
      { k: 'osmMs', label: 'c_osm', text: (r) => dash(r.osmMs, f.dt) },
      { k: 'uploadMs', label: 'c_up', text: (r) => dash(r.uploadMs, f.dt) },
      { k: 'lagH', label: 'c_lag', text: (r) => dash(r.lagH, f.d1) },
      { k: 'sizeMb', label: 'c_size', text: (r) => dash(r.sizeMb, f.d1) }
    ]
  },
  runs: {
    sel: '#st-runs',
    cols: (f) => [
      { k: 'name', label: 'c_name', left: true, get: runName, text: runName },
      { k: 'file', label: 'c_file', left: true, get: (r) => r.file, text: runFile },
      { k: 'uploadMs', label: 'c_up', text: (r) => dash(r.uploadMs, f.dt) },
      { k: 'osmMs', label: 'c_osm', text: (r) => dash(r.osmMs, f.dt) },
      { k: 'lagH', label: 'c_lag', text: (r) => dash(r.lagH, f.d1) },
      { k: 'sizeMb', label: 'c_size', text: (r) => dash(r.sizeMb, f.d1) },
      { k: 'minzoom', label: 'c_zoom', text: ZOOM },
      { k: 'hydrants', label: 'c_hyd', text: (r) => dash(r.hydrants, f.int) },
      { k: 'fireStations', label: 'c_fs', text: (r) => dash(r.fireStations, f.int) },
      { k: 'waterPoints', label: 'c_wp', text: (r) => dash(r.waterPoints, f.int) },
      { k: 'defibrillators', label: 'c_aed', text: (r) => dash(r.defibrillators, f.int) },
      { k: 'boundaries', label: 'c_bnd', text: (r) => dash(r.boundaries, f.int) }
    ]
  }
};

/** Zeichnet Kopf und Zeilen einer sortierbaren Tabelle neu. */
function renderTable(id, rows, maxD) {
  const def = TABLES[id];
  const sort = S.sort[id];
  const cols = def.cols(fmt(), maxD);
  const table = $(def.sel);
  const value = (r, col) => (col.get ? col.get(r) : r[col.k]);
  const col = cols.find((c) => c.k === sort.k) || cols[0];
  const sorted = rows.slice().sort((a, b) => {
    const va = value(a, col), vb = value(b, col);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return (typeof va === 'string' ? va.localeCompare(vb, S.lang) : va - vb) * sort.dir;
  });
  // Das Neuzeichnen ersetzt den Kopf samt Knopf: ein Tastaturfokus darauf geht sonst verloren
  const thead = table.querySelector('thead');
  const focusedKey = thead.contains(document.activeElement) ? document.activeElement.dataset.k : null;
  thead.replaceChildren(h('tr', {}, ...cols.map((c) =>
    h('th', { scope: 'col', class: c.left ? 'l' : null, 'aria-sort': c.k === sort.k ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none' },
      h('button', { type: 'button', 'data-k': c.k }, t(c.label))))));
  if (focusedKey) thead.querySelector(`button[data-k="${focusedKey}"]`)?.focus();
  table.querySelector('tbody').replaceChildren(...sorted.map((r) => h('tr', { 'data-key': r.id },
    ...cols.map((c) => {
      const td = h('td', c.left ? { class: 'l' } : c.bar ? { class: 'bar' } : {}, c.text(r));
      const w = c.bar ? c.bar(r) : null;
      if (w != null) td.style.setProperty('--w', `${w}%`);
      return td;
    }))));
}

function renderTables() {
  const q = S.query.trim().toLowerCase();
  const all = S.data.rows;
  const maxD = Math.max(0, ...all.map((r) => r.per1000 ?? 0));
  renderTable('main', all.filter((r) => !q || `${r.nameDe} ${name(r)}`.toLowerCase().includes(q)), maxD);
  renderTable('runs', all, 0);
}

function renderRun() {
  const md = S.data.metadata;
  const card = $('#st-run-card');
  if (!md || !md.timings || !md.pmtiles) { card.hidden = true; return; }
  card.hidden = false;
  const f = fmt();
  $('#st-run-kpis').replaceChildren(
    kpiCard(t('r_end'), f.dt(md.generated_at), '', true),
    kpiCard(t('r_osm'), f.dt(md.osm_data_until), '', true),
    kpiCard(t('r_dl'), f.sec(md.timings.download_sec), '', true),
    kpiCard(t('r_ex'), f.sec(md.timings.extraction_sec), '', true),
    kpiCard(t('r_pm'), f.sec(md.pmtiles.duration_sec), '', true),
    kpiCard(t('r_sz'), `${f.mb(md.pmtiles.size_mb)} MB`, '', true));
  renderRunBar($('#st-runbar'), { download_sec: md.timings.download_sec, extraction_sec: md.timings.extraction_sec }, { t, fmt: f });
  const extracts = Object.entries(md.extracts || {}).map(([id, ex]) => ({ id, nameDe: ex.name || id, ex }));
  $('#st-extracts tbody').replaceChildren(...extracts.map(({ id, nameDe, ex }) => h('tr', { 'data-key': id },
    h('td', { class: 'l' }, name({ id, nameDe })),
    h('td', {}, dash(ex.size_mb, f.d1)),
    h('td', {}, dash(ex.osm_data_timestamp, f.dt)),
    h('td', {}, dash(ex.mtime, f.dt)))));
}

function renderNotes() {
  const d = S.data;
  $('#st-note-dach').textContent = d.hasDach ? t(d.usedSnapshot ? 'n_dach_snapshot' : 'n_dach_live') : '';
  $('#st-fetched').textContent = S.fetchedMs ? `${t('fetched')}${fmt().dt(S.fetchedMs)} UTC` : '';
  const warn = $('#st-warn');
  const lines = [];
  if (d.metadataFailed) lines.push(t('warn_meta'));
  else if (d.dachMissing.length) lines.push(t('warn_dach'));
  if (S.refreshFailed) lines.push(t('warn_refresh'));
  warn.hidden = lines.length === 0;
  warn.textContent = lines.join(' ');
}

function renderAll() {
  applyTexts();
  if (!S.data) return;
  renderKpis();
  renderCharts();
  renderTables();
  renderRun();
  renderNotes();
}

// -- Laden ---------------------------------------------------------------------------------

async function refresh() {
  try {
    const { manifest, metadata, metadataFailed } = await loadPipelineData();
    const built = buildRows({ manifest, metadata, snapshot: dachSnapshot, population });
    S.data = { ...built, summary: summarize(built.rows), metadata, metadataFailed };
    S.fetchedMs = Date.now();
    S.refreshFailed = false;
    $('#st-loading').hidden = true;
    $('#st-error').hidden = true;
    $('#st-content').hidden = false;
    renderAll();
  } catch (err) {
    console.warn('[Status] Laden fehlgeschlagen:', err);
    // Ein früherer Stand bleibt stehen, aber mit Warnung; nur beim ersten Laden gibt es die Fehlermeldung
    if (S.data) {
      S.refreshFailed = true;
      renderNotes();
    } else {
      $('#st-loading').hidden = true;
      $('#st-error').hidden = false;
    }
  }
}

function init() {
  applyTexts();
  document.querySelectorAll('.st-lang button').forEach((b) => b.addEventListener('click', () => {
    S.lang = b.dataset.lang;
    storeLang(S.lang);
    renderAll();
  }));
  Object.entries(TABLES).forEach(([id, def]) => $(def.sel).addEventListener('click', (e) => {
    const k = e.target.closest('button[data-k]')?.dataset.k;
    if (!k) return;
    const sort = S.sort[id];
    if (sort.k === k) sort.dir = -sort.dir;
    else S.sort[id] = { k, dir: k === 'name' || k === 'file' ? 1 : -1 };
    if (S.data) renderTables();
  }));
  $('#st-search').addEventListener('input', (e) => { S.query = e.target.value; if (S.data) renderTables(); });
  $('#st-retry').addEventListener('click', () => {
    $('#st-error').hidden = true;
    $('#st-loading').hidden = false;
    refresh();
  });

  // Diagramme an die Breite anpassen (nur bei Breitenänderung neu zeichnen)
  let lastWidth = 0;
  new ResizeObserver(() => {
    const w = $('#st-content').clientWidth;
    if (!S.data || !w || w === lastWidth) return;
    lastWidth = w;
    renderCharts();
  }).observe($('#st-content'));

  refresh();
  setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, REFRESH_MS);
}

init();
