/**
 * ==========================================================================================
 * DATEI: config.js
 * ZWECK: Zentrale Konfiguration und Einstellungen
 * BESCHREIBUNG:
 * Hier werden alle Werte gespeichert, die sich nicht während der Laufzeit ändern,
 * aber vielleicht später mal angepasst werden müssen (z.B. URLs, Farben, Limits).
 * * WARUM EINE EIGENE DATEI?
 * Wenn sich eine URL ändert, müssen wir nicht im tiefen Code suchen, sondern 
 * ändern es nur hier an einer Stelle.
 * ==========================================================================================
 */

export const Config = {
    // Start-Position der Karte (Koordinaten für Schnaittach)
    // Format: [Breitengrad (Lat), Längengrad (Lon)]
    defaultCenter: [49.555, 11.350],
    
    // Standard-Zoomstufe beim Start (14 ist gut für eine Ortsübersicht)
    defaultZoom: 14,

    // Server-Adressen für die Overpass-API (Datenabfrage)
    // Wir nutzen eine Liste, damit wir wechseln können, falls ein Server ausfällt.
    overpassEndpoints: [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
    ],
    
    // Adresse für die Ortssuche (Geocoding)
    nominatimUrl: 'https://nominatim.openstreetmap.org',

    // Konfiguration der verschiedenen Karten-Hintergründe (Layer)
    // Jeder Eintrag hat eine URL (woher kommen die Bilder?) und 
    // einen Copyright-Hinweis (Attribution).
    layers: {
        voyager: {
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attr: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 18 // Wie weit darf man hineinzoomen?
        },
        positron: {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attr: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 18
        },
        dark: {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attr: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 18
        },
        satellite: {
            // Satellitenbilder kommen von Esri
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attr: 'Tiles &copy; Esri &mdash; Source: Esri et al.',
            maxZoom: 18
        },
        topo: {
            // Topographische Karte (Höhenlinien etc.)
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attr: 'Daten: OSM, SRTM | Darstellung: OpenTopoMap',
            maxZoom: 17 // Achtung: Dieser Server hat oft weniger Zoom-Stufen!
        },
        osm: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attr: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        },
        osmde: {
            // Deutscher Stil (beschriftet in Deutsch, andere Farben)
            url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
            attr: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        }
    },
    
    // Sicherheits-Limits für den PNG Export
    // Damit der Browser nicht abstürzt, begrenzen wir die Größe des 
    // exportierten Gebiets in Kilometern (km), abhängig vom Zoom-Level.
    exportZoomLimitsKm: {
        12: 30, // Bei Zoom 12 darf man 30km x 30km exportieren
        13: 25,
        14: 20,
        15: 15, 
        16: 10,
        17: 8,  
        18: 5   // Bei Zoom 18 (sehr detailliert) nur noch 5km
    }
};