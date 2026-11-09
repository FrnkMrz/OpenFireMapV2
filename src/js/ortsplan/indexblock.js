// Strassenverzeichnis als eigenstaendiger Block (rein, ohne DOM, mit `node --test` pruefbar).
// Der Block weiss selbst, wie viel Platz er braucht: planBlock() bekommt den verfuegbaren Bereich und liefert Spaltenzahl,
// Spaltenbreite, belegte Breite und Hoehe sowie die Aufteilung auf Folgeseiten. Wohin er auf dem Blatt kommt, entscheidet der Aufrufer
// (Seitenleiste, Zeile unter der Karte, Folgeseite); gezeichnet wird ab einem frei waehlbaren Ursprung (x0, y0).
// Alle Masse in Millimetern; die Textbreite kommt als measure(text) von aussen (Canvas im Browser, Naeherung im Test).
import { fillColumns } from "./paginate.js";

/** Bricht einen Strassennamen auf maxW um: erst an Leerzeichen, dann nach Bindestrichen, zuletzt mitten im Wort mit Trennstrich. */
export function wrapName(name, maxW, measure) {
  const pieces = [];
  name.split(" ").forEach((word) => {
    const parts = word.match(/[^-]+-?|-+/g) || [word]; // "Friedrich-von-Schiller-Straße" -> "Friedrich-", "von-", "Schiller-", "Straße"
    parts.forEach((t, k) => pieces.push({ t, sp: k === 0 && pieces.length > 0 }));
  });
  const out = [];
  let cur = "";
  for (const { t, sp } of pieces) {
    const cand = cur ? cur + (sp ? " " : "") + t : t;
    if (measure(cand) <= maxW) { cur = cand; continue; }
    if (cur) { out.push(cur); cur = ""; }
    let w = t;
    while (measure(w) > maxW && w.length > 2) {
      let k = w.length - 1;
      while (k > 1 && measure(`${w.slice(0, k)}-`) > maxW) k--;
      out.push(`${w.slice(0, k)}-`);
      w = w.slice(k);
    }
    cur = w;
  }
  if (cur) out.push(cur);
  return out;
}

/** Planquadrate ("A3, B4, ...") bei vielen Zellen mehrzeilig, jede Zeile hoechstens maxW breit (ein Eintrag steht immer ganz). */
export function wrapRefs(refs, maxW, measure) {
  const out = [];
  let cur = "";
  for (const part of refs.split(", ")) {
    const t = cur ? `${cur}, ${part}` : part;
    if (measure(t) <= maxW || !cur) cur = t; else { out.push(`${cur},`); cur = part; }
  }
  if (cur) out.push(cur);
  return out;
}

/** Liefert fitW(i, breite): Zeilen, Planquadrat-Zeilen und Hoehe des Eintrags i in einer Spalte dieser Breite (zwischengespeichert). */
export function makeFitter({ entries, measure, lineH }) {
  const cache = new Map();
  return (i, width) => {
    const key = `${i}:${width.toFixed(2)}`;
    let v = cache.get(key);
    if (!v) {
      const e = entries[i];
      const refs = wrapRefs(e.cells, width * 0.5, measure);
      const refW = Math.max(...refs.map(measure));
      const lines = wrapName(e.name, Math.max(8, width - refW - 2), measure);
      v = { lines, refs, refW, h: Math.max(lines.length, refs.length) * lineH, width };
      cache.set(key, v);
    }
    return v;
  };
}

const heightOfColumns = (columns, heightOf) => Math.max(0, ...columns.map(([a, b]) => { let s = 0; for (let i = a; i < b; i++) s += heightOf(i); return s; }));

/**
 * Plant den Block fuer `total` Eintraege.
 * @param {object} o
 * @param {number} o.total                  Anzahl Eintraege
 * @param {number} [o.from]                 erster Eintrag, der geplant wird (0 = von vorn; >0, wenn davor schon ein anderer Bereich des Blatts gefuellt wurde)
 * @param {(i:number, w:number)=>{h:number}} o.fitW  Hoehe des Eintrags i in einer Spalte der Breite w (siehe makeFitter)
 * @param {{w:number,h:number}|null} o.box  Platz auf dem Blatt (ohne Ueberschrift); null oder zu klein: nichts steht auf dem Blatt
 * @param {{w:number,h:number}} o.cont      Platz einer Folgeseite
 * @param {number} o.lineH                  Zeilenhoehe
 * @param {number} o.minColW                schmalste lesbare Spalte (darunter bricht der Name mitten im Wort)
 * @param {number} o.idealColW              bevorzugte Spaltenbreite auf Folgeseiten
 * @param {number} o.maxColW                breiteste Spalte (breiter liest sich schlecht, der Block schrumpft stattdessen)
 * @param {number} [o.gap]                  Spaltenabstand auf dem Blatt
 * @param {number} [o.contGap]              Spaltenabstand auf Folgeseiten
 * @param {number} [o.cols]                 feste Spaltenzahl (0 = automatisch)
 * @param {number} [o.minFirst]             weniger Eintraege lohnen auf dem Blatt nicht, dann steht alles auf den Folgeseiten
 * @returns {{first: null | {n:number,colW:number,gap:number,columns:number[][],width:number,height:number},
 *            rest: null | {n:number,colW:number,gap:number,pages:number[][][]}, placedFirst:number}}
 *   Regeln: Passt alles auf das Blatt, wird die kleinste Spaltenzahl genommen (also die breitesten Spalten), die Spalten gleich hoch gefuellt
 *   und der Block nur so gross gemacht wie noetig. Sonst kommen so viele Eintraege wie moeglich auf das Blatt (Spalten nie schmaler als
 *   minColW) und der Rest auf Folgeseiten mit Spalten um idealColW.
 */
export function planBlock({ total, from = 0, fitW, box, cont, lineH, minColW, idealColW, maxColW, gap = 3, contGap = 6, cols = 0, minFirst = 8 }) {
  if (from >= total) return { first: null, rest: null, placedFirst: from };
  const colWFor = (w, n, g) => Math.min(maxColW, (w - (n - 1) * g) / n);
  let first = null;
  let placed = from;
  if (box && box.w > 0 && box.h >= lineH) {
    const nMax = cols > 0 ? cols : Math.max(1, Math.floor((box.w + gap) / (minColW + gap)));
    let best = null;
    for (let n = cols > 0 ? cols : 1; n <= nMax; n++) {
      const colW = colWFor(box.w, n, gap);
      const r = fillColumns(from, total, (i) => fitW(i, colW).h, Array(n).fill(box.h));
      if (r.end >= total) { best = { n, colW, fits: true, end: r.end }; break; } // kleinste Spaltenzahl, die alles aufnimmt
      if (!best || r.end > best.end) best = { n, colW, fits: false, end: r.end };
    }
    if (best && (best.fits || best.end - from >= minFirst)) {
      const { n, colW } = best;
      const heightOf = (i) => fitW(i, colW).h;
      let cap = box.h;
      if (best.fits) {
        // gleich hohe Spalten: kleinste Spaltenhoehe (in Zeilenschritten), in die noch alles passt
        let sum = 0;
        for (let i = from; i < total; i++) sum += heightOf(i);
        for (cap = Math.max(lineH, Math.ceil(sum / n / lineH) * lineH); cap < box.h; cap += lineH) {
          if (fillColumns(from, total, heightOf, Array(n).fill(cap)).end >= total) break;
        }
        cap = Math.min(cap, box.h);
      }
      const r = fillColumns(from, total, heightOf, Array(n).fill(cap));
      placed = r.end;
      first = { n, colW, gap, columns: r.cols, width: r.cols.length * colW + (r.cols.length - 1) * gap, height: heightOfColumns(r.cols, heightOf) };
    }
  }
  let rest = null;
  if (placed < total) {
    const nMaxC = Math.max(1, Math.floor((cont.w + contGap) / (minColW + contGap)));
    const n = cols > 0 ? cols : Math.min(nMaxC, Math.max(1, Math.round((cont.w + contGap) / (idealColW + contGap))));
    const colW = colWFor(cont.w, n, contGap);
    const heightOf = (i) => fitW(i, colW).h;
    const pages = [];
    const capFull = Math.max(cont.h, lineH);
    for (let start = placed; start < total;) {
      let r = fillColumns(start, total, heightOf, Array(n).fill(capFull), false);
      if (r.end >= total) {
        // letzte Seite: gleich hohe Spalten ueber die ganze Breite statt einer langen Spalte links (kleinste Hoehe in Zeilenschritten, in die alles passt)
        let sum = 0;
        for (let i = start; i < total; i++) sum += heightOf(i);
        for (let cap = Math.max(lineH, Math.ceil(sum / n / lineH) * lineH); cap < capFull; cap += lineH) {
          const t = fillColumns(start, total, heightOf, Array(n).fill(cap), false);
          if (t.end >= total) { r = t; break; }
        }
      }
      pages.push(r.cols);
      start = r.end;
    }
    rest = { n, colW, gap: contGap, pages };
  }
  return { first, rest, placedFirst: placed };
}

/** Zeichnet eine Spaltenliste ab (x0, y0). tf(text, x, y, size, opts) setzt Text; gc ist die Zeichenflaeche (fuer die Punktlinie). */
export function drawColumns({ gc, tf, fitW, columns, colW, gap, x0, y0, fsI, isz, lineH }) {
  columns.forEach(([from, to], ci) => {
    let y = y0;
    const cx = x0 + ci * (colW + gap);
    for (let i = from; i < to; i++) {
      const f = fitW(i, colW);
      f.lines.forEach((l, k) => tf(l, cx, y + k * lineH, fsI));
      f.refs.forEach((l, k) => tf(l, cx + colW, y + k * lineH, fsI, { align: "right", color: "#333" }));
      // Punktlinie (Leitlinie) zwischen Name und Planquadraten, damit das Auge nicht springen muss
      gc.font = `${fsI}px 'Noto Sans', 'Liberation Sans', Arial, sans-serif`;
      const nameEnd = cx + gc.measureText(f.lines[0]).width + 1.2;
      const refStart = cx + colW - gc.measureText(f.refs[0]).width - 1.2;
      if (f.lines.length === 1 && refStart - nameEnd > 2.5) {
        gc.save(); gc.strokeStyle = "#8c8c8c"; gc.lineWidth = 0.16 * isz; gc.lineCap = "round"; gc.setLineDash([0.01, 0.75 * isz]);
        gc.beginPath(); gc.moveTo(nameEnd, y - 0.45 * isz); gc.lineTo(refStart, y - 0.45 * isz); gc.stroke(); gc.restore();
      }
      y += f.h;
    }
  });
}
