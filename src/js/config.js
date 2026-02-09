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
  searchZoom: 14,
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
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  ],

  /**
   * Nominatim Basis-URL (Geocoding / Suche).
   * Hinweis: Nominatim hat Nutzungsrichtlinien (Rate-Limits, User-Agent/Referer etc.).
   */
  nominatimUrl: "https://nominatim.openstreetmap.org",

  // ----------------------------------------------------------------------------------------
  // 3) Basemap-Layer
  // ----------------------------------------------------------------------------------------

  /**
   * Karten-Hintergründe (Basemaps).
   * - url: Tile-URL-Template
   * - attr: Attribution für die Webseite (HTML erlaubt)
   * - textAttr: Attribution für Export (Plain Text)
   * - maxZoom: Maximaler Zoom der Basemap
   */
  layers: {
    voyager: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attr:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
        '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      textAttr: "© OpenStreetMap contributors, © CARTO",
      maxZoom: 18,
    },
    positron: {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attr:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
        '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      textAttr: "© OpenStreetMap contributors, © CARTO",
      maxZoom: 18,
    },
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
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
      maxZoom: 17,
    },
    topo: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attr:
        'Daten: &copy; <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>-Mitwirkende, SRTM | ' +
        'Darstellung: &copy; <a href="http://opentopomap.org">OpenTopoMap</a> ' +
        '(<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      textAttr: "Daten: © OpenStreetMap-Mitwirkende, SRTM | Darstellung: © OpenTopoMap (CC-BY-SA)",
      maxZoom: 17,
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
    cacheTtlMs: 5 * 60 * 1000, // 5 Minuten
  },
};
