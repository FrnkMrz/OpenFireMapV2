/* =========================================================
 * Globaler State
 * ======================================================= */

const State = {
  map: null,
  markerLayer: null,
  markerCache: new Map()
};

// genau EIN Marker darf einen Tooltip offen haben
let currentlyOpenTooltipMarker = null;


/* =========================================================
 * Initialisierung
 * ======================================================= */

export function initMap(mapInstance) {
  State.map = mapInstance;
  State.markerLayer = L.layerGroup().addTo(State.map);
}


/* =========================================================
 * Marker-Erzeugung
 * ======================================================= */

export function createAndAddMarker({
  id,
  lat,
  lon,
  tags = {},
  iconHtml,
  isStation = false,
  isDefib = false
}) {
  if (!State.map || !State.markerLayer) {
    console.error("Map not initialized");
    return;
  }

  if (State.markerCache.has(id)) {
    return;
  }

  const marker = L.marker([lat, lon], {
    icon: L.divIcon({
      className: "custom-marker",
      html: iconHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    })
  });

  marker.__tags = tags;

  attachSmartTooltip(marker, tags, State.map);

  marker.addTo(State.markerLayer);

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

export function renderMarkers(filterFn = null) {
  State.markerLayer.clearLayers();

  for (const entry of State.markerCache.values()) {
    if (filterFn && !filterFn(entry)) continue;
    entry.marker.addTo(State.markerLayer);
  }
}


/* =========================================================
 * Smart Tooltip Handling
 * ======================================================= */

function attachSmartTooltip(marker, tags, map) {
  let closeTimer = null;

  marker.off("mouseover");
  marker.off("mouseout");

  marker.on("mouseover", function () {
    if (map.getZoom() < 18) return;

    // alten Tooltip schließen
    if (
      currentlyOpenTooltipMarker &&
      currentlyOpenTooltipMarker !== this
    ) {
      currentlyOpenTooltipMarker.closeTooltip();
    }

    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    if (!this.getTooltip()) {
      this.bindTooltip(generateTooltip(tags), {
        interactive: true,
        direction: "top",
        opacity: 0.95
      });
    }

    this.openTooltip();
    currentlyOpenTooltipMarker = this;

    const tooltipEl = this.getTooltip()?.getElement();
    if (tooltipEl) {
      tooltipEl.addEventListener("mouseenter", () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      });

      tooltipEl.addEventListener("mouseleave", () => {
        scheduleClose(this);
      });
    }
  });

  marker.on("mouseout", function () {
    scheduleClose(this);
  });

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

function generateTooltip(tags) {
  let html = "<div class=\"tooltip-content\">";

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

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}