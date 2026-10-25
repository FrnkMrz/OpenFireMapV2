// Verteilt `total` Eintraege auf Seiten und Spalten (rein, ohne DOM, mit `node --test` pruefbar).
// firstCaps: Kapazitaet je Spalte der ersten Seite; nextCaps: je Spalte jeder Folgeseite.
// Rueckgabe: Seiten, je Seite die Spalten als [von, bis) in Eintragsnummern. Es gehen keine Eintraege verloren.
export function paginate(total, firstCaps, nextCaps) {
  const pages = [];
  let i = 0;
  const fill = (caps) => {
    const cols = [];
    for (const cap of caps) {
      const n = Math.min(Math.max(1, cap), total - i);
      if (n <= 0) break;
      cols.push([i, i + n]);
      i += n;
    }
    return cols;
  };
  pages.push(fill(firstCaps));
  const next = nextCaps.length ? nextCaps : [1];
  while (i < total) pages.push(fill(next));
  return pages;
}
