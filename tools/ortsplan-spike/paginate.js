// Verteilt Eintraege mit unterschiedlicher Hoehe auf Seiten und Spalten (rein, ohne DOM, mit `node --test` pruefbar).
// heightOf(i, istErsteSeite) liefert die Hoehe des Eintrags i in mm (mehrzeilige Namen sind hoeher).
// firstCaps / nextCaps: nutzbare Hoehe je Spalte der ersten Seite bzw. jeder Folgeseite in mm.
// Rueckgabe: Seiten, je Seite die Spalten als [von, bis) in Eintragsnummern. Es gehen keine Eintraege verloren,
// und jede Spalte nimmt mindestens einen Eintrag auf (auch wenn er hoeher ist als die Spalte).

/** Fuellt die Spalten einer Seite der Reihe nach ab Eintrag `from`. Rueckgabe: Spalten [von, bis) und die naechste freie Nummer. */
export function fillColumns(from, total, heightOf, caps, first = true) {
  const cols = [];
  let i = from;
  for (const cap of caps) {
    if (i >= total) break;
    const start = i;
    let used = 0;
    while (i < total) {
      const h = heightOf(i, first);
      if (i > start && used + h > cap) break;
      used += h;
      i++;
    }
    cols.push([start, i]);
  }
  return { cols, end: i };
}

export function paginate(total, heightOf, firstCaps, nextCaps) {
  const pages = [];
  let i = 0;
  const first = fillColumns(i, total, heightOf, firstCaps, true);
  pages.push(first.cols);
  i = first.end;
  const next = nextCaps.length ? nextCaps : [0];
  while (i < total) {
    const r = fillColumns(i, total, heightOf, next, false);
    pages.push(r.cols);
    i = r.end;
  }
  return pages;
}
