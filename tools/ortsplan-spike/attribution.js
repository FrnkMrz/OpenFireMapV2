// Quellenangabe und Datenstand auf dem Blatt (rein, ohne DOM, mit `node --test` pruefbar).
// OSM-Pflichttext nach den Attribution Guidelines der OSMF: Nennung, Lizenz (ODbL) und ausgeschriebene Adresse, gedruckt neben der Karte.

/** Pflichttext, steht auf Seite 1 und am Fuss jeder Folgeseite des Strassenverzeichnisses (die Strassennamen stammen aus OSM). */
export const OSM_NOTICE = "© OpenStreetMap contributors (ODbL; https://www.openstreetmap.org/copyright)";
/** Vollstaendige Quellenangabe des Quellenblocks. */
export const ATTRIBUTION = `${OSM_NOTICE} · Basiskarte: Protomaps © OpenStreetMap · Feuerwehr- und Wasserstellen-Daten: OpenFireMap.org auf Basis von OpenStreetMap`;

// Schriftgroessen in "virtuellen" mm (A3 = 1; groessere Papiere skalieren mit). Die Quelle muss "leicht lesbar" sein: nicht kleiner als die Legende.
export const SRC_SIZE = 2.3;
export const SRC_STAND_SIZE = 2.5;
export const SRC_STEP = 3.2;
export const SRC_FOOT_SIZE = 2.6;

/** "2026-10-24T20:20:51Z" -> "24.10.2026 20:20 UTC"; ohne gueltiges Datum "unbekannt". */
export function formatStand(iso) {
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(String(iso || ""));
  return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}:${m[5]} UTC` : "unbekannt";
}

/** Stand der Basiskarte aus den Metadaten der PMTiles-Datei (Planetiler schreibt den Zeitpunkt der OSM-Daten). */
export function basemapUntil(metadata) {
  const v = metadata && metadata["planetiler:osm:osmosisreplicationtime"];
  return typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(v) ? v : null;
}
