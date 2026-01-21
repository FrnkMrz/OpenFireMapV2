/**
 * ==========================================================================================
 * DATEI: config.js
 * ZWECK: Zentrale Konfiguration
 * LERN-ZIEL: Verstehen von Konstanten und Konfigurations-Objekten.
 * ==========================================================================================
 * * Warum eine extra Datei?
 * Anstatt "Magische Zahlen" (wie Koordinaten oder URLs) überall im Code zu verstreuen,
 * sammeln wir sie hier. Wenn sich z.B. die Start-Position ändern soll, musst du nur
 * hier eine Zeile ändern, und die ganze App übernimmt das.
 */

// "export" bedeutet: Diese Variable darf von anderen Dateien benutzt (importiert) werden.
// "const" bedeutet: Dieser Wert ist fest und darf sich nicht während der Laufzeit ändern.
export const Config = {
    
    // Start-Koordinaten [Breitengrad, Längengrad] für Schnaittach.
    // Tipp: Du kannst diese Werte z.B. bei Google Maps ablesen (Rechtsklick -> "Was ist hier?").
    defaultCenter: [49.555, 11.350],
    
    // Zoom-Stufe beim Start. 
    // 1 = Ganze Welt, 10 = Stadt, 14 = Stadtteil, 18 = Hausnummer genau.
    defaultZoom: 14,

    // --- OVERPASS API SERVE (Daten-Quellen) ---
    // Das sind die Computer, die wir fragen: "Wo sind hier Hydranten?".
    // Wir speichern eine Liste (Array) von Servern. Wenn der erste "Besetzt" ist,
    // nimmt unser Skript automatisch den nächsten (siehe api.js).
    overpassEndpoints: [
        'https://overpass-api.de/api/interpreter',             // Hauptserver (Deutschland)
        'https://overpass.kumi.systems/api/interpreter',       // Sehr schneller Alternativ-Server
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter' // Backup-Server
    ],

    // Adresse für die Namens-Suche (Geocoding Service)
    nominatimUrl: 'https://nominatim.openstreetmap.org',

    // --- KARTEN-HINTERGRÜNDE (Layer) ---
    // Hier definieren wir, welche "Tapeten" (Kacheln) die Karte haben kann.
    // Jeder Eintrag besteht aus einer URL (Wo liegt das Bild?) und Copyright-Infos.
    layers: {
        voyager: {
            // {z} = Zoom, {x}/{y} = Position der Kachel
            url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            // WICHTIG: Das 'attr' (Attribution) ist HTML-Code für die Anzeige unten rechts im Browser (mit Links).
            attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            // 'textAttr' ist reiner Text für den PNG-Export (weil Bilder keine klickbaren Links haben können).
            textAttr: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18 // Wie tief darf man zoomen?
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
            maxZoom: 17 // Achtung: Topo-Karten gehen oft nicht so tief wie andere!
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
    
    // --- EXPORT SCHUTZ ---
    // Wenn man bei Zoom 12 (ganzer Landkreis) versucht, ein PNG zu machen,
    // würde der Browser abstürzen (Bild wäre 50.000 x 50.000 Pixel groß).
    // Deshalb begrenzen wir die erlaubte Breite in Kilometern.
    exportZoomLimitsKm: {
        12: 30, // Bei Zoom 12 darf der Ausschnitt max. 30km breit sein
        13: 25,
        14: 20,
        15: 15, 
        16: 10,
        17: 8,  
        18: 5   // Bei Zoom 18 (sehr detailliert) nur 5km
    }
};