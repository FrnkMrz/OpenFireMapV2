// Comic „Der Hydrant, den keiner fand“: Skript, Zeichnungen und Markdown-Quelle aus einer Hand.
//
//   node handouts/feuerwehr-comic/comic.mjs     schreibt img/panel-*.svg und OpenFireMap-Feuerwehr-Comic.md
//   npm run handout:build -- handouts/feuerwehr-comic   baut daraus das PDF
//
// Das Skript (PANELS) ist die einzige Quelle: Bildbeschreibung = Alternativtext und Vorlesefassung,
// Sprechblasen und Bildtexte stehen als echter Text über den Bildern (nicht in die Zeichnung gebrannt).
// Die Zeichnungen sind einfache Vektorgrafik im Stil der Hilfe (hell, Signalrot, Wasserblau).
// Personen, Orte und Einsatz sind erfunden.

import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const C = {
  red: '#d62828', darkRed: '#9b1c1c', blue: '#1d70b8', ink: '#111827', night: '#0f172a', night2: '#1e293b',
  street: '#4b5563', walk: '#6b7280', dayStreet: '#9ca3af', dayWalk: '#d1d5db', sky: '#e0f2fe',
  vest: '#e8f542', reflect: '#cbd5e1', helmet: '#f1f5f9', trousers: '#1f2a44', jacket: '#1f2a44',
  lit: '#fde68a', fire: '#f97316', grass: '#bbf7d0',
};
const SKIN = ['#f2c9a0', '#c98e62', '#8d5a3b', '#f5d7b8'];

/** Deterministischer Zufall, damit die SVGs bei jedem Lauf gleich bleiben. */
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Bausteine ----------

function background({ w, h, night, ground = 380, snow = false, seed = 1 }) {
  const r = rng(seed);
  let s = night
    ? `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.night}"/><stop offset="1" stop-color="${C.night2}"/></linearGradient></defs>`
      + `<rect width="${w}" height="${h}" fill="url(#sky)"/>`
    : `<rect width="${w}" height="${h}" fill="${C.sky}"/>`;
  if (night) {
    for (let i = 0; i < w / 30; i++) s += `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * ground * 0.45).toFixed(0)}" r="${(r() * 1.6 + 0.6).toFixed(1)}" fill="#e2e8f0" opacity="0.7"/>`;
  } else {
    s += `<circle cx="${w - 70}" cy="60" r="30" fill="#fde047"/>`;
  }
  s += `<rect y="${ground - 30}" width="${w}" height="30" fill="${night ? C.walk : C.dayWalk}"/>`;
  s += `<rect y="${ground}" width="${w}" height="${h - ground}" fill="${night ? C.street : C.dayStreet}"/>`;
  s += `<rect y="${ground - 2}" width="${w}" height="4" fill="${night ? '#9ca3af' : '#f8fafc'}"/>`;
  if (snow) {
    s += `<rect y="${ground - 34}" width="${w}" height="8" rx="4" fill="#f8fafc" opacity="0.9"/>`;
    for (let i = 0; i < w / 12; i++) s += `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(r() * 2.2 + 1).toFixed(1)}" fill="#fff" opacity="0.85"/>`;
  }
  return s;
}

function house(x, ground, { w = 160, h = 170, color = '#fca5a5', night = false, fire = false, roof = C.darkRed } = {}) {
  const top = ground - 30 - h;
  const body = night ? shade(color) : color;
  let s = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${body}"/>`;
  s += `<polygon points="${x - 10},${top} ${x + w / 2},${top - 60} ${x + w + 10},${top}" fill="${night ? '#334155' : roof}"/>`;
  const cols = Math.max(2, Math.floor(w / 55));
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < cols; col++) {
      const wx = x + 18 + col * ((w - 36) / cols) + 4;
      const wy = top + 20 + row * 70;
      const isFire = fire && row === 0 && col === cols - 1;
      const fill = isFire ? C.fire : night ? (col + row) % 2 ? C.lit : '#1e293b' : '#e0f2fe';
      s += `<rect x="${wx}" y="${wy}" width="34" height="42" fill="${fill}" stroke="${night ? '#0f172a' : '#fff'}" stroke-width="3"/>`;
      if (isFire) {
        s += `<rect x="${wx}" y="${wy}" width="34" height="42" fill="#fde047" opacity="0.5"/>`;
        s += `<path d="M${wx + 4},${wy} q12,-40 -6,-80 q30,20 24,-60 q34,50 14,140 z" fill="#64748b" opacity="0.6"/>`;
      }
    }
  }
  s += `<rect x="${x + w / 2 - 16}" y="${ground - 30 - 56}" width="32" height="56" fill="${night ? '#1e293b' : '#78350f'}"/>`;
  return s;
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * 0.45).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

function truck(x, ground, { night = false, flip = false } = {}) {
  const g = flip ? `transform="translate(${2 * x + 300},0) scale(-1,1)"` : '';
  let s = `<g ${g}>`;
  const y = ground - 128;
  s += `<rect x="${x}" y="${y}" width="210" height="110" rx="6" fill="${C.red}"/>`;
  s += `<path d="M${x + 210},${y + 18} h58 q22,0 26,26 l6,66 h-90 z" fill="${C.red}"/>`;
  s += `<path d="M${x + 222},${y + 28} h42 q12,0 14,14 l4,28 h-60 z" fill="${night ? '#334155' : '#bae6fd'}"/>`;
  s += `<rect x="${x}" y="${y + 70}" width="300" height="10" fill="#f8fafc"/>`;
  for (let i = 0; i < 4; i++) s += `<rect x="${x + 12 + i * 50}" y="${y + 12}" width="40" height="52" rx="3" fill="${C.darkRed}"/>`;
  s += `<rect x="${x + 236}" y="${y + 6}" width="26" height="12" rx="4" fill="${C.blue}"/>`;
  if (night) s += `<circle cx="${x + 249}" cy="${y + 10}" r="36" fill="${C.blue}" opacity="0.25"/>`;
  for (const wx of [x + 50, x + 250]) {
    s += `<circle cx="${wx}" cy="${ground - 18}" r="22" fill="#111827"/><circle cx="${wx}" cy="${ground - 18}" r="9" fill="#9ca3af"/>`;
  }
  return `${s}</g>`;
}

function car(x, ground, { color = '#2563eb', night = false } = {}) {
  const body = night ? shade(color) : color;
  let s = `<path d="M${x},${ground - 20} v-34 q0,-12 12,-14 l38,-4 l30,-30 h86 l34,32 q32,4 34,18 v32 z" fill="${body}"/>`;
  s += `<path d="M${x + 86},${ground - 98} h40 v28 h-66 z M${x + 132},${ground - 98} h28 l26,28 h-54 z" fill="${night ? '#334155' : '#e0f2fe'}"/>`;
  for (const wx of [x + 44, x + 184]) s += `<circle cx="${wx}" cy="${ground - 18}" r="18" fill="#111827"/><circle cx="${wx}" cy="${ground - 18}" r="7" fill="#9ca3af"/>`;
  return s;
}

/** Hinweisschild für Unterflurhydranten (vereinfacht). */
function hydrantSign(x, y, { scale = 1, fresh = false } = {}) {
  let s = `<g transform="translate(${x},${y}) scale(${scale})">`;
  s += `<rect width="64" height="50" rx="3" fill="${C.red}"/><rect x="6" y="6" width="52" height="38" fill="#fff"/>`;
  s += '<text x="32" y="22" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" text-anchor="middle" fill="#111">H 100</text>';
  s += '<path d="M12,26 h40 M32,26 v12" stroke="#111" stroke-width="2.4"/>';
  s += '<text x="44" y="38" font-family="Helvetica, Arial, sans-serif" font-size="8" font-weight="700" text-anchor="middle" fill="#111">12,7</text>';
  s += '<text x="24" y="42" font-family="Helvetica, Arial, sans-serif" font-size="7" font-weight="700" text-anchor="middle" fill="#111">6,4</text>';
  if (fresh) s += '<path d="M62,-4 l6,-8 M70,4 l9,-3 M56,-8 l1,-9" stroke="#facc15" stroke-width="3" stroke-linecap="round"/>';
  return `${s}</g>`;
}

function signPost(x, ground, { sign = true, fresh = false, scale = 1 } = {}) {
  let s = `<rect x="${x - 3}" y="${ground - 50 - 150 * scale}" width="6" height="${150 * scale + 20}" fill="#94a3b8"/>`;
  if (sign) s += hydrantSign(x - 32 * scale * 1.2, ground - 50 - 150 * scale, { scale: scale * 1.2, fresh });
  else s += `<rect x="${x - 20}" y="${ground - 46 - 150 * scale}" width="40" height="5" fill="#64748b"/><circle cx="${x - 14}" cy="${ground - 36 - 150 * scale}" r="3" fill="#64748b"/><circle cx="${x + 14}" cy="${ground - 36 - 150 * scale}" r="3" fill="#64748b"/>`;
  return s;
}

function lid(x, y, { night = false, w = 46 } = {}) {
  return `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${w / 6}" fill="${night ? '#1f2937' : '#475569'}" stroke="${night ? '#64748b' : '#1f2937'}" stroke-width="3"/>`
    + `<path d="M${x - w / 4},${y} h${w / 2}" stroke="${night ? '#64748b' : '#94a3b8'}" stroke-width="2"/>`;
}

function pillarHydrant(x, ground) {
  return `<rect x="${x - 12}" y="${ground - 34 - 70}" width="24" height="70" rx="6" fill="${C.red}"/>`
    + `<rect x="${x - 16}" y="${ground - 34 - 76}" width="32" height="12" rx="5" fill="${C.darkRed}"/>`
    + `<rect x="${x - 22}" y="${ground - 34 - 52}" width="44" height="10" rx="4" fill="${C.darkRed}"/>`;
}

function phone(x, y, scale = 1) {
  return `<g transform="translate(${x},${y}) scale(${scale})"><rect width="30" height="54" rx="5" fill="#111827"/>`
    + '<rect x="3" y="5" width="24" height="42" fill="#e5e7eb"/><path d="M3,20 h24 M14,5 v42" stroke="#fff" stroke-width="3"/>'
    + `<circle cx="18" cy="28" r="4" fill="${C.red}"/><circle cx="9" cy="14" r="3" fill="${C.red}"/></g>`;
}

function clipboard(x, y, scale = 1) {
  return `<g transform="translate(${x},${y}) scale(${scale})"><rect width="40" height="52" rx="3" fill="#92400e"/>`
    + '<rect x="4" y="7" width="32" height="42" fill="#fff"/><rect x="13" y="1" width="14" height="8" rx="2" fill="#9ca3af"/>'
    + '<path d="M8,18 h24 M8,26 h24 M8,34 h18 M8,42 h22" stroke="#9ca3af" stroke-width="2"/></g>';
}

function planPoster(x, y, w, h) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="#475569" stroke-width="4"/>`;
  s += `<rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${h - 16}" fill="#fef3c7"/>`;
  for (let i = 1; i < 4; i++) {
    s += `<path d="M${x + 8 + i * (w - 16) / 4},${y + 8} v${h - 16} M${x + 8},${y + 8 + i * (h - 16) / 4} h${w - 16}" stroke="#cbd5e1" stroke-width="1.5"/>`;
  }
  s += `<path d="M${x + 8},${y + h * 0.6} q${w * 0.3},-${h * 0.2} ${w - 16},-${h * 0.1}" stroke="#93c5fd" stroke-width="7" fill="none"/>`;
  const r = rng(w + h);
  for (let i = 0; i < 9; i++) s += `<circle cx="${(x + 16 + r() * (w - 32)).toFixed(0)}" cy="${(y + 16 + r() * (h - 32)).toFixed(0)}" r="4" fill="${C.red}"/>`;
  return s;
}

/**
 * Person, Fußpunkt (x, ground). Optionen: kind 'ff' (Feuerwehr, Helm) | 'youth' (Warnweste) | 'adult' (Warnweste),
 * pose 'stand' | 'point' | 'wave' | 'hold' | 'kneel' | 'run', dir 1 (nach rechts) | -1, scale, skin, hair, item.
 */
function person(x, ground, o = {}) {
  const { kind = 'ff', pose = 'stand', dir = 1, scale = 1, skin = SKIN[0], hair = '#3f2a1d', item = null, night = false } = o;
  const kneel = pose === 'kneel';
  const legH = kneel ? 30 : 64;
  const hip = -legH;
  const bodyH = 62;
  const sh = hip - bodyH + 8;
  const headY = hip - bodyH - 16;
  const jacket = kind === 'ff' ? C.jacket : kind === 'youth' ? '#334155' : '#475569';
  const trousers = kind === 'ff' ? C.trousers : '#1e3a5f';
  const k = scale * 1.3; // Grundgröße: im Druck sollen Gesichter erkennbar sein
  let s = `<g transform="translate(${x},${ground}) scale(${dir * k},${k})">`;
  // Beine
  if (kneel) {
    s += `<path d="M-6,${hip} l-4,26 h-30 M8,${hip} l26,4 l0,26" stroke="${trousers}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  } else if (pose === 'run') {
    s += `<path d="M-4,${hip} l-22,34 l-6,28 M6,${hip} l18,30 l20,20" stroke="${trousers}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  } else {
    s += `<path d="M-8,${hip} v${legH - 4} M8,${hip} v${legH - 4}" stroke="${trousers}" stroke-width="15" stroke-linecap="round"/>`;
    s += `<path d="M-14,-6 h14 M2,-6 h16" stroke="#111827" stroke-width="9" stroke-linecap="round"/>`;
  }
  if (kind === 'ff' && !kneel && pose !== 'run') s += `<path d="M-15,${hip + 34} h14 M1,${hip + 34} h14" stroke="${C.vest}" stroke-width="4"/>`;
  // Körper
  s += `<rect x="-20" y="${hip - bodyH}" width="40" height="${bodyH + 6}" rx="12" fill="${jacket}"/>`;
  if (kind === 'ff') {
    s += `<rect x="-20" y="${hip - 22}" width="40" height="5" fill="${C.vest}"/><rect x="-20" y="${hip - 14}" width="40" height="3" fill="${C.reflect}"/>`;
  } else {
    s += `<path d="M-20,${hip - bodyH + 10} h40 v${bodyH - 8} h-40 z" fill="${C.vest}"/><path d="M-20,${hip - 24} h40 M-20,${hip - 14} h40" stroke="${C.reflect}" stroke-width="4"/>`;
  }
  // Arme
  const arm = (d) => `<path d="${d}" stroke="${jacket}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  const hand = (hx, hy) => `<circle cx="${hx}" cy="${hy}" r="6" fill="${skin}"/>`;
  if (pose === 'point') {
    s += arm(`M10,${sh} l46,-10`) + hand(60, sh - 11) + arm(`M-10,${sh} l-8,44`);
  } else if (pose === 'wave') {
    s += arm(`M10,${sh} l22,-34`) + hand(34, sh - 38) + arm(`M-10,${sh} l-8,44`);
  } else if (pose === 'hold' || kneel) {
    s += arm(`M10,${sh} l20,22 l14,-6`) + arm(`M-10,${sh} l14,26 l22,-6`) + hand(44, sh + 15);
  } else if (pose === 'run') {
    s += arm(`M10,${sh} l26,16`) + arm(`M-10,${sh} l-24,24`) + hand(38, sh + 18);
  } else {
    s += arm(`M10,${sh} l8,44`) + arm(`M-10,${sh} l-8,44`);
  }
  if (item === 'lamp') s += `<rect x="40" y="${sh + 6}" width="18" height="10" rx="3" fill="#111827"/>`;
  if (item === 'phone') s += `<g transform="translate(40,${sh - 6}) scale(0.7)"><rect width="30" height="54" rx="5" fill="#111827"/><rect x="3" y="5" width="24" height="42" fill="#bfdbfe"/></g>`;
  if (item === 'clipboard') s += clipboard(32, sh - 6, 0.75);
  if (item === 'tablet') s += `<rect x="30" y="${sh - 10}" width="36" height="46" rx="4" fill="#111827"/><rect x="33" y="${sh - 6}" width="30" height="38" fill="#fef3c7"/><circle cx="50" cy="${sh + 12}" r="4" fill="${C.red}"/>`;
  // Kopf
  s += `<circle cx="0" cy="${headY}" r="19" fill="${skin}"/>`;
  s += `<circle cx="8" cy="${headY - 2}" r="2.4" fill="#111827"/><circle cx="-2" cy="${headY - 2}" r="2.4" fill="#111827"/>`;
  s += `<path d="M0,${headY + 8} q6,4 11,0" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  if (kind === 'ff') {
    s += `<path d="M-22,${headY - 4} q2,-26 22,-26 q22,0 24,26 z" fill="${C.helmet}" stroke="#94a3b8" stroke-width="2"/>`;
    s += `<rect x="-24" y="${headY - 6}" width="50" height="5" rx="2" fill="#94a3b8"/>`;
    if (night) s += `<rect x="-22" y="${headY - 14}" width="44" height="3" fill="${C.vest}"/>`;
  } else {
    s += `<path d="M-20,${headY - 2} q0,-24 20,-24 q20,0 20,18 q-14,-8 -26,-4 q-6,2 -14,10 z" fill="${hair}"/>`;
  }
  return `${s}</g>`;
}

function beam(x1, y1, x2, y2, spread = 40) {
  return `<polygon points="${x1},${y1} ${x2 - spread},${y2} ${x2 + spread},${y2}" fill="#fde68a" opacity="0.35"/>`;
}

function svg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>\n`;
}

// ---------- Skript ----------
// Jedes Panel: id, wide (doppelte Breite), Bildbeschreibung (alt), caption (Bildtext), bubbles (Sprechblasen mit Lage in %).

export const PANELS = [
  {
    id: 1, wide: true,
    alt: 'Nacht in einer Wohnstraße. In einem Fenster im ersten Stock brennt es, Rauch steigt auf. Ein Löschfahrzeug steht auf der Straße, davor zwei Einsatzkräfte. Der Gruppenführer zeigt die Straße entlang.',
    caption: 'Nachts, 2:14 Uhr. Zimmerbrand in der Lindenstraße.',
    bubbles: [{ who: 'Gruppenführer', text: 'Wasser! Wo ist der nächste Hydrant?', x: 52, y: 12, w: 28, tail: 'left' }],
    draw: () => {
      const w = 1230, h = 500, g = 420;
      return svg(w, h, background({ w, h, night: true, ground: g, seed: 11 })
        + house(40, g, { w: 220, h: 190, color: '#fdba74', night: true })
        + house(300, g, { w: 240, h: 200, color: '#fca5a5', night: true, fire: true })
        + house(900, g, { w: 260, h: 180, color: '#a5b4fc', night: true })
        + truck(580, g + 60, { night: true })
        + person(500, g + 64, { pose: 'point', dir: -1, skin: SKIN[0], night: true })
        + person(960, g + 64, { pose: 'stand', dir: -1, skin: SKIN[2], night: true }));
    },
  },
  {
    id: 2,
    alt: 'Es schneit. Der Maschinist leuchtet mit der Taschenlampe den Gehweg neben einem geparkten Auto ab.',
    caption: null,
    bubbles: [{ who: 'Maschinist', text: 'Hier muss doch irgendwo einer sein …', x: 6, y: 6, w: 52, tail: 'right' }],
    draw: () => {
      const w = 600, h = 500, g = 420;
      return svg(w, h, background({ w, h, night: true, ground: g, snow: true, seed: 22 })
        + car(250, g + 30, { color: '#2563eb', night: true })
        + beam(206, 268, 260, g - 20, 60)
        + person(150, g + 50, { pose: 'hold', item: 'lamp', skin: SKIN[1], night: true }));
    },
  },
  {
    id: 3,
    alt: 'Der Maschinist kniet am Bordstein. Am Mast daneben fehlt das Hinweisschild, nur die leere Halterung ist zu sehen. Unter dem geparkten Auto schaut ein Hydrantendeckel hervor.',
    caption: null,
    bubbles: [{ who: 'Maschinist', text: 'Kein Schild – und der Deckel ist unter dem Auto!', x: 4, y: 6, w: 56, tail: 'right' }],
    draw: () => {
      const w = 600, h = 500, g = 420;
      return svg(w, h, background({ w, h, night: true, ground: g, snow: true, seed: 33 })
        + signPost(540, g, { sign: false })
        + lid(330, g + 44, { night: true, w: 60 })
        + car(260, g + 36, { color: '#2563eb', night: true })
        + beam(196, 330, 330, g + 40, 30)
        + person(150, g + 50, { pose: 'kneel', item: 'lamp', skin: SKIN[1], night: true }));
    },
  },
  {
    id: 4,
    alt: 'Zwei Einsatzkräfte laufen mit einem Schlauch von einem roten Überflurhydranten am Ende der Straße Richtung Einsatzstelle. Der Schlauch zieht sich lang über den Gehweg.',
    caption: 'Das Wasser kommt vom Überflurhydranten zwei Straßen weiter. Das kostet Minuten. Diesmal geht es gut.',
    bubbles: [],
    draw: () => {
      const w = 600, h = 500, g = 420;
      return svg(w, h, background({ w, h, night: true, ground: g, seed: 44 })
        + house(380, g, { w: 200, h: 160, color: '#fdba74', night: true })
        + pillarHydrant(70, g + 4)
        + '<path d="M82,330 q60,40 140,30 t160,40 t120,10" stroke="#f5f5f4" stroke-width="7" fill="none" stroke-linecap="round"/>'
        + person(280, g + 60, { pose: 'run', skin: SKIN[3], night: true })
        + person(420, g + 66, { pose: 'run', skin: SKIN[0], night: true }));
    },
  },
  {
    id: 5,
    alt: 'Eine Woche später im Gerätehaus. An der Wand hängt ein Ortsplan. Die Jugendwartin steht davor, drei Jugendliche hören zu, einer meldet sich.',
    caption: 'Eine Woche später, Jugendfeuerwehr.',
    bubbles: [
      { who: 'Jugendwartin', text: 'Wer findet die Hydranten im Ort, bevor sie jemand im Einsatz sucht?', x: 3, y: 20, w: 52, tail: 'right' },
      { who: 'Jugendlicher', text: 'Mit dem Handy? Ich bin dabei!', x: 61, y: 20, w: 36, tail: 'left' },
    ],
    draw: () => {
      const w = 600, h = 500;
      return svg(w, h, `<rect width="${w}" height="${h}" fill="#f1f5f9"/><rect y="420" width="${w}" height="80" fill="#cbd5e1"/>`
        + planPoster(20, 190, 170, 130)
        + person(250, 470, { kind: 'adult', pose: 'stand', dir: 1, skin: SKIN[3], hair: '#7c2d12' })
        + person(380, 478, { kind: 'youth', pose: 'wave', dir: -1, scale: 0.8, skin: SKIN[2], hair: '#111827' })
        + person(465, 478, { kind: 'youth', pose: 'stand', dir: -1, scale: 0.78, skin: SKIN[0], hair: '#a16207' })
        + person(545, 478, { kind: 'youth', pose: 'stand', dir: -1, scale: 0.76, skin: SKIN[1], hair: '#1f2937' }));
    },
  },
  {
    id: 6,
    alt: 'Tag, Wohnstraße. Zwei Jugendliche in Warnwesten stehen vor einem Mast mit Hydrantenschild H 100, darunter die Zahlen 12,7 und 6,4. Eine zeigt nach rechts, auf dem Gehweg liegt ein Hydrantendeckel.',
    caption: 'Der Rundgang.',
    bubbles: [
      { who: 'Jugendliche', text: '12,7 Meter nach rechts, 6,4 nach vorn …', x: 38, y: 5, w: 36, tail: 'left' },
      { who: 'Jugendlicher', text: 'Da ist der Deckel!', x: 66, y: 36, w: 30, tail: 'left' },
    ],
    draw: () => {
      const w = 600, h = 500, g = 420;
      return svg(w, h, background({ w, h, night: false, ground: g, seed: 66 })
        + signPost(120, g, { sign: true, scale: 1.1 })
        + lid(470, g - 14, { w: 54 })
        + person(220, g + 50, { kind: 'youth', pose: 'point', scale: 0.9, skin: SKIN[2], hair: '#111827' })
        + person(330, g + 56, { kind: 'youth', pose: 'stand', scale: 0.86, skin: SKIN[0], hair: '#a16207' }));
    },
  },
  {
    id: 7,
    alt: 'Ein Jugendlicher steht etwa drei Meter vor dem Hydrantendeckel und richtet das Handy darauf. Daneben steht ein Betreuer in Warnweste und schaut auf die Straße, auf der ein Auto vorbeifährt.',
    caption: null,
    bubbles: [
      { who: 'Jugendlicher', text: 'Unterflur, Gehweg … hochgeladen!', x: 4, y: 8, w: 46, tail: 'right' },
      { who: 'Betreuer', text: 'Und ich achte auf die Autos.', x: 52, y: 8, w: 40, tail: 'left' },
    ],
    draw: () => {
      const w = 600, h = 500, g = 420;
      return svg(w, h, background({ w, h, night: false, ground: g, seed: 77 })
        + lid(270, g - 14, { w: 54 })
        + person(400, g - 6, { kind: 'adult', pose: 'stand', dir: 1, scale: 0.95, skin: SKIN[1], hair: '#1f2937' })
        + car(450, g + 72, { color: '#16a34a' })
        + person(100, g + 50, { kind: 'youth', pose: 'hold', item: 'phone', scale: 0.88, skin: SKIN[0], hair: '#a16207' }));
    },
  },
  {
    id: 8,
    alt: 'Zurück in der Lindenstraße, bei Tag. Am Mast fehlt das Schild. Eine Jugendliche schreibt auf ein Klemmbrett.',
    caption: null,
    bubbles: [{ who: 'Jugendliche', text: 'Schild fehlt: Das kommt auf die Mängelliste, nicht in die Karte.', x: 4, y: 6, w: 60, tail: 'right' }],
    draw: () => {
      const w = 600, h = 500, g = 420;
      return svg(w, h, background({ w, h, night: false, ground: g, seed: 88 })
        + signPost(470, g, { sign: false })
        + lid(370, g - 14, { w: 54 })
        + person(220, g + 50, { kind: 'youth', pose: 'hold', item: 'clipboard', scale: 0.9, skin: SKIN[2], hair: '#111827' }));
    },
  },
  {
    id: 9,
    alt: 'Ein paar Wochen später: Am Mast in der Lindenstraße hängt ein neues, glänzendes Hydrantenschild. Der Gehweg vor dem Deckel ist frei.',
    caption: 'Ein paar Wochen später: Die Gemeinde hat ein neues Schild aufgehängt.',
    bubbles: [],
    draw: () => {
      const w = 600, h = 500, g = 420;
      return svg(w, h, background({ w, h, night: false, ground: g, seed: 99 })
        + house(40, g, { w: 200, h: 180, color: '#fca5a5' })
        + signPost(450, g, { sign: true, fresh: true, scale: 1.1 })
        + lid(330, g - 14, { w: 54 }));
    },
  },
  {
    id: 10, wide: true,
    alt: 'Wieder ein Einsatz bei Nacht. Das Löschfahrzeug hält in der Lindenstraße. Der Maschinist hält ein Tablet mit dem Ortsplan, auf dem der Hydrant als roter Punkt eingetragen ist. Am Mast hängt das neue Schild, der Deckel ist frei.',
    caption: 'Beim nächsten Einsatz.',
    bubbles: [{ who: 'Maschinist', text: 'Lindenstraße, gegenüber Nummer 12. Steht ja im Plan!', x: 4, y: 16, w: 30, tail: 'right' }],
    draw: () => {
      const w = 1230, h = 500, g = 420;
      return svg(w, h, background({ w, h, night: true, ground: g, seed: 110 })
        + house(740, g, { w: 220, h: 190, color: '#fca5a5', night: true })
        + house(990, g, { w: 200, h: 170, color: '#a5b4fc', night: true })
        + truck(330, g + 60, { night: true })
        + signPost(250, g, { sign: true, scale: 1.1 })
        + lid(140, g - 14, { night: true, w: 56 })
        + person(80, g + 50, { pose: 'hold', item: 'tablet', skin: SKIN[1], night: true }));
    },
  },
];

export const FOOTER_LINE = 'Jeder Hydrant zählt. So macht eure Feuerwehr mit: openfiremap.org/help/fire-brigades/';

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Markdown-Quelle des Comics (Seite 1 Comic, Seite 2 Vorlesefassung). */
export function renderComicMarkdown() {
  const panels = PANELS.map((p) => {
    const bubbles = p.bubbles.map((b) => `<p class="bubble tail-${b.tail}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%"><span class="who">${escapeHtml(b.who)}:</span> ${escapeHtml(b.text)}</p>`).join('');
    const caption = p.caption ? `<p class="caption">${escapeHtml(p.caption)}</p>` : '';
    return `<figure class="panel${p.wide ? ' wide' : ''}"><img src="img/panel-${String(p.id).padStart(2, '0')}.svg" alt="${escapeHtml(p.alt)}">${caption}${bubbles}</figure>`;
  }).join('\n');
  const transcript = PANELS.map((p) => {
    const lines = [`${p.id}. **Bild:** ${p.alt}`];
    if (p.caption) lines.push(`   **Text:** ${p.caption}`);
    for (const b of p.bubbles) lines.push(`   **${b.who}:** „${b.text}“`);
    return lines.join('<br>\n');
  }).join('\n');
  return `---
title: Der Hydrant, den keiner fand
subtitle: Ein Comic über Hydranten, Hinweisschilder und den Rundgang der Jugendfeuerwehr
meta: Version 0.9 (vor dem Pilot) · Für Feuerwehren in Deutschland · Personen und Handlung sind erfunden · Lizenz CC BY 4.0, Quelle: OpenFireMap.org
footer: OpenFireMap · Comic „Der Hydrant, den keiner fand“ · CC BY 4.0
---

<!-- Erzeugt von handouts/feuerwehr-comic/comic.mjs. Nicht von Hand ändern, sondern dort das Skript anpassen. -->

<div class="comic">
${panels}
</div>

<p class="claim">${escapeHtml(FOOTER_LINE)}</p>

<div class="pb"></div>

## Der Comic zum Vorlesen

Bildbeschreibung und Text aller Bilder in der Lesereihenfolge.

${transcript}

So geht der Rundgang: Trupp-Karte, Leitfaden und Folien stehen unter openfiremap.org/help/fire-brigades/.
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = dirname(fileURLToPath(import.meta.url));
  for (const p of PANELS) writeFileSync(join(dir, 'img', `panel-${String(p.id).padStart(2, '0')}.svg`), p.draw());
  writeFileSync(join(dir, 'OpenFireMap-Feuerwehr-Comic.md'), renderComicMarkdown());
  console.log(`geschrieben: ${PANELS.length} Bilder und OpenFireMap-Feuerwehr-Comic.md`);
}
