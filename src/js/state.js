/**
 * ==========================================================================================
 * DATEI: state.js
 * ZWECK: Zentraler Speicher ("Gedächtnis") der App
 * LERN-ZIEL: Verstehen von "Shared State" (Geteilter Zustand).
 * ==========================================================================================
 * * Problem: Datei A lädt Daten, Datei B muss sie anzeigen. Wo legen wir die Daten hin?
 * Lösung: Wir schaffen hier einen zentralen Ort (Objekt), den ALLE Dateien kennen.
 * Das ist wie ein schwarzes Brett, auf das jeder Zettel hängen oder lesen kann.
 */

export const State = {
    // Hier speichern wir die "Leaflet Map Instance". 
    // Das ist das Herzstück der Karte, über das wir zoomen oder pannen können.
    map: null,
    userMarker: null, // HIER NEU: Speichert den pulsierenden Punkt
    userLocationTimer: null,

    // --- LAYER GRUPPEN (Folien) ---
    // Leaflet organisiert Dinge in "Layers". Wir nutzen Gruppen, um z.B. alle
    // Hydranten auf einmal ein- oder ausblenden zu können.
    markerLayer: null,      // Hier kommen die Icons (Hydranten, Wachen) rein
    boundaryLayer: null,    // Hier kommen die Gemeindegrenzen rein
    rangeLayerGroup: null,  // Hier kommt der orangene 100m Kreis rein
    
    // --- DATEN CACHE ---
    // Wenn wir Daten vom Server holen, speichern wir sie hier zwischen.
    // Warum? Wenn der Nutzer auf "Export PNG" klickt, müssen wir nicht nochmal
    // den Server fragen, sondern nehmen einfach die Daten, die wir schon haben.
    cachedElements: [],
    
    // Welcher Hintergrund ist gerade an? (Startwert: 'voyager')
    activeLayerKey: 'voyager',
    
    // --- EXPORT EINSTELLUNGEN ---
    // Hier merken wir uns, was der Nutzer im Export-Menü eingestellt hat.
    exportFormat: 'free',       // 'free' (Frei), 'a4l' (DIN A4 Quer), 'a4p' (DIN A4 Hoch)
    exportZoomLevel: 18,        // Wie scharf soll das Bild sein? (Zoom 18 = sehr scharf)
    
    // --- AUSWAHL WERKZEUG ---
    // Alles was passiert, wenn man auf "Ausschnitt wählen" klickt.
    selection: {
        active: false,      // Ist der Modus gerade an?
        rect: null,         // Das blaue Rechteck auf der Karte
        startPoint: null,   // Wo hat die Maus angefangen zu ziehen?
        finalBounds: null   // Das fertige Ergebnis (Koordinaten Nord/Süd/Ost/West)
    },

    // --- NETZWERK KONTROLLE ---
    // "AbortController" ist wie eine Notbremse für Internet-Anfragen.
    // Wenn der Nutzer schnell zoomt, brechen wir die alte (langsame) Anfrage ab,
    // damit die neue (wichtige) Anfrage sofort starten kann.
    controllers: {
        fetch: null,    // Für das Laden der Hydranten
        export: null    // Für den PNG Export Prozess
    }
};