/**
 * ==========================================================================================
 * DATEI: app.js
 * ZWECK: Haupt-Einstiegspunkt der Anwendung
 * ==========================================================================================
 */

import { initMapLogic } from './map.js';
import { updatePageLanguage } from './i18n.js';
import { setupUI } from './ui.js';

// NEU: Wir importieren jetzt die Init-Funktion statt der einzelnen Events
import { initSelectionLogic } from './export.js'; 
import { State } from './state.js'; 

document.addEventListener('DOMContentLoaded', () => {
    console.log("App startet...");
    
    // 1. Sprache initialisieren
    updatePageLanguage(); 
    
    // 2. UI (Buttons, Menüs) vorbereiten
    setupUI();            
    
    // 3. Karte starten
    initMapLogic();       
    
    // 4. CLEANUP ERLEDIGT: Export-Logik initialisieren
    // Wir rufen nur noch die Funktion auf. Die app.js muss nicht mehr wissen,
    // wie das Auswahl-Rechteck technisch funktioniert.
    if (State.map) {
        initSelectionLogic();
    } else {
        console.error("Fehler: Karte wurde nicht initialisiert!");
    }
});