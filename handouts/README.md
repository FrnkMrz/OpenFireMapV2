# Handouts

Handouts sind verteilbare PDF-Leitfäden. Die **Quelle ist Markdown**, das PDF wird daraus erzeugt und mit eingecheckt.

| Ordner | Inhalt |
| --- | --- |
| [`overlay-leitfaden/`](overlay-leitfaden/) | Leitfaden zum Overlay von openfiremap.org: Kachel-URL, PMTiles, Symbole, Datenschutz, Impressum |
| [`feuerwehr-leitfaden/`](feuerwehr-leitfaden/) | Leitfaden für die Übungsleitung (A4, 7 Seiten): Kurzfassung für die Wehrführung, Checklisten, OSM-Wiki-Vorlage, Hydrantenjäger in Bildern, Ablauf, Nachbereitung |
| [`feuerwehr-praesentation/`](feuerwehr-praesentation/) | Präsentation für die Einweisung am Übungsabend (12 Folien 16:9, Seitengröße in `style.css`): Karte, Typen, Schild, Hydrantenjäger, sechs Schritte, Mängel, Sicherheit, Ablauf |
| [`feuerwehr-comic/`](feuerwehr-comic/) | Comic „Der Hydrant, den keiner fand“ (A4, Seite 2 Vorlesefassung). Skript, Zeichnungen und Markdown entstehen aus `comic.mjs`, siehe unten |
| [`feuerwehr-truppkarte/`](feuerwehr-truppkarte/) | Trupp-Karte für den Hydranten-Rundgang (A4 beidseitig): sechs Schritte, Sicherheit, Hinweisschild, Hydrantentypen |
| [`feuerwehr-boegen/`](feuerwehr-boegen/) | Erfassungsbogen, Mängelliste und Anschreiben-Vorlage (A4 quer, zum Ausfüllen von Hand) |

## PDF neu bauen

```bash
npm install                                    # einmalig
npx playwright install chromium                # einmalig, falls noch kein Chromium vorhanden ist
npm run handout:build -- handouts/overlay-leitfaden   # auch mehrere Ordner auf einmal
```

Das Skript [`scripts/build-handout.mjs`](../scripts/build-handout.mjs) wandelt die Markdown-Datei mit `marked` in HTML und rendert sie mit Chromium (Playwright) zu einem A4-PDF. Der Stil liegt in `style.css` im jeweiligen Ordner. `npm run build` rendert das PDF bei jedem Website-Build neu und kopiert es als `public/downloads/<Name>.pdf`, von wo es zusammen mit der Website veröffentlicht wird. So genügt es, die Markdown-Quelle zu aktualisieren; das gerenderte PDF muss nicht separat eingecheckt werden.

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
- **Feuerwehr-Material** (`feuerwehr-*`) spricht die Wehr mit „ihr“ an. „Wir“ steht nur in der Anschreiben-Vorlage, dort spricht die Feuerwehr selbst. Neue Handout-Ordner auch im `build`-Skript in `package.json` eintragen, ein Test prüft das.
- **Es geht um openfiremap.org.** Frühere Adressen unter .de werden nur erwähnt, um den Umstieg zu erklären.
- **Keine festen Zusagen** zu Verfügbarkeit, Ländern oder Terminen. Verbindliches wird telefonisch besprochen.
- Keine Betriebsdetails (Hosts, Pfade, Zugänge). Die stehen im privaten Pipeline-Repository.

## Bilder des Overlay-Leitfadens neu aufnehmen

Die Bilder zeigen die Live-Seiten. Ändern sich diese, mit `node handouts/overlay-leitfaden/screenshots.mjs` neu aufnehmen und das PDF neu bauen.

## Bilder des Feuerwehr-Leitfadens neu aufnehmen

Die drei Bilder zeigen Hydrantenjäger (hydrantenjaeger.de) in der Handy-Ansicht, mit simuliertem Standort und Kompass; die Kamera zeigt ein gezeichnetes Hinweisschild. Es wird nichts hochgeladen, das Skript sperrt die OSM-API. Ändert sich Hydrantenjäger, mit `node handouts/feuerwehr-leitfaden/screenshots.mjs` neu aufnehmen und das PDF neu bauen.

## Comic ändern

Beim Comic sind Markdown-Datei und Bilder erzeugt, nicht von Hand geschrieben. Die einzige Quelle ist das Skript `PANELS` in [`feuerwehr-comic/comic.mjs`](feuerwehr-comic/comic.mjs): Bildbeschreibung (zugleich Alternativtext und Vorlesefassung), Bildtext, Sprechblasen mit Lage in Prozent und die Zeichnung als SVG-Bausteine.

```bash
node handouts/feuerwehr-comic/comic.mjs              # schreibt img/panel-*.svg und die Markdown-Datei
npm run handout:build -- handouts/feuerwehr-comic    # baut das PDF
```

Ein Test prüft, dass Markdown und Bilder zum Skript passen. Sprechblasen und Bildtexte bleiben echter Text über den Bildern, damit sie vorgelesen und übersetzt werden können.
