/**
 * ==========================================================================================
 * DATEI: config.js (Die Einstellungen)
 * LERN-ZIEL: Zentrale Konfiguration
 * ==========================================================================================
 * * In dieser Datei speichern wir alle Werte, die sich während der Laufzeit der App
 * NICHT ändern (sogenannte Konstanten).
 * * Vorteil: Wenn wir z.B. die Start-Position der Karte ändern wollen, müssen wir
 * nicht im komplizierten Code suchen, sondern ändern es einfach hier oben.
 * * "export const": Macht diese Variable für andere Dateien verfügbar.
 */

export const Config = {
    // Start-Position der Karte: [Breitengrad, Längengrad] (Koordinaten für Schnaittach)
    defaultCenter: [49.555, 11.350],
    
    // Wie nah soll beim Start hereingezoomt werden? (Kleiner = Weltraum, Größer = Haus)
    defaultZoom: 14,

    // LISTE DER SERVER (API Endpunkte)
    // Wir fragen diese Server nach den Hydranten-Daten.
    // Wir nutzen eine Liste (Array), damit wir Alternativen haben, falls einer ausfällt.
    overpassEndpoints: [
        'https://overpass-api.de/api/interpreter',             // Hauptserver (Deutschland)
        'https://overpass.kumi.systems/api/interpreter',       // Starker Alternativserver
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter' // Backup
    ],

    // Adresse für die Ortssuche (Wenn du oben links einen Städtenamen eingibst)
    nominatimUrl: 'https://nominatim.openstreetmap.org',

    // KARTEN-HINTERGRÜNDE (Layer)
    // Hier definieren wir, welche Kacheln (Tiles) geladen werden sollen.
    // {z} = Zoomstufe, {x}/{y} = Koordinaten der Kachel
    layers: {
        voyager: {
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attr: '&copy; OpenStreetMap contributors &copy; CARTO', // Urheberrechtshinweis
            maxZoom: 18 // Wie tief darf man zoomen?
        },
        positron: {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attr: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 18
        },
        dark: { // Dunkler Modus (gut für Nachts)
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            attr: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 18
        },
        satellite: { // Satellitenbilder
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attr: 'Tiles &copy; Esri &mdash; Source: Esri et al.',
            maxZoom: 18
        },
        topo: { // Topographische Karte (Höhenlinien) - Achtung: Geht oft nur bis Zoom 17!
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attr: 'Daten: OSM, SRTM | Darstellung: OpenTopoMap',
            maxZoom: 17
        },
        osm: { // Das klassische OpenStreetMap Aussehen
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attr: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        },
        osmde: { // Deutscher Stil (Beschriftungen in Deutsch)
            url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
            attr: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        }
    },
    
    // EXPORT LIMITS
    // Um den Browser nicht abstürzen zu lassen, erlauben wir bei niedrigen Zoomstufen
    // (wo man viel Fläche sieht) nur kleine Export-Bereiche.
    exportZoomLimitsKm: {
        12: 30, // Bei Zoom 12 max. 30km Breite
        13: 25,
        14: 20,
        15: 15, 
        16: 10,
        17: 8,  
        18: 5   // Bei Zoom 18 (sehr detailliert) nur 5km
    }
};