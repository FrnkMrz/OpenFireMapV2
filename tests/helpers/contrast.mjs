// Eigene Kontrastprüfung für Panels über der Karte (WCAG 1.4.3 Text, 1.4.11 Symbole).
// axe kann halbtransparente Flächen über Kartenkacheln nicht auswerten (keine Treffer, auch bei offenen Dialogen),
// darum wird hier der Hintergrund selbst berechnet: Karte als einfarbiger Untergrund (Worst Case: weiß oder schwarz),
// darüber die Hintergrundfarben der Vorfahren mit ihrer Transparenz.

/**
 * Misst alle sichtbaren Texte und Symbole im Dokument und liefert die Stellen unter dem geforderten Kontrast.
 * @param {import('@playwright/test').Page} page
 * @param {'#ffffff'|'#000000'|string} backdrop Farbe unter den Panels
 * @param {{root?: string}} [options] root: nur dieses Element (Selektor) messen, z. B. für Hover-Zustände
 * @returns {Promise<Array<{selector: string, text: string, ratio: number, required: number, fg: string, bg: string, kind: string}>>}
 */
export async function auditContrast(page, backdrop = '#ffffff', { root = null } = {}) {
    return page.evaluate(({ backdropColor, rootSelector }) => {
        const parse = (value) => {
            const hexMatch = /^#([0-9a-f]{6})$/i.exec(value);
            if (hexMatch) {
                const n = parseInt(hexMatch[1], 16);
                return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
            }
            const m = /rgba?\(([^)]+)\)/.exec(value);
            if (!m) return null;
            const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
            return { r, g, b, a };
        };
        const over = (top, bottom) => {
            const a = top.a + bottom.a * (1 - top.a);
            if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
            const mix = (t, b2) => (t * top.a + b2 * bottom.a * (1 - top.a)) / a;
            return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
        };
        const lum = ({ r, g, b }) => {
            const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const ratio = (c1, c2) => {
            const [a, b] = [lum(c1), lum(c2)].sort((x, y) => y - x);
            return (a + 0.05) / (b + 0.05);
        };
        const hex = (c) => `#${[c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
        const visible = (el) => {
            const s = getComputedStyle(el);
            if (s.visibility === 'hidden' || s.display === 'none') return false;
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return false;
            for (let n = el; n; n = n.parentElement) {
                if (getComputedStyle(n).display === 'none' || n.hasAttribute('inert') && false) return false;
                if (parseFloat(getComputedStyle(n).opacity) === 0) return false;
            }
            return true;
        };
        const describe = (el) => el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;

        // Hintergrund: Karte als Untergrund, darüber alle Vorfahren ab dem ersten Overlay-Element
        const backgroundOf = (el) => {
            const chain = [];
            for (let n = el; n && n !== document.documentElement; n = n.parentElement) chain.push(n);
            chain.reverse();
            let base = parse(backdropColor) || { r: 255, g: 255, b: 255, a: 1 };
            base = { ...base, a: 1 };
            let started = false;
            for (const n of chain) {
                // body, main und der Karten-Container liegen auf/unter der Karte: ihr Ersatz-Hintergrund (#1e293b) darf den
                // gewählten Untergrund (Kacheln) nicht verdecken; erst Overlay-Elemente zählen
                if (!started && (n === document.body || n.tagName === 'MAIN' || n.id === 'map')) continue;
                started = true;
                const s = getComputedStyle(n);
                const bg = parse(s.backgroundColor);
                if (bg && bg.a > 0) {
                    const op = parseFloat(s.opacity);
                    base = over({ ...bg, a: bg.a * (Number.isNaN(op) ? 1 : op) }, base);
                }
            }
            return base;
        };
        const opacityOf = (el) => {
            let o = 1;
            for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
            return o;
        };

        const findings = [];
        const seen = new Set();

        // Text: jeder Textknoten mit sichtbarem Inhalt
        const scope = (rootSelector && document.querySelector(rootSelector)) || document.body;
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (!text) continue;
            const el = node.parentElement;
            if (!el || seen.has(el) || ['SCRIPT', 'STYLE', 'OPTION'].includes(el.tagName)) continue;
            // Marker-Symbole (SVG) und Texte mit weißem Rand (Radius-Label, Distanz-Label) haben eigene Flächen: dort
            // gilt der Hintergrund aus dem CSS nicht (Marker-Farben prüft test/marker-colors.test.js)
            if (el.closest('.sr-only, svg, .range-label, .distance-label-icon')) continue;
            // Der Skip-Link liegt außerhalb des Bildschirms und zählt nur, solange er den Fokus hat (dann ist er sichtbar)
            if (el.closest('.skip-link') && !el.closest('.skip-link').matches(':focus')) continue;
            if (!visible(el)) continue;
            seen.add(el);
            const s = getComputedStyle(el);
            const fgRaw = parse(s.color);
            if (!fgRaw) continue;
            const bg = backgroundOf(el);
            const fg = over({ ...fgRaw, a: fgRaw.a * opacityOf(el) }, bg);
            const size = parseFloat(s.fontSize);
            const bold = parseInt(s.fontWeight, 10) >= 700;
            const large = size >= 24 || (size >= 18.66 && bold);
            const required = large ? 3 : 4.5;
            const r = ratio(fg, bg);
            if (r < required) findings.push({ kind: 'text', selector: describe(el), text: text.slice(0, 40), ratio: Math.round(r * 100) / 100, required, fg: hex(fg), bg: hex(bg) });
        }

        // Platzhaltertexte leerer Eingabefelder
        for (const input of scope.querySelectorAll('input[placeholder], textarea[placeholder]')) {
            if (input.value || !visible(input)) continue;
            const fgRaw = parse(getComputedStyle(input, '::placeholder').color);
            if (!fgRaw) continue;
            const bg = backgroundOf(input);
            const fg = over({ ...fgRaw, a: fgRaw.a * opacityOf(input) }, bg);
            const r = ratio(fg, bg);
            if (r < 4.5) findings.push({ kind: 'placeholder', selector: describe(input), text: input.placeholder.slice(0, 40), ratio: Math.round(r * 100) / 100, required: 4.5, fg: hex(fg), bg: hex(bg) });
        }

        // Symbole (SVG, die Bedeutung tragen): mindestens 3:1
        for (const svg of scope.querySelectorAll('svg')) {
            if (!visible(svg) || svg.closest('.leaflet-marker-icon, .leaflet-overlay-pane, .sr-only')) continue;
            const control = svg.closest('button, a');
            if (!control || !visible(control)) continue;
            const hasOwnText = [...control.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
            const s = getComputedStyle(svg);
            const fgRaw = parse(s.color);
            if (!fgRaw) continue;
            const bg = backgroundOf(svg);
            const fg = over({ ...fgRaw, a: fgRaw.a * opacityOf(svg) }, bg);
            const r = ratio(fg, bg);
            if (r < 3) findings.push({ kind: 'icon', selector: describe(control), text: hasOwnText ? 'mit Text' : 'nur Symbol', ratio: Math.round(r * 100) / 100, required: 3, fg: hex(fg), bg: hex(bg) });
        }
        return findings;
    }, { backdropColor: backdrop, rootSelector: root });
}
