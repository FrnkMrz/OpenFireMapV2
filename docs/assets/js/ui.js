/**
 * ==========================================================================================
 * DATEI: ui.js (SAFE MODE)
 * ZWECK: UI Steuerung (Stürzt nicht ab, wenn HTML fehlt)
 * ==========================================================================================
 */
import { State } from './state.js';
import { t } from './i18n.js';
import { setExportFormat, setExportZoom, startSelection, exportAsPNG, exportAsGPX, cancelExport } from './export.js';
import { setBaseLayer } from './map.js';

// Helfer: Klick-Event nur hinzufügen, wenn Element existiert
function addClick(id, fn) {
    const el = document.getElementById(id);
    if (el) {
        el.onclick = fn;
    } else {
        console.warn(`ACHTUNG: Button mit ID '${id}' fehlt im HTML!`);
    }
}

export function showNotification(msg, duration = 3000) {
    const box = document.getElementById('notification-box');
    if (!box) return;
    box.innerText = msg;
    box.style.display = 'block';
    if(box.hideTimeout) clearTimeout(box.hideTimeout);
    box.hideTimeout = setTimeout(() => box.style.display = 'none', duration); 
}

export function closeAllMenus() {
    ['layer-menu', 'export-menu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const legal = document.getElementById('legal-modal');
    if(legal) legal.style.display = 'none';
    
    // ARIA zurücksetzen
    const layerBtn = document.getElementById('layer-btn-trigger');
    if(layerBtn) layerBtn.setAttribute('aria-expanded', 'false');
    const expBtn = document.getElementById('export-btn-trigger');
    if(expBtn) expBtn.setAttribute('aria-expanded', 'false');
}

export function toggleLayerMenu() {
    const menu = document.getElementById('layer-menu');
    if(!menu) return;
    const isHidden = menu.classList.contains('hidden');
    closeAllMenus();
    if (isHidden) {
        menu.classList.remove('hidden');
        document.getElementById('layer-btn-trigger')?.setAttribute('aria-expanded', 'true');
    }
}

export function toggleExportMenu() {
    const menu = document.getElementById('export-menu');
    if(!menu) return;
    const isHidden = menu.classList.contains('hidden');
    closeAllMenus();
    if (isHidden) {
        menu.classList.remove('hidden');
        document.getElementById('export-btn-trigger')?.setAttribute('aria-expanded', 'true');
        document.getElementById('export-setup')?.classList.remove('hidden');
        document.getElementById('export-progress')?.classList.add('hidden');
    }
}

export function toggleLegalModal() {
    const modal = document.getElementById('legal-modal');
    if(!modal) return;
    const isVisible = modal.style.display === 'flex';
    closeAllMenus();
    if (!isVisible) {
        modal.style.display = 'flex';
    }
}

export function searchLocation() {
    const input = document.getElementById('search-input');
    if (!input || !input.value) return;
    const q = input.value;
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => {
            if(d.length && State.map) {
                State.map.flyTo([d[0].lat, d[0].lon], 18);
            } else {
                showNotification(t('no_results') || "Nicht gefunden");
            }
        });
}

export function locateUser() {
    if (!navigator.geolocation) { showNotification("GPS Fehler"); return; }
    
    const btn = document.getElementById('locate-btn');
    const icon = btn ? btn.querySelector('svg') : null;
    if(icon) icon.classList.add('animate-spin');

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            if(State.map) State.map.flyTo([pos.coords.latitude, pos.coords.longitude], 18);
            if(icon) icon.classList.remove('animate-spin');
            showNotification(t('geo_found') || "Gefunden!");
        },
        (err) => {
            if(icon) icon.classList.remove('animate-spin');
            showNotification("GPS Fehler");
        }
    );
}

export function setupUI() {
    // Buttons mit Funktionen verknüpfen (Sicher)
    addClick('layer-btn-trigger', toggleLayerMenu);
    addClick('export-btn-trigger', toggleExportMenu);
    addClick('btn-legal-trigger', toggleLegalModal);
    addClick('legal-close-btn', toggleLegalModal);
    addClick('export-close-btn', toggleExportMenu);
    
    // Suche
    const searchInp = document.getElementById('search-input');
    if (searchInp) {
        searchInp.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchLocation();
        });
    }
    addClick('search-btn', searchLocation); // Neuer ID für Search Button
    addClick('locate-btn', locateUser);

    // Layer Buttons
    ['voyager', 'positron', 'dark', 'satellite', 'topo', 'osm', 'osmde'].forEach(key => {
        addClick(`btn-${key}`, () => setBaseLayer(key));
    });

    // Export Buttons
    ['free', 'a4l', 'a4p'].forEach(fmt => {
        addClick(`fmt-${fmt}`, () => setExportFormat(fmt));
    });
    
    [15, 16, 17, 18].forEach(z => {
        addClick(`zoom-${z}`, () => setExportZoom(z));
    });

    addClick('select-btn', startSelection);
    addClick('png-btn', exportAsPNG);
    addClick('gpx-btn', exportAsGPX);
    addClick('cancel-export-btn', cancelExport);

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