/**
 * ==========================================================================================
 * DATEI: status/charts.js
 * ZWECK: SVG-Diagramme der Statusseite: Zeitleiste (OSM-Stand → Upload je Land) und
 *        Hydranten-Dichte (Balken). Ohne Diagramm-Bibliothek; Farben kommen aus CSS-Variablen
 *        (hell/dunkel, siehe status.css).
 * ==========================================================================================
 */

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

/** Farbe der Diagramm-Reihe (CSS-Variable, folgt dem Farbschema). */
const SERIES = 'var(--series)';

/** Breite der längsten Beschriftung, im Browser gemessen (Rückfall: grobe Schätzung). */
function maxTextWidth(svg, texts) {
  const probe = el('text', { x: -999, y: -999 });
  svg.appendChild(probe);
  let w = 0;
  for (const t of texts) {
    probe.textContent = t;
    const len = typeof probe.getComputedTextLength === 'function' ? probe.getComputedTextLength() : 0;
    w = Math.max(w, len || String(t).length * 6.2);
  }
  probe.remove();
  return Math.ceil(w);
}

function makeTip(box) {
  const tip = document.createElement('div');
  tip.className = 'st-tip';
  tip.hidden = true;
  box.appendChild(tip);
  return {
    show(lines, ev) {
      tip.replaceChildren(...lines.map((line, i) => {
        const d = document.createElement('div');
        if (i === 0) d.className = 'st-tip-h';
        d.textContent = line;
        return d;
      }));
      tip.hidden = false;
      const b = box.getBoundingClientRect();
      let x = ev.clientX - b.left + 12;
      let y = ev.clientY - b.top + 12;
      if (x + tip.offsetWidth > b.width) x = ev.clientX - b.left - tip.offsetWidth - 12;
      if (y + tip.offsetHeight > b.height) y = b.height - tip.offsetHeight;
      tip.style.left = `${Math.max(0, x)}px`;
      tip.style.top = `${Math.max(0, y)}px`;
    },
    hide() { tip.hidden = true; }
  };
}

function linearTicks(min, max, count) {
  // Mitternacht-Ticks (UTC) zwischen min und max; bei wenig Platz jeden n-ten Tag
  const day = 864e5;
  const first = Math.ceil(min / day) * day;
  const all = [];
  for (let t = first; t <= max; t += day) all.push(t);
  const step = Math.max(1, Math.ceil(all.length / Math.max(1, count)));
  return all.filter((_, i) => i % step === 0);
}

/**
 * Zeitleiste, eine Zeile je Land. rows: [{id, osmMs, uploadMs, lagH, ...}]
 * ctx: {t, fmt, name(row), width}
 */
export function renderTimeline(box, rows, ctx) {
  const { t, fmt } = ctx;
  const W = Math.max(ctx.width || box.clientWidth, 320);
  const svg = el('svg', { role: 'img', 'aria-label': t('tl_aria'), width: '100%' });
  box.replaceChildren(svg);
  if (!rows.length) return;
  const left = maxTextWidth(svg, rows.map(ctx.name)) + 14;
  const right = 14, top = 24, rowH = 19;
  const H = top + rows.length * rowH + 4;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const t0 = Math.min(...rows.map((r) => r.osmMs)) - 6 * 36e5;
  const t1 = Math.max(...rows.map((r) => r.uploadMs)) + 6 * 36e5;
  const x = (ms) => left + ((ms - t0) / (t1 - t0)) * (W - left - right);
  for (const tick of linearTicks(t0, t1, Math.floor((W - left - right) / 80))) {
    svg.appendChild(el('line', { x1: x(tick), x2: x(tick), y1: top - 6, y2: H - 4, class: 'st-gridline' }));
    svg.appendChild(el('text', { x: x(tick), y: 12, 'text-anchor': 'middle', class: 'st-axis' }, fmt.dtick(tick)));
  }
  const tip = makeTip(box);
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    const cy = y + rowH / 2;
    svg.appendChild(el('text', { x: left - 10, y: cy + 4, 'text-anchor': 'end', class: 'st-axis' }, ctx.name(r)));
    svg.appendChild(el('line', { x1: x(r.osmMs), x2: x(r.uploadMs), y1: cy, y2: cy, stroke: SERIES, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.55 }));
    svg.appendChild(el('circle', { cx: x(r.osmMs), cy, r: 4, class: 'st-dot-osm', stroke: SERIES }));
    svg.appendChild(el('circle', { cx: x(r.uploadMs), cy, r: 4.5, fill: SERIES }));
    const hit = el('rect', { x: 0, y, width: W, height: rowH, fill: 'transparent' });
    hit.addEventListener('mousemove', (ev) => tip.show([
      ctx.name(r),
      `${t('tip_osm')}${fmt.dshort(r.osmMs)} UTC`,
      `${t('tip_up')}${fmt.dshort(r.uploadMs)} UTC`,
      `${t('tip_lag')}${fmt.d1(r.lagH)} h`
    ], ev));
    hit.addEventListener('mouseleave', () => tip.hide());
    svg.appendChild(hit);
  });
}

/**
 * Balkendiagramm einer Kennzahl je Einwohner, ein Balken je Land, absteigend sortiert.
 * rows: nur Länder mit Wert. average: Gesamtwert (gestrichelte Linie).
 * ctx: {t, fmt, name(row), value(row), format(v), tip(row) → Zeilen, ariaKey, width}
 */
export function renderDensity(box, rows, average, ctx) {
  const { t } = ctx;
  const W = Math.max(ctx.width || box.clientWidth, 320);
  const svg = el('svg', { role: 'img', 'aria-label': t(ctx.ariaKey), width: '100%' });
  box.replaceChildren(svg);
  if (!rows.length) return;
  const left = maxTextWidth(svg, rows.map(ctx.name)) + 12;
  const right = maxTextWidth(svg, rows.map((r) => ctx.format(ctx.value(r)))) + 12;
  const top = 22, rowH = 20;
  const H = top + rows.length * rowH + 4;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const max = Math.max(...rows.map(ctx.value), average ?? 0);
  const x = (v) => left + (v / max) * (W - left - right);
  const tip = makeTip(box);
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    const cy = y + rowH / 2;
    const v = ctx.value(r);
    svg.appendChild(el('text', { x: left - 8, y: cy + 4, 'text-anchor': 'end', class: 'st-axis' }, ctx.name(r)));
    svg.appendChild(el('rect', { x: left, y: cy - 6, width: Math.max(2, x(v) - left), height: 12, rx: 4, fill: SERIES }));
    svg.appendChild(el('text', { x: x(v) + 6, y: cy + 4, class: 'st-value' }, ctx.format(v)));
    const hit = el('rect', { x: 0, y, width: W, height: rowH, fill: 'transparent' });
    hit.addEventListener('mousemove', (ev) => tip.show([ctx.name(r), ...ctx.tip(r)], ev));
    hit.addEventListener('mouseleave', () => tip.hide());
    svg.appendChild(hit);
  });
  if (average != null) {
    svg.appendChild(el('line', { x1: x(average), x2: x(average), y1: top - 4, y2: H - 2, class: 'st-ref' }));
    svg.appendChild(el('text', { x: Math.min(x(average), W - 60), y: 11, 'text-anchor': 'middle', class: 'st-axis' }, `Ø ${ctx.format(average)}`));
  }
}

/** Gestapelte Zeitleiste des Builds: Download und Extraktion. */
export function renderRunBar(box, run, ctx) {
  const seg = (label, sec, color) => {
    const d = document.createElement('div');
    d.style.flex = `${sec} 1 0`;
    d.style.background = color;
    d.textContent = `${label} ${ctx.fmt.sec(sec)}`;
    return d;
  };
  box.replaceChildren(
    seg(ctx.t('r_bar_dl'), run.download_sec, 'var(--bar-a)'),
    seg(ctx.t('r_bar_ex'), run.extraction_sec, 'var(--bar-b)')
  );
}
