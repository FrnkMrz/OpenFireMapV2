/**
 * Hilfe-Bereich (/help/): kleine Verbesserungen über dem statischen HTML. Ohne Skript bleibt alles lesbar
 * (Erklärungen stehen als Liste da, nur die Nummern im Bild fehlen).
 *
 * - Kopfzeile: Linie beim Scrollen, Themenmenü auf schmalen Bildschirmen
 * - Erklärer „Jeder Knopf erklärt“: Nummer im Bild und Eintrag in der Liste sind gekoppelt
 * - Tabs Computer/Smartphone mit Pfeiltasten
 * - E-Mail-Adresse kopieren
 */

function initHeader() {
  const top = document.getElementById('top');
  if (top) {
    const onScroll = () => top.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const btn = document.getElementById('menu-btn');
  const nav = document.getElementById('nav');
  if (!btn || !nav) return;
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); btn.focus(); }
  });
}

export function initExplorer(panel) {
  const items = [...panel.querySelectorAll('.legend button')];
  const spots = [...panel.querySelectorAll('.spot')];

  // Lage der Nummern aus data-x/data-y (Prozent). Per CSSOM, weil die CSP keine style-Attribute zulässt.
  for (const spot of spots) {
    const x = Number(spot.dataset.x), y = Number(spot.dataset.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    spot.style.left = `${Math.min(97, Math.max(3, x))}%`;
    spot.style.top = `${Math.min(97, Math.max(3, y))}%`;
    spot.classList.add('is-placed');
  }

  const select = (index) => {
    items.forEach((b, k) => b.setAttribute('aria-pressed', String(k === index)));
    spots.forEach((s, k) => s.classList.toggle('active', k === index));
  };
  items.forEach((b, i) => {
    b.addEventListener('click', () => select(i));
    b.addEventListener('mouseenter', () => select(i));
    b.addEventListener('focus', () => select(i));
  });
  spots.forEach((s, i) => s.addEventListener('click', () => select(i)));
  select(0);
}

export function initTabs(root = document) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  if (!tabs.length) return null;
  const show = (tab) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(i + tabs.length - 1) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      show(next);
      next.focus();
    });
  });

  // Themen-Kachel „Karte am Smartphone“ öffnet direkt den passenden Tab
  document.querySelectorAll('[data-tab]').forEach((link) => {
    link.addEventListener('click', () => {
      const tab = document.getElementById(link.dataset.tab);
      if (tab) show(tab);
    });
  });
  return show;
}

function initCopy() {
  const btn = document.getElementById('copy-mail');
  const mail = document.getElementById('mail');
  if (!btn || !mail) return;
  const label = btn.textContent;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(mail.textContent.trim());
      btn.textContent = btn.dataset.done || label;
    } catch {
      // Ohne Zwischenablage-Zugriff wenigstens markieren, damit Strg+C reicht
      const range = document.createRange();
      range.selectNodeContents(mail);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setTimeout(() => { btn.textContent = label; }, 2000);
  });
}

initHeader();
document.querySelectorAll('[data-explorer]').forEach(initExplorer);
initTabs();
initCopy();
