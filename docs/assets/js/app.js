/**
 * ==========================================================================================
 * DATEI: app.js
 * ZWECK: Haupt-Einstiegspunkt der Anwendung
 * FIX: Korrekte Importe für State und Event-Handling
 * ==========================================================================================
 */

import { initMapLogic } from './map.js';
import { updatePageLanguage } from './i18n.js';
import { setupUI } from './ui.js';

// KORREKTUR: Wir müssen 'handleSelectionEvents' aus export.js holen...
import { handleSelectionEvents } from './export.js'; 
// ...und 'State' aus state.js (NICHT aus export.js!)
import { State } from './state.js'; 

document.addEventListener('DOMContentLoaded', () => {
    console.log("App startet...");
    
    // 1. Sprache initialisieren
    updatePageLanguage(); 
    
    // 2. UI (Buttons, Menüs) vorbereiten
    setupUI();            
    
    // 3. Karte starten
    initMapLogic();       
    
    // 4. WICHTIG: Auswahl-Rechteck für Export aktivieren
    // Nachdem initMapLogic() lief, existiert 'State.map'.
    // Jetzt hängen wir die Maus-Events an die Karte, damit das Ziehen funktioniert.
    if (State.map) {
         State.map.on('mousedown', (e) => handleSelectionEvents(e, 'down'));
         State.map.on('mousemove', (e) => handleSelectionEvents(e, 'move'));
         State.map.on('mouseup', (e) => handleSelectionEvents(e, 'up'));
    } else {
        console.error("Fehler: Karte wurde nicht initialisiert!");
    }
});