// Symbole 1:1 aus der App: SVG-Texte wie in getSVGContent() (src/js/map.js), Farben wie Config.colors.
export const ICON_PX = 200;

const C = { station: "#dc2626", hydrant: "#dc2626", water: "#2563eb", defib: "#15803d" };

/** Wasserstellen-Art wie getWaterMarkerKind() in src/js/marker-symbols.js (gleiche Tags, gleiche Reihenfolge). */
export function waterKindOf(type, tags = {}) {
  if (type === "pipe" && tags.water_source === "groundwater") return "groundwater_pipe";
  if (type === "fire_water_pond" || type === "pond") return "open_water";
  if (type === "suction_point") return "suction_point";
  if (type === "water_tank") {
    if (["storage_tank", "reservoir_covered"].includes(tags.man_made)) return "closed_water_tank";
    if (tags.natural === "water" || tags.landuse === "reservoir" || ["basin", "pond", "reservoir"].includes(tags.water)) return "open_water";
    return "water_tank";
  }
  if (type === "cistern") return "water_tank"; // emergency=cistern, wie in der App
  return null;
}
export const isWaterType = (type, tags = {}) => !!waterKindOf(type, tags);

/** Icon-ID zu einem App-"type" (station, defibrillator, Hydranten-/Wasser-Typ) und seinen Tags (wie getHydrantMarkerType der App). */
export function iconIdForType(type, tags = {}) {
  if (type === "station" || type === "defibrillator") return type;
  const kind = waterKindOf(type, tags);
  if (kind) return kind;
  if (type === "pillar" && tags["pillar:type"] === "dry_barrel") return "dry_barrel";
  if (["underground", "pillar", "pipe", "dry_barrel", "wall", "wsh"].includes(type)) return type;
  return "plain";
}

// Wasser-Glyphen: dieselben Pfade wie getMarkerSvg() der App
const WATER_GLYPHS = {
  closed_water_tank: '<rect x="27" y="31" width="46" height="39" rx="4" fill="none" stroke="white" stroke-width="7"/><path d="M31 53 Q40 47 50 53 T69 53 M34 25 H66" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>',
  water_tank: '<rect x="27" y="34" width="46" height="38" rx="4" fill="none" stroke="white" stroke-width="7"/><path d="M31 54 Q40 48 50 54 T69 54" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>',
  open_water: '<path d="M25 43 Q37 33 50 43 T75 43 M25 57 Q37 47 50 57 T75 57 M25 71 Q37 61 50 71 T75 71" fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/>',
  suction_point: '<path d="M72 24 L48 58" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/><circle cx="45" cy="62" r="7" fill="none" stroke="white" stroke-width="5"/><path d="M25 70 Q37 62 50 70 T75 70" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>',
};
const BLUE_IDS = new Set([...Object.keys(WATER_GLYPHS), "groundwater_pipe"]);

/** SVG-Text; id: station | defibrillator | water_tank | closed_water_tank | open_water | suction_point | groundwater_pipe | wall | underground | wsh | pillar | pipe | dry_barrel | plain | badge-N */
export function svgFor(id) {
  const s = `${ICON_PX}px`;
  const open = `<svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">`;
  if (id === "defibrillator") {
    return `${open}<circle cx="50" cy="50" r="45" fill="${C.defib}" stroke="white" stroke-width="5"/>
      <path d="M50 80 C10 40 10 10 50 35 C90 10 90 40 50 80 Z" fill="white"/>
      <path d="M55 45 L45 55 L55 55 L45 65" stroke="${C.defib}" stroke-width="3" fill="none"/></svg>`;
  }
  if (id === "station") {
    return `${open}<path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="${C.station}" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;
  }
  if (id === "oneway") {
    // Pfeil nach Osten (entlang der Linie ausgerichtet); schmal, damit er in eine Fahrbahn von ~1 mm passt
    return `${open}<path d="M6 40 H56 V24 L96 50 L56 76 V60 H6 Z" fill="#2f2f2f"/></svg>`;
  }
  const color = BLUE_IDS.has(id) ? C.water : C.hydrant;
  if (WATER_GLYPHS[id]) return `${open}<circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${WATER_GLYPHS[id]}</svg>`;
  if (id === "wall") {
    return `${open}<circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
      <circle cx="42" cy="52" r="18" fill="none" stroke="white" stroke-width="6" />
      <line x1="64" y1="34" x2="64" y2="70" stroke="white" stroke-width="6" stroke-linecap="round" /></svg>`;
  }
  if (id.startsWith("badge-")) {
    const n = id.slice(6);
    return `${open}<circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
      <text x="50" y="70" font-family="Arial" font-weight="bold" font-size="52" text-anchor="middle" fill="white">${n}</text></svg>`;
  }
  const char = { underground: "U", wsh: "W", pillar: "O", pipe: "I", groundwater_pipe: "I", dry_barrel: "Ø" }[id] || "";
  const innerRing = id === "wsh" ? `<circle cx="50" cy="50" r="36" fill="none" stroke="white" stroke-dasharray="6 4" stroke-width="4"/>` : "";
  return `${open}<circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${innerRing}${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ""}</svg>`;
}

/** Rastert die SVGs und liefert Map id -> ImageData (fuer map.addImage). */
export async function loadIcons(ids) {
  const out = new Map();
  for (const id of ids) {
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgFor(id));
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = ICON_PX;
    canvas.height = ICON_PX;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, ICON_PX, ICON_PX);
    out.set(id, ctx.getImageData(0, 0, ICON_PX, ICON_PX));
  }
  return out;
}
