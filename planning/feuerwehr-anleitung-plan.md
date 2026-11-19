# Plan: Anleitung für Feuerwehren – Hydranten bei Übung und Ortsrundgang prüfen und eintragen

Stand: 19.11.2026 · Status: Entscheidungen geklärt, E1 in Arbeit · Herkunft: To-do aus `planning/hilfe-bereich-plan.md` (Abschnitt 10)

> **Auftrag (Wortlaut Projektinhaber):** „Anleitung für Feuerwehren erstellen, mit der sie Hydranten und weitere relevante Objekte bei einer Übung oder einem Ortsrundgang selbst überprüfen und eintragen können. Mögliche Umsetzung: kurze Schritt-für-Schritt-Anleitung, Erklärvideo und ergänzender Comic.“

---

## 1. Ziel und Zielgruppe

**Ziel:** Eine Feuerwehr (Ortsfeuerwehr, Löschzug, Jugendfeuerwehr) kann mit diesem Material ohne Vorwissen zu OpenStreetMap einen Übungsabend oder Ortsrundgang so organisieren, dass danach

1. alle Hydranten, Löschwasserstellen, Saugstellen und öffentlichen Defibrillatoren im Ausrückebereich in OpenStreetMap stehen,
2. vorhandene Einträge geprüft und korrigiert sind (Typ, Lage, Durchmesser, Nummer),
3. sichtbare Mängel (Schild fehlt, Deckel zugeparkt, Hydrant zugewachsen) als eigene Liste an die Gemeinde bzw. den Wasserversorger gehen, nicht in OpenStreetMap,
4. der Stand mit OpenFireMap sichtbar ist und als Ortsplan gedruckt werden kann.

**Zielgruppen (in dieser Reihenfolge):**

| Rolle | Braucht |
|---|---|
| **Übungsleitung / Gruppenführer** | Ablaufplan, Vorbereitungsliste, Material zum Ausdrucken, Rechtliches, Zeitbedarf |
| **Trupp vor Ort** (2–3 Personen, auch Jugendfeuerwehr) | eine Seite Spickzettel, Hydrantentypen erkennen, Handy-Bedienung Hydrantenjäger |
| **Kommandant / Wehrführung** | Kurzfassung: Nutzen, Aufwand, Risiken, Absprache mit Gemeinde und Wasserversorger |
| **Nachbereitung** (eine Person am PC) | Kontrolle in OpenFireMap, Korrekturen mit iD, Mängelliste, Ortsplan drucken |

**Nicht-Ziele:** keine Hydrantenprüfung nach DVGW-Arbeitsblatt W 400-3 (das ist Sache des Wasserversorgers), kein Öffnen oder Betätigen von Hydranten, keine Übernahme fremder Hydrantenpläne, kein offizieller Einsatzplan.

## 2. Ausgangslage im Projekt (schon vorhanden, wiederverwenden)

- **Hilfe-Bereich** `/help/` (DE) und `/help/en/` (EN), hell, eigener Build: `scripts/build-help.mjs`, Inhalte als Markdown in `help/content/<sprache>/<seite>.md` mit Blöcken `:::figure`, `:::tip`, `:::note`, `:::warn`, `:::steps`; Bildschirmfotos per `npm run help:shots` (`help/screenshots.mjs`), Tests `test/help-build.test.js` und `tests/help.spec.js` (axe, 320 px). Details: `CLAUDE.md` Abschnitt „Hilfe“.
- **Anleitung Mitmachen** `/help/contribute/`: OSM-Konto, drei Regeln, Werkzeugwahl, iD Schritt für Schritt, Tag-Referenz. Die Feuerwehr-Anleitung baut darauf auf und verlinkt dorthin, statt sie zu wiederholen.
- **Hydrantenjäger** (`hydrantenjaeger.de`, eigene Hilfe `hydrantenjaeger.de/help/`): Web-App für das Handy, Punkt per GPS + Kompass 3 m voraus, Typ/Lage wählen, Upload nach OSM, Foto bleibt lokal. Hauptwerkzeug für den Trupp.
- **Ortsplan** `/ortsplan/`: druckfertiger Plan mit Planquadraten und Straßenverzeichnis (nur Desktop, Deutschland). Ideal als Einteilungskarte für Trupps („Trupp 1: Planquadrate A1–C4“).
- **PDF-Handouts**: `scripts/build-handout.mjs` baut aus `handouts/<ordner>/<Name>.md` + `style.css` + `img/` ein A4-PDF (marked + Playwright), Muster `handouts/overlay-leitfaden/`. Der Pages-Build veröffentlicht unter `/downloads/…`.
- **Rechtliches**: Datenschutz und Lizenzen im Dialog „Info & Recht“ (`/?legal=1`); Kontakt `info@openfiremap.org`.

## 3. Ergebnisse (Deliverables)

| # | Ergebnis | Form | Sprache |
|---|---|---|---|
| D1 | **Hilfe-Seite „Für Feuerwehren“** `/help/fire-brigades/` | Markdown-Seite im Hilfe-Build | DE, EN |
| D2 | **Leitfaden für die Übungsleitung** (Ablauf, Vorbereitung, Rechtliches, Nachbereitung) | PDF-Handout A4, ca. 6–8 Seiten | DE (EN später) |
| D3 | **Trupp-Karte** (Spickzettel): Hydrantentypen, Schild lesen, 6 Schritte Hydrantenjäger, Sicherheit | PDF A4 beidseitig bzw. A5 laminierbar | DE |
| D4 | **Erfassungsbogen** auf Papier (Rückfall ohne Handy/Netz) und **Mängelliste** für Gemeinde/Wasserversorger | PDF A4, ausfüllbar von Hand | DE |
| D5 | **Erklärvideo** 3–4 min (+ 60-s-Kurzfassung) | MP4 mit Untertiteln, selbst gehostet | DE, Untertitel EN |
| D6 | **Comic** 1–2 Seiten „Der Hydrant, den keiner fand“ | Bilder + PDF, Alternativtext | DE, EN |
| D7 | **Präsentation für den Unterrichtsabend** (10–12 Folien) | PDF/Folien | DE |
| D8 | Einbindung: Startseite der Hilfe, FAQ, Mitmachen-Seite verlinken D1; Downloads unter `/downloads/` | Hilfe-Build | DE, EN |

Reihenfolge der Umsetzung: D1 → D3 → D2 → D4 → D8 → D7 → D6 → D5 (Video zuletzt, weil es die Abläufe aus D1–D3 bebildert und am teuersten zu ändern ist).

## 4. Inhalt der Anleitung (fachlich)

### 4.1 Warum mitmachen (Einstieg, eine Seite)
- Wer im Einsatz Wasser sucht, verliert Zeit. OpenFireMap zeigt, was in OpenStreetMap steht; fehlt dort etwas, fehlt es auf der Karte.
- Nebennutzen: Ortskenntnis für neue Kameradinnen und Kameraden, Jugendfeuerwehr-Projekt, aktueller Ortsplan zum Ausdrucken.
- Klarstellung: OpenFireMap ersetzt keine Einsatzunterlagen; Notruf 112.

### 4.2 Vorbereitung (Übungsleitung, 1–2 Wochen vorher)
1. **Absprache** mit Wehrführung; Hinweis an Gemeinde/Wasserversorger, dass eine Bestandsaufnahme stattfindet, und Angebot, die Mängelliste zu schicken. Ausdrücklich: Es werden keine Hydranten geöffnet.
2. **Gebiet festlegen und aufteilen:** Ortsplan des Ausrückebereichs drucken (`/ortsplan/`), Planquadrate auf Trupps verteilen (Richtwert: 1 Trupp je 15–25 Hydranten bzw. je 0,5–1 km² bebautes Gebiet bei 90 Minuten).
3. **Ist-Stand ansehen:** OpenFireMap bei Zoom 17 öffnen, vorhandene Hydranten zählen; optional CSV-Export als Prüfliste je Planquadrat (`/help/export/`).
4. **Konten:** Jede/r, der/die einträgt, legt vorher ein eigenes OpenStreetMap-Konto an (Anleitung `/help/contribute/#vorher`). Keine Sammelkonten (OSM-Regeln, Nachvollziehbarkeit). Jugendfeuerwehr: Konto nach Alters- und Einwilligungsregeln; Alternative: Jugendliche erfassen, Betreuer lädt hoch.
5. **Organisierte Aktivität dokumentieren:** OpenStreetMap verlangt für organisierte Kartierungen eine kurze Beschreibung im OSM-Wiki (Organised Editing Guidelines der OSMF). Vorlage für eine Wiki-Seite mitliefern; einheitlicher Hashtag im Änderungssatz-Kommentar, `#OpenFireMap` (Entscheidung 9.6).
6. **Material:** Handys geladen (Hydrantenjäger im Browser getestet, Standort/Kompass erlaubt), Powerbank, Warnwesten, Taschenlampe, Trupp-Karte (D3), Erfassungsbogen (D4) als Rückfall, Klemmbrett, ggf. Maßband.

### 4.3 Durchführung (90 Minuten, Übungsdienst)
| Zeit | Inhalt |
|---|---|
| 0–15 min | Einweisung: Ziel, Sicherheit, Hydrantentypen und Schild lesen (D7), Hydrantenjäger vorführen |
| 15–75 min | Trupps im eigenen Planquadrat: jeden Hydranten **finden, prüfen, eintragen bzw. korrigieren**, Mängel notieren |
| 75–90 min | Rückkehr, kurze Auswertung, offene Punkte sammeln |

**Pro Hydrant (Trupp-Karte, 6 Schritte):**
1. Hydrant finden: Schild suchen, Schild lesen (H = Hydrant, Zahl = Nennweite in mm; die Zahlen am Balken und am Stiel geben die Entfernung des Hydranten vom Schild in Metern an – seitlich und nach vorn; genaue Lesart vor Veröffentlichung mit DIN 4066 abgleichen).
2. Prüfen, ob er schon in OpenFireMap/Hydrantenjäger steht (Marker in der Nähe).
3. Neu: etwa 3 m davor stellen, Handy auf den Hydranten richten, Typ (Unterflur, Überflur, Wand, Saugstelle …) und Lage wählen; Durchmesser und Nummer nur, wenn sicher (vom Schild).
4. Vorhanden: Angaben prüfen und korrigieren; Lage verschieben, wenn sie mehr als ein paar Meter abweicht.
5. Hochladen (oder auf dem Erfassungsbogen notieren, wenn kein Netz).
6. Mängel getrennt notieren (Schild fehlt/unleserlich, Deckel zugeparkt/überteert, zugewachsen, beschädigt) – **nicht** in OpenStreetMap, sondern auf die Mängelliste (D4).

**Weitere Objekte (wenn Zeit):** Saugstellen, Löschwasserteiche und -behälter, öffentlich zugängliche Defibrillatoren (mit Zugang und Öffnungszeiten), Feuerwehrzufahrten werden *nicht* erfasst (außerhalb des Projektumfangs).

### 4.4 Sicherheit und Regeln (eigener Kasten, überall gleich)
- Warnweste, nicht auf der Fahrbahn stehen bleiben, Verkehr beachten; Jugendliche nur mit Betreuung.
- Keine privaten Grundstücke ohne Erlaubnis; Wandhydranten in Gebäuden nur mit Zustimmung.
- **Hydranten nicht öffnen, nicht betätigen**, Deckel nicht anheben.
- Fotos: keine Personen, Kennzeichen, Hausnummern; Hydrantenjäger lädt Fotos nicht hoch.
- Daten nur aus eigener Anschauung; keine Pläne der Gemeinde/Wasserversorger abschreiben (Urheberrecht, Datenbankrecht, Lizenzunverträglichkeit mit ODbL).
- Übungsdienst ist dienstlich angesetzt (Versicherungsschutz über die Feuerwehr klären; Formulierung als Empfehlung, keine Rechtsberatung).

### 4.5 Nachbereitung (ein bis zwei Personen am PC, 30–60 min)
1. In OpenFireMap prüfen, ob alles angekommen ist (Hinweis: Anzeige nicht sofort, siehe `/help/data/#verzoegerung`).
2. Papiererfassungen mit iD nachtragen (`/help/contribute/#id`).
3. Qualitätsblick: Doppelte Punkte, Hydranten ohne Typ (rote Punkte ohne Buchstaben), offensichtliche Fehllagen; optional Prüfwerkzeuge wie OSMCha (eigene Änderungssätze ansehen) oder Osmose.
4. Mängelliste sauber abtippen und an Gemeinde/Wasserversorger senden (Vorlage D4 mit Anschreiben-Textbaustein).
5. Ortsplan neu drucken und im Gerätehaus aushängen; optional Ortsplan-PDF in die Fahrzeugmappen.
6. Ergebnis teilen: kurzer Bericht (Anzahl neu/korrigiert), gern an `info@openfiremap.org` für eine Sammlung von Beispielen.

### 4.6 Wiederholung
Empfehlung: jährlich ein Rundgang (z. B. im Frühjahr nach dem Winterdienst), Neubaugebiete nach Fertigstellung, Jugendfeuerwehr als Daueraufgabe. Fortschritt über die Statusseite (`/status/`) bzw. Zählung im Ausschnitt.

## 5. Medien

### 5.1 Erklärvideo (D5)
- **Länge:** 3–4 min Hauptfassung, 60 s Kurzfassung (Social, Unterrichtseinstieg).
- **Aufbau:** Problem (Wasser suchen im Einsatz) → Karte zeigt nur, was eingetragen ist → Übung organisieren (Ortsplan, Trupps) → vor Ort mit Hydrantenjäger (echte Aufnahme, Hände + Handy, Hydrant mit Schild) → Mängel getrennt → Ergebnis auf der Karte und im gedruckten Plan.
- **Produktion:** Drehbuch und Sprechertext zuerst (in diesem Repo als Markdown, `media/video/drehbuch.md`), dann Storyboard (Skizzen), Bildschirmaufnahmen per Playwright/Screen-Recording, Außenaufnahmen mit einer echten Feuerwehr (Einverständniserklärungen, keine Kennzeichen/Gesichter ohne Zustimmung), Sprecheraufnahme.
- **Barrierefreiheit:** Untertitel DE und EN (WebVTT), Transkript als Text auf D1, keine reine Bild-Information ohne Sprechertext (Audiodeskription-light), keine schnellen Blitze.
- **Hosting/Datenschutz:** Kein YouTube-Embed ohne Zwei-Klick-Lösung. Bevorzugt selbst gehostet (`<video>` mit MP4/WebM + VTT) über dieselbe Infrastruktur wie die Seite oder R2; Größe < 30 MB (1080p, H.264, ca. 1 Mbit/s). CSP der Hilfe um `media-src 'self'` bzw. die Medien-Domain erweitern.
- **Lizenz:** eigenes Material unter CC BY 4.0 (Weitergabe an andere Wehren erwünscht); Kartenausschnitte mit OSM-Quellenangabe; Musik nur lizenzfrei mit Nachweis.

### 5.2 Comic (D6)
- **Zweck:** niedrigschwelliger Einstieg für Jugendfeuerwehr und Aushang; erzählt, warum Einträge zählen.
- **Umfang:** 8–12 Panels, 1 Seite A4 hoch (+ optional Fortsetzung „Rundgang“).
- **Skizze Handlung:** Nachts Brandeinsatz, Maschinist sucht den Unterflurhydranten unter parkendem Auto/Schnee → Schild fehlt → Zeitverlust → nächste Woche: Jugendfeuerwehr-Rundgang mit Handy, Schild lesen, Eintrag, Mängelliste an die Gemeinde → nächster Einsatz: Hydrant auf der Karte und im Ortsplan, Schild ist neu.
- **Produktion:** Drehbuch Panel für Panel (`media/comic/skript.md`), Zeichnung durch Illustrator/in oder eigene Vektorzeichnung im Stil der Hilfe (hell, Signalrot, Wasserblau). Falls Bildgenerierung genutzt wird: Rechte und Kennzeichnung klären, keine realen Personen/Marken, Ergebnis nachbearbeiten. Entscheidung offen (Abschnitt 9).
- **Barrierefreiheit:** Text als echter Text (nicht ins Bild gebrannt) bzw. vollständiger Alternativtext/Transkript; kontrastreiche Sprechblasen; PDF mit Lesereihenfolge.
- **Lizenz:** CC BY 4.0, Quelle „OpenFireMap.org“.

### 5.3 Präsentation (D7)
10–12 Folien für den Unterrichtsabend: Was ist OpenStreetMap/OpenFireMap, Hydrantentypen, Schild lesen, Hydrantenjäger in 6 Schritten, Sicherheit/Regeln, Ablauf des Abends, Nachbereitung. Als PDF aus Markdown (gleicher Handout-Build mit Folienstil) oder als Slides-Datei; Bilder aus `npm run help:shots`.

## 6. Technik und Struktur

```
help/content/de/fire-brigades.md        D1 (Seite „Für Feuerwehren“), order nach contribute
help/content/en/fire-brigades.md
handouts/feuerwehr-leitfaden/            D2  (Markdown + style.css + img/)
handouts/feuerwehr-truppkarte/           D3
handouts/feuerwehr-boegen/               D4  (Erfassungsbogen + Mängelliste)
handouts/feuerwehr-praesentation/        D7
media/video/drehbuch.md, untertitel/*.vtt   D5 (Quellen; Videodatei nicht im Repo, sondern Hosting)
media/comic/skript.md, panels/*.svg|png      D6
public/downloads/…                        erzeugte PDFs (Build), wie Overlay-Leitfaden
```

- **Build:** `npm run build` baut alle Handouts mit (`handout:build` je Ordner ergänzen, wie beim Overlay-Leitfaden). Die Hilfe-Seite verlinkt die PDFs unter `/downloads/`.
- **Bilder:** `help/screenshots.mjs` um Hydrantenjäger-Bilder erweitern? Nein: fremde App, Bildschirmfotos nur mit Zustimmung des Hydrantenjäger-Betreibers (gleicher Projektinhaber → klären und vermerken). Fotos von Hydranten/Schildern selbst aufnehmen (ohne Personen/Kennzeichen).
- **Hinweisschild-Grafik:** vorhandene SVG der Hilfe-Startseite (nach Referenzfoto H 100) wiederverwenden, ergänzt um Bemaßungs-Erklärung (welche Zahl wofür) – vorher mit der DIN-4066-Fassung bzw. einer Werknorm abgleichen.
- **Tests:** neue Seite fällt automatisch unter `test/help-build.test.js` (gleiche Abschnitte DE/EN, Links) und `tests/help.spec.js` (Slug in `SLUGS` ergänzen: axe, 320 px). Für die Handouts: `test/build-handout.test.js`-Muster (Front Matter, Bilder vorhanden). Video-Einbindung: Test, dass `<video>` Untertitel-Spur und Transkript hat.
- **CSP:** nur bei Video ändern (`media-src`); sonst keine Fremdquellen.
- **Barrierefreiheit:** WCAG 2.2 AA wie die übrige Hilfe; PDFs mit Überschriftenstruktur, Alternativtexten, Sprache gesetzt (Playwright-PDF taggt nur begrenzt → prüfen, ggf. Hinweis + HTML-Fassung auf D1 als barrierefreie Alternative).

## 7. Etappen (je ein PR, nicht gestapelt wenn vermeidbar)

| # | Etappe | Ergebnis | Abnahme |
|---|---|---|---|
| E0 | Entscheidungen (Abschnitt 9) mit Projektinhaber | Liste beantwortet | — |
| E1 | **Seite „Für Feuerwehren“** D1 (DE/EN), Verlinkung D8 | live unter `/help/fire-brigades/` | Tests grün, Inhalt fachlich gegengelesen |
| E2 | **Trupp-Karte** D3 + **Bögen** D4 als PDF, Download auf D1 | `/downloads/…pdf` | Druck A4/A5 getestet, lesbar mit Handschuh-Abstand |
| E3 | **Leitfaden** D2 (Übungsleitung) | PDF 6–8 Seiten | Probedurchlauf mit einer echten Wehr (Feedback einarbeiten) |
| E4 | **Präsentation** D7 | PDF | — |
| E5 | **Comic** D6: Skript → Skizzen → Reinzeichnung → Einbindung | PDF + Bilder + Transkript | Freigabe Projektinhaber |
| E6 | **Video** D5: Drehbuch → Storyboard → Dreh → Schnitt → Untertitel → Hosting | MP4 + VTT + Transkript auf D1 | Freigabe, Datenschutz geprüft |
| E7 | Pilot mit 1–2 Feuerwehren, Erfahrungen in alle Teile einarbeiten; EN-Fassungen von D2–D4 | Version 1.0 | — |

## 8. Risiken

- **Sicherheit vor Ort** (Straßenverkehr, Jugendliche): klare Regeln in jedem Medium, nicht nur im Leitfaden.
- **Rechtslage**: Urheberrecht fremder Pläne, Datenschutz bei Fotos und Video, Einwilligungen der Mitwirkenden; keine Rechtsberatung formulieren, sondern Empfehlungen + Verweis auf zuständige Stellen.
- **OSM-Regeln** für organisierte Aktivitäten (Wiki-Dokumentation, eigene Konten, Änderungssatz-Kommentare); Missachtung kann zur Rücknahme der Änderungen führen.
- **Erwartung „sofort sichtbar“**: Anzeige verzögert sich (Overpass, Caches); nie feste Zeiten versprechen (Vorgabe des Projektinhabers).
- **Veralten** von App-Oberflächen (Hydrantenjäger, iD): Bildschirmfotos datieren, Video so schneiden, dass UI-Teile kurz sind.
- **Aufwand Video/Comic**: teuer; daher zuletzt und nach Pilot.

## 9. Entscheidungen (geklärt 19.11.2026)

1. **Adresse und Titel:** `/help/fire-brigades/`, „Für Feuerwehren“ / „For fire brigades“. ✔
2. **Hydrantenjäger-Bildschirmfotos:** in E1 und E2 keine; im Leitfaden (E3) erlaubt (Entscheidung 19.11.), aufgenommen per `handouts/feuerwehr-leitfaden/screenshots.mjs` mit simuliertem Standort, ohne Upload.
3. **Pilot-Feuerwehr:** noch offen. E3 erscheint vorher als Version 0.9 (Entscheidung 19.11.), Rückmeldungen fließen in E7 ein.
4. **Comic:** eigene Vektorzeichnung im Hilfe-Stil.
5. **Video-Hosting:** selbst gehostet (`<video>` mit MP4/WebM + VTT), keine Plattform.
6. **Hashtag:** nur `#OpenFireMap` (kein Orts-Hashtag).
7. **Mängelliste:** nur Vorlage; die Wehr schickt sie selbst an Gemeinde/Wasserversorger, keine Sammelstelle bei OpenFireMap.
8. **Englisch für D2–D4:** nach dem Pilot.

## 10. Startprompt für die neue Sitzung

```
Lies planning/feuerwehr-anleitung-plan.md und CLAUDE.md (Abschnitt „Hilfe“). Kläre zuerst die offenen Entscheidungen in
Abschnitt 9 mit mir (eine Frage-Runde), dann setze Etappe E1 um: Seite „Für Feuerwehren“ (DE/EN) im Hilfe-Build
(help/content/<sprache>/fire-brigades.md), verlinkt von Startseite, FAQ und Mitmachen, Tests ergänzt (SLUGS in
tests/help.spec.js). Arbeite im eigenen Worktree von main, E2E nur mit der Projekt-Konfiguration auf Port 5173,
PR mit voller URL, nicht selbst mergen. Keine festen Aktualisierungszeiten versprechen; Overlay nur verlinken.
```

## 11. Umsetzungsstand

- **E1** Seite „Für Feuerwehren“: live (#196), seit #205/#208 nur Deutsch und nur für Deutschland.
- **E2** Trupp-Karte und Bögen: live (#197).
- **E3** Leitfaden für die Übungsleitung (`handouts/feuerwehr-leitfaden/`, 7 Seiten A4): Kurzfassung für die Wehrführung, Checklisten, Vorlage für die OSM-Wiki-Seite, Hydrantenjäger in drei Bildern, Ablauf, Probleme vor Ort, Sicherheit, Nachbereitung. Version 0.9 vor dem Pilot.
- **Korrektur Hashtag:** Hydrantenjäger setzt den Änderungskommentar fest („… via Hydranten Jäger“), ein Hashtag lässt sich dort nicht eingeben. `#OpenFireMap` wird deshalb nur für den iD-Editor verlangt (Hilfeseite, Trupp-Karte, Leitfaden). Ob Hydrantenjäger einen Hashtag mitschickt, ist eine Entscheidung im Hydrantenjäger-Repo.
