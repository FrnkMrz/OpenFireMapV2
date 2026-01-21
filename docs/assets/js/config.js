/**
 * ==========================================================================================
 * DATEI: config.js
 * ZWECK: Zentrale Konfiguration (URLs, Farben, Einstellungen)
 * LERN-ZIEL: Wie man "Magic Numbers" und feste Werte in einer Datei sammelt (Wartbarkeit).
 * ==========================================================================================
 */

export const Config = {
    
    // START-POSITION
    // Wo soll die Karte starten, wenn man die Seite lädt?
    // [Breitengrad (Lat), Längengrad (Lon)] -> Schnaittach
    defaultCenter: [49.555, 11.350],
    
    // START-ZOOM
    // 14 = Stadtteil-Ebene (man sieht Straßen, aber noch keine Hausnummern)
    defaultZoom: 14,

    // DATEN-QUELLEN (Overpass API)
    // Hier fragen wir nach Hydranten. Wir haben mehrere Server als Backup.
    overpassEndpoints: [
        'https://overpass-api.de/api/interpreter',             // Hauptserver
        'https://overpass.kumi.systems/api/interpreter',       // Backup 1
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter' // Backup 2
    ],

    // ORTS-SUCHE (Geocoding)
    // Um Adressen in Koordinaten umzuwandeln (und andersherum für den Titel).
    nominatimUrl: 'https://nominatim.openstreetmap.org',

    // KARTEN-HINTERGRÜNDE (Layers)
    // attr: HTML-Copyright für die Webseite (mit Links)
    // textAttr: Reiner Text für das PNG-Bild (ohne Links)
    layers: {
        voyager: {
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            textAttr: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18
        },
        positron: {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            textAttr: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18
        },
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            textAttr: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attr: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            textAttr: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS Community',
            maxZoom: 18
        },
        topo: {
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attr: 'Daten: &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende, SRTM | Darstellung: &copy; <a href="http://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
            textAttr: 'Daten: © OpenStreetMap-Mitwirkende, SRTM | Darstellung: © OpenTopoMap (CC-BY-SA)',
            maxZoom: 17 // Topo geht oft nicht tiefer als 17
        },
        osm: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            textAttr: '© OpenStreetMap contributors',
            maxZoom: 18
        },
        osmde: {
            url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            textAttr: '© OpenStreetMap contributors',
            maxZoom: 18
        }
    },
    
    // EXPORT-SICHERHEIT
    // Verhindert, dass der Browser abstürzt, weil jemand versucht, ganz Deutschland als PNG zu speichern.
    // Maximale Breite in Kilometern pro Zoomstufe.
    exportZoomLimitsKm: {
        12: 30, 
        13: 25, 
        14: 20, 
        15: 15, 
        16: 10, 
        17: 8,  
        18: 5
    },

    // ZENTRALE FARBPALETTE
    // Hier definieren wir alle Farben an einem Ort.
    // Das macht es leicht, später das Design zu ändern.
    colors: {
        // Infrastruktur
        station: '#ef4444',       // Rot (Feuerwachen)
        hydrant: '#ef4444',       // Rot (Standard Hydranten)
        water: '#3b82f6',         // Blau (Wasser/Zisternen/Teiche)
        defib: '#16a34a',         // Grün (Defibrillatoren)
        
        // Karte & Tools
        rangeCircle: '#f97316',   // Orange (100m Radius Kreis)
        selection: '#3b82f6',     // Blau (Auswahl-Rechteck Export)
        bounds: '#333333',        // Dunkelgrau (Gemeindegrenzen)
        
        // Export Design (Header & Footer)
        textMain: '#0f172a',      // Dunkelblau (Titel)
        textSub: '#334155',       // Grau-Blau (Datum/Footer)
        bgHeader: 'rgba(255, 255, 255, 0.98)' // Weißer Kasten (Hintergrund)
    }
    export const Config = {
    // START-POSITION
    defaultCenter: [49.555, 11.350],
    
    // ZOOM-EINSTELLUNGEN
    defaultZoom: 14,      // Zoom beim ersten Laden der Seite
    searchZoom: 14,       // NEU: Zoom-Stufe nach einer erfolgreichen Suche
    
    // ... Rest der Konfiguration bleibt gleich ...
};