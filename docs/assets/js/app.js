/**
 * ==========================================================================================
 * DATEI: app.js
 * ZWECK: Haupt-Einstiegspunkt der Anwendung
 * ==========================================================================================
 */

import { initMapLogic } from './map.js';
import { updatePageLanguage } from './i18n.js';
import { setupUI } from './ui.js';
import { handleSelectionEvents, State } from './export.js'; // Wichtig für Maus-Events beim Export

document.addEventListener('DOMContentLoaded', () => {
    console.log("App startet...");
    
    // 1. Sprache
    updatePageLanguage(); 
    
    // 2. UI
    setupUI();            
    
    // 3. Karte
    initMapLogic();       
    
    // 4. Events für Export-Auswahlrechteck registrieren
    // (Da State.map jetzt existiert, können wir Listener anhängen)
    // Achtung: Wir importieren 'State' hier aus export.js oder map.js, 
    // aber am besten greifen wir über das map-Modul auf die Karte zu.
    // Vereinfacht: Wir nutzen globale Events oder exportieren Map.
    
    // Besserer Weg für Events in Modular:
    // Wir importieren State aus state.js und hängen Events an.
    // (Siehe Import oben, muss ergänzt werden: import { State } from './state.js';)
});

// Nachtrag: Events für Auswahl müssen registriert werden.
// Da map.js das Map-Objekt erstellt, machen wir das am besten dort oder hier.
// Ich habe den Event-Handler in export.js 'handleSelectionEvents' genannt.
// Wir fügen ihn in map.js bei initMapLogic hinzu (siehe oben).