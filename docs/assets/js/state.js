/**
 * ==========================================================================================
 * DATEI: state.js (Das Gedächtnis der Anwendung)
 * ZWECK: Zentraler Speicher für alle Daten, die wir uns merken müssen.
 * ==========================================================================================
 * * LERN-HINWEIS:
 * In einer modularen App können wir Variablen nicht einfach "irgendwo" hinlegen.
 * Wenn api.js Daten lädt, muss map.js darauf zugreifen können.
 * Deshalb erstellen wir hier einen "Container" (das Objekt State), den alle anderen
 * Dateien importieren und nutzen dürfen.
 */

export const State = {
    // 1. KARTEN-OBJEKTE
    // Hier speichern wir die Leaflet-Karte, sobald sie erstellt wurde.
    map: null,
    
    // "LayerGroups" sind wie transparente Folien auf der Karte.
    // Wir trennen Marker, Grenzen und den Radius-Kreis auf verschiedene Folien.
    markerLayer: null,      
    boundaryLayer: null,    
    rangeLayerGroup: null,  
    
    // 2. DATEN-CACHE
    // Hier merken wir uns die geladenen Hydranten & Wachen.
    // Wichtig für den Export: Wir müssen nicht alles neu laden, sondern nehmen es von hier.
    cachedElements: [],
    
    // Welches Design ist gerade aktiv? (z.B. 'voyager', 'satellite')
    activeLayerKey: 'voyager',
    
    // 3. EXPORT-EINSTELLUNGEN
    // Was hat der Nutzer im Export-Menü ausgewählt?
    exportFormat: 'free',       // 'free', 'a4l' (Quer), 'a4p' (Hoch)
    exportZoomLevel: 18,        // Wie detailliert soll das Bild sein?
    
    // 4. AUSWAHL-WERKZEUG (Rechteck ziehen)
    selection: {
        active: false,      // Ist der Auswahl-Modus gerade an?
        rect: null,         // Das gezeichnete Rechteck auf der Karte
        startPoint: null,   // Wo hat die Maus angefangen zu ziehen?
        finalBounds: null   // Das fertige Ergebnis (Koordinaten)
    },

    // 5. ABBRUCH-CONTROLLER (Die "Notbremse")
    // Damit können wir laufende Internet-Anfragen abbrechen.
    controllers: {
        fetch: null,    // Für das Laden der Daten (Overpass)
        export: null    // Für den PNG Export Prozess
    }
};