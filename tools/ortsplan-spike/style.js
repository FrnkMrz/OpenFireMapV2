// Ortsplan-Stil (Spike): erzeugt ein MapLibre-Style-JSON fuer einen Druckmassstab.
// Alle Masse sind Millimeter AUF DEM PAPIER; px() rechnet in CSS-Pixel um (96 dpi).
// Die Werte sind vorlaeufige Platzhalter, in Phase 1 an echten Ortsplaenen zu messen.

export const CSS_PX_PER_MM = 96 / 25.4;
const px = (mm) => +(mm * CSS_PX_PER_MM).toFixed(2);

// Klassen: echte Fahrbahnbreite in Metern, Mindest-Fuellbreite in mm (Papier), Farben.
export const ROAD_CLASSES = [
  // Reihenfolge = Wichtigkeit aufsteigend (unten -> oben)
  { id: "service", label: "Zufahrt, Erschließungsweg",   filter: ["all", ["==", ["get", "kind"], "minor_road"], ["==", ["get", "kind_detail"], "service"]], realM: 3.5, minMm: 0.7, fill: "#ffffff", casing: "#6f685c" },
  { id: "minor", label: "Wohn- und Nebenstraße",     filter: ["all", ["==", ["get", "kind"], "minor_road"], ["!=", ["get", "kind_detail"], "service"]], realM: 5.5, minMm: 1.2, fill: "#ffffff", casing: "#5f584c" },
  { id: "tertiary", label: "Sammelstraße (Kreis-, Staatsstraße)",  filter: ["all", ["==", ["get", "kind"], "major_road"], ["in", ["get", "kind_detail"], ["literal", ["tertiary", "secondary"]]]], realM: 7, minMm: 1.6, fill: "#fff0a0", casing: "#4f483c" },
  { id: "primary", label: "Hauptstraße (Bundesstraße)",   filter: ["all", ["==", ["get", "kind"], "major_road"], ["in", ["get", "kind_detail"], ["literal", ["primary", "trunk"]]]], realM: 9, minMm: 1.9, fill: "#ffd24d", casing: "#40392e" },
  { id: "highway", label: "Autobahn",   filter: ["==", ["get", "kind"], "highway"], realM: 14, minMm: 2.3, fill: "#f4a259", casing: "#2f2a22" },
];

const NOT_TUNNEL = ["!=", ["get", "is_tunnel"], true];

export function buildStyle({ scale, mode = "plan", pmtilesUrl, ofmUrl = null }) {
  const plan = mode === "plan";
  const realMm = (m) => (m / scale) * 1000;
  const fillMm = (c) => (plan ? Math.max(realMm(c.realM), c.minMm) : Math.max(realMm(c.realM), 0.1));
  const casingMm = plan ? 0.22 : 0.08;
  const text = (mm) => px(mm);

  const layers = [];
  layers.push({ id: "bg", type: "background", paint: { "background-color": "#f6f3ec" } });

  layers.push({
    id: "landuse", type: "fill", source: "p", "source-layer": "landuse",
    paint: {
      "fill-color": ["match", ["get", "kind"],
        ["park", "garden", "playground", "recreation_ground", "village_green", "grass", "grassland", "meadow", "pitch", "golf_course"], "#dcebc8",
        ["forest", "wood"], "#c9dfb5",
        ["farmland", "orchard", "vineyard", "allotments"], "#eee9d2",
        ["cemetery"], "#d3e2c2",
        ["residential"], "#efeae0",
        ["industrial", "commercial", "retail", "railway"], "#e6e2da",
        ["hospital", "school", "university", "college"], "#f0e3e3",
        "rgba(0,0,0,0)"],
    },
  });

  layers.push({
    id: "water-fill", type: "fill", source: "p", "source-layer": "water",
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": "#b7d6ee" },
  });
  layers.push({
    id: "water-line", type: "line", source: "p", "source-layer": "water",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: { "line-color": "#b7d6ee", "line-width": px(plan ? 0.7 : 0.25) },
  });

  layers.push({
    id: "buildings", type: "fill", source: "p", "source-layer": "buildings",
    filter: ["!=", ["get", "kind"], "address"],
    paint: { "fill-color": "#d4cbbb", "fill-outline-color": "#8f8675" },
  });

  // Wege (Fuss/Rad/Wirtschaft): duenn, gestrichelt
  layers.push({
    id: "paths", type: "line", source: "p", "source-layer": "roads",
    filter: ["all", ["==", ["get", "kind"], "path"], NOT_TUNNEL],
    layout: { "line-cap": "butt" },
    paint: { "line-color": "#9a9183", "line-width": px(plan ? 0.28 : 0.12), "line-dasharray": [1.5, 2] },
  });

  // Alle Konturen zuerst (Kreuzungen verschmelzen), danach alle Fuellungen.
  for (const c of ROAD_CLASSES) {
    layers.push({
      id: `road-casing-${c.id}`, type: "line", source: "p", "source-layer": "roads",
      filter: ["all", c.filter, NOT_TUNNEL],
      layout: { "line-cap": "butt", "line-join": "round" },
      paint: { "line-color": c.casing, "line-width": px(fillMm(c) + 2 * casingMm) },
    });
  }
  for (const c of ROAD_CLASSES) {
    layers.push({
      id: `road-fill-${c.id}`, type: "line", source: "p", "source-layer": "roads",
      filter: ["all", c.filter, NOT_TUNNEL],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": c.fill, "line-width": px(fillMm(c)) },
    });
  }

  layers.push({
    id: "rail", type: "line", source: "p", "source-layer": "roads",
    filter: ["==", ["get", "kind"], "rail"],
    paint: { "line-color": "#5a5a5a", "line-width": px(plan ? 0.35 : 0.15), "line-dasharray": [4, 4] },
  });

  // Gemeindegrenzen aus der Pipeline-Ebene "boundaries" (alle Linien, wie renderBoundaries() der App)
  if (ofmUrl) {
    layers.push({
      id: "boundaries", type: "line", source: "ofm", "source-layer": "boundaries",
      layout: { "line-cap": "butt", "line-join": "round" },
      paint: { "line-color": "#333333", "line-opacity": 0.7, "line-width": px(plan ? 0.35 : 0.2), "line-dasharray": [7.5, 7.5] },
    });
  }

  // Beschriftung
  layers.push({
    id: "road-labels", type: "symbol", source: "p", "source-layer": "roads",
    filter: ["all", ["has", "name"], ["in", ["get", "kind"], ["literal", ["highway", "major_road", "minor_road"]]], NOT_TUNNEL],
    layout: {
      "symbol-placement": "line",
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["match", ["get", "kind"], "minor_road", text(plan ? 1.75 : 1.4), text(plan ? 2.1 : 1.6)],
      "text-letter-spacing": 0.03,
      "text-padding": 1,
      "text-max-angle": 40,
      "symbol-spacing": px(plan ? 45 : 80),
    },
    paint: { "text-color": "#1a1a1a", "text-halo-color": "#ffffff", "text-halo-width": px(0.4) },
  });
  layers.push({
    id: "housenumbers", type: "symbol", source: "p", "source-layer": "buildings",
    filter: ["all", ["==", ["get", "kind"], "address"], ["has", "addr_housenumber"]],
    layout: {
      "text-field": ["get", "addr_housenumber"],
      "text-font": ["Noto Sans Regular"],
      "text-size": text(plan ? 1.7 : 1.2),
      "text-allow-overlap": false,
    },
    paint: { "text-color": "#5a3b00", "text-halo-color": "#f6f3ec", "text-halo-width": px(0.25) },
  });
  // Einsatzwichtige Objekte mit Namen (Schulen, Kitas, Kliniken, Pflege, Rathaus, Kirchen ...), blau-kursiv wie in der Legende.
  layers.push({
    id: "poi-labels", type: "symbol", source: "p", "source-layer": "pois",
    filter: ["all", ["has", "name"], ["in", ["get", "kind"], ["literal", ["school", "kindergarten", "hospital", "social_facility", "nursing_home", "townhall", "place_of_worship", "university", "college"]]]],
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Italic"],
      "text-size": text(plan ? 1.9 : 1.3),
      "text-max-width": 7,
      "text-padding": 2,
    },
    paint: { "text-color": "#1d4e89", "text-halo-color": "#ffffff", "text-halo-width": px(0.35) },
  });
  layers.push({
    id: "place-labels", type: "symbol", source: "p", "source-layer": "places",
    filter: ["in", ["get", "kind"], ["literal", ["locality", "neighbourhood", "macrohood"]]],
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Medium"],
      "text-size": ["match", ["get", "kind"], "locality", text(plan ? 3.6 : 2.6), text(plan ? 2.6 : 2.0)],
      "text-letter-spacing": 0.08,
      "text-transform": ["match", ["get", "kind"], "locality", "none", "uppercase"],
    },
    paint: { "text-color": "#1f1f1f", "text-halo-color": "#f6f3ec", "text-halo-width": px(0.5) },
  });

  const sources = { p: { type: "vector", url: `pmtiles://${pmtilesUrl}`, attribution: "© OpenStreetMap contributors, Protomaps" } };

  // Quelle der OpenFireMap-Pipeline (Grenzen als Ebene hier, Feuerwehr-Symbole zeichnet fire.js wie die App).
  if (ofmUrl) sources.ofm = { type: "vector", url: `pmtiles://${ofmUrl}`, attribution: "OpenFireMap" };

  return {
    version: 8,
    glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sources,
    layers,
  };
}

// Zoomstufe, bei der 1 CSS-Pixel genau (scale/1000 / CSS_PX_PER_MM) Meter entspricht.
// MapLibre rechnet mit 512-px-Kacheln: Meter je Pixel = 78271.517 * cos(lat) / 2^z.
export function zoomForScale(scale, latDeg) {
  const mPerCssPx = scale / 1000 / CSS_PX_PER_MM;
  return Math.log2((78271.517 * Math.cos((latDeg * Math.PI) / 180)) / mPerCssPx);
}
