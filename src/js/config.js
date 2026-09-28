/**
 * ==========================================================================================
 * DATEI: config.js
 * ZWECK: Zentrale Konfiguration (URLs, Layer, Farben, Zoom-Stufen, Export-Limits, Performance)
 *
 * WARUM:
 * - Vermeidet "Magic Numbers" und verstreute URLs im Code.
 * - Erleichtert Wartung und spätere Anpassungen (z.B. Mobile-Ansicht, neue Layer, andere Limits).
 *
 * HINWEIS:
 * - Diese Datei enthält nur Konfiguration, keine Logik.
 * - Änderungen hier wirken sich auf Karte UND Export aus, sofern die Werte dort genutzt werden.
 * ==========================================================================================
 */

export const Config = {
  // ----------------------------------------------------------------------------------------
  // 1) Startverhalten der Karte
  // ----------------------------------------------------------------------------------------

  /**
   * Startposition beim Laden (Default-View).
   * Aktuell: Schnaittach.
   * Format: [lat, lon]
   */
  defaultCenter: [49.555, 11.35],

  /**
   * Zoomstufen:
   * - defaultZoom: beim Laden
   * - searchZoom: nach Suche (z.B. Nominatim)
   * - locateZoom: nach Standortbestimmung (GPS)
   */
  defaultZoom: 14,
  searchZoom: 16,
  locateZoom: 17,

  // ----------------------------------------------------------------------------------------
  // 2) Dienste / APIs
  // ----------------------------------------------------------------------------------------

  /**
   * Overpass-Endpunkte (Fallback-Liste).
   * Idee: Wenn ein Server langsam ist oder ausfällt, kann auf den nächsten gewechselt werden.
   */
  overpassEndpoints: [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ],

  /**
   * Nominatim Basis-URL (Geocoding / Suche).
   * Hinweis: Nominatim hat Nutzungsrichtlinien (Rate-Limits, User-Agent/Referer etc.).
   */
  nominatimUrl: "https://nominatim.openstreetmap.org",

  /**
   * Lokale DACH Data Pipeline (Proxmox / Docker).
   * Wird bevorzugt, wenn das Kartenfenster im Abdeckungsbereich liegt.
   */
  pipeline: {
    enabled: true,
    url: "https://pipeline.openfiremap.org",
    usePmtiles: true,
    pmtilesFile: "openfiremap.pmtiles",
    // Abdeckungsbereich Bayern (von Lindau/Oberstdorf bis Aschaffenburg/Hof/Wegscheid)
    // Äußere Bounding-Box für schnelle Vorfilterung (O(1))
    bounds: {
      south: 47.2,
      west: 8.9,
      north: 50.6,
      east: 13.9
    },
    // Exaktes Grenzpolygon des Freistaates Bayern (124 Stützpunkte, WGS84 [lat, lon]).
    // Verhindert zuverlässig, dass Grenzstädte in Nachbarländern/-bundesländern
    // (z. B. Ulm in BW, Salzburg/Kufstein in AT, Sonneberg in TH) fälschlicherweise
    // über die Bayern-Pipeline angefragt werden und leer bleiben.
    coveragePolygon: [
      [47.5558, 10.4544], [47.5373, 10.8903], [47.4833, 10.87], [47.4811, 10.9372],
      [47.3996, 10.9719], [47.3976, 11.2699], [47.4446, 11.4212], [47.4724, 11.3838],
      [47.5179, 11.4421], [47.5145, 11.5724], [47.5946, 11.6362], [47.6068, 12.204],
      [47.7012, 12.1624], [47.743, 12.257], [47.6795, 12.2552], [47.6952, 12.4401],
      [47.6251, 12.4992], [47.6738, 12.7812], [47.557, 12.7943], [47.4644, 13.0066],
      [47.687, 13.0807], [47.7234, 12.9053], [47.85, 13.0034], [48.1261, 12.7581],
      [48.3235, 13.3298], [48.4308, 13.4393], [48.5574, 13.4378], [48.5906, 13.509],
      [48.5148, 13.7305], [48.6186, 13.8258], [48.7716, 13.8396], [48.9492, 13.6286],
      [48.9872, 13.4027], [49.0507, 13.3974], [49.1345, 13.1828], [49.3043, 13.0291],
      [49.3455, 12.7858], [49.4348, 12.6556], [49.6864, 12.522], [49.7538, 12.4006],
      [49.9205, 12.5477], [50.0584, 12.261], [50.199, 12.1972], [50.2524, 12.0906],
      [50.3072, 12.126], [50.3521, 11.9727], [50.4237, 11.9348], [50.374, 11.5195],
      [50.4446, 11.4198], [50.5139, 11.4276], [50.5214, 11.3467], [50.4779, 11.2473],
      [50.2679, 11.2531], [50.2853, 11.1453], [50.3669, 11.1154], [50.3927, 10.8305],
      [50.3251, 10.7142], [50.2514, 10.8518], [50.2043, 10.7175], [50.2241, 10.6121],
      [50.3339, 10.6012], [50.3933, 10.3948], [50.4944, 10.3307], [50.5633, 10.1062],
      [50.4233, 9.9577], [50.425, 9.7603], [50.2341, 9.6636], [50.2431, 9.5013],
      [50.0943, 9.5129], [50.1495, 9.2215], [50.0903, 9.1487], [50.1115, 9.0184],
      [50.0498, 8.9764], [49.9946, 9.0511], [49.8426, 9.0378], [49.7427, 9.1506],
      [49.6023, 9.0665], [49.5739, 9.1946], [49.6549, 9.3041], [49.6455, 9.4061],
      [49.7297, 9.3998], [49.7405, 9.2957], [49.7895, 9.4225], [49.7442, 9.5633],
      [49.7913, 9.6488], [49.6871, 9.6533], [49.731, 9.7999], [49.61, 9.8728],
      [49.5561, 9.8112], [49.5857, 9.9122], [49.4805, 9.9517], [49.5451, 10.0617],
      [49.511, 10.1213], [49.1989, 10.1249], [49.1493, 10.2482], [49.0974, 10.204],
      [49.0404, 10.2503], [48.9204, 10.4568], [48.7705, 10.412], [48.6872, 10.4953],
      [48.6528, 10.3611], [48.7037, 10.2687], [48.5229, 10.3121], [48.4575, 10.0314],
      [48.3742, 9.9674], [48.0976, 10.1408], [47.8679, 10.077], [47.8097, 10.1379],
      [47.8044, 10.0914], [47.7849, 10.0651], [47.6768, 10.1302], [47.6775, 9.8404],
      [47.5419, 9.5587], [47.534, 9.7348], [47.5961, 9.8], [47.5285, 9.8745],
      [47.5457, 9.9707], [47.4589, 10.0916], [47.3548, 10.0999], [47.3819, 10.2362],
      [47.2791, 10.1721], [47.2706, 10.2324], [47.3804, 10.4368], [47.5558, 10.4544]
    ]
  },

  // ----------------------------------------------------------------------------------------
  // 3) Basemap-Layer
  // ----------------------------------------------------------------------------------------

  /**
   * CARTO API-Key für Raster-Basemaps (Voyager, Positron, Dark).
   * Verhindert das Wasserzeichen "API KEY REQUIRED".
   */
  cartoApiKey: "cb1_3rhl_1_c46f6032a1460d7cdb99badc",

  /**
   * Karten-Hintergründe (Basemaps).
   * - url: Tile-URL-Template
   * - attr: Attribution für die Webseite (HTML erlaubt)
   * - textAttr: Attribution für Export (Plain Text)
   * - maxZoom: Maximaler Zoom der Basemap
   */
  layers: {
    voyager: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_3rhl_1_c46f6032a1460d7cdb99badc",
      attr:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
        '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      textAttr: "© OpenStreetMap contributors, © CARTO",
      maxZoom: 18,
    },
    positron: {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_3rhl_1_c46f6032a1460d7cdb99badc",
      attr:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
        '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      textAttr: "© OpenStreetMap contributors, © CARTO",
      maxZoom: 18,
    },
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_3rhl_1_c46f6032a1460d7cdb99badc",
      attr:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
        '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      textAttr: "© OpenStreetMap contributors, © CARTO",
      maxZoom: 18,
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attr:
        "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, " +
        "Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      maxZoom: 18,
      maxNativeZoom: 17
    },
    topo: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attr:
        'Daten: &copy; <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>-Mitwirkende, SRTM | ' +
        'Darstellung: &copy; <a href="http://opentopomap.org">OpenTopoMap</a> ' +
        '(<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      textAttr: "Daten: © OpenStreetMap-Mitwirkende, SRTM | Darstellung: © OpenTopoMap (CC-BY-SA)",
      maxZoom: 17
    },
    osm: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attr:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      textAttr: "© OpenStreetMap contributors",
      maxZoom: 18,
    },
    osmde: {
      url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
      attr:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      textAttr: "© OpenStreetMap contributors",
      maxZoom: 18,
    },
    bayern: {
      url: "https://wmtsod{s}.bayernwolke.de/wmts/by_webkarte/smerc/{z}/{x}/{y}",
      subdomains: ["1","2","3","4"],
      attr: "Kartendaten: &copy; Bayerische Vermessungsverwaltung (OpenData)",
      textAttr: "© Bayerische Vermessungsverwaltung",
      maxZoom: 19
    },
    bayern_dop: {
      url: "https://wmtsod{s}.bayernwolke.de/wmts/by_dop/smerc/{z}/{x}/{y}",
      subdomains: ["1","2","3","4"],
      attr: "Kartendaten: &copy; Bayerische Vermessungsverwaltung (DOP)",
      textAttr: "© Bayerische Vermessungsverwaltung",
      maxZoom: 19
    }
  },

  // ----------------------------------------------------------------------------------------
  // 4) Export
  // ----------------------------------------------------------------------------------------

  /**
   * Export-Limits (km pro Zoomstufe).
   * Ziel: Browser-Abstürze verhindern, wenn zu große Kartenausschnitte exportiert werden.
   */
  exportZoomLimitsKm: {
    12: 30,
    13: 25,
    14: 20,
    15: 15,
    16: 10,
    17: 8,
    18: 5,
  },

  // ----------------------------------------------------------------------------------------
  // 5) Farben
  // ----------------------------------------------------------------------------------------

  /**
   * Zentrale Farbpalette.
   * Änderung hier wirkt sich überall aus (Karte & Export), sofern die Werte dort genutzt werden.
   */
  colors: {
    station: "#ef4444", // Rot (Feuerwachen)
    hydrant: "#ef4444", // Rot (Standard-Hydranten)
    water: "#3b82f6", // Blau (Wasser/Zisternen/Teiche)
    defib: "#16a34a", // Grün (Defibrillatoren)

    rangeCircle: "#f97316", // Orange (100 m Radius-Kreis)
    selection: "#3b82f6", // Blau (Auswahl-Rechteck Export)
    bounds: "#333333", // Dunkelgrau (Standard)
    boundsSatellite: "#ffff00", // Gelb (für Satellit)

    textMain: "#0f172a", // Dunkelblau (Titel im Export)
    textSub: "#334155", // Grau-Blau (Datum/Footer im Export)
    bgHeader: "rgba(255, 255, 255, 0.98)", // Hintergrund für Header-Box
  },

  // ----------------------------------------------------------------------------------------
  // 6) Technische Steuerung / Performance
  // ----------------------------------------------------------------------------------------

  /**
   * Performance-/Robustheits-Parameter.
   * - overpassTimeoutMs: Timeout pro Overpass-Request
   * - overpassMaxRetries: wie oft ein Request erneut versucht wird (z.B. bei Timeout)
   * - moveDebounceMs: Entprellung bei Kartenbewegungen (verhindert Request-Stürme)
   * - cacheTtlMs: Cache-Gültigkeit (ms)
   */
  performance: {
    overpassTimeoutMs: 25000,
   overpassMaxRetries: 2,
   moveDebounceMs: 400,
    hydrantStatusShowDelayMs: 500,
    hydrantStatusSlowAfterMs: 6000,
    hydrantStatusSuccessDurationMs: 1600,
   cacheTtlMs: 5 * 60 * 1000, // 5 Minuten
  },
};
