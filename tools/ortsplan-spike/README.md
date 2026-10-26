# Ortsplan-Spike

Eigenständiger Versuch (nicht Teil der App, nicht in `docs/`): ein druckoptimierter Kartenstil für deutsche Ortschaften,
gezeichnet mit MapLibre aus PMTiles. Plan und Hintergründe: `planning/ortsplan_style_guide_project.md`.

## Idee

- Alle Maße des Stils (`style.js`) sind **Millimeter auf dem Papier**. Aus dem Druckmaßstab (`scale`) wird die Zoomstufe
  berechnet, bei der ein CSS-Pixel genau diese Papier-Größe hat. Straßen, Schrift und Symbole sind damit überhöht,
  ohne dass der Stil an eine feste Zoomstufe gebunden ist.
- Die Feuerwehr-Ebene (`fire.js`, `icons.js`) nutzt die Symbole und Regeln der App (`src/js/map.js`) und die
  Daten der Pipeline (Ebenen `fire_stations`, `hydrants`, `water_points`, `defibrillators`, `boundaries`).

## Daten holen (nach `data/`, wird nicht eingecheckt)

```bash
mkdir -p data && cd data
# Grundkarte (Protomaps-Build, Ausschnitt Neunkirchen am Sand); aktuelles Datum aus https://build-metadata.protomaps.dev/builds.json
pmtiles extract https://build.protomaps.com/<JJJJMMTT>.pmtiles neunkirchen.pmtiles --bbox=11.28,49.49,11.41,49.58
# Feuerwehr-Objekte und Gemeindegrenzen aus der OpenFireMap-Pipeline
pmtiles extract https://pipeline.openfiremap.org/openfiremap.pmtiles ofm.pmtiles --bbox=11.28,49.49,11.41,49.58 --minzoom=12
```

Einbahn-Pfeile (Richtung aus OSM, nicht aus den Kacheln; die Pfeil-Punkte rechnet `oneway.js` aus den Linien, Abstand in Papier-Millimetern):

```bash
node oneway-data.mjs    # schreibt data/oneway.geojson (Overpass, gleicher Ausschnitt)
```

Die Richtung der Linien in den Protomaps-Kacheln ist nicht verlässlich: Beim Zusammenfassen kehrt der Kachelbau einzelne Linien um (Stichprobe: 2 von 472 Abschnitten verkehrt). Ein Pfeil gegen die Fahrtrichtung wäre auf einem Feuerwehrplan gefährlich, deshalb kommt die Richtung aus OSM (Knotenreihenfolge, bei `oneway=-1` umgekehrt, Kreisverkehr implizit). Für den Betrieb sollte der Builder der Pipeline eine eigene Einbahn-Ebene mit gesicherter Richtung liefern.

Weiterer Ort (Grundkarte und Feuerwehr-Ebenen für einen Kreis um einen Punkt, Standard 6 km):

```bash
node extract-area.mjs lauf 49.5120 11.2780 6 "Lauf an der Pegnitz"
# danach: ?area=lauf&sheet=1&scale=5000&paper=a3l&dpi=150
```

## Starten

```bash
npm install
npm run dev          # Vite auf Port 5173, im Netz erreichbar
node shot.mjs "scale=5000&paper=a4l&dpi=150&mode=plan" shots/test.png   # PNG ohne Browser-Fenster
```

Tests für die Planquadrat-Hilfen: `node --test` (Planquadrate in `grid.test.mjs`, Seitenaufteilung des Verzeichnisses in `paginate.test.mjs`). Belastungstest für das Straßenverzeichnis (400 lange Namen, Umbruch und Seitenaufteilung): `node stress.mjs shots/stress` bei laufendem `npm run dev`. Die Skripte `shot.mjs`, `stress.mjs` und `names.mjs` nutzen `http://127.0.0.1:5173`; mit `SPIKE_URL=http://127.0.0.1:5174` zeigen sie auf einen anderen Server (zum Beispiel für einen Branch). `shot.mjs` nutzt `playwright-core` aus dem Wurzelverzeichnis des Repos (`npm ci` dort).

## Parameter der Seite

| Parameter | Werte | Bedeutung |
|---|---|---|
| `scale` | 2500, 5000, 10000, 20000 … | Druckmaßstab 1:x |
| `paper` | `a4l`/`a4p`, `a3l`/`a3p`, `a2l`/`a2p`, `a1l`/`a1p` | Papierformat (quer = `l`, hoch = `p`); Schrift und Seitenleiste wachsen mit dem Papier |
| `dpi` | 96, 150, 200, 300 | Ausgabeauflösung. Die Karte hat je Seite höchstens 8192 px; bei sehr großen Blättern sinkt ihre Auflösung automatisch (`mapDpi` in der Ausgabe von `shot.mjs`) |
| `mode` | `plan`, `real` | überhöhter Ortsplan oder echte Breiten |
| `lat`, `lon` | Zahl | Kartenmitte. Liegt der Ausschnitt außerhalb der geladenen Daten, bleibt die Karte leer; die Seite zeigt dann einen roten Hinweis (auch auf dem Blatt) |
| `area` | Name | weiterer Ort aus `extract-area.mjs` (nimmt dessen Mitte und Titel, wenn `lat`/`lon`/`place` fehlen) |
| `fire` | `0` | Feuerwehr-Ebene aus |
| `isz` | Zahl, Standard 1 | Faktor für die Symbolgröße |
| `sheet` | `1` | Planblatt mit Rahmen, Planquadraten, Legende, Maßstabsleiste, Nordpfeil und Straßenverzeichnis (Seite 2 bei Überlauf) |
| `place` | Text | Ortsname im Titel des Planblatts |
| `side` | `right` (Standard), `left`, `top`, `bottom` | Lage von Titel, Legende, Maßstab und Verzeichnis um die Karte; oben und unten stehen sie in drei Blöcken nebeneinander |
| `icols` | 0 bis 6, Standard 0 | Spaltenzahl des Verzeichnisses auf Seite 1 (0 = automatisch: Spalten von etwa 55 mm, gleich hoch gefüllt) |
| `index` | `1` (Standard), `0` | Straßenverzeichnis an oder aus (zwischen Straßenname und Planquadraten steht eine Punktlinie) |
| `isize` | 0,5 bis 3, Standard 1 | Schriftgröße des Straßenverzeichnisses als Faktor |
| `owall` | `1` | Einbahn-Pfeile auch auf Verbindungs-, Kreis-, Staats- und Bundesstraßen (Standard: nur Gemeindestraßen: Wohn-, verkehrsberuhigte und Erschließungsstraßen) |
| `ow` | `0`, `1` | Einbahn-Pfeile (Standard: an bei Maßstab 1:10.000 und größer, wenn `data/oneway.geojson` existiert) |
| `lbl` | `avoid` (Standard), `top` | Straßennamen weichen den Symbolen aus, fehlende Namen stehen danach einmal über den Symbolen (`avoid`), oder alle Namen liegen über den Symbolen (`top`) |
| `lsp` | Zahl in mm | Abstand der Straßennamen-Wiederholung (Standard 10 bei `avoid`, sonst 45) |

Straßennamen, die entlang der Linie nirgends Platz finden (lauter kurze Linienstücke, Symbole, Pfeile), bekommen ihren Namen als Punkt in der Mitte des längsten Stücks, mit der Richtung der Straße (`labelpoints.js`): erst ohne, dann mit Überlappung, immer unter den Feuerwehr-Symbolen. So steht jede Straße des Verzeichnisses auch im Plan.

Die Legende zeigt nur Symbole, Linien und Straßenarten, die im Kartenausschnitt wirklich vorkommen. Die Feuerwehrhäuser sind 60 % größer als die übrigen Symbole.

Die Karte ist ein Renderer mit festem Maßstab: Mitte und Maßstab werden über das Formular gesetzt (Zoomen und Verschieben sind aus).

Die Mindestbreiten und Schriftgrößen sind Schätzwerte und müssen an echten Ortsplänen gemessen werden.

## MapLibre-Version

Der Spike läuft mit maplibre-gl 5.x und 6.x. Für 6 nötig (alle drei sind schon eingebaut): Namespace-Import in `main.js`, `optimizeDeps.exclude` in `vite.config.js` (der Worker liegt in einer eigenen Datei; gilt nur für Version 6, die Konfiguration erkennt die installierte Version selbst) und unsichtbare Ebenen je Quell-Ebene in `style.js`, damit `querySourceFeatures` die Feuerwehr-Daten behält.
