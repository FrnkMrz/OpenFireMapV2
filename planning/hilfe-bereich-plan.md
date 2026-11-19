# Plan: Hilfe-Bereich für OpenFireMap

Stand: 19.11.2026 · Status: Etappen 1–5 umgesetzt (Prototyp, Gerüst und Startseite, Bildschirmfotos, Anleitungen Karte/Smartphone/Ebenen/Daten/Export/Ortsplan); offen Overlay, Mitmachen, Barrierefreiheit, FAQ-Seite

Vorbild ist die Hilfeseite des Hydrantenjägers (`hydrantenjaeger.de/help/`): dunkles Layout, große Überschrift mit kursivem Akzent, nummerierte Schritte, Typen-Karten, „Gut zu wissen“, FAQ, Kontakt. OpenFireMap bekommt einen eigenen, größeren Hilfe-Bereich mit Unterseiten, der optisch zur selben Familie gehört, aber die OFM-Farben trägt.

---

## 1. Ziele

1. **Jede Funktion der Karte erklären**, getrennt nach Desktop und Mobil, mit echten Bildschirmfotos und nummerierten Markierungen („Hotspots“).
2. **Export und Ortsplan** Schritt für Schritt, der Ortsplan als eigene Detailseite.
3. **Overlay & Einbindung** für Betreiber fremder Karten verständlich machen (heute nur Demo-Seite + PDF-Leitfaden).
4. **Mitmachen:** Hydranten und Wasserstellen in OpenStreetMap eintragen – mit Hydrantenjäger und mit anderen Editoren (iD, StreetComplete, Every Door, Vespucci, JOSM), inkl. Tag-Referenz.
5. **FAQ** (bestehende `docs/FAQ.md` aufgreifen und erweitern), durchsuchbar.
6. **Fußbereich:** Lizenzen, Impressum, Datenschutz, Kontakt `info@openfiremap.org`, GitHub-Issues.
7. **Deutsch und Englisch** von Anfang an, Struktur offen für weitere Sprachen.
8. **Design auf Spitzenniveau:** schnell (kein Framework, kaum JS), barrierefrei (WCAG 2.2 AA wie die Karte), Dark/Light, perfekt auf 320 px bis 4K.

## 2. Bestandsaufnahme (ausprobiert am 19.11.2026)

| Bereich | Ist-Stand | Für die Hilfe wichtig |
|---|---|---|
| Karte Desktop | Suche, Standort, Ebenen (9 Hintergründe inkl. BayernAtlas/Luftbild), Export, Teilen, Info & Recht, Status-Box mit Datenstand-Popover | Hotspot-Tour über ein Desktop-Foto |
| Karte Mobil (< 1370 px oder Touch) | Burger-Menü: Kartenebenen, Teilen, Suche, Kartenzeichen, Info & Recht, Cache; Standort-Knopf unten; Status-Box oben rechts | **Kein Export auf Mobil** – muss die Hilfe klar sagen |
| Zoomstufen | Wachen früh, Hydranten ab 15, Symbole ab 17, Details per Tooltip | Grafik „Was sehe ich bei welchem Zoom?“ |
| Export | PNG, PDF, GPX, CSV; A4 quer/hoch/frei; Rechteck ziehen oder „Sichtbaren Ausschnitt übernehmen“; Titel-Dialog; max. 10 km Kantenlänge | Schritt-für-Schritt + Grenzen |
| Ortsplan | `/ortsplan/` + `/ortsplan/blatt/`, 3 Schritte (Ausschnitt & Format, Inhalt, Anordnen), PDF/PNG, nur Desktop, nur per Link, Basiskarte nur Deutschland | Detailseite; **offen, ob öffentlich verlinkt** (s. Abschnitt 9) – im Test war die Kartenfläche grau, Basiskarte-Stand vor Veröffentlichung prüfen |
| Overlay | `/overlay/` mit Raster-Overlay, OFM-Einzelebenen, ZIP-Download, PDF-Leitfaden | Erklärseite, Leitfaden verlinken |
| Kartenzeichen | `/symbols/` | Verlinken, nicht doppeln |
| Statusseite | `/status/` (DE/EN) | In „Daten & Aktualität“ verlinken |
| Doku | `docs/ERSTE_SCHRITTE.md`, `FAQ.md`, `DATENQUELLEN.md`, `USER_MANUAL.md` | Inhalte übernehmen; danach auf die Hilfe verweisen statt doppelt pflegen |
| Rechtstexte | Im Dialog „Info & Recht“ in `index.html`, erreichbar über `/?legal=1`, Deutsch verbindlich | Eine Quelle behalten (s. 6.5) |

## 3. Seitenstruktur

```
/hilfe/                         Start (Hero, Schnellstart, Kacheln zu allen Themen, FAQ-Auszug, Kontakt)
├── karte/                      Die Karte am Computer (Hotspot-Tour Desktop)
├── mobil/                      Die Karte am Smartphone (Hotspot-Tour Mobil, PWA installieren)
├── ebenen-und-zeichen/         Hintergrundkarten, Zoomstufen, Kartenzeichen (→ /symbols/)
├── export/                     PNG, PDF, GPX, CSV – Ausschnitt wählen, Formate, Grenzen
├── ortsplan/                   Ortsplan erstellen – ausführlich, Schritt 1–3, Druck-Tipps
├── overlay/                    Overlay & Einbindung in eigene Karten (→ /overlay/, PDF)
├── daten/                      Datenquellen, Datenstand, Aktualität, Statusseite, Cache, offline
├── mitmachen/                  Hydranten eintragen – Übersicht + Entscheidungshilfe „Welcher Editor?“
│   ├── hydrantenjaeger/        Kurzfassung + Verweis auf hydrantenjaeger.de/help/
│   ├── id-editor/              Ausführlich mit Bildern (Browser, Desktop)
│   ├── unterwegs/              StreetComplete, Every Door, Vespucci (Android/iOS)
│   ├── josm/                   Für Fortgeschrittene
│   └── tags/                   Tag-Referenz Hydranten, Wasserstellen, Wachen, AED
├── barrierefreiheit/           Tastatur, Screenreader, Bewegung reduzieren
└── faq/                        Alle Fragen, gruppiert, mit Suche
```

Englisch spiegelbildlich (Pfadnamen siehe Entscheidung 1). Jede Seite hat dieselben Abschnitts-IDs in beiden Sprachen, damit Sprachwechsel an derselben Stelle landet.

### Inhalt der Kernseiten (Kurzfassung)

- **Start:** Hero „Löschwasser finden – *in Sekunden.*“ mit animierter Mini-Karte (SVG, Marker poppen auf), drei Schnellstart-Schritte (Ort suchen → hineinzoomen → Hydrant antippen), Themen-Kacheln, „Gut zu wissen“ (keine Einsatzgrundlage, 112, Daten aus OSM), FAQ-Auszug, Kontakt-Karte.
- **Karte (Desktop):** großes Bildschirmfoto im Browser-Rahmen, nummerierte Hotspots; Klick/Tastatur auf einen Punkt hebt Element und Erklärung hervor. Danach je Funktion ein Abschnitt: Suche, Standort, Ebenen, Teilen/Permalink, Marker-Details, Hydranten-Radius und Distanz-Linie, Status-Box & Datenstand, Info & Recht, Cache, Tastatur.
- **Mobil:** dasselbe Prinzip im Smartphone-Rahmen, Burger-Menü aufgeklappt als zweites Foto, Gesten, „Zum Home-Bildschirm“ (iOS/Android), Hinweis „Export nur am Computer“.
- **Export:** Ablauf als 4-Schritte-Leiste (Format wählen → Ausschnitt → Titel → Datei), Tabelle „Welches Format wofür?“ (PNG Aushang, PDF Druck, GPX Navi/Einsatz-App, CSV Tabelle), Grenzen (10 km, Laden unter Zoom 15), Tipps für gute Pläne (Ebene „Druck (Hell)“).
- **Ortsplan:** ausführlich: wofür (Einsatzplan, Aushang, Übungsplan), Schritt 1 Ausschnitt & Format (Rahmen ziehen, Ecken/Kanten, Papier, Maßstab), Schritt 2 Inhalt (Ebenen, Legende, Verzeichnis), Schritt 3 Anordnen (Titel, Legende, Nordpfeil, Maßstab, Verzeichnis), Ausgabe PDF/PNG, Druck-Tipps (100 % skalieren, Maßstab prüfen), Grenzen (nur Desktop, Basiskarte Deutschland), Quellenangabe Pflicht.
- **Overlay:** Was ist ein Overlay, Raster vs. Einzelebenen vs. Ortsplan-Grundkarte (Grafik aus `docs/OVERLAY.md`), Einbindung, CORS-Freigabe auf Anfrage, Leitfaden-PDF, Lizenzpflichten.
- **Mitmachen:** Entscheidungsbaum „Ich bin vor Ort mit dem Handy → Hydrantenjäger / StreetComplete“, „Ich sitze am Computer → iD“, „Ich mappe viel → JOSM“. Grundregeln: nur vor Ort Gesehenes eintragen, **keine Daten aus geschützten Hydrantenplänen der Wasserversorger ohne Erlaubnis**, Änderungssatz-Kommentar, wann die Änderung in OFM erscheint (Live-Delta in Sekunden; Löschungen erst mit dem nächsten wöchentlichen Pipeline-Build).
- **iD-Anleitung:** OSM-Konto anlegen → openstreetmap.org → Bearbeiten → Punkt setzen → Vorlage „Hydrant“ → Felder Typ, Position, Durchmesser, Nummer → Speichern mit Kommentar. Je Schritt ein Bild mit Markierung.
- **Tag-Referenz:** `emergency=fire_hydrant` + `fire_hydrant:type` (pillar/underground/wall/pipe), `fire_hydrant:position`, `fire_hydrant:diameter`, `couplings`, `ref`, `water_source`; `emergency=suction_point`, `emergency=water_tank`, `emergency=fire_water_pond`; `emergency=defibrillator` (+ `indoor`, `opening_hours`, `defibrillator:location`); `amenity=fire_station`. Jeweils mit OFM-Symbol und Link ins OSM-Wiki; abgeglichen mit `/symbols/` und den Filtern der App.
- **FAQ:** bestehende 9 Fragen + neu z. B. „Warum sehe ich keinen Hydranten?“, „Warum fehlt der Export auf dem Handy?“, „Darf ich Pläne für meine Feuerwehr drucken?“, „Wie zitiere ich die Quelle?“, „Ist das eine offizielle Feuerwehr-Karte?“, „Wie bekomme ich das Overlay in mein System?“, „Wann erscheint mein neuer Hydrant?“.

## 4. Designkonzept

**Leitidee: „Leitstelle bei Nacht“.** Ruhige, dunkle Fläche (Slate/Nachtblau wie die Karten-Panels), ein warmer Glutakzent (Feuerwehrrot/Orange) für Handlungen, Kartenblau für Links. Familienähnlich zum Hydrantenjäger (Eyebrow-Label in Sperrschrift, große Headline mit kursivem Akzentwort, Nummern 01–04), aber mit eigener Farbe und Kartenmotiven.

- **Typografie:** eine variable Grotesk für Text/UI und eine Serif-Kursive nur für Akzentwörter; beide **selbst gehostet** (keine Google Fonts → keine Datenschutzfrage, CSP bleibt streng).
- **Design-Tokens** als CSS-Variablen (Farbe, Abstände, Radien, Schatten), Dark als Standard, Light-Modus über `prefers-color-scheme` + Schalter.
- **Bausteine:** Hero mit animierter SVG-Karte · Geräterahmen (Browser/Phone) mit Hotspots · Schritt-Leiste · Formatkarten · Tabellen · Hinweiskästen (Tipp/Achtung/Rechtlich) · Tag-Karte mit Symbol und Code · FAQ-Akkordeon (`<details>`) · Kontaktkarte · Fußbereich.
- **Navigation:** Desktop: obere Leiste + feste Seitennavigation links und „Auf dieser Seite“ rechts; Mobil: kompakte Leiste, Navigation als Bottom-Sheet, „Zurück nach oben“.
- **Bewegung:** dezente Einblendungen per CSS-Scroll-Animationen, Hotspots pulsieren leicht; alles aus bei „Bewegung reduzieren“.
- **Bilder:** echte Bildschirmfotos als AVIF/WebP mit `srcset`, Markierungen als HTML darüber (übersetzbar, scharf, für Screenreader lesbar) statt in die Bilder gebrannt.
- **Qualitätsziel:** Lighthouse 100/100/100/100, axe ohne Befund, eigene Kontrastmessung (`tests/helpers/contrast.mjs`) grün, kein horizontales Scrollen ab 320 px.

## 5. Technik

- **Eigener Vite-Einstieg** wie `/status/` und `/overlay/`: kein Leaflet, kein Karten-Bundle, eigene CSP, eigene kleine JS-Datei (Hotspots, Navigation, Theme, Suche).
- **Umgesetzt in Etappe 2:** Startseite und Layout als HTML-Vorlagen mit Text-Schlüsseln (`help/layout.html`, `help/pages/start.html`, `help/text/de.json`/`en.json`), weil die Startseite aus vielen gestalteten Bausteinen besteht. `scripts/build-help.mjs` setzt die Texte ein, schreibt `help/index.html` und `help/en/index.html` (nicht versioniert) und liefert die Vite-Einstiege. Lange Anleitungsseiten (ab Etappe 4) kommen aus Markdown (`help/content/<sprache>/<seite>.md`, umgesetzt). Seitennamen in der Adresse sind in allen Sprachen englisch: `/help/map/`, `/help/phone/`, `/help/layers/`, `/help/data/`, `/help/export/`, `/help/town-plan/`.
- **Inhalte als Markdown** je Sprache (`help/content/de/*.md`, `help/content/en/*.md`) mit Frontmatter (Titel, Beschreibung, Reihenfolge) und wenigen Bausteinen (`:::steps`, `:::tip`, `:::hotspots` …). Ein Build-Skript `scripts/build-help.mjs` (marked ist schon im Projekt, s. Handout) rendert sie in ein gemeinsames HTML-Template; Vite bündelt die Seiten. So pflegen spätere Übersetzer nur Text.
- **Statische Seiten je Sprache** (kein Umschalten per JS): bessere Auffindbarkeit, `hreflang`, kein Aufflackern, Sprachschalter verlinkt die Gegenstück-Seite.
- **Vollständigkeitsprüfung** wie `i18n:check`: jede deutsche Seite hat ein englisches Gegenstück mit denselben Abschnitts-IDs und Hotspot-Nummern.
- **Bildschirmfotos automatisch** mit Playwright (`help/screenshots.mjs`, Muster `handouts/overlay-leitfaden/screenshots.mjs`): fester Ort, Desktop 1440×900 und iPhone 390×844 @3x, je Sprache, Menüs geöffnet. Läuft nicht im Pages-Build (braucht Netz), sondern per `npm run help:shots`; Ergebnisse werden eingecheckt. So bleiben Bilder nach UI-Änderungen mit einem Befehl aktuell.
- **Suche:** zunächst Filter auf der FAQ-Seite; seitenübergreifende Suche als Ausbaustufe (kleiner eigener JSON-Index beim Build, kein Fremddienst).
- **Tests:** Vitest für das Build-Skript (Bausteine, Gegenstücke, Links); Playwright für Barrierefreiheit (axe + Kontrast), Hotspots per Tastatur, 320 px ohne Querscrollen, alle internen Links erreichbar.
- **Einstieg aus der App:** Link „Hilfe“ (s. Entscheidung 3) und Verweise aus `README.md`/`docs/` auf die Hilfe.

## 6. Recht & Fußbereich

1. Fußzeile auf jeder Seite: Hilfe-Navigation, Lizenzen, Impressum, Datenschutz, Kontakt, GitHub, Version.
2. **Lizenzen-Abschnitt:** Daten © OpenStreetMap-Mitwirkende (ODbL), Hintergrundkarten mit ihren Quellen, Code MIT, Bibliotheken; Bildschirmfotos zeigen OSM-Daten → Quellenangabe an jedem Bild; Editor-Bildschirmfotos (iD, StreetComplete …) mit Lizenzhinweis.
3. **Hinweis „Keine Einsatzgrundlage“** sichtbar auf Start, Export und Ortsplan.
4. **Kontakt:** `info@openfiremap.org` und GitHub-Issues; Kontaktkarte am Seitenende („Fragen? Schreib uns.“).
5. **Rechtstexte eine Quelle:** Impressum/Datenschutz bleiben verbindlich im Dialog der Karte; die Hilfe verlinkt `/?legal=1`. Später optional eigene Seite `/recht/`, aus der der Dialog gespeist wird. Datenschutz um die Hilfe ergänzen (keine Cookies, keine Fremd-Schriften, nur Hosting-Logs).

## 7. Umsetzung in Etappen (je ein PR)

| # | Etappe | Ergebnis |
|---|---|---|
| 0 | Entscheidungen (Abschnitt 9) | Pfade, Ortsplan-Sichtbarkeit, App-Link geklärt |
| 1 | **Design-Prototyp** der Startseite (DE) als klickbare Vorschau | Freigabe der Gestaltung, bevor Inhalte entstehen |
| 2 | Gerüst: Template, Tokens, Schriften, Bausteine, Build-Skript, Vite-Einstieg, Start DE/EN, Tests | Leere, aber fertige Hilfe unter `/hilfe/` |
| 3 | Bildschirmfoto-Automatik + Hotspot-Baustein | Fotos Desktop/Mobil DE/EN |
| 4 | Karte (Desktop), Mobil, Ebenen & Zeichen, Daten | Kernnutzung erklärt |
| 5 | Export + Ortsplan | Detailseiten |
| 6 | Overlay | Erklärseite |
| 7 | Mitmachen (Übersicht, Hydrantenjäger, iD, unterwegs, JOSM, Tags) | Anleitungen |
| 8 | FAQ, Barrierefreiheit, Suche, Fußbereich, Link aus der App, Doku-Verweise | Fertig |
| 9 | Abnahme: Lighthouse, axe, Kontrast, iPhone/Android echt, Korrekturlesen DE/EN | Live |

Gearbeitet wird in einem eigenen Worktree von `main` (der gemeinsame Checkout steht auf einem anderen Branch mit offenen Änderungen).

## 8. Risiken

- **UI ändert sich** → Bilder veralten: dagegen die Foto-Automatik und Hotspots als HTML.
- **Ortsplan noch im Aufbau** (Basiskarte, nur per Link): Seite erst veröffentlichen, wenn der Ortsplan öffentlich sein soll; bis dahin hinter Schalter/noindex.
- **Editor-Anleitungen veralten** (iD, StreetComplete ändern sich): knapp halten, auf deren Doku verlinken, Stand-Datum auf der Seite.
- **Keine echten Bearbeitungen in OSM für Bildschirmfotos**: Bilder aus dem iD-Rundgang („Walkthrough“, Übungsdaten) oder ohne Speichern.
- **Rechtlich heikle Ratschläge** (Hydrantenpläne der Wasserversorger): neutral formulieren, auf OSM-Wiki „Copyright“ verweisen.

## 9. Entscheidungen (19.11.2026)

1. **Adresse `/help/`** (Deutsch). Englisch unter `/help/en/` (Vorschlag, gleiche Seitennamen).
2. **Ortsplan wird in der Hilfe erklärt und verlinkt.**
3. **Link in der App** im Dialog „Info & Recht“ (erreichbar auf Desktop und im mobilen Menü), kein neuer Knopf auf der Karte.
4. **Eigenes Design, unabhängig vom Hydrantenjäger. Helle Seite mit weißem Hintergrund**, kein dunkles Layout. Abschnitt 4 („Leitstelle bei Nacht“) ist damit überholt; neue Leitidee „Hinweisschild“: Weiß, Signalrot, Wasserblau, Beschilderungs-Typografie, das Hydranten-Hinweisschild als Erkennungszeichen.
5. **Kontakt:** `info@openfiremap.org` wird auf der Seite genannt.

Seitenpfade in Abschnitt 3 gelten unter `/help/` statt `/hilfe/`. Bis der Bereich fertig ist, tragen die Seiten `noindex`; noch fehlende Themen stehen auf der Startseite als „Folgt“.
