/**
 * ==========================================================================================
 * DATEI: status/texts.js
 * ZWECK: Texte (Deutsch/Englisch), englische Ländernamen, Zahlen-/Datumsformate und
 *        Spracherkennung der Pipeline-Statusseite (/status/).
 *
 * Die Statusseite lädt bewusst nicht i18n.js der Karte (30+ Sprachen), sondern bringt ihre zwei
 * Sprachen selbst mit. Die Wahl liegt unter demselben Schlüssel wie in der Karte (`ofm_lang`).
 * ==========================================================================================
 */

export const LANGS = ['de', 'en'];
export const LANG_KEY = 'ofm_lang';

/** Sprache: ?lang=, gespeicherte Wahl der Karte (nur de/en), Browsersprache, sonst Deutsch (Projekt-Standard). */
export function detectLang({ search = '', stored = null, browser = '' } = {}) {
  const fromUrl = new URLSearchParams(search).get('lang');
  if (LANGS.includes(fromUrl)) return fromUrl;
  if (LANGS.includes(stored)) return stored;
  const b = String(browser || '').toLowerCase();
  if (b.startsWith('de')) return 'de';
  if (b) return 'en';
  return 'de';
}

export const COUNTRY_EN = {
  germany: 'Germany', austria: 'Austria', switzerland: 'Switzerland', luxembourg: 'Luxembourg', liechtenstein: 'Liechtenstein',
  albania: 'Albania', andorra: 'Andorra', azores: 'Azores', belgium: 'Belgium', 'bosnia-herzegovina': 'Bosnia and Herzegovina',
  bulgaria: 'Bulgaria', croatia: 'Croatia', cyprus: 'Cyprus', 'czech-republic': 'Czechia', denmark: 'Denmark', estonia: 'Estonia',
  'faroe-islands': 'Faroe Islands', finland: 'Finland', france: 'France', 'great-britain': 'Great Britain', greece: 'Greece',
  'guernsey-jersey': 'Guernsey and Jersey', hungary: 'Hungary', iceland: 'Iceland', 'ireland-and-northern-ireland': 'Ireland and Northern Ireland',
  'isle-of-man': 'Isle of Man', italy: 'Italy', kosovo: 'Kosovo', latvia: 'Latvia', lithuania: 'Lithuania', malta: 'Malta',
  macedonia: 'North Macedonia', moldova: 'Moldova', monaco: 'Monaco', montenegro: 'Montenegro', netherlands: 'Netherlands',
  norway: 'Norway', poland: 'Poland', portugal: 'Portugal', romania: 'Romania', serbia: 'Serbia', slovakia: 'Slovakia',
  slovenia: 'Slovenia', spain: 'Spain', sweden: 'Sweden'
};

/** Landesname in der gewählten Sprache; unbekannte Länder behalten den Namen aus dem Manifest. */
export function countryName(row, lang) {
  return lang === 'en' ? (COUNTRY_EN[row.id] || row.nameDe) : row.nameDe;
}

export const TEXTS = {
  de: {
    doc_title: 'Pipeline-Status – OpenFireMap',
    skip: 'Zum Inhalt springen',
    back: '← Zur Karte',
    sub: 'Wann welche Karte bei Geofabrik bereitstand, wann sie hochgeladen wurde und wie dicht Hydranten pro Einwohner im OSM-Bestand sind.',
    lang_label: 'Sprache',
    loading: 'Daten werden geladen …',
    error: 'Die Pipeline-Daten konnten nicht geladen werden.',
    retry: 'Erneut versuchen',
    warn_meta: 'Der DACHLiLu-Build (metadata.json) war nicht erreichbar oder unbrauchbar; Deutschland, Österreich, Schweiz, Luxemburg und Liechtenstein fehlen vorübergehend.',
    warn_refresh: 'Die Aktualisierung ist fehlgeschlagen. Die Seite zeigt weiter den Stand des letzten erfolgreichen Abrufs (siehe „Abgerufen“ unten) und versucht es automatisch erneut.',
    warn_dach: 'In metadata.json fehlen Angaben zu einigen DACHLiLu-Ländern; sie stehen deshalb nicht in der Liste.',
    k_unknown: 'ohne {n} Länder ohne Angabe',
    fetched: 'Abgerufen: ',
    k_regions: 'Länder und Gebiete', k_regions_n: 'in den veröffentlichten Karten',
    k_hyd: 'Hydranten gesamt', k_hyd_n: 'im OSM-Bestand aller Karten',
    k_per: 'Hydranten je 1.000 Einwohner', k_per_n: 'gesamt, Einwohner laut Statistik',
    k_aed: 'Defibrillatoren gesamt', k_aed_n: 'im OSM-Bestand aller Karten',
    k_fs_per: 'Wachen je 100.000 Einwohner', k_aed_per: 'Defibrillatoren je 100.000 Einwohner',
    k_fs: 'Feuerwachen gesamt', k_fs_n: 'im OSM-Bestand aller Karten',
    k_oldest: 'Ältester OSM-Datenstand', k_oldest_n: 'UTC, ältester Auszug im Bestand',
    def_osm_t: 'OSM-Datenstand', def_osm_d: 'Zeitpunkt, bis zu dem Änderungen aus OpenStreetMap im Geofabrik-Auszug enthalten sind.',
    def_up_t: 'Upload', def_up_d: 'Zeitpunkt, an dem die fertige Karte nach Cloudflare R2 hochgeladen wurde. Der Verzug ist die Zeit dazwischen.',
    k_latest: 'Letzter Upload', k_latest_n: 'UTC, zuletzt veröffentlichte Karte',
    tl_title: 'Geofabrik-Stand und Upload je Karte',
    tl_desc: 'Jede Zeile ein Land: vom OSM-Datenstand des Geofabrik-Auszugs (Ring) bis zum Upload nach Cloudflare R2 (gefüllter Punkt). Zeiten in UTC, neuester Upload zuerst. Länder aus dem DACHLiLu-Build teilen sich den Upload-Zeitpunkt. Die Tabelle weiter unten enthält dieselben Werte.',
    tl_osm: 'OSM-Datenstand (Geofabrik)', tl_up: 'Upload', tl_aria: 'Zeitleiste von OSM-Stand und Upload je Land',
    den_title: 'Je Einwohner', den_pick: 'Kennzahl wählen',
    m_hydrants: 'Hydranten je 1.000 Einw.', m_fireStations: 'Wachen je 100.000 Einw.', m_defibrillators: 'Defibrillatoren je 100.000 Einw.',
    den_desc_hydrants: 'OSM-Hydranten des Landes geteilt durch seine Einwohner. Gestrichelt: Gesamtwert aller Länder. Das misst auch, wie vollständig Hydranten in OSM erfasst sind, nicht nur die Ausstattung vor Ort.',
    den_desc_fireStations: 'OSM-Feuerwachen und Feuerwehrgerätehäuser des Landes je 100.000 Einwohner. Gestrichelt: Gesamtwert aller Länder. Der Wert hängt stark davon ab, ob kleine, oft freiwillige Wachen in OSM erfasst sind, und sagt nichts über die Einsatzbereitschaft.',
    den_desc_defibrillators: 'OSM-Defibrillatoren (AED) des Landes je 100.000 Einwohner. Gestrichelt: Gesamtwert aller Länder. Das zeigt vor allem, wie vollständig AED in OSM kartiert sind, nicht die tatsächliche Versorgung.',
    den_aria_hydrants: 'Hydranten je 1.000 Einwohner je Land', den_aria_fireStations: 'Wachen je 100.000 Einwohner je Land', den_aria_defibrillators: 'Defibrillatoren je 100.000 Einwohner je Land',
    tb_title: 'Alle Länder im Überblick', tb_desc: 'Verzug = Zeit zwischen OSM-Datenstand und Upload. Spalten sortieren per Klick auf die Überschrift.', tb_search: 'Land suchen',
    tb_caption: 'Länder mit Hydranten, Einwohnern, Dichte, OSM-Datenstand und Upload',
    c_name: 'Land', c_hyd: 'Hydranten', c_fs: 'Wachen', c_pop: 'Einwohner (Mio.)', c_per: 'je 1.000 Einw.', c_inh: 'Einw. je Hydrant', c_osm: 'OSM-Datenstand', c_up: 'Upload', c_lag: 'Verzug (h)', c_size: 'Größe (MB)', c_file: 'Datei', c_zoom: 'Zoom', c_wp: 'Wasserstellen', c_aed: 'Defibrillatoren', c_bnd: 'Grenzen', c_fsper: 'Wachen je 100.000', c_aedper: 'AED je 100.000',
    runs_title: 'Läufe je Gebiet', runs_desc: 'Der letzte Lauf jeder veröffentlichten Karte, neueste zuerst: Datei, Zeiten, Größe und Zahl der Objekte je Ebene. Deutschland, Österreich, Schweiz, Luxemburg und Liechtenstein entstehen in einem gemeinsamen täglichen Build (eine Datei, hier je Land ausgewiesen). Laufzeiten veröffentlicht die Pipeline nur für diesen Build, nicht für die Länder-Dateien.', runs_caption: 'Letzter Lauf je veröffentlichter Karte', run_shared: 'gemeinsamer Build',
    run_title: 'DACHLiLu: letzter Lauf', run_desc: 'Der gemeinsame Build für Deutschland, Österreich, Schweiz, Luxemburg und Liechtenstein: Geofabrik-Download, Extraktion, PMTiles.',
    r_end: 'Upload der Karte (UTC)', r_osm: 'OSM-Datenstand der Auszüge (UTC)', r_dl: 'Geofabrik-Download', r_ex: 'Extraktion', r_pm: 'davon PMTiles bauen', r_sz: 'PMTiles-Größe',
    r_bar_dl: 'Download', r_bar_ex: 'Extraktion',
    x_caption: 'Geofabrik-Auszüge des letzten DACHLiLu-Laufs',
    x_name: 'Geofabrik-Auszug', x_size: 'Größe (MB)', x_osm: 'OSM-Datenstand (im Auszug)', x_dl: 'Auszug heruntergeladen',
    n_osm: 'Hydranten-Zahlen zählen Objekte in OpenStreetMap, nicht die tatsächlich vorhandenen Hydranten.',
    n_pop: 'Einwohner: Eurostat (1. Januar 2025), außerhalb von Eurostat Weltbank (2025) und für Nordirland NISRA (Mitte 2024), angepasst an das Gebiet des Geofabrik-Auszugs (Frankreich ohne Überseegebiete, Spanien ohne Kanaren, Zypern ganze Insel). Moldau ohne Transnistrien, das der Auszug mitumfasst. Jede Anpassung steht in src/data/status-population.json.',
    n_overlap: 'Die Azoren stecken im Auszug Portugals und zählen in den Summen und Dichten nur einmal.',
    n_dach_snapshot: 'Hydranten, Wachen, Wasserstellen und Defibrillatoren der fünf DACHLiLu-Länder sind einzeln aus den Geofabrik-Auszügen gezählt (Stand 20.10.2026). Die Summen liegen leicht über den Werten des Builds, weil Objekte an Landesgrenzen in zwei Auszügen stehen und der Builder Hilfsobjekte aussortiert. Größe und Grenzen gibt es nur für den gemeinsamen Build.',
    n_dach_live: 'Größe und Grenzen gibt es für die fünf DACHLiLu-Länder nur für den gemeinsamen Build.',
    src: 'Datenquellen: pipeline.openfiremap.org (Karten-Manifest und Build-Daten), OpenStreetMap-Daten über Geofabrik.',
    tip_osm: 'OSM-Datenstand: ', tip_up: 'Upload: ', tip_lag: 'Verzug: ', tip_hydrants: 'Hydranten', tip_fireStations: 'Wachen', tip_defibrillators: 'Defibrillatoren', tip_pop: 'Mio. Einwohner', tip_per_hydrants: 'je 1.000 Einw.', tip_per_fireStations: 'je 100.000 Einw.', tip_per_defibrillators: 'je 100.000 Einw.', mio: 'Mio.'
  },
  en: {
    doc_title: 'Pipeline status – OpenFireMap',
    skip: 'Skip to content',
    back: '← Back to the map',
    sub: 'When each map was available from Geofabrik, when it was uploaded, and how many hydrants OpenStreetMap holds per inhabitant.',
    lang_label: 'Language',
    loading: 'Loading data …',
    error: 'The pipeline data could not be loaded.',
    retry: 'Try again',
    warn_meta: 'The DACHLiLu build (metadata.json) was not reachable or unusable; Germany, Austria, Switzerland, Luxembourg and Liechtenstein are missing for now.',
    warn_refresh: 'The refresh failed. The page keeps showing the data of the last successful fetch (see “Fetched” below) and retries automatically.',
    warn_dach: 'metadata.json lacks data for some DACHLiLu countries; they are therefore not listed.',
    k_unknown: 'excluding {n} without data',
    fetched: 'Fetched: ',
    k_regions: 'Countries and regions', k_regions_n: 'in the published maps',
    k_hyd: 'Hydrants in total', k_hyd_n: 'in OSM across all maps',
    k_per: 'Hydrants per 1,000 inhabitants', k_per_n: 'overall, inhabitants per official statistics',
    k_aed: 'Defibrillators in total', k_aed_n: 'in OSM across all maps',
    k_fs_per: 'Stations per 100,000 inhabitants', k_aed_per: 'Defibrillators per 100,000 inhabitants',
    k_fs: 'Fire stations in total', k_fs_n: 'in OSM across all maps',
    k_oldest: 'Oldest OSM data state', k_oldest_n: 'UTC, oldest extract in use',
    def_osm_t: 'OSM data state', def_osm_d: 'Point in time up to which OpenStreetMap changes are contained in the Geofabrik extract.',
    def_up_t: 'Upload', def_up_d: 'Point in time when the finished map was uploaded to Cloudflare R2. The delay is the time in between.',
    k_latest: 'Latest upload', k_latest_n: 'UTC, most recently published map',
    tl_title: 'Geofabrik state and upload per map',
    tl_desc: 'One row per country: from the OSM data state of the Geofabrik extract (ring) to the upload to Cloudflare R2 (filled dot). Times in UTC, newest upload first. Countries from the DACHLiLu build share one upload time. The table further down holds the same values.',
    tl_osm: 'OSM data state (Geofabrik)', tl_up: 'Upload', tl_aria: 'Timeline of OSM state and upload per country',
    den_title: 'Per inhabitant', den_pick: 'Choose measure',
    m_hydrants: 'Hydrants per 1,000 inh.', m_fireStations: 'Stations per 100,000 inh.', m_defibrillators: 'Defibrillators per 100,000 inh.',
    den_desc_hydrants: 'OSM hydrants of the country divided by its inhabitants. Dashed: overall value across all countries. This also reflects how completely hydrants are mapped in OSM, not only the equipment on the ground.',
    den_desc_fireStations: 'OSM fire stations of the country per 100,000 inhabitants. Dashed: overall value across all countries. The value depends heavily on whether small, often volunteer stations are mapped in OSM, and says nothing about readiness.',
    den_desc_defibrillators: 'OSM defibrillators (AEDs) of the country per 100,000 inhabitants. Dashed: overall value across all countries. This mainly reflects how completely AEDs are mapped in OSM, not actual coverage.',
    den_aria_hydrants: 'Hydrants per 1,000 inhabitants by country', den_aria_fireStations: 'Stations per 100,000 inhabitants by country', den_aria_defibrillators: 'Defibrillators per 100,000 inhabitants by country',
    tb_title: 'All countries at a glance', tb_desc: 'Delay = time between OSM data state and upload. Click a column heading to sort.', tb_search: 'Search country',
    tb_caption: 'Countries with hydrants, inhabitants, density, OSM data state and upload',
    c_name: 'Country', c_hyd: 'Hydrants', c_fs: 'Stations', c_pop: 'Inhabitants (M)', c_per: 'per 1,000 inh.', c_inh: 'Inh. per hydrant', c_osm: 'OSM data state', c_up: 'Upload', c_lag: 'Delay (h)', c_size: 'Size (MB)', c_file: 'File', c_zoom: 'Zoom', c_wp: 'Water points', c_aed: 'Defibrillators', c_bnd: 'Boundaries', c_fsper: 'Stations per 100,000', c_aedper: 'AEDs per 100,000',
    runs_title: 'Runs per area', runs_desc: 'The latest run of every published map, newest first: file, times, size and number of objects per layer. Germany, Austria, Switzerland, Luxembourg and Liechtenstein come from one shared daily build (one file, shown per country here). The pipeline publishes run times only for this build, not for the country files.', runs_caption: 'Latest run of each published map', run_shared: 'shared build',
    run_title: 'DACHLiLu: latest run', run_desc: 'The shared build for Germany, Austria, Switzerland, Luxembourg and Liechtenstein: Geofabrik download, extraction, PMTiles.',
    r_end: 'Map uploaded (UTC)', r_osm: 'OSM data state of extracts (UTC)', r_dl: 'Geofabrik download', r_ex: 'Extraction', r_pm: 'of which building PMTiles', r_sz: 'PMTiles size',
    r_bar_dl: 'Download', r_bar_ex: 'Extraction',
    x_caption: 'Geofabrik extracts of the latest DACHLiLu run',
    x_name: 'Geofabrik extract', x_size: 'Size (MB)', x_osm: 'OSM data state (in extract)', x_dl: 'Extract downloaded',
    n_osm: 'Hydrant figures count objects in OpenStreetMap, not the hydrants that actually exist.',
    n_pop: 'Inhabitants: Eurostat (1 January 2025), outside Eurostat the World Bank (2025) and for Northern Ireland NISRA (mid-2024), adjusted to the area of the Geofabrik extract (France without overseas territories, Spain without the Canary Islands, Cyprus the whole island). Moldova excludes Transnistria, which the extract includes. Every adjustment is listed in src/data/status-population.json.',
    n_overlap: 'The Azores are part of the Portugal extract and are counted only once in totals and densities.',
    n_dach_snapshot: 'Hydrants, stations, water points and defibrillators of the five DACHLiLu countries are counted individually from the Geofabrik extracts (as of 20 Oct 2026). The sums are slightly above the build values because objects on borders appear in two extracts and the builder discards helper objects. Size and boundaries exist only for the shared build.',
    n_dach_live: 'Size and boundaries exist for the five DACHLiLu countries only for the shared build.',
    src: 'Data sources: pipeline.openfiremap.org (map manifest and build data), OpenStreetMap data via Geofabrik.',
    tip_osm: 'OSM data state: ', tip_up: 'Upload: ', tip_lag: 'Delay: ', tip_hydrants: 'hydrants', tip_fireStations: 'stations', tip_defibrillators: 'defibrillators', tip_pop: 'M inhabitants', tip_per_hydrants: 'per 1,000 inh.', tip_per_fireStations: 'per 100,000 inh.', tip_per_defibrillators: 'per 100,000 inh.', mio: 'M'
  }
};

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n) => String(n).padStart(2, '0');

/** Zahlen- und Datumsformate je Sprache. Alle Zeiten in UTC. */
export function createFormatters(lang) {
  const locale = lang === 'de' ? 'de-DE' : 'en-US';
  const cache = {};
  const nf = (o) => {
    const key = JSON.stringify(o);
    return cache[key] || (cache[key] = new Intl.NumberFormat(locale, o));
  };
  const fix = (n) => nf({ minimumFractionDigits: n, maximumFractionDigits: n });
  const hm = (d) => `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
  const asDate = (v) => (v instanceof Date ? v : new Date(v));
  return {
    int: (v) => nf({}).format(v),
    d1: (v) => fix(1).format(v),
    compact: (v) => nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v),
    dens: (v) => (v >= 10 ? fix(1) : v >= 0.1 ? fix(2) : fix(3)).format(v),
    mio: (v) => (v >= 10 ? fix(1) : v >= 1 ? fix(2) : fix(3)).format(v),
    mb: (v) => fix(1).format(v),
    dt(v) {
      const d = asDate(v);
      if (Number.isNaN(+d)) return '—';
      return lang === 'de'
        ? `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()} ${hm(d)}`
        : `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} ${hm(d)}`;
    },
    dshort(v) {
      const d = asDate(v);
      return lang === 'de' ? `${d.getUTCDate()}.${d.getUTCMonth() + 1}. ${hm(d)}` : `${MON[d.getUTCMonth()]} ${d.getUTCDate()} ${hm(d)}`;
    },
    dtick(v) {
      const d = asDate(v);
      return lang === 'de' ? `${d.getUTCDate()}.${d.getUTCMonth() + 1}.` : `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
    },
    sec: (v) => `${nf({}).format(Math.round(v))} s`
  };
}
