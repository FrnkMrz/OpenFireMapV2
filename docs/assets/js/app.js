/**
 * ==========================================================================================
 * DATEI: app.js
 * ZWECK: Haupt-Einstiegspunkt
 * ==========================================================================================
 */

// KORREKTUR: "State" entfernt, da es hier nicht gebraucht wird.
// Wir importieren nur die Start-Funktion aus map.js
import { initMapLogic } from './map.js'; 

// Importiere Sprach-Funktionen (Achte darauf, dass die Datei so heißt!)
// Falls du deine Datei 'translations.js' genannt hast, ändere den Pfad hier in './translations.js'
import { updatePageLanguage } from './i18n.js'; 

// Importiere UI-Funktionen
import { setupUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("App wird gestartet...");
    
    // 1. Sprache setzen
    updatePageLanguage(); 
    
    // 2. UI vorbereiten (Buttons aktivieren)
    setupUI();            
    
    // 3. Karte starten
    initMapLogic();       
});