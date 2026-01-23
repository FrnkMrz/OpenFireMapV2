/**
 * ==========================================================================================
 * DATEI: config.js
 * ZWECK: Zentrale Konfiguration (URLs, Farben, Zoom-Stufen)
 * LERN-ZIEL: Vermeidung von "Magic Numbers" im Code durch zentrale Steuerung.
 * ==========================================================================================
 */

export const Config = {
    
    // --- START-POSITION ---
    // Wo soll die Karte beim ersten Laden starten? (Schnaittach)
    defaultCenter: [49.555, 11.350],
    
    // --- ZOOM-EINSTELLUNGEN ---
    defaultZoom: 14,      // Standard-Zoom beim Laden
    searchZoom: 14,       // NEU: Zoom-Stufe, auf die bei einer Suche gesprungen wird
    locateZoom: 17,       // NEU: Zoom-Stufe für die GPS-Standortbestimmung

    // --- DATEN-QUELLEN (Overpass API) ---
    // Wir nutzen mehrere Server als Backup, falls einer langsam ist oder ausfällt.
    overpassEndpoints: [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ],

    // --- GEODIENSTE ---
    nominatimUrl: 'https://nominatim.openstreetmap.org',

    // --- KARTEN-HINTERGRÜNDE (Layers) ---
    // 'attr' ist für die Webseite (mit HTML-Links)
    // 'textAttr' ist für den Export (reiner Text für das PNG)
    layers: {
        voyager: {
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
            textAttr: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18
        },
        positron: {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
            textAttr: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18
        },
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
            textAttr: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 17
        },
        topo: {
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attr: 'Daten: &copy; <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>-Mitwirkende, SRTM | Darstellung: &copy; <a href="http://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
            textAttr: 'Daten: © OpenStreetMap-Mitwirkende, SRTM | Darstellung: © OpenTopoMap (CC-BY-SA)',
            maxZoom: 17
        },
        osm: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
            textAttr: '© OpenStreetMap contributors',
            maxZoom: 18
        },
        osmde: {
            url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
            textAttr: '© OpenStreetMap contributors',
            maxZoom: 18
        }
    },
    
    // --- EXPORT-EINSTELLUNGEN ---
    // Maximale Breite in Kilometern pro Zoomstufe, um Browser-Abstürze zu verhindern.
    exportZoomLimitsKm: {
        12: 30, 13: 25, 14: 20, 15: 15, 16: 10, 17: 8, 18: 5
    },

    // --- ZENTRALE FARBPALETTE ---
    // Ändere eine Farbe hier, und sie ändert sich überall (Karte & Export).
    colors: {
        station: '#ef4444',       // Rot (Feuerwachen)
        hydrant: '#ef4444',       // Rot (Standard Hydranten)
        water: '#3b82f6',         // Blau (Wasser/Zisternen/Teiche)
        defib: '#16a34a',         // Grün (Defibrillatoren)
        
        rangeCircle: '#f97316',   // Orange (100m Radius Kreis)
        selection: '#3b82f6',     // Blau (Auswahl-Rechteck Export)
        bounds: '#333333',        // Dunkelgrau (Gemeindegrenzen)
        
        textMain: '#0f172a',      // Dunkelblau (Titel im Export)
        textSub: '#334155',       // Grau-Blau (Datum/Footer im Export)
        bgHeader: 'rgba(255, 255, 255, 0.98)' // Weißer Kasten Hintergrund
    }
}; // WICHTIG: Dieses Semikolon beendet das Objekt.
