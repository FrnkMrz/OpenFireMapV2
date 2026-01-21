/**
 * ==========================================================================================
 * DATEI: app.js
 * ZWECK: Haupt-Einstiegspunkt
 * BESCHREIBUNG:
 * Diese Datei wird von der index.html geladen. 
 * Sie importiert alle anderen Module und startet die Anwendung.
 * ==========================================================================================
 */

import { initMapLogic, State } from './map.js';
import { updatePageLanguage } from './i18n.js';
import { setupUI } from './ui.js';
import { handleSelectionEvents } from './export.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sprache setzen
    updatePageLanguage(); 
    
    // 2. UI vorbereiten (Buttons aktivieren)
    setupUI();            
    
    // 3. Karte starten
    initMapLogic();       
    
    // 4. Auswahl-Rechteck Events registrieren
    // (Da Leaflet erst jetzt initialisiert ist)
    State.map.on('mousedown', (e) => handleSelectionEvents(e, 'down'));
    State.map.on('mousemove', (e) => handleSelectionEvents(e, 'move'));
    State.map.on('mouseup', (e) => handleSelectionEvents(e, 'up'));
});