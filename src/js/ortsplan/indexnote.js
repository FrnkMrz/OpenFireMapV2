// Text ueber dem Blatt: wo steht das Strassenverzeichnis? (rein, mit `node --test` pruefbar)
// indexPage: 1 = auf dem Blatt, 2 = erst auf der Folgeseite, null = ausgeschaltet oder leer.
export function indexNote({ indexOn, indexPage, indexCount, pages }) {
  if (!indexOn) return "Straßenverzeichnis ist ausgeschaltet (Feld „Verzeichnis“ oben auf „an“ stellen).";
  if (indexPage === 1) {
    return `Straßenverzeichnis: ${indexCount} Straßen, auf dem Blatt neben der Karte.${pages > 1 ? ` Der Rest steht auf Seite 2 von ${pages} (weiter unten).` : ""}`;
  }
  if (indexPage === 2) {
    return `Straßenverzeichnis: ${indexCount} Straßen, auf Seite 2 von ${pages} – weiter unten auf dieser Seite (Seite 1 hat dafür keinen Platz; für ein Verzeichnis auf dem Blatt „Lage“ auf rechts oder links stellen).`;
  }
  return "Straßenverzeichnis: in diesem Ausschnitt gibt es keine benannten Straßen.";
}
