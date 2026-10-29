# Ortsplan erstellen: Bedienkonzept und Weg ins Web

Stand 27.10.2026. Ergänzt `ortsplan_style_guide_project.md` (Stil, Spike, Phasen). Dieses Dokument beschreibt, wie aus dem Spike eine Funktion wird, die man ohne Anleitung bedienen kann, und wie sie auf die Webseite kommt. Es ist ein Plan, noch nichts davon ist in der App gebaut.

## Ziel

Eine zusammenhängende Funktion statt loser Spike-Seiten (Auswahlseite, Blatt-Formular mit Parametern). Der Ablauf besteht aus drei Schritten:

1. **Ausschnitt** wählen,
2. **Format** wählen,
3. **Legende** platzieren und füllen.

Danach erstellt die App das Blatt als PDF oder PNG. Die Funktion soll zur bestehenden App passen (dunkle Glas-Panels, Tailwind, deutsche Texte, Tastatur und Screenreader) und auch auf dem Handy bedienbar sein.

## Ablauf in drei Schritten

Links die Karte, rechts ein schmales Panel mit Schrittanzeige (1 Ausschnitt, 2 Format, 3 Legende) und „Zurück/Weiter". Auf dem Handy wird das Panel ein Bottom-Sheet unter der Karte.

### Schritt 1: Ausschnitt

- Ortssuche oder Karte verschieben und zoomen; roter Auswahlrahmen, Ecken ziehbar.
- Maßstab als Knöpfe (1:2 500, 1:4 700, 1:7 500, 1:10 000; die Liste kommt aus `NICE_SCALES` in `layout.js`).
- Live-Angabe an der Karte: Kantenlänge des Rahmens in km und Druckmaßstab.
- Liegt der Rahmen ganz oder teilweise außerhalb des Datengebiets, steht ein ruhiger Hinweis im Panel (kein Fehlerdialog).
- Karte bleibt gegen Drehen und Kippen gesperrt (wie in `pick.js`).

### Schritt 2: Format

- Papier A4, A3, A2, A1; Quer oder Hoch; Kartenform (Blatt füllen, 3:2, 4:3, 2:3, 3:4).
- Das Panel nennt Blattgröße in mm und das abgedeckte Gelände in km. Der Rahmen auf der Karte passt sich sofort an.
- Die Geometrie kommt aus `computeLayout()`; sie ist rein und getestet, damit Vorschau und Export dieselben Zahlen haben.

### Schritt 3: Legende

- Seite der Legende: oben, unten, links, rechts. Eine Mini-Blattvorschau zeigt die Aufteilung von Karte und Legende, bevor etwas berechnet wird.
- Inhalte per Häkchen: Feuerwehr-Symbole, Hydrantentypen (nur vorhandene), Einbahnstraßen, Straßenverzeichnis, Maßstab und Datenstand.
- Straßenverzeichnis: Spaltenzahl und Schriftgröße unter „Mehr Optionen" eingeklappt, damit die Standardansicht ruhig bleibt.
- Knopf „Ortsplan erstellen" startet den Export; Fortschrittsanzeige, danach Download (PDF als Standard, PNG optional). Fehler stehen im Panel mit einem Satz, was zu tun ist.

### Querschnittsregeln

- Sinnvolle Voreinstellung: A2 quer, Legende links, alle Inhalte an. Die letzte Wahl merkt sich der Browser (`localStorage`, mit try/catch, Seite funktioniert auch ohne).
- „Zurück" verliert keine Eingaben; Schrittanzeige ist anklickbar.
- Texte über i18n (zuerst `de` und `en`, andere Sprachen fallen auf `en` zurück, `npm run i18n:check` bleibt grün).
- Einstieg als neuer Eintrag im bestehenden Export-Menü, kein zusätzlicher Button auf der Karte (Linie aus der A11y-Reihe: keine neuen Menüs für Nebenfunktionen).
- Dialog über `registerDialog()` in `ui.js` (Fokus, Tab-Falle, Escape, Fokus zurück). Keine eigenen Escape-Listener.
- Kontraste nach den Regeln in `CLAUDE.md` (Text ≥ 4,5:1, `tests/a11y-contrast.spec.js` um den Dialog erweitern).
- Schrittwechsel und Fertigmeldung über die bestehenden Live-Regionen ansagen.
- Handy: große Touch-Ziele, Panel als Bottom-Sheet, Karte bleibt sichtbar. Der Export selbst bleibt auf iOS und Safari durch Canvas-Grenzen eingeschränkt (siehe Risiken im Hauptplan).

## Mit oder ohne VM

**Zur Laufzeit ohne VM.** Die Funktion läuft vollständig im Browser wie die restliche Karte. MapLibre wird erst beim Öffnen des Assistenten nachgeladen (ca. 567 KB, 142 KB gzip), die Hauptseite wird nicht größer.

Öffentlich gehostet werden müssen:

1. **Basiskarte als PMTiles auf Cloudflare R2.** Der öffentliche Protomaps-Build-Server sendet keinen CORS-Header (`access-control-allow-origin`), und Dauer-Hotlinking ist laut Protomaps-Dokumentation nicht erwünscht. Trockenlauf für Deutschland (Build 20261026): 1 182 215 Kachel-Einträge, etwa 7,4 GB. DACH liegt vermutlich um 10 GB (Hochrechnung, nicht gemessen). Zu prüfen: ob eine kleinere maximale Zoomstufe (Überzoomen) die Größe deutlich senkt, ohne den Druck zu verschlechtern.
2. **Schriften** (Straßennamen) selbst hosten.
3. **Einbahn-Richtungen:** bisher live per Overpass im Spike. Besser eine Ebene in der Pipeline, weil schneller und verlässlicher; Kachel-Richtungen allein sind unzuverlässig (im Test 2 von 472 verkehrt).
4. **Quellenangabe** (ODbL, Protomaps) auf dem Blatt und im Info-Dialog.

Aufbau und Hosting der Basiskarte gehören zur Pipeline im privaten Repo; hier im öffentlichen Repo steht nur die Client-Seite. Keine Hosts, Pfade oder Zugänge in dieses Dokument schreiben.

### Entscheidung zur Basiskarte (29.10.2026)

Die Basiskarte kommt auf Cloudflare R2, wo die Pipeline-Dateien schon liegen. Geprüft und vorerst verworfen:

- **Öffentliche Kachel-Dienste (z. B. OpenFreeMap):** nichts zu hosten, aber Stil müsste auf ein anderes Kachelschema umgebaut werden, Abhängigkeit von einem Fremddienst, Nutzungsbedingungen für die Last (einige hundert Kacheln je Plan) und Einbahn-Attribute nicht geprüft.
- **Nur den Plan-Ausschnitt live von Overpass holen und selbst rendern:** keine Basiskarte nötig, passt zur App, aber großer Umbau (OSM-Tags auf unsere Kartenebenen abbilden) und abhängig von der Overpass-Verfügbarkeit bei großen Blättern. Bleibt die Rückfalloption, falls R2 nicht trägt.
- **Eigene verkleinerte Karte** (nur Straßen, Gebäude, Wasser, Flächen; zuerst Deutschland): bleibt als Möglichkeit, die Größe zu senken.

Kosten (Preise nach Stand des Verfassers, vor der Entscheidung auf der Cloudflare-Preisseite prüfen): Speicher rund 1,5 Cent je GB und Monat, also für 10 GB etwa 15 Cent, ein Teil davon im Gratis-Kontingent; Abrufe ohne Datenvolumen-Gebühr, nur Anfragen (rund 36 Cent je Million). Ein Plan lädt grob 300 bis 600 Kacheln, auch bei tausenden Plänen im Monat bleibt es bei wenigen Euro.

Technischer Haken: Der Cloudflare-Zwischenspeicher liefert Dateien über 512 MiB nicht zuverlässig aus (deshalb sind die Pipeline-Dateien kleiner). Eine Datei von mehreren GB würde nicht zwischengespeichert, jeder Kachelabruf ginge direkt an R2: langsamer, aber billig und funktionsfähig. Alternative: Aufteilen in Dateien je Region unter 512 MiB (wie bei den Länder-Dateien) und/oder einen schlankeren Stil (weniger Namen und Ebenen).

Vorgehen: zuerst Schritt B (Einbau in die App, die VM-Karte genügt), danach Test mit Neunkirchen auf R2 und die Ladezeit ohne Zwischenspeicher messen, erst dann entscheiden, ob die Karte aufgeteilt wird.

**Die VM bleibt für Entwicklung und Tests.** Dort laufen Playwright, Stress- und Lasttests mit lokalen Daten. Der Assistent lässt sich dort vollständig prüfen, weil er nur eine Datenquelle (URL aus `config.js`) braucht. Nicht auf der VM prüfbar: Safari und iPhone (Test am Gerät), echte Ladezeiten über R2 und das Cache-Verhalten (erst nach dem Hochladen).

## Reihenfolge

| Schritt | Inhalt | Prüfbar |
|---|---|---|
| A | Assistent im Spike bauen, Grundlage ist die Auswahlseite (#109) und `layout.js` | VM komplett |
| B | In die App einbauen: Export-Menü, Lazy-Loading, i18n, A11y-Tests | VM, Dev-Server |
| C | Basiskarte, Schriften und Einbahn-Ebene bauen und hochladen (Pipeline-Repo) | Pipeline, Hosting |
| D | Hinter Schalter in `Config` ausrollen, mit Notbremse (wie bei Europa) | live |

A und C hängen nicht voneinander ab und können parallel laufen. B braucht A; D braucht B und C.

## Offene Entscheidungen

- Gebiet: nur DACHLiLu oder auch Europa? Europa wäre ein Mehrfaches an Basiskarten-Daten.
- Ausgabe: reichen PDF und PNG, oder braucht es früh einen Druckauftrag mit Beschnitt und Rand?
- Sichtbarkeit: für alle Nutzer, oder zunächst nur für Feuerwehren über einen Link?
- ~~Freies Rahmenzeichnen~~ entschieden: nötig, umgesetzt im Assistenten (Kanten und Ecken einzeln ziehen, Blatt nimmt das Seitenverhältnis an; PR #113).
- Soll der Ortsplan-Stil auch als Bildschirm-Ebene sichtbar sein (offene Frage aus dem Hauptplan)?

## Nicht Teil dieses Plans

- Weitere Barrierefreiheits-Menüs oder Objektlisten.
