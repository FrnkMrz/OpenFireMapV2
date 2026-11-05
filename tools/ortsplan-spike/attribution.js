// Quellenangabe und Datenstand auf dem Blatt (rein, ohne DOM, mit `node --test` pruefbar).
// OSM-Pflichttext nach den Attribution Guidelines der OSMF: Nennung, Lizenz (ODbL) und ausgeschriebene Adresse, gedruckt neben der Karte.
// Mehr ist nicht Pflicht: die Namen Protomaps und OpenFireMap.org sind freiwillige Hinweise und stehen darum nur kurz da.

/** Pflichttext, steht auf Seite 1 und am Fuss jeder Folgeseite des Strassenverzeichnisses (die Strassennamen stammen aus OSM). */
export const OSM_NOTICE = "© OpenStreetMap contributors (ODbL; https://www.openstreetmap.org/copyright)";
/** Freiwillige Hinweise auf Basiskarte und Fachdaten, bewusst kurz. */
export const CREDIT = "Karte: Protomaps · Daten: OpenFireMap.org";
/** Alle Textzeilen der Quellenangabe (ohne Datenstand), in der Reihenfolge auf dem Blatt. */
export const ATTRIBUTION_LINES = [OSM_NOTICE, CREDIT];

// Schriftgroessen in "virtuellen" mm (A3 = 1; groessere Papiere skalieren mit). Klein, aber lesbar: etwa 5,7 pt auf A3.
export const SRC_SIZE = 2.0;
export const SRC_STEP = 2.6;
export const SRC_FOOT_SIZE = 2.4;

/** "2026-10-24T20:20:51Z" -> "24.10.2026 20:20 UTC"; ohne gueltiges Datum "unbekannt". */
export function formatStand(iso) {
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(String(iso || ""));
  return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}:${m[5]} UTC` : "unbekannt";
}

/** Nur das Datum: "2026-10-24T20:20:51Z" -> "24.10.2026"; sonst null. */
export function formatDay(iso) {
  const m = /^(\d{4})-(\d\d)-(\d\d)T/.exec(String(iso || ""));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null;
}

/** Eine Zeile mit beiden Staenden: "Stand: Feuerwehr-Daten 24.10.2026 · Basiskarte 01.11.2026" (fehlt einer, entfaellt er). */
export function standLine(fireIso, baseIso) {
  const parts = [["Feuerwehr-Daten", formatDay(fireIso)], ["Basiskarte", formatDay(baseIso)]].filter(([, d]) => d).map(([n, d]) => `${n} ${d}`);
  return `Stand: ${parts.length ? parts.join(" · ") : "unbekannt"}`;
}

/** Stand der Basiskarte aus den Metadaten der PMTiles-Datei (Planetiler schreibt den Zeitpunkt der OSM-Daten). */
export function basemapUntil(metadata) {
  const v = metadata && metadata["planetiler:osm:osmosisreplicationtime"];
  return typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(v) ? v : null;
}
