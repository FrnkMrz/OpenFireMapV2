/**
 * ==========================================================================================
 * DATEI: ui.js
 * ZWECK: Benutzerinterface Steuerung
 * BESCHREIBUNG:
 * Hier steuern wir alles, was man anklicken kann:
 * - Menüs öffnen/schließen
 * - Suche
 * - Standort finden
 * - Fehlermeldungen anzeigen
 * - Testen
 * ==========================================================================================
 */

import { State } from './state.js';
import { t } from './i18n.js';
import { setExportFormat, setExportZoom, startSelection, exportAsPNG, exportAsGPX, cancelExport } from './export.js';
import { setBaseLayer } from './map.js';

// Zeigt eine Nachricht (Notification) oben rechts an
export function showNotification(msg, duration = 3000) {
    const box = document.getElementById('notification-box');
    if (!box) return;
    box.innerText = msg;
    box.style.display = 'block';
    
    // Alten Timer löschen, falls einer läuft
    if(box.hideTimeout) clearTimeout(box.hideTimeout);
    
    // Ausblenden nach X Millisekunden
    box.hideTimeout = setTimeout(() => box.style.display = 'none', duration); 
}

// Schließt alle Menüs (wird aufgerufen, bevor ein neues Menü geöffnet wird)
export function closeAllMenus() {
    ['layer-menu', 'export-menu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const legal = document.getElementById('legal-modal');
    if(legal) legal.style.display = 'none';
    
    // ARIA Attribute zurücksetzen (für Barrierefreiheit)
    document.querySelectorAll('[aria-expanded="true"]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
}

export function toggleLayerMenu() {
    const menu = document.getElementById('layer-menu');
    const isHidden = menu.classList.contains('hidden');
    closeAllMenus();
    if (isHidden) {
        menu.classList.remove('hidden');
        document.getElementById('layer-btn-trigger')?.setAttribute('aria-expanded', 'true');
    }
}

export function toggleExportMenu() {
    const menu = document.getElementById('export-menu');
    const isHidden = menu.classList.contains('hidden');
    closeAllMenus();
    if (isHidden) {
        menu.classList.remove('hidden');
        document.getElementById('export-btn-trigger')?.setAttribute('aria-expanded', 'true');
        // Export UI zurücksetzen (Fortschrittsbalken ausblenden)
        document.getElementById('export-setup')?.classList.remove('hidden');
        document.getElementById('export-progress')?.classList.add('hidden');
    }
}

export function toggleLegalModal() {
    const modal = document.getElementById('legal-modal');
    const isVisible = modal.style.display === 'flex';
    closeAllMenus();
    if (!isVisible) {
        modal.style.display = 'flex';
        document.getElementById('btn-legal-trigger')?.setAttribute('aria-expanded', 'true');
    }
}

// Ortssuche (Nominatim API)
export function searchLocation() {
    const input = document.getElementById('search-input');
    const q = input.value;
    if (!q) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => {
            if(d.length) {
                State.map.flyTo([d[0].lat, d[0].lon], 18); // Hinfliegen
            } else {
                showNotification("Ort nicht gefunden!");
            }
        });
}

// GPS Standort
export function locateUser() {
    if (!navigator.geolocation) { showNotification(t('geo_error')); return; }
    
    const btn = document.getElementById('locate-btn');
    const icon = btn ? btn.querySelector('svg') : null;
    if(icon) icon.classList.add('animate-spin'); // Ladeanimation

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            State.map.flyTo([latitude, longitude], 18, { animate: true, duration: 1.5 });
            if(icon) icon.classList.remove('animate-spin');
            showNotification(t('geo_found'));
        },
        (err) => {
            console.warn("Geolocation Fehler:", err);
            if(icon) icon.classList.remove('animate-spin');
            showNotification(t('geo_fail'));
        },
        { enableHighAccuracy: true, timeout: 5000 }
    );
}

// Initialisiert alle Event Listener beim Start
export function setupUI() {
    // Buttons mit Funktionen verknüpfen
    document.getElementById('layer-btn-trigger').onclick = toggleLayerMenu;
    document.getElementById('export-btn-trigger').onclick = toggleExportMenu;
    document.getElementById('btn-legal-trigger').onclick = toggleLegalModal;
    
    // Suche bei Enter-Taste
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation();
    });
    // Suche Button
    document.querySelector('#search-input + button').onclick = searchLocation;
    
    document.getElementById('locate-btn').onclick = locateUser;

    // Layer Buttons
    ['voyager', 'positron', 'dark', 'satellite', 'topo', 'osm', 'osmde'].forEach(key => {
        const btn = document.getElementById(`btn-${key}`);
        if(btn) btn.onclick = () => setBaseLayer(key);
    });

    // Export Buttons
    ['free', 'a4l', 'a4p'].forEach(fmt => {
        const btn = document.getElementById(`fmt-${fmt}`);
        if(btn) btn.onclick = () => setExportFormat(fmt);
    });
    
    [15, 16, 17, 18].forEach(z => {
        const btn = document.getElementById(`zoom-${z}`);
        if(btn) btn.onclick = () => setExportZoom(z);
    });

    document.getElementById('select-btn').onclick = startSelection;
    document.getElementById('png-btn').onclick = exportAsPNG;
    document.getElementById('gpx-btn').onclick = exportAsGPX;
    document.querySelector('#export-progress button').onclick = cancelExport;

    // Auto-Close Logik (Menüs schließen nach 10s)
    setupMenuAutoClose();
}

function setupMenuAutoClose() {
    ['layer-menu', 'export-menu', 'legal-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        let closeTimer = null;
        el.addEventListener('mouseleave', () => {
            const isHidden = id === 'legal-modal' ? (el.style.display === 'none') : el.classList.contains('hidden');
            if (isHidden) return;
            closeTimer = setTimeout(() => {
                if (id === 'legal-modal') el.style.display = 'none';
                else el.classList.add('hidden');
            }, 10000);
        });
        el.addEventListener('mouseenter', () => {
            if (closeTimer) clearTimeout(closeTimer);
        });
    });
}