// Verteilt Eintraege mit unterschiedlicher Hoehe auf Seiten und Spalten (rein, ohne DOM, mit `node --test` pruefbar).
// heightOf(i, istErsteSeite) liefert die Hoehe des Eintrags i in mm (mehrzeilige Namen sind hoeher).
// firstCaps / nextCaps: nutzbare Hoehe je Spalte der ersten Seite bzw. jeder Folgeseite in mm.
// Rueckgabe: Seiten, je Seite die Spalten als [von, bis) in Eintragsnummern. Es gehen keine Eintraege verloren,
// und jede Spalte nimmt mindestens einen Eintrag auf (auch wenn er hoeher ist als die Spalte).
export function paginate(total, heightOf, firstCaps, nextCaps) {
  const pages = [];
  let i = 0;
  const fill = (caps, first) => {
    const cols = [];
    for (const cap of caps) {
      if (i >= total) break;
      const from = i;
      let used = 0;
      while (i < total) {
        const h = heightOf(i, first);
        if (i > from && used + h > cap) break;
        used += h;
        i++;
      }
      cols.push([from, i]);
    }
    return cols;
  };
  pages.push(fill(firstCaps, true));
  const next = nextCaps.length ? nextCaps : [0];
  while (i < total) pages.push(fill(next, false));
  return pages;
}
