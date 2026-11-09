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

**PDF:** Im Blatt-Modus (`sheet=1`) speichert „PDF speichern“ alle Seiten (Blatt, danach Folgeseiten des Verzeichnisses) als ein PDF in Papiergröße (`pdfout.js`, jsPDF wird erst beim Klick geladen). Die Seiten sind dieselben Bilder wie bei „PNG speichern“ (gewählte `dpi`, verlustfrei), in den Dokumenteigenschaften steht der OSM-Hinweis. Ende-zu-Ende-Prüfung: `node pdf.mjs` bei laufendem `npm run dev` (Download, Seitenzahl, Papiergröße). Nach dem Holen dieses Stands einmal `npm install` im Ordner (neue Abhängigkeit `jspdf`).

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
| `sheet` | Standard an; `0` = nur das Kartenfenster (Stilvergleiche, `shot.mjs`) | Planblatt mit Rahmen, Planquadraten, Legende, Maßstabsleiste, Nordpfeil und Straßenverzeichnis (Seite 2 bei Überlauf) |
| `place` | Text | Ortsname, steht unter der Überschrift über der Karte (im Assistenten wird er aus der Kartenmitte vorgeschlagen und ist änderbar; ohne Angabe gilt der Name des Gebiets) |
| `title` | Text, Standard „Orts- und Hydrantenplan“ | Überschrift über der Karte, darunter der Ortsname |
| `iauto` | `0`, `1` (Standard) | Schrift des Straßenverzeichnisses wird bis Faktor 1,5 größer, solange noch alles auf das Blatt passt (`isize` bleibt die Grundgröße) |
| `side` | `none` (Standard, „Auf der Karte“), `right`, `left`, `top`, `bottom` | Lage von Legende, Maßstab, Nordpfeil und Verzeichnis. **`none` (Standard):** Legende, Maßstab, Nordpfeil liegen frei verschiebbar auf der Karte (innen an der rechten Kante, siehe `pos`), nur das Straßenverzeichnis steht außerhalb: bei Querformat in einer Spalte rechts, bei Hochformat in einem Streifen unten (dieselbe Aufteilung wie `right` bzw. `bottom`); die Quellenangabe steht als Streifen unter der Karte. Bei `right`, `left`, `top`, `bottom` stehen alle Blöcke in der Leiste; oben und unten in drei Blöcken nebeneinander |
| `mi` | Zahl 0–20, Standard 4 | Abstand der Blöcke zum Kartenrand in mm (auf A3, größere Papiere skalieren mit). Liegt ein Block (Legende, Maßstab, Nordpfeil, Quelle) auf der Karte und hat eine Kante höchstens 6 mm von „Kartenkante + Abstand“, rastet er genau darauf ein: alle Blöcke am Rand haben denselben Abstand (gemessen am sichtbaren Untergrund, mit dem echten Maß auf dem Blatt, `snapToFrameInset` in `freelayout.js`). Im Assistenten (Schritt 3) als Feld „Abstand zum Kartenrand“; `mi=0` setzt die Blöcke bündig an den Rand. |
| `pos` | `t:x,y;m:x,y;z:b,h;u:b;l:x,y;s:x,y;q:x,y;n:x,y;i:x,y,b,h` | Freie Lage der Blöcke als Anteile des Papiers (linke obere Ecke): `t` Titel (Standard links oben, Randabstand 14, Oberkante 3,4), `m` Kartenfenster (nur die Lage; der Ausschnitt bleibt; die Karte bleibt ganz auf dem Blatt und hält 6 Einheiten Rand für die Planquadrat-Buchstaben), `l` Legende, `s` Maßstab, `n` Nordpfeil, `q` Quellenangabe, `i` Straßenverzeichnis (zusätzlich Breite und Höhe seines Rechtecks). Im Assistenten rastet die Karte beim Ziehen nahe (4 mm) an den normalen Randabständen ein (`snapMap`), mit den Pfeiltasten verschiebt sie sich frei. `u` ist die Breite der Quellenangabe als Anteil des Papiers (0,08–1): ohne `u` steht sie in einer Zeile (so lang wie der Text, höchstens so breit wie die Karte), mit `u` bricht der Text um und wird ein Kasten (im Assistenten an der Ecke rechts der Zeile ziehen, Alt + Pfeiltasten). Legende, Maßstab, Quelle und Nordpfeil können hinter den Koordinaten `r` und/oder `b` tragen (am rechten/unteren Kartenrand verankert, siehe `mi`). `z` ist die eigene Größe des Kartenfensters als Anteil des Papiers (Breite, Höhe): mindestens 40 mm, höchstens das volle Fenster der Lage (feste Leiste) bzw. bei freier Anordnung das Papier abzüglich Mindestrand (die Leiste ist dann nicht im Weg); der Maßstab bleibt, das Fenster zeigt mehr oder weniger Gebiet, die linke obere Ecke bleibt und die Leiste rückt mit. Im Assistenten an der Ecke unten rechts der Karte ziehen (Alt + Pfeiltasten); bei festem Kartenformat bleibt das Verhältnis. Ein Titel, der über der Karte liegt, bekommt wie die anderen Blöcke einen hellen Untergrund. `t` und `m` gelten bei jeder Lage; nennt `pos` keine Blöcke (nur `t`/`m`), bleiben Legende, Maßstab und Verzeichnis in der Seitenleiste, und die Leiste folgt der Karte (beide bleiben gemeinsam im Papier, `clampGroupOffset`). Der Titel steht standardmäßig links oben (14 / 3,4), auch bei Leiste links. Fehlende Blöcke stehen an der Standardlage der gewählten Seite; bei `side=none` gilt immer die freie Anordnung. Liegt ein Block über der Karte, bekommt er einen hellen Untergrund. Im Assistenten (Schritt 3, „Blöcke selbst anordnen“) werden die Kästen gezogen. Rein in `freelayout.js` |
| `obg` | `white` (Standard), `clear` | Untergrund von Blöcken, die über der Karte liegen: hell (weiß) oder durchsichtig (Schrift mit weißem Rand). Der Assistent erlaubt Blöcke auf der Karte nur, wenn man es einschaltet (`onmap=1` in der Adresse, nur für den Assistenten); sonst lassen sie sich nur in die freien Flächen neben und unter der Karte ziehen |
| `icols` | 0 bis 6, Standard 0 | Spaltenzahl des Verzeichnisses auf Seite 1 (0 = automatisch: Spalten von etwa 55 mm, gleich hoch gefüllt) |
| `fmt` | `fill` (Standard), `1:1`, `3:2`, `4:3`, `2:3`, `3:4` | Kartenformat: Seitenverhältnis des Kartenfensters (Quadrat, Quer, Hoch); Legende und Verzeichnis rücken direkt an die Karte |
| `index` | `1` (Standard), `0` | Straßenverzeichnis an oder aus; über dem Blatt steht, wo es steht (bei `side=top|bottom` und kleinen Papieren erst auf Seite 2, die Seiten sind beschriftet) (zwischen Straßenname und Planquadraten steht eine Punktlinie) |
| `isize` | 0,5 bis 3, Standard 1 | Grundgröße der Schrift des Straßenverzeichnisses als Faktor |
| `owall` | `1` | Einbahn-Pfeile auch auf Verbindungs-, Kreis-, Staats- und Bundesstraßen (Standard: nur Gemeindestraßen: Wohn-, verkehrsberuhigte und Erschließungsstraßen) |
| `ow` | `0`, `1` | Einbahn-Pfeile (Standard: an bei Maßstab 1:10.000 und größer, wenn `data/oneway.geojson` existiert) |
| `lbl` | `avoid` (Standard), `top` | Straßennamen weichen den Symbolen aus, fehlende Namen stehen danach einmal über den Symbolen (`avoid`), oder alle Namen liegen über den Symbolen (`top`) |
| `lsp` | Zahl in mm | Abstand der Straßennamen-Wiederholung (Standard 10 bei `avoid`, sonst 45) |

Straßennamen, die entlang der Linie nirgends Platz finden (lauter kurze Linienstücke, Symbole, Pfeile), bekommen ihren Namen als Punkt in der Mitte des längsten Stücks, mit der Richtung der Straße (`labelpoints.js`): erst ohne, dann mit Überlappung, immer unter den Feuerwehr-Symbolen. So steht jede Straße des Verzeichnisses auch im Plan.

Quellenangabe und Datenstand (`attribution.js`): Der Quellenblock ist bewusst kurz: der OSM-Pflichttext mit ausgeschriebener Adresse (nach den Attribution Guidelines der OSMF), „Karte: Protomaps · Daten: OpenFireMap.org“ und die zwei getrennten Stände. Bei frei gelegten Blöcken ist er ein **Streifen in einer Zeile** (Standard: unter der Karte, linksbündig; bei schmaler Karte zweizeilig), in einer festen Leiste stehen die Zeilen untereinander. Der Stand „Feuerwehr-Daten“ kommt aus `data/<gebiet>.meta.json` (schreibt `extract-area.mjs` aus der `metadata.json` der Pipeline zum Zeitpunkt des Ausschnitts; ohne die Datei gilt `meta.json`; `osm_data_until`) und „Basiskarte“ (Metadaten der PMTiles-Datei, `planetiler:osm:osmosisreplicationtime`; fehlt der Schlüssel, entfällt der Teil). Jede Folgeseite des Verzeichnisses trägt den OSM-Pflichttext am Fuß.

Das Straßenverzeichnis ist ein eigener Block (`indexblock.js`): Er bekommt den verfügbaren Platz, wählt Spaltenzahl und Spaltenbreite selbst (breiteste Spalten, in die noch alles passt; nie schmaler als etwa 36 mm, damit Namen nicht mitten im Wort brechen), gleicht die Spaltenhöhen aus und wird nur so groß wie nötig. Bei Seitenleiste (`side=right|left`) und festem Kartenformat läuft das Verzeichnis, wenn die Seitenleiste nicht reicht, in der freien Fläche unter der Karte weiter (über die ganze Breite, Überschrift „Fortsetzung“); erst was auch dort keinen Platz findet, steht auf Folgeseiten. Die Lage auf dem Blatt bestimmt der Aufruf in `sheet.js`.

Die Legende zeigt nur Symbole, Linien und Straßenarten, die im Kartenausschnitt wirklich vorkommen. Die Feuerwehrhäuser sind 60 % größer als die übrigen Symbole.

Die Karte ist ein Renderer mit festem Maßstab: Mitte und Maßstab werden über das Formular gesetzt (Zoomen und Verschieben sind aus).

Die Mindestbreiten und Schriftgrößen sind Schätzwerte und müssen an echten Ortsplänen gemessen werden.

## MapLibre-Version

Der Spike läuft mit maplibre-gl 5.x und 6.x. Für 6 nötig (alle drei sind schon eingebaut): Namespace-Import in `main.js`, `optimizeDeps.exclude` in `vite.config.js` (der Worker liegt in einer eigenen Datei; gilt nur für Version 6, die Konfiguration erkennt die installierte Version selbst) und unsichtbare Ebenen je Quell-Ebene in `style.js`, damit `querySourceFeatures` die Feuerwehr-Daten behält.

## Ortsplan erstellen (Assistent)

`/pick.html` (auch über den Link „Ausschnitt wählen …“ im Formular): Assistent in drei Schritten, links die Karte (in Schritt 3 die große Vorschau des Blatts), rechts das Panel.

1. **Ausschnitt und Format:** der Rahmen ist das Kartenfenster des Blatts. Am Griff oben verschieben. Die Karte wird getrennt davon verschoben und
   gezoomt; der Rahmen klebt am Ort. Zwei Formen:
   - **Frei** (Standard): Kanten und Ecken einzeln ziehen, die gegenüberliegende Kante bleibt stehen. Das Kartenfenster des Blatts nimmt das
     Seitenverhältnis des Rahmens an (`fmt=1.6234:1`, begrenzt auf 1:4 bis 4:1), der Maßstab ergibt sich aus Papier und Rahmen (mindestens 1:1000, auf 10 aufgerundet,
     sodass der Ausschnitt ganz drauf ist). Wechselt man Papier oder Lage, bleibt der Ausschnitt in Metern gleich, der Maßstab folgt. Mit dem
     Häkchen „Maßstab auf Standardwert runden“ rastet der Rahmen beim Loslassen auf den nächsten Standardmaßstab (`NICE_SCALES`) ein, der den
     Ausschnitt noch ganz zeigt.
   - **Wie das Blatt:** Seitenverhältnis wie Papier, Lage der Legende und Kartenform (weiter unten im selben Schritt); „Papier füllen“ nennt das echte Verhältnis des Kartenfensters; die Ecken ändern nur den Maßstab (Standardliste).
   Pfeiltasten verschieben den Rahmen, `+`/`-` machen ihn größer oder kleiner. Wird der Rahmen größer als die Ansicht, zoomt die Karte
   heraus. Ragt er über die geladenen Daten hinaus, steht ein Hinweis da.
   Darunter im selben Schritt: Papier (A4 bis A1), Quer/Hoch, im festen Modus die Kartenform und die Lage der Legende (auf der Karte (Standard), oben, unten, links, rechts). Bei Hoch steht die Legende standardmäßig unten, sonst würde das Kartenfenster sehr schmal (A3 hoch mit Leiste links: Verhältnis 0,52 statt 0,71);
   zurück auf Quer wieder links. Unten im Panel steht der Commit (`Stand …`) des ausgelieferten Quellcodes.
2. **Inhalt:** Texte (Ortsname, Überschrift), Inhalte per Häkchen (Symbole, Straßenarten und Gemeindegrenze, Straßenverzeichnis), unter „Mehr Optionen“
   Auflösung, Spalten und Schriftgröße des Verzeichnisses.
3. **Anordnen:** die Vorschau des Blatts mit frei verschiebbaren Blöcken (Titel, Karte, Legende, Maßstab, Nordpfeil, Quellenangabe, Straßenverzeichnis) füllt
   den ganzen Platz links neben dem Panel (Papierverhältnis bleibt, passt sich der Fenstergröße an; die Titelschrift ist so groß wie auf dem Blatt). Hier steht
   auch der Knopf „Ortsplan erstellen“. Standard ist die Lage „Auf der Karte“: Legende, Maßstab und Nordpfeil auf der Karte, nur das Verzeichnis außerhalb.

„Ortsplan erstellen“ öffnet das Blatt (`/?sheet=1&...`). Neue Blattparameter dafür: `lsym=0` (ohne Symbole in der Legende), `lroad=0`
(ohne Straßenarten und Gemeindegrenze); sind beide aus, entfällt die Legende samt Platz. Die letzte Wahl merkt sich der Browser
(`localStorage`); Angaben in der Adresse haben Vorrang. Die Geometrie steht in `layout.js`, die Rahmenrechnung in `framegeo.js`, beide getestet.
Bedienprobe im echten Browser (Rahmen ziehen, Schritte, Blatt erzeugen): `SPIKE_URL=http://127.0.0.1:5173 node wizard.mjs`.

Rauchtest aller Seiten und Parameter-Kombinationen (fängt Startfehler, die die Unit-Tests nicht sehen): `SPIKE_URL=http://127.0.0.1:5173 node smoke.mjs`.

## Messung: Grundkarte auf R2 (09.11.2026)

Frage: Wie schnell entsteht das Blatt, wenn die Grundkarte (Protomaps-PMTiles) aus R2 hinter der Pipeline-Domain kommt statt von der Platte, und was heißt die Grenze von 512 MiB des Cloudflare-Caches? Dazu `r2bench.mjs` (Seite von `localhost:5173`, weil R2-CORS nur diese Herkunft erlaubt; `base=…` lädt die Karte aus einem Test-Pfad der Pipeline-Domain, andere Adressen lehnt `main.js` ab). Drei Testdateien aus dem Gebiet Franken: 58,6 MB (Nürnberger Land), 494,6 MB (471,7 MiB, knapp unter dem Limit) und 1,05 GB (1005 MiB, darüber), hochgeladen mit demselben `Cache-Control` wie die Pipeline-Dateien und nach der Messung wieder gelöscht. Blatt A3 quer, 1:5000, 96 dpi, headless Chromium im Heimnetz, je Lauf ein neuer Browser-Kontext (kein HTTP-Cache).

| Quelle | Cache der Kante | Antwortzeit je Bereichsanfrage (Median / 95 %) | Blatt fertig nach |
|---|---|---|---|
| Platte | – | 1 ms | 4,7–5,7 s |
| 58,6 MB | erster Abruf MISS, danach HIT | 18–55 ms / ~66 ms | 7,7 s (kalt), danach 4,8 s |
| 494,6 MB | erster Abruf MISS, danach HIT | 19–32 ms / ~50 ms | **24,5 s (kalt)**, danach 4,6–4,8 s |
| 1,05 GB | immer BYPASS (über 512 MiB nicht im Cache) | 103–154 ms / 147–249 ms | 4,9–6,0 s (kein Kaltstart) |

Befunde:
- **Ein Blatt braucht nur 10–11 Bereichsanfragen (zusammen etwa 0,1 MB)**, die Karte besteht aus wenigen Vektorkacheln. Auch ohne Cache (BYPASS, jede Anfrage geht an R2) kostet das nur etwa 0,1 s je Anfrage, im Ganzen 0,2–1,3 s mehr als von der Platte.
- **Cache-Treffer sind schnell (20–55 ms), aber der erste Abruf je Rechenzentrum füllt die ganze Datei in den Cache:** +3 s bei 58 MB, +20 s bei 495 MB. Je größer die Datei unter dem Limit, desto länger der Kaltstart (Grund für die kleinen Pipeline-Dateien).
- **Dateien über 512 MiB werden nie gecacht**, haben dafür keinen Kaltstart. Für ein Blatt reicht das; Cloudflare berechnet R2-Lesevorgänge (Klasse B) einzeln, bei 11 je Blatt vernachlässigbar.
- **Der Cache gilt nur für Pfade, die die Cloudflare-Regel der Domain erfasst:** gleiche Dateien unter einem frischen Pfad (`ortsplan-test/`) blieben auch klein BYPASS, unter `eu/` wurden sie gecacht. Eine Basiskarte braucht also einen Pfad mit Cache-Regel oder eine neue Regel.
- Einmal lieferte der erste Lauf der 1-GB-Datei eine Antwort ohne Bereich (rund 1 GB übertragen); in drei weiteren Läufen nicht mehr reproduzierbar, aber ein Grund, die Datei beim echten Betrieb im Auge zu behalten.

Schluss für die Entscheidung „eine Gesamtkarte auf R2 ja/nein“: Eine einzelne Multi-GB-Datei ohne Cache ist für den Ortsplan brauchbar (etwa 0,1 s je Anfrage mehr, kein Kaltstart) und die einfachste Lösung; Aufteilen auf Dateien bis etwa 200 MiB mit Cache-Treffern bringt 20–50 ms je Anfrage, kostet aber je Rechenzentrum einen Kaltstart von einigen Sekunden und mehr Pflege. Gemessen wurde von einem Ort, an einem Tag.
