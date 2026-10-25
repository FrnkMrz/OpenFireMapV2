// Symbole 1:1 aus der App: SVG-Texte wie in getSVGContent() (src/js/map.js), Farben wie Config.colors.
export const ICON_PX = 200;

const C = { station: "#dc2626", hydrant: "#dc2626", water: "#2563eb", defib: "#15803d" };
const WATER_TYPES = ["water_tank", "cistern", "fire_water_pond", "suction_point"];
export const isWaterType = (type) => WATER_TYPES.includes(type);

/** Icon-ID zu einem App-"type" (station, defibrillator, Hydranten-/Wasser-Typ). */
export function iconIdForType(type) {
  if (type === "station" || type === "defibrillator") return type;
  if (isWaterType(type)) return "water";
  if (["underground", "pillar", "pipe", "dry_barrel", "wall", "wsh"].includes(type)) return type;
  return "plain";
}

/** SVG-Text; id: station | defibrillator | water | wall | underground | wsh | pillar | pipe | dry_barrel | plain | badge-N */
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
  const color = id === "water" ? C.water : C.hydrant;
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
  const char = { underground: "U", wsh: "W", pillar: "O", pipe: "I", dry_barrel: "Ø" }[id] || "";
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
