# Handouts

Handouts sind verteilbare PDF-Leitfäden. Die **Quelle ist Markdown**, das PDF wird daraus erzeugt und mit eingecheckt.

| Ordner | Inhalt |
| --- | --- |
| [`overlay-leitfaden/`](overlay-leitfaden/) | Leitfaden zum Overlay von openfiremap.org: Kachel-URL, PMTiles, Symbole, Datenschutz, Impressum |

## PDF neu bauen

```bash
npm install                                    # einmalig
npx playwright install chromium                # einmalig, falls noch kein Chromium vorhanden ist
npm run handout:build -- handouts/overlay-leitfaden
```

Das Skript [`scripts/build-handout.mjs`](../scripts/build-handout.mjs) wandelt die Markdown-Datei mit `marked` in HTML und rendert sie mit Chromium (Playwright) zu einem A4-PDF. Der Stil liegt in `style.css` im jeweiligen Ordner. Nach jeder Änderung an der Markdown-Datei, am Stil oder an den Bildern das PDF neu bauen und mit einchecken.

## Aufbau eines Handout-Ordners

```text
<ordner>/<Name>.md      Quelle mit Front Matter (title, subtitle, meta, footer)
<ordner>/style.css      Druckstil
<ordner>/img/           Bilder, relativ in der Markdown-Datei verlinkt
<ordner>/<Name>.pdf     erzeugtes PDF
```

Besonderheiten der Markdown-Quelle:

- Ein Codeblock mit der Sprache `url` wird zum hervorgehobenen Adressfeld.
- `<div class="cols two">` oder `<div class="cols three">` mit `<div class="card ok|maybe|no|legacy|future|plain">` ergibt Spalten und Karten. Lücken zwischen den HTML-Zeilen sind nötig, damit Markdown darin gewandelt wird.
- `<div class="pb"></div>` erzwingt einen Seitenumbruch.
- Ein Bild erhält seinen Alternativtext als Bildunterschrift.
- Blockzitate (`>`) werden als roter Hinweiskasten dargestellt.

## Leitlinien für den Text

- **Ich-Form.** Das Projekt betreibt eine Privatperson. Keine „wir/uns/unser“-Formulierungen, außer wenn Gesprächspartner gemeint sind („sprechen wir telefonisch“). Ein Test (`test/build-handout.test.js`) prüft das.
- **Es geht um openfiremap.org.** Frühere Adressen unter .de werden nur erwähnt, um den Umstieg zu erklären.
- **Keine festen Zusagen** zu Verfügbarkeit, Ländern oder Terminen. Verbindliches wird telefonisch besprochen.
- Keine Betriebsdetails (Hosts, Pfade, Zugänge). Die stehen im privaten Pipeline-Repository.

## Bilder des Overlay-Leitfadens neu aufnehmen

Die Bilder zeigen die Live-Seiten. Ändern sich diese, mit `node handouts/overlay-leitfaden/screenshots.mjs` neu aufnehmen und das PDF neu bauen.
