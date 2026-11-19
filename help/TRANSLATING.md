# Weitere Sprachen für die Hilfe

Die Hilfe kann Sprachen aus dem Sprachkatalog `help/languages.json` aufnehmen. Der Katalog enthält die 30 Sprachen der OpenFireMap-Karte einschließlich ihrer nativen Namen. Eine Sprache erscheint erst auf der Website, wenn eine Textdatei unter `help/text/` existiert und der Seiten-Build für alle Hilfe-Seiten vollständig ist.

## Neue Übersetzung ergänzen

Für den Sprachcode `<code>`:

1. `help/text/<code>.json` anlegen. Die Datei braucht dieselben Schlüssel wie `help/text/de.json` und `help/text/en.json`. HTML-Auszeichnung und Links in Werten müssen erhalten bleiben.
2. Alle Markdown-Seiten aus `help/content/de/` nach `help/content/<code>/` übersetzen. Dateinamen, Reihenfolge, Frontmatter-Felder, Abschnitts-IDs (`{#...}`) und Bild-Blöcke beibehalten. Links und technische Angaben übersetzen bzw. auf ihre passenden Ziele prüfen.
3. `npm run help:shots` ausführen. Der Screenshot-Lauf nimmt die Kartenoberfläche mit der neuen Kartensprache auf und misst die Hotspots neu. Ortsplan-Bilder werden weiterhin aus der deutschsprachigen Oberfläche übernommen, weil der Ortsplan-Assistent zurzeit nur Deutsch anbietet.
4. Danach baut `npm run build` die Seiten unter `/help/<code>/`. Der Build bricht ab, wenn Texte, Abschnitte, Bilder oder Hotspots fehlen.

Der Sprachumschalter, `hreflang`-Verweise, `lang`-Attribute und die Sprach-URL des Hilfe-Links auf der Karte werden aus den aktiven Übersetzungen erzeugt. Bis eine Übersetzung vollständig ist, führt der Hilfe-Link in der Karte auf Deutsch oder Englisch.

## Sprachkatalog pflegen

`help/languages.json` muss dieselben Codes enthalten wie `src/js/lang/`. Für abweichende BCP-47-Bezeichnungen wird `hreflang` hinterlegt, zum Beispiel `fl` → `nl-BE` und `tw` → `zh-Hant`. Für rechts-nach-links geschriebene Sprachen wird `dir: "rtl"` gesetzt. Native Namen sollen in ihrer eigenen Schrift stehen.

Neue Seiten oder Abschnitte müssen in allen aktiven Sprachen dieselben Slugs, Abschnitts-IDs und Reihenfolgen verwenden. So bleiben Seitennavigation, Ankerlinks, Suchmaschinenhinweise und Sprachwechsel passend zueinander.
