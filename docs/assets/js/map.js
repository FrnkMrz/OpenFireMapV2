/* =========================================================
 * map.js
 *
 * Zweck:
 * - Marker (Hydranten/Stationen/Defibs etc.) auf einer Leaflet-Karte verwalten.
 * - Marker werden gecached, damit du sie nicht mehrfach erzeugst.
 * - Tooltips sind "smart":
 *   - öffnen erst ab Zoom >= 18
 *   - schließen nach 3 Sekunden automatisch
 *   - bleiben offen, wenn du mit der Maus in den Tooltip fährst
 *   - es kann immer nur EIN Tooltip gleichzeitig offen sein
 *
 * Wichtig:
 * - Auf Wunsch: KEINE Funktionsänderungen, nur Dokumentation/Kommentare.
 * ======================================================= */


/* =========================================================
 * Globaler State (einfaches "Modul-Gedächtnis")
 * ======================================================= */

/**
 * State enthält Dinge, die im ganzen Modul gebraucht werden.
 * So müssen wir sie nicht überall als Parameter durchreichen.
 *
 * map: die Leaflet-Map Instanz (L.map)
 * markerLayer: ein LayerGroup-Container für alle Marker
 * markerCache: Map von id -> { marker, lat, lon, tags, ... }
 */
const State = {
  map: null,
  markerLayer: null,
  markerCache: new Map()
};

/**
 * Wir wollen maximal EINEN Tooltip gleichzeitig offen haben.
 * Diese Variable merkt sich den Marker, dessen Tooltip aktuell offen ist.
 *
 * Beim Öffnen eines neuen Tooltips schließen wir den alten sofort.
 */
let currentlyOpenTooltipMarker = null;


/* =========================================================
 * Initialisierung
 * ======================================================= */

/**
 * initMap(mapInstance)
 *
 * Muss einmal aufgerufen werden, bevor du Marker erstellen kannst.
 * Übergib die Leaflet-Map Instanz (z.B. aus L.map(...)).
 *
 * @param {L.Map} mapInstance - Leaflet Map-Objekt
 */
export function initMap(mapInstance) {
  State.map = mapInstance;

  /**
   * markerLayer ist eine LayerGroup, die wir zur Karte hinzufügen.
   * Vorteil:
   * - du kannst alle Marker gesammelt löschen/neu rendern
   * - du hältst Ordnung in Leaflet
   */
  State.markerLayer = L.layerGroup().addTo(State.map);
}


/* =========================================================
 * Marker-Erzeugung
 * ======================================================= */

/**
 * createAndAddMarker(...)
 *
 * Erstellt einen Leaflet Marker mit einem divIcon, hängt Tooltip-Logik dran,
 * fügt ihn dem Layer hinzu und schreibt ihn in den Cache.
 *
 * Caching-Idee:
 * - wenn id schon existiert: sofort raus
 * - sonst einmal erstellen, dann wiederverwenden
 *
 * @param {Object} opts
 * @param {string|number} opts.id - eindeutige ID (muss eindeutig sein!)
 * @param {number} opts.lat - Latitude
 * @param {number} opts.lon - Longitude
 * @param {Object} opts.tags - OSM Tags / Metadaten für Tooltip
 * @param {string} opts.iconHtml - HTML für das Marker-Icon (divIcon)
 * @param {boolean} opts.isStation - optionales Flag (z.B. Feuerwehrwache)
 * @param {boolean} opts.isDefib - optionales Flag (z.B. AED)
 */
export function createAndAddMarker({
  id,
  lat,
  lon,
  tags = {},
  iconHtml,
  isStation = false,
  isDefib = false
}) {
  /**
   * Schutz: Falls initMap vergessen wurde, hätten wir sonst Nullpointer-Probleme.
   */
  if (!State.map || !State.markerLayer) {
    console.error("Map not initialized");
    return;
  }

  /**
   * Wenn der Marker schon im Cache ist:
   * - nichts tun (wir wollen keine doppelten Marker).
   */
  if (State.markerCache.has(id)) {
    return;
  }

  /**
   * Marker erstellen:
   * - Position: [lat, lon]
   * - Icon: divIcon, damit du beliebiges HTML als Icon nutzen kannst
   */
  const marker = L.marker([lat, lon], {
    icon: L.divIcon({
      className: "custom-marker",
      html: iconHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    })
  });

  /**
   * tags am Marker "anhängen".
   * Das ist ein simples, pragmatisches Feld.
   * Vorteil: Tooltip-Funktion kann später darauf zugreifen.
   */
  marker.__tags = tags;

  /**
   * Tooltip-Verhalten an den Marker hängen:
   * - Öffnen ab Zoom >= 18
   * - auto-close nach 3 Sekunden
   * - Tooltip bleibt offen beim Hover über Tooltip selbst
   * - nur ein Tooltip gleichzeitig (global geregelt)
   */
  attachSmartTooltip(marker, tags, State.map);

  /**
   * Marker in die LayerGroup aufnehmen.
   */
  marker.addTo(State.markerLayer);

  /**
   * Cache-Eintrag:
   * Wir speichern nicht nur den Marker, sondern auch Metadaten,
   * damit du später z.B. filtern oder anders rendern kannst,
   * ohne alles neu zu berechnen.
   */
  State.markerCache.set(id, {
    marker,
    lat,
    lon,
    tags,
    isStation,
    isDefib
  });
}


/* =========================================================
 * Rendering / Re-Rendering
 * ======================================================= */

/**
 * renderMarkers(filterFn = null)
 *
 * Rendert Marker aus dem Cache in die LayerGroup.
 * Typischer Einsatz:
 * - Filter ändern (z.B. nur Hydranten, nur Wachen)
 * - Marker neu darstellen, ohne neu zu erzeugen
 *
 * Funktionsweise:
 * - LayerGroup leeren
 * - alle Marker aus Cache wieder hinzufügen, ggf. gefiltert
 *
 * @param {(entry: Object) => boolean|null} filterFn
 *        Wenn gesetzt: nur Marker rendern, für die filterFn(entry) true liefert.
 */
export function renderMarkers(filterFn = null) {
  /**
   * Alles aus der LayerGroup entfernen.
   * (Cache bleibt erhalten, wir verlieren die Marker nicht.)
   */
  State.markerLayer.clearLayers();

  /**
   * Cache iterieren und Marker wieder hinzufügen.
   */
  for (const entry of State.markerCache.values()) {
    if (filterFn && !filterFn(entry)) continue;
    entry.marker.addTo(State.markerLayer);
  }
}


/* =========================================================
 * Smart Tooltip Handling
 * ======================================================= */

/**
 * attachSmartTooltip(marker, tags, map)
 *
 * Hängt Event-Handler an einen Marker, damit Tooltips:
 * - erst ab bestimmtem Zoom öffnen
 * - automatisch schließen
 * - nicht sofort schließen, wenn man in den Tooltip fährt
 * - nie mehrere gleichzeitig offen sind
 *
 * Hinweis:
 * - Diese Funktion ändert nichts am Marker selbst außer:
 *   - Event-Handler (mouseover/mouseout)
 *   - Tooltip wird bei Bedarf gebunden (bindTooltip)
 *
 * @param {L.Marker} marker - Leaflet Marker
 * @param {Object} tags - Metadaten für Tooltip
 * @param {L.Map} map - Leaflet Map Instanz (für Zoom-Abfrage)
 */
function attachSmartTooltip(marker, tags, map) {
  /**
   * closeTimer:
   * - merkt sich den Timeout, der das spätere Schließen ausführt
   * - wir können ihn abbrechen, wenn User wieder hover’t
   */
  let closeTimer = null;

  /**
   * Sicherheit: Vor dem Neu-Binden erst alte Listener entfernen,
   * damit du nicht versehentlich doppelte Handler bekommst.
   */
  marker.off("mouseover");
  marker.off("mouseout");

  /**
   * mouseover:
   * - Zoom check
   * - alten Tooltip schließen (global)
   * - ggf. Tooltip anlegen (bindTooltip)
   * - Tooltip öffnen
   * - Tooltip-Element bekommt eigene mouseenter/mouseleave-Logik,
   *   damit er offen bleibt, wenn der User in den Tooltip fährt.
   */
  marker.on("mouseover", function () {
    /**
     * Ab Zoom < 18 wollen wir keine Tooltips.
     * Grund: bei großem Überblick ist es nur Spam.
     */
    if (map.getZoom() < 18) return;

    /**
     * Wenn ein anderer Tooltip offen ist, schließen wir den.
     * Damit gibt es nie zwei offene Tooltips.
     */
    if (
      currentlyOpenTooltipMarker &&
      currentlyOpenTooltipMarker !== this
    ) {
      currentlyOpenTooltipMarker.closeTooltip();
    }

    /**
     * Wenn ein Close-Timer lief, stoppen wir ihn,
     * weil der User wieder aktiv am Marker ist.
     */
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    /**
     * Tooltip nur binden, wenn noch keiner existiert.
     * Das spart Overhead (nicht ständig neu binden).
     */
    if (!this.getTooltip()) {
      this.bindTooltip(generateTooltip(tags), {
        interactive: true,   // Tooltip kann "hoverbar" sein
        direction: "top",
        opacity: 0.95
      });
    }

    /**
     * Tooltip öffnen und diesen Marker als "aktuell offen" merken.
     */
    this.openTooltip();
    currentlyOpenTooltipMarker = this;

    /**
     * Tooltip DOM-Element holen.
     * Leaflet erzeugt das erst, nachdem ein Tooltip existiert.
     */
    const tooltipEl = this.getTooltip()?.getElement();
    if (tooltipEl) {
      /**
       * Wenn Maus in den Tooltip fährt:
       * - Close-Timer abbrechen, damit er nicht wegklappt.
       */
      tooltipEl.addEventListener("mouseenter", () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      });

      /**
       * Wenn Maus den Tooltip verlässt:
       * - Close-Timer starten (nach 3 Sekunden schließen).
       */
      tooltipEl.addEventListener("mouseleave", () => {
        scheduleClose(this);
      });
    }
  });

  /**
   * mouseout:
   * - sobald Maus den Marker verlässt, planen wir das Schließen.
   *   (Wenn Maus in Tooltip geht, stoppt mouseenter wieder den Timer.)
   */
  marker.on("mouseout", function () {
    scheduleClose(this);
  });

  /**
   * scheduleClose(ctx)
   *
   * Schließt Tooltip verzögert nach 3 Sekunden.
   * ctx ist der Marker, dessen Tooltip geschlossen werden soll.
   *
   * Zusätzlich:
   * - wenn ctx der aktuell offene Tooltip war, setzen wir global wieder null
   */
  function scheduleClose(ctx) {
    closeTimer = setTimeout(() => {
      ctx.closeTooltip();

      if (currentlyOpenTooltipMarker === ctx) {
        currentlyOpenTooltipMarker = null;
      }
    }, 3000);
  }
}


/* =========================================================
 * Tooltip-Content
 * ======================================================= */

/**
 * generateTooltip(tags)
 *
 * Baut HTML für den Tooltip aus tags.
 * Sicherheitsdetail:
 * - escapeHtml wird genutzt, damit Tags keine HTML/JS injizieren können.
 *
 * @param {Object} tags
 * @returns {string} HTML string
 */
function generateTooltip(tags) {
  let html = "<div class=\"tooltip-content\">";

  /**
   * Alle Tags als Zeilen rendern:
   * - key links
   * - value rechts
   */
  for (const [key, value] of Object.entries(tags || {})) {
    html += `
      <div class="tooltip-row">
        <span class="tooltip-key">${escapeHtml(key)}</span>
        <span class="tooltip-value">${escapeHtml(String(value))}</span>
      </div>
    `;
  }

  html += "</div>";
  return html;
}


/* =========================================================
 * Security
 * ======================================================= */

/**
 * escapeHtml(str)
 *
 * Minimale HTML-Escaping-Funktion, damit Tooltip-Inhalte sicher sind.
 * Verhindert z.B.:
 * - <script>...</script>
 * - HTML-Injection über Tag-Werte
 *
 * @param {string} str
 * @returns {string} escaped string
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}