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

## Starten

```bash
npm install
npm run dev          # Vite auf Port 5173, im Netz erreichbar
node shot.mjs "scale=5000&paper=a4l&dpi=150&mode=plan" shots/test.png   # PNG ohne Browser-Fenster
```

Tests für die Planquadrat-Hilfen: `node --test` (Planquadrate in `grid.test.mjs`, Seitenaufteilung des Verzeichnisses in `paginate.test.mjs`). Belastungstest für das Straßenverzeichnis (400 lange Namen, Umbruch und Seitenaufteilung): `node stress.mjs shots/stress` bei laufendem `npm run dev`. `shot.mjs` nutzt `playwright-core` aus dem Wurzelverzeichnis des Repos (`npm ci` dort).

## Parameter der Seite

| Parameter | Werte | Bedeutung |
|---|---|---|
| `scale` | 2500, 5000, 10000, 20000 … | Druckmaßstab 1:x |
| `paper` | `a4l`/`a4p`, `a3l`/`a3p`, `a2l`/`a2p`, `a1l`/`a1p` | Papierformat (quer = `l`, hoch = `p`); Schrift und Seitenleiste wachsen mit dem Papier |
| `dpi` | 96, 150, 200, 300 | Ausgabeauflösung. Die Karte hat je Seite höchstens 8192 px; bei sehr großen Blättern sinkt ihre Auflösung automatisch (`mapDpi` in der Ausgabe von `shot.mjs`) |
| `mode` | `plan`, `real` | überhöhter Ortsplan oder echte Breiten |
| `lat`, `lon` | Zahl | Kartenmitte |
| `fire` | `0` | Feuerwehr-Ebene aus |
| `isz` | Zahl, Standard 1 | Faktor für die Symbolgröße |
| `sheet` | `1` | Planblatt mit Rahmen, Planquadraten, Legende, Maßstabsleiste, Nordpfeil und Straßenverzeichnis (Seite 2 bei Überlauf) |
| `place` | Text | Ortsname im Titel des Planblatts |
| `index` | `1` (Standard), `0` | Straßenverzeichnis an oder aus |
| `isize` | 0,5 bis 3, Standard 1 | Schriftgröße des Straßenverzeichnisses als Faktor |
| `lbl` | `avoid` (Standard), `top` | Straßennamen weichen den Symbolen aus, fehlende Namen stehen danach einmal über den Symbolen (`avoid`), oder alle Namen liegen über den Symbolen (`top`) |
| `lsp` | Zahl in mm | Abstand der Straßennamen-Wiederholung (Standard 10 bei `avoid`, sonst 45) |

Die Legende zeigt nur Symbole, Linien und Straßenarten, die im Kartenausschnitt wirklich vorkommen. Die Feuerwehrhäuser sind 60 % größer als die übrigen Symbole.

Die Karte ist ein Renderer mit festem Maßstab: Mitte und Maßstab werden über das Formular gesetzt (Zoomen und Verschieben sind aus).

Die Mindestbreiten und Schriftgrößen sind Schätzwerte und müssen an echten Ortsplänen gemessen werden.
