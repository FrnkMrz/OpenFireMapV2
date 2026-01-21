/**
 * ==========================================================================================
 * DATEI: state.js
 * ZWECK: Globaler Zustandsspeicher (State Management)
 * BESCHREIBUNG:
 * In Modulen gibt es keine "globalen Variablen" mehr, die einfach so überall herumfliegen.
 * Das ist gut, weil es Chaos verhindert.
 * Stattdessen speichern wir alles, was wir uns merken müssen (z.B. "Ist die Karte gerade geladen?"),
 * sauber in diesem `State`-Objekt.
 * ==========================================================================================
 */

export const State = {
    // Das Leaflet-Karten-Objekt (wird beim Start erstellt)
    map: null,                  
    
    // Layer-Gruppen (Folien), auf die wir Dinge zeichnen
    markerLayer: null,          // Für Hydranten & Wachen Icons
    boundaryLayer: null,        // Für Gemeindegrenzen (gestrichelte Linien)
    rangeLayerGroup: null,      // Für den orangenen 100m Kreis
    
    // Zwischenspeicher für geladene OSM-Daten
    // Damit wir beim Export nicht nochmal alles neu laden müssen.
    cachedElements: [],         
    
    // Welcher Hintergrund ist gerade aktiv? (Standard: 'voyager')
    activeLayerKey: 'voyager',  
    
    // Export-Einstellungen, die der Nutzer gewählt hat
    exportFormat: 'free',       // 'free', 'a4l' (Quer), 'a4p' (Hoch)
    exportZoomLevel: 18,        // Gewünschte Qualität
    
    // Status für das Auswahl-Rechteck beim Export
    selection: {
        active: false,      // Ist der Auswahl-Modus gerade an?
        rect: null,         // Das gezeichnete Rechteck auf der Karte
        startPoint: null,   // Wo hat der Nutzer angefangen zu ziehen?
        finalBounds: null   // Das fertige Ergebnis (Koordinaten)
    },

    // AbortController: "Notbremsen" für Internet-Anfragen
    // Damit können wir laufende Ladevorgänge abbrechen, wenn der Nutzer
    // z.B. wild auf der Karte herumschiebt.
    controllers: {
        fetch: null,    // Für das Laden der Icons
        export: null    // Für den PNG Export
    }
};