/**
 * ==========================================================================================
 * DATEI: ui.js (Benutzeroberfläche)
 * ZWECK: Verknüpft die HTML-Buttons mit den JavaScript-Funktionen.
 * LERN-ZIEL: DOM-Manipulation & Event-Handling verstehen.
 * ==========================================================================================
 * * Diese Datei ist der "Vermittler". Wenn der Nutzer klickt, sagt diese Datei
 * den anderen Modulen (map.js, export.js) Bescheid, was zu tun ist.
 */

import { State } from './state.js';
import { Config } from './config.js';
import { t } from './i18n.js';
import { APP_VERSION } from './version.js';
import { clearCache, isCacheDisabled } from './cache.js';
import { initDataStatusUI, closeDataInfoPopover } from './data-status.js';

// Lazy-Loader: export.js (inkl. jspdf + html2canvas) wird erst bei Bedarf geladen.
// Das spart ~70 KB gzipped bei jedem App-Start.
let _exportModule = null;
async function getExport() {
    if (!_exportModule) _exportModule = await import('./export.js');
    return _exportModule;
}
// Wir importieren die Karten-Funktion zum Wechseln des Hintergrunds
import { setBaseLayer, clearDistanceLine, drawLineToNearest, shareMap, moveMapTo, getObjectsInView, focusMapObject } from './map.js';

// ...

// Hilfsfunktion: Button -> Dialog -> Export (lazy)
const withTitleConfirm = (lazyFnName) => () => openTitleConfirmation(lazyFnName);
let pendingExportAction = null;

function closeExportTitleModal() {
    document.getElementById('export-title-modal')?.classList.add('hidden');
}

function openTitleConfirmation(exportFnName) {
    // 0. Daten-Check: Haben wir überhaupt Hydranten?
    if (!State.cachedElements || State.cachedElements.length === 0) {
        showNotification(t('no_objects'), 3000, 'warning');
        return;
    }

    // Lazy: Die eigentliche Export-Funktion wird erst bei "OK" geladen
    pendingExportAction = async () => {
        const m = await getExport();
        m[exportFnName]();
    };

    // 1. Export-Menü schließen
    const exportMenu = document.getElementById('export-menu');
    if (exportMenu) exportMenu.classList.add('hidden');

    // 2. Dialog öffnen
    const modal = document.getElementById('export-title-modal');
    if (modal) {
        modal.classList.remove('hidden');

        // 3. Titel vorladen (Logik hierhin verschoben)
        const input = document.getElementById('export-confirm-title');
        if (input) {
            // IMMER neu laden, damit es zum aktuellen Ausschnitt passt (User-Feedback)
            input.value = "";
            input.placeholder = "Lade Ortsnamen...";

            // Vorbefüllen des Ortsnamens für den Export-Dialog
            // NEU: Wenn eine Auswahl (Selection) aktiv ist, nehmen wir das Zentrum DIESER Auswahl.
            // Sonst nehmen wir das Zentrum der Karte.
            let centerLat = 0;
            let centerLng = 0;

            if (State.selection.finalBounds) {
                const selCenter = State.selection.finalBounds.getCenter();
                centerLat = selCenter.lat;
                centerLng = selCenter.lng;
            } else if (State.map) {
                const mapCenter = State.map.getCenter();
                centerLat = mapCenter.lat;
                centerLng = mapCenter.lng;
            }

            if (centerLat && centerLng) {
                getExport().then(m => {
                    m.fetchLocationTitle(centerLat, centerLng).then(city => {
                        if (city) {
                            input.value = `Ort- und Hydrantenplan ${city}`;
                        } else {
                            input.placeholder = "Titel eingeben";
                        }
                    });
                });
            }
            input.focus();
        }
    }
}

/**
 * HILFSFUNKTION: addClick
 * Fügt einem Button eine Funktion hinzu, aber prüft erst, ob er existiert.
 * Das verhindert Abstürze, wenn man mal einen Button im HTML löscht.
 */
function addClick(id, fn) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            fn(e);
        });
    } else {
        // Nur Warnung für Entwickler, kein Absturz für den User
        console.warn(`Warnung: Button mit ID '${id}' fehlt im HTML.`);
    }
}

/* =============================================================================
   DIALOG-HELFER (Barrierefreiheit)
   Gemeinsame Logik für Overlays: Fokus beim Öffnen hinein, Tab-Falle (nur modal),
   Rest der Seite per inert, Escape schließt, Fokus geht zum Auslöser zurück.
   Der Helfer beobachtet nur Sichtbarkeit (class/style) des Overlays. So greift er auch,
   wenn andere Module (mobile-ui.js, Auto-Close-Timer, export.js) ein Overlay öffnen oder
   schließen, ohne dass dort etwas doppelt gebaut werden muss.
   ============================================================================= */

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const OPENER_SELECTOR = 'button, a[href], input, select, textarea, [tabindex]';
const INERT_MARK = 'data-ofm-inert';
// Diese Bereiche bleiben bei einem modalen Dialog immer bedienbar bzw. hörbar (Live-Regionen für Meldungen)
const ALWAYS_ACTIVE_SELECTORS = ['#notification-live-status', '#notification-live-alert'];
// Ein Klick zählt als Auslöser, wenn der Dialog kurz danach aufgeht
const OPENER_MAX_AGE_MS = 1500;

const registeredDialogs = [];
const openDialogs = []; // zuletzt geöffnet = ganz hinten
let lastClick = null;
let dialogObserver = null;

function isVisible(el) {
    return !!el && el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
}

function visibleFocusables(root) {
    return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el => isVisible(el) && !el.closest('[inert]'));
}

function resolveElement(ref) {
    return typeof ref === 'string' ? document.querySelector(ref) : ref;
}

/** Setzt inert auf alles außer dem obersten modalen Dialog (und den Bereichen, die aktiv bleiben sollen). */
function applyInert(topModal) {
    document.querySelectorAll(`[${INERT_MARK}]`).forEach(node => {
        node.removeAttribute('inert');
        node.removeAttribute(INERT_MARK);
    });
    if (!topModal) return;

    const keep = new Set();
    [topModal.el, ...ALWAYS_ACTIVE_SELECTORS, ...topModal.keepActive].forEach(ref => {
        const el = resolveElement(ref);
        if (el) keep.add(el);
    });
    const onPath = new Set();
    keep.forEach(el => {
        for (let node = el; node && node !== document.body; node = node.parentElement) onPath.add(node);
    });

    const visit = (parent) => {
        for (const child of parent.children) {
            if (keep.has(child)) continue;
            if (onPath.has(child)) {
                visit(child);
            } else if (!child.hasAttribute('inert') && child.tagName !== 'SCRIPT') {
                child.setAttribute('inert', '');
                child.setAttribute(INERT_MARK, '');
            }
        }
    };
    visit(document.body);
}

function pickOpener(dialog) {
    const active = document.activeElement;
    if (active && active !== document.body && !dialog.el.contains(active) && active.matches(OPENER_SELECTOR)) return active;
    if (lastClick && performance.now() - lastClick.at < OPENER_MAX_AGE_MS && !dialog.el.contains(lastClick.el)) return lastClick.el;
    return null;
}

function focusInto(dialog) {
    const active = document.activeElement;
    if (active && active !== dialog.el && dialog.el.contains(active)) return; // Fokus ist schon im Dialog
    const preferred = dialog.initialFocus
        ? Array.from(dialog.el.querySelectorAll(dialog.initialFocus)).find(isVisible)
        : null;
    (preferred || visibleFocusables(dialog.el)[0] || dialog.el).focus({ preventScroll: true });
}

function restoreFocus(dialog) {
    const active = document.activeElement;
    // Hat der Nutzer den Fokus schon bewusst woanders hingesetzt, nichts überschreiben
    if (active && active !== document.body && !dialog.el.contains(active)) return;
    const candidates = [dialog.opener, ...dialog.fallbacks.map(resolveElement)];
    const target = candidates.find(el => isVisible(el) && !el.closest('[inert]'));
    if (target) target.focus({ preventScroll: true });
}

function syncDialogs() {
    const opened = [];
    const closed = [];
    for (const dialog of registeredDialogs) {
        const shown = isVisible(dialog.el);
        if (shown && !dialog.isOpen) {
            dialog.isOpen = true;
            dialog.opener = pickOpener(dialog);
            openDialogs.push(dialog);
            opened.push(dialog);
        } else if (!shown && dialog.isOpen) {
            dialog.isOpen = false;
            openDialogs.splice(openDialogs.indexOf(dialog), 1);
            closed.push(dialog);
        } else {
            continue;
        }
        if (dialog.trigger) {
            document.querySelectorAll(dialog.trigger).forEach(btn => btn.setAttribute('aria-expanded', String(dialog.isOpen)));
        }
    }
    if (!opened.length && !closed.length) return;

    applyInert([...openDialogs].reverse().find(d => d.modal) || null);

    if (opened.length) {
        focusInto(opened[opened.length - 1]);
    } else if (!openDialogs.length) {
        restoreFocus(closed[closed.length - 1]);
    }
}

function handleDialogKeydown(e) {
    const top = openDialogs[openDialogs.length - 1];
    if (!top) return;

    if (e.key === 'Escape') {
        e.preventDefault();
        top.close();
        return;
    }
    if (e.key !== 'Tab' || !top.modal) return;

    // Fokus-Falle: Tab und Shift+Tab bleiben im Dialog
    const items = visibleFocusables(top.el);
    if (!items.length) {
        e.preventDefault();
        top.el.focus();
        return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!top.el.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && (active === first || active === top.el)) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
    }
}

/**
 * Macht ein ein-/ausblendbares Overlay tastaturbedienbar.
 * @param {string|Element} ref Overlay-Element (oder Selektor)
 * @param {Object} options
 * @param {Function} options.close Schließt das Overlay (Escape)
 * @param {boolean} [options.modal=true] Tab-Falle und inert für den Rest der Seite; false für Popups ohne Sperre
 * @param {string[]} [options.keepActive] Bereiche, die trotz modalem Dialog bedienbar bleiben (z. B. die Karte)
 * @param {string} [options.trigger] Selektor der Auslöser-Buttons (aria-expanded wird nachgeführt)
 * @param {string[]} [options.fallbacks] Auslöser, falls der ursprüngliche nicht mehr sichtbar ist (z. B. Mobile-Menü zu)
 * @param {string} [options.initialFocus] Selektor des Elements, das beim Öffnen den Fokus bekommt
 */
export function registerDialog(ref, { close, modal = true, keepActive = [], trigger = null, fallbacks = [], initialFocus = null } = {}) {
    const el = resolveElement(ref);
    if (!el || registeredDialogs.some(d => d.el === el)) return;

    registeredDialogs.push({ el, close, modal, keepActive, trigger, fallbacks, initialFocus, isOpen: false, opener: null });

    if (!dialogObserver) {
        dialogObserver = new MutationObserver(syncDialogs);
        document.addEventListener('keydown', handleDialogKeydown);
        // Capture-Phase, weil addClick() die Klicks an den Buttons sonst nicht weiterreicht
        document.addEventListener('click', (e) => {
            const target = e.target instanceof Element ? e.target.closest(OPENER_SELECTOR) : null;
            if (target) lastClick = { el: target, at: performance.now() };
        }, true);
    }
    dialogObserver.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
    syncDialogs();
}

function setupCacheDurationSelects() {
    const selects = Array.from(document.querySelectorAll('[data-cache-duration-select]'));
    if (!selects.length) return;

    const syncValue = (value) => {
        selects.forEach((select) => {
            select.value = value;
            if (!select.value) select.value = '168';
        });
    };

    syncValue(localStorage.getItem('ofm_cache_hours') || '168');
    // Bei "Aus" auch Altbestände entfernen
    if (isCacheDisabled()) clearCache();

    selects.forEach((select) => {
        if (select.__ofmCacheBound) return;
        select.__ofmCacheBound = true;

        select.addEventListener('change', () => {
            const nextValue = select.value || '168';
            localStorage.setItem('ofm_cache_hours', nextValue);
            syncValue(nextValue);
            if (isCacheDisabled()) clearCache();
            showNotification(t('cache_saved'), 2500, 'success');
        });
    });
}

const NOTIFICATION_ICONS = {
    success: `<svg class="w-4 h-4 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>`,
    error: `<svg class="w-4 h-4 shrink-0 text-rose-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" /></svg>`,
    warning: `<svg class="w-4 h-4 shrink-0 text-amber-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>`,
    info: `<svg class="w-4 h-4 shrink-0 text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.247.25v3.25a.75.75 0 001.5 0v-3.5A1.75 1.75 0 009.25 9H9z" clip-rule="evenodd" /></svg>`
};

const liveAnnounceTimers = {};

/**
 * Sagt eine Meldung über die zwei festen Live-Regionen an: Fehler in #notification-live-alert (role="alert"),
 * alles andere in #notification-live-status (role="status"). Die Rollen bleiben dabei unverändert.
 */
function announceNotification(type, msg) {
    const status = document.getElementById('notification-live-status');
    const alertRegion = document.getElementById('notification-live-alert');
    const target = type === 'error' ? alertRegion : status;
    const other = type === 'error' ? status : alertRegion;
    if (other) other.textContent = '';
    if (!target) return;

    // Erst leeren, dann kurz verzögert befüllen: so wird auch eine gleichlautende Folgemeldung erneut angesagt
    target.textContent = '';
    clearTimeout(liveAnnounceTimers[target.id]);
    liveAnnounceTimers[target.id] = setTimeout(() => { target.textContent = msg; }, 50);
}

/** Sagt einen Text höflich an (status-Region), ohne sichtbare Meldung. */
export function announceStatus(msg) {
    announceNotification('info', msg);
}

function clearLiveRegions() {
    ['notification-live-status', 'notification-live-alert'].forEach(id => {
        clearTimeout(liveAnnounceTimers[id]);
        const region = document.getElementById(id);
        if (region) region.textContent = '';
    });
}

// Laufende Nummer der zuletzt gezeigten Benachrichtigung (steht in #notification-box[data-notification-id])
let notificationSeq = 0;

/**
 * Blendet die Benachrichtigungs-Box sofort oder sanft aus.
 * @param {number|null} [id] ID aus showNotification(). Ist sie angegeben, wird nur geschlossen, solange genau
 *   diese Benachrichtigung noch angezeigt wird (eine neuere Meldung bleibt stehen). Ohne ID wird immer geschlossen.
 */
export function hideNotification(id = null) {
    const box = document.getElementById('notification-box');
    if (!box) return;
    if (id !== null && box.dataset.notificationId !== String(id)) return;
    if (box.hideTimeout) {
        clearTimeout(box.hideTimeout);
        box.hideTimeout = null;
    }
    box.classList.remove('is-visible');
    setTimeout(() => {
        if (!box.classList.contains('is-visible')) {
            box.style.display = 'none';
            clearLiveRegions();
        }
    }, 250);
}

/**
 * HAUPTFUNKTION: showNotification
 * Zeigt Benachrichtigungen (Toasts) für Benutzer-Aktionen oder wichtige System-Events.
 * Unterstützt Typen ('info', 'success', 'warning', 'error') und variable Anzeigedauer.
 *
 * Signaturen:
 *   showNotification(msg)
 *   showNotification(msg, duration)
 *   showNotification(msg, type)
 *   showNotification(msg, duration, type)
 *   showNotification(msg, type, duration)
 * Gibt eine ID zurück (oder null ohne #notification-box), mit der hideNotification(id) gezielt genau diese Meldung schließt.
 */
export function showNotification(msg, durationOrType = 3000, explicitTypeOrDuration = null) {
    const box = document.getElementById('notification-box');
    if (!box) return null;

    let duration = 3000;
    let type = 'info';

    if (typeof durationOrType === 'string') {
        type = durationOrType;
        if (typeof explicitTypeOrDuration === 'number') {
            duration = explicitTypeOrDuration;
        }
    } else if (typeof durationOrType === 'number') {
        duration = durationOrType;
        if (typeof explicitTypeOrDuration === 'string') {
            type = explicitTypeOrDuration;
        }
    }

    if (!['info', 'success', 'warning', 'error'].includes(type)) {
        type = 'info';
    }

    // ARIA für Screenreader passend konfigurieren
    const id = ++notificationSeq;
    box.dataset.notificationId = String(id);

    // Die sichtbare Box ist für Screenreader stumm; angesagt wird über die festen Live-Regionen (Fehler: alert, sonst status)
    box.setAttribute('aria-hidden', 'true');
    box.dataset.type = type;
    announceNotification(type, msg);

    // Icon + Text sicher zusammenbauen (XSS-sicher via textContent)
    box.replaceChildren();

    const iconSpan = document.createElement('span');
    iconSpan.className = 'notification-icon flex items-center shrink-0';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.innerHTML = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.info;

    const textSpan = document.createElement('span');
    textSpan.className = 'notification-text';
    textSpan.textContent = msg;

    box.append(iconSpan, textSpan);
    box.style.display = 'flex';

    // Reflow erzwingen für sanfte Transition
    void box.offsetWidth;
    box.classList.add('is-visible');

    if (box.hideTimeout) clearTimeout(box.hideTimeout);

    box.hideTimeout = setTimeout(() => {
        hideNotification();
    }, duration);

    return id;
}

/**
 * Menü-Steuerung: Schließt alle Popups.
 * Wird aufgerufen, bevor ein neues Fenster geöffnet wird (Exklusivität).
 */
export function closeAllMenus() {
    // 1. Normale Menüs (Layer & Export) ausblenden
    ['layer-menu', 'export-menu', 'objects-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden'); // 'hidden' ist eine Tailwind-Klasse
    });

    // 2. Info-Modal und Datenstand-Popover schließen
    const legal = document.getElementById('legal-modal');
    if (legal) legal.style.display = 'none';
    closeDataInfoPopover();

    // 3. Barrierefreiheit: Layer-Button zurücksetzen
    const layerBtn = document.getElementById('layer-btn-trigger');
    if (layerBtn) {
        layerBtn.setAttribute('aria-expanded', 'false');
        // WICHTIG: Label wieder auf "Öffnen" setzen
        layerBtn.setAttribute('aria-label', t('menu_layers_open'));
    }

    // 4. Barrierefreiheit: Export-Button zurücksetzen
    const exportBtn = document.getElementById('export-btn-trigger');
    if (exportBtn) {
        exportBtn.setAttribute('aria-expanded', 'false');
        // WICHTIG: Label wieder auf "Öffnen" setzen
        exportBtn.setAttribute('aria-label', t('menu_export_open'));
    }
}

/* =============================================================================
   TOGGLE FUNKTIONEN (Auf/Zu machen)
   ============================================================================= */

// Diese Funktion wird aufgerufen, wenn man auf den Layer-Button klickt
function toggleLayerMenu() {
    // KORREKTUR: Die ID muss exakt so heißen wie im HTML ('layer-btn-trigger')
    const btn = document.getElementById('layer-btn-trigger');
    const menu = document.getElementById('layer-menu');

    // Sicherheitscheck: Abbrechen, falls der Button nicht gefunden wird (verhindert Absturz)
    if (!btn || !menu) {
        console.warn("Fehler: Layer-Button oder Menü nicht gefunden.");
        return;
    }

    // Aktuellen Status prüfen
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    const newState = !isExpanded;

    // 1. Erst alle anderen Menüs schließen (damit sich nichts überlappt)
    if (newState) {
        closeAllMenus();
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }

    // 2. ARIA Updates (Für Screenreader)
    btn.setAttribute('aria-expanded', newState);

    // Label anpassen: Wenn offen -> "Schließen", wenn zu -> "Öffnen"
    const newLabel = newState ? t('menu_layers_close') : t('menu_layers_open');
    btn.setAttribute('aria-label', newLabel);
}

export function toggleExportMenu() {
    const menu = document.getElementById('export-menu');
    if (!menu) return;

    const isHidden = menu.classList.contains('hidden');
    closeAllMenus();

    if (isHidden) {
        menu.classList.remove('hidden');
        document.getElementById('export-btn-trigger')?.setAttribute('aria-expanded', 'true');

        // UI zurücksetzen (Ladebalken weg, Setup zeigen)
        document.getElementById('export-setup')?.classList.remove('hidden');
        document.getElementById('export-progress')?.classList.add('hidden');

    }
}

const OBJECTS_LIST_MAX = 100;

// Zuletzt gezeichnete Liste (ID, Name, Entfernung, Ladezustand): ein Neuaufbau ohne Änderung fasst den Fokus nicht an,
// eine Änderung unter gleicher ID (Live-Delta) wird aber übernommen
let objectsListSignature = '';

/** Baut die Objektliste neu auf (beim Öffnen und bei neuen Markerdaten, passend zum aktuellen Kartenausschnitt). */
function renderObjectsList() {
    const summary = document.getElementById('objects-list-summary');
    const list = document.getElementById('objects-list-items');
    if (!summary || !list) return;

    const { items, total } = getObjectsInView(OBJECTS_LIST_MAX);
    // Der Ladezustand gehört dazu: aus "lädt" wird bei leerem Ergebnis "keine Objekte", ohne dass sich die Einträge ändern
    const signature = `${State.isFetchingData ? 'loading' : 'idle'}|${total}|${items.map(item => `${item.id}:${item.label}:${item.distance}`).join(',')}`;
    if (signature === objectsListSignature && list.childElementCount === items.length) return;
    objectsListSignature = signature;

    // Hat gerade ein Eintrag den Fokus, soll er ihn nach dem Neuaufbau behalten
    const focusedId = document.activeElement?.closest?.('#objects-list-items') ? document.activeElement.dataset.objectId : null;
    list.replaceChildren();

    if (total === 0) {
        // Während der erste Abruf noch läuft, ist die Liste nicht "leer", sondern wartet auf Daten
        summary.textContent = State.isFetchingData ? t('hydrant_load_started') : t('objects_list_empty');
        // Der fokussierte Eintrag ist weg: Fokus im modalen Dialog halten
        if (focusedId) document.getElementById('objects-close-btn')?.focus();
        return;
    }
    summary.textContent = total > items.length
        ? t('objects_list_count_limited').replace('{count}', String(total)).replace('{max}', String(items.length))
        : t('objects_list_count').replace('{count}', String(total));

    for (const item of items) {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.objectId = item.id;
        btn.className = 'w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between gap-3';
        const name = document.createElement('span');
        name.textContent = item.label;
        const dist = document.createElement('span');
        dist.className = 'text-slate-400 shrink-0';
        dist.textContent = `${item.distance} m`;
        btn.append(name, dist);
        btn.addEventListener('click', () => {
            closeAllMenus();
            // Erst im nächsten Task: bis dahin hat registerDialog() inert wieder von der Karte genommen
            setTimeout(() => focusMapObject(item.id), 0);
        });
        li.appendChild(btn);
        list.appendChild(li);
        if (item.id === focusedId) btn.focus();
    }
    // Der fokussierte Eintrag ist verschwunden: auf den ersten verbleibenden springen, statt den Fokus zu verlieren
    if (focusedId && !list.contains(document.activeElement)) list.querySelector('button')?.focus();
}

// Ist die Liste offen, während Marker (nach)geladen werden oder der Ausschnitt sich ändert, folgt sie (gebündelt, nicht bei jedem Zwischenstand)
let objectsListRefreshTimer = null;
function scheduleObjectsListRefresh() {
    clearTimeout(objectsListRefreshTimer);
    objectsListRefreshTimer = setTimeout(() => {
        const dialog = document.getElementById('objects-list');
        if (dialog && !dialog.classList.contains('hidden')) renderObjectsList();
    }, 150);
}

export function toggleObjectsList() {
    const dialog = document.getElementById('objects-list');
    if (!dialog) return;

    const isHidden = dialog.classList.contains('hidden');
    closeAllMenus();
    if (isHidden) {
        objectsListSignature = ''; // beim Öffnen immer neu aufbauen
        renderObjectsList();
        dialog.classList.remove('hidden');
    }
}

export function toggleLegalModal() {
    const modal = document.getElementById('legal-modal');
    if (!modal) return;

    // Prüfen ob es schon offen ist (bei Flexbox ist 'flex' = offen)
    const isVisible = modal.style.display === 'flex';
    closeAllMenus();

    if (!isVisible) {
        modal.style.display = 'flex';
    }
}

/* =============================================================================
   SUCHE & GPS
   ============================================================================= */

/**
 * Sucht einen Ort über die Nominatim API (OpenStreetMap).
 * LERN-INFO: Wir nutzen jetzt Config.searchZoom für die Ansicht.
 */
export function searchLocation() {
    const input = document.getElementById('search-input');
    if (!input || !input.value) return;

    const query = input.value;

    fetch(`${Config.nominatimUrl}/search?format=json&q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(data => {
            if (data.length > 0 && State.map) {
                // Wir nutzen den zentral konfigurierten Zoom-Wert
                moveMapTo([data[0].lat, data[0].lon], Config.searchZoom);

                input.blur(); // Tastatur am Handy einklappen
            } else {
                showNotification(t('no_results'), 3000, 'warning');
            }
        })
        .catch(err => {
            console.error("Suchfehler:", err);
            showNotification("Suche fehlgeschlagen", 3000, 'error');
        });
}
let isLocating = false;

/**
 * Bestimmt den Standort des Nutzers via Browser-GPS.
 */
export function locateUser(highAccuracy = true) {
    if (!navigator.geolocation) {
        showNotification("GPS nicht unterstützt", 4000, 'warning');
        return;
    }

    // Spam-Schutz: Wenn bereits eine Ortung läuft (und es kein automatischer Fallback ist), ignorieren wir weitere Klicks.
    // Das verhindert OS-seitige Timeouts (Safari/MacOS locken das GPS sonst temporär).
    if (isLocating && highAccuracy) return;

    isLocating = true;

    const btn = document.getElementById('locate-btn');
    const icon = btn ? btn.querySelector('svg') : null;

    // Icon nur beim ersten Aufruf drehen lassen
    if (icon && highAccuracy) icon.classList.add('animate-spin');

    // Safety-Net: Manche Browser (Safari) verschlucken manchmal den Error-Callback bei Timeouts.
    // Damit der Button nicht für immer gelockt bleibt, entsperren wir ihn nach 12 Sekunden hart.
    const safetyTimer = setTimeout(() => {
        if (isLocating) {
            isLocating = false;
            if (icon) icon.classList.remove('animate-spin');
            console.warn('[GPS] Safety timeout triggered. Browser did not fire callback.');
        }
    }, 12000);

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            clearTimeout(safetyTimer);
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            // 1. ZUR POSITION SPRINGEN (Mit Zoom-Check)
            if (State.map) {
                const currentZoom = State.map.getZoom();
                const defaultZoom = Config.locateZoom || 17;

                // LOGIK: Wenn wir schon tief drin sind (z.B. 18), nicht rauszoomen!
                // Sonst den Standard-Wert (17) nehmen.
                const targetZoom = currentZoom >= 18 ? currentZoom : defaultZoom;

                moveMapTo([lat, lng], targetZoom);
            }

            // 2. Alten Marker entfernen
            if (State.userMarker) {
                State.map.removeLayer(State.userMarker);
                clearDistanceLine();
            }

            // 3. NEUER MARKER (Die Lösung für das "Wandern")
            const dotIcon = L.divIcon({
                className: 'user-location-wrapper',
                html: '<div class="user-location-inner"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            State.userMarker = L.marker([lat, lng], { icon: dotIcon }).addTo(State.map);

            // 3b. Blaue Linie zum nächsten Hydranten zeichnen
            drawLineToNearest();

            // 4. Timer (25 Sekunden)
            if (State.userLocationTimer) clearTimeout(State.userLocationTimer);

            State.userLocationTimer = setTimeout(() => {
                if (State.userMarker) {
                    State.map.removeLayer(State.userMarker);
                    State.userMarker = null;
                    clearDistanceLine();
                }
            }, 25000);

            if (icon) icon.classList.remove('animate-spin');
            showNotification(t('geo_found') || "Standort gefunden!", 3000, 'success');
            isLocating = false;
        },
        (err) => {
            clearTimeout(safetyTimer);

            // FALLBACK FÜR SAFARI/MACOS:
            // Fehler 2 (Position unavailable) oder 3 (Timeout) treten oft bei "highAccuracy: true" 
            // an Desktop-Geräten (macOS) auf. Wir versuchen es dann transparent ohne High-Accuracy noch einmal.
            if (highAccuracy && (err.code === 2 || err.code === 3 || err.code === 1)) {
                console.warn(`[GPS Fallback] HighAccuracy failed (Code ${err.code}). Retrying with low accuracy...`);
                locateUser(false); // Rekursiver Aufruf mit low-accuracy
                return;
            }

            if (icon) icon.classList.remove('animate-spin');
            console.error('[GPS Error]', err);
            const errMsg = t('gps_error') || "Standort konnte nicht ermittelt werden.";
            // Safari liefert bei Code 2 oft eine leere (tote) message mit.
            const desc = err.message ? `: ${err.message}` : '';
            showNotification(`${errMsg} (${err.code}${desc})`, 5000, 'error');

            isLocating = false;
        },
        {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 6000 : 10000,
            maximumAge: 10000 // Erlaubt dem Browser, eine bis zu 10sek alte Position zu verwenden (schont Systemressourcen stark)
        }
    );
}

/* =============================================================================
   SETUP (Initialisierung)
   Diese Funktion wird einmalig beim Start von app.js aufgerufen.
   ============================================================================= */

export function setupUI() {
    // 0. Version in Legal Modal eintragen (falls DOM existiert)
    const versionEl = document.getElementById('app-version');
    if (versionEl) {
        versionEl.textContent = `v${APP_VERSION}`;
    }

    // 1. Haupt-Buttons verbinden
    addClick('layer-btn-trigger', toggleLayerMenu);
    addClick('export-btn-trigger', toggleExportMenu);
    addClick('share-btn-trigger', shareMap);
    addClick('objects-btn-trigger', toggleObjectsList);
    addClick('objects-close-btn', toggleObjectsList);
    window.addEventListener('ofm:markerschange', scheduleObjectsListRefresh);
    window.addEventListener('ofm:viewchange', scheduleObjectsListRefresh);

    // Info & Recht Button (Desktop: ⓘ unten links / Mobile: Burger-Menü-Eintrag)
    addClick('btn-legal-trigger', toggleLegalModal);
    addClick('mobile-open-legal', () => { closeAllMenus(); toggleLegalModal(); });

    // Schließen-Buttons (das X oben rechts in den Fenstern)
    addClick('legal-close-btn', toggleLegalModal);
    addClick('export-close-btn', toggleExportMenu);

    // Cache-Dauer Einstellungen
    setupCacheDurationSelects();

    // Datenstand-Popover & Status initialisieren (Desktop)
    initDataStatusUI();

    // 2. Suche (Enter-Taste Unterstützung)
    const searchInp = document.getElementById('search-input');
    if (searchInp) {
        searchInp.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchLocation();
        });
    }
    addClick('search-btn', searchLocation);
    addClick('locate-btn', locateUser);

    // 3. Layer-Auswahl (Hintergrundbilder)
    ['voyager', 'positron', 'dark', 'satellite', 'topo', 'osm', 'osmde', 'bayern', 'bayern_dop'].forEach(key => {
        addClick(`btn-${key}`, () => setBaseLayer(key));
    });

    // 4. Export-Format (A4, Frei, etc.) — lazy
    ['free', 'a4l', 'a4p'].forEach(fmt => {
        addClick(`fmt-${fmt}`, async () => { const m = await getExport(); m.setExportFormat(fmt); });
    });

    // 5. Export-Zoom (15-18) — lazy
    [15, 16, 17, 18].forEach(z => {
        addClick(`zoom-${z}`, async () => { const m = await getExport(); m.setExportZoom(z); });
    });

    // 6. Export-Aktionen & Bestätigungs-Dialog
    addClick('select-btn', async () => { const m = await getExport(); m.startSelection(); });
    addClick('png-btn', withTitleConfirm('exportAsPNG'));
    addClick('pdf-btn', withTitleConfirm('exportAsPDF'));
    addClick('gpx-btn', withTitleConfirm('exportAsGPX'));
    addClick('csv-btn', withTitleConfirm('exportAsCSV'));
    addClick('cancel-export-btn', async () => { const m = await getExport(); m.cancelExport(); });

    // Der Fokus geht über registerDialog() (unten) zum Auslöser zurück
    addClick('export-confirm-cancel', closeExportTitleModal);

    addClick('export-confirm-ok', () => {
        const modal = document.getElementById('export-title-modal');
        if (modal) modal.classList.add('hidden');
        if (pendingExportAction) pendingExportAction();
    });

    // Skip-Link: Fokus auf die Karte setzen, ohne den Permalink-Hash (#zoom/lat/lon/layer) durch #map zu ersetzen.
    // Ohne JavaScript greift weiter der normale Anker (href="#map").
    document.getElementById('skip-to-map')?.addEventListener('click', (e) => {
        const mapEl = document.getElementById('map');
        if (!mapEl) return;
        e.preventDefault();
        mapEl.focus();
    });

    // Automatische Schließ-Logik aktivieren
    setupMenuAutoClose();

    // Tastaturbedienung der Overlays (Fokus, Tab-Falle, Escape, Fokus-Rückgabe) an einer Stelle
    const mobileBurgerFallback = '#mobile-burger-btn';
    registerDialog('#layer-menu', {
        modal: false,
        trigger: '#layer-btn-trigger',
        fallbacks: ['#layer-btn-trigger', mobileBurgerFallback],
        initialFocus: '.layer-btn.active',
        close: closeAllMenus
    });
    registerDialog('#export-menu', {
        trigger: '#export-btn-trigger',
        fallbacks: ['#export-btn-trigger', mobileBurgerFallback],
        keepActive: ['#map'], // "Ausschnitt wählen" und Verschieben/Zoomen der Karte laufen bei offenem Menü weiter
        close: closeAllMenus
    });
    registerDialog('#export-title-modal', {
        fallbacks: ['#export-btn-trigger', mobileBurgerFallback],
        initialFocus: '#export-confirm-title',
        close: closeExportTitleModal
    });
    registerDialog('#objects-list', {
        trigger: '#objects-btn-trigger',
        fallbacks: ['#objects-btn-trigger', mobileBurgerFallback],
        close: closeAllMenus
    });
    registerDialog('#legal-modal', {
        trigger: '#btn-legal-trigger',
        fallbacks: ['#btn-legal-trigger', mobileBurgerFallback],
        close: closeAllMenus
    });
    registerDialog('#data-info-popover', {
        modal: false,
        trigger: '#data-info-btn',
        fallbacks: ['#data-info-btn'],
        close: closeDataInfoPopover
    });
}

/**
 * FEATURE: Menüs automatisch schließen
 * Wenn die Maus den Bereich verlässt, schließt sich das Menü nach 10 Sekunden.
 * VERBESSERUNG: Timer wird jetzt sicher am Element gespeichert.
 */
function setupMenuAutoClose() {
    ['layer-menu', 'export-menu', 'legal-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        // Wir speichern den Timer direkt am Element, um Konflikte zu vermeiden
        el._closeTimer = null;

        // MAUS RAUS -> Timer starten
        el.addEventListener('mouseleave', () => {
            // Nur schließen, wenn das Menü auch wirklich sichtbar ist
            const isHidden = id === 'legal-modal' ? (el.style.display === 'none' || el.style.display === '') : el.classList.contains('hidden');
            if (isHidden) return;

            // Timer starten (10 Sekunden = 10000 ms)
            el._closeTimer = setTimeout(() => {
                if (id === 'legal-modal') el.style.display = 'none';
                else el.classList.add('hidden');

                // Den zugehörigen Button auch zurücksetzen (für Barrierefreiheit)
                const btnId = id === 'layer-menu' ? 'layer-btn-trigger' : (id === 'export-menu' ? 'export-btn-trigger' : 'btn-legal-trigger');
                document.getElementById(btnId)?.setAttribute('aria-expanded', 'false');

            }, 10000);
        });

        // MAUS REIN -> Timer abbrechen (Nutzer liest noch)
        el.addEventListener('mouseenter', () => {
            if (el._closeTimer) {
                clearTimeout(el._closeTimer);
                el._closeTimer = null;
            }
        });
    });
}
