---
title: Export
description: Hydrantenplan als PNG oder PDF, Hydranten als GPX oder CSV exportieren – Ausschnitt wählen, Format, Detailgrad und Grenzen.
eyebrow: Export
lead: Aus jedem Kartenausschnitt wird mit wenigen Klicks ein Hydrantenplan zum Ausdrucken oder eine Punktliste für Navi und Tabelle.
order: 5
---

## Welches Format wofür? {#formate}

| Format | Ergebnis | Gut für |
|---|---|---|
| **PNG** | Bild des Ausschnitts mit Titel, Maßstab, Datum und Quellenangabe | Aushang, E-Mail, Präsentation |
| **PDF** | derselbe Plan als PDF | Drucken, Ablage |
| **GPX** | Hydranten und andere Objekte als Wegpunkte | Navigationsgeräte, Einsatz- und Wander-Apps |
| **CSV** | Tabelle mit allen Angaben je Objekt | Tabellenprogramme, Auswertungen, Abgleich mit eigenen Listen |

Der Export gibt es nur am Computer. Für einen gestalteten Plan mit Gitter, Straßenverzeichnis und festem Maßstab nimm den [Ortsplan](../town-plan/).

## Schritt für Schritt {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
Das Export-Menü.
:::

:::steps
1. **Export-Menü öffnen:** der Knopf mit dem Pfeil nach unten, oben links neben Kartenebenen.
2. **Format-Vorlage wählen (1):** **Frei** für einen beliebigen Ausschnitt, **DIN quer** oder **DIN hoch** für das Seitenverhältnis eines DIN-Blatts.
3. **Ausschnitt festlegen:** mit **Ausschnitt auf Karte wählen (2)** ziehst du ein Rechteck auf der Karte. **Sichtbaren Ausschnitt übernehmen (3)** nimmt den aktuellen Ausschnitt (bei DIN im passenden Seitenverhältnis). Wählst du nichts, exportiert OpenFireMap den sichtbaren Ausschnitt.
4. **Detailgrad wählen (4):** Zoomstufe 15 bis 18. Je höher, desto mehr Details und desto größer die Datei. Für einen Straßenzug ist 18 richtig, für einen ganzen Ort eher 16.
5. **Format anklicken:** Hydrantenplan als **PNG (5)** oder **PDF**, Hydranten als **GPX (6)** oder **CSV**.
6. **Titel prüfen:** OpenFireMap schlägt einen Titel mit dem Ortsnamen vor. Ändere ihn bei Bedarf und klicke auf **Erstellen**.
:::

:::figure title frame=plain
Der Titel wird vorgeschlagen und lässt sich vor dem Erstellen ändern.
:::

Während der Plan entsteht, zeigt ein Fortschrittsfenster, was gerade passiert. **Vorgang abbrechen** stoppt den Export jederzeit.

## Was auf dem Plan steht {#plan}

PNG und PDF enthalten den gewählten Ausschnitt mit der aktuellen [Hintergrundkarte](../layers/), alle Feuerwehr-Objekte, Gemeindegrenzen, den Titel, einen Maßstab, Datum und Detailgrad sowie die Quellenangabe „© OpenStreetMap-Mitwirkende“.

Der Dateiname enthält Datum, Uhrzeit, Detailgrad und Titel, zum Beispiel `2026-11-19_14-30_Z18_Nürnberg.png`.

:::tip Gut lesbare Pläne
Stelle vor dem Export den Hintergrund **Druck (Hell)** ein. Die Symbole heben sich dann am besten ab, und der Ausdruck braucht weniger Farbe. **Topographisch** geht bis Detailgrad 17.

Druckst du schwarz-weiß, zum Beispiel auf einem Laserdrucker, stelle unter **Grundkarte** auf **S/W**. Die Karte kommt dann in kräftigen Grautönen, Gebäude und Straßenränder bleiben erkennbar, und die Symbole bleiben farbig. Luftbilder werden nur in Graustufen umgewandelt.
:::

## GPX und CSV {#gpx-csv}

**GPX** enthält jedes Objekt als Wegpunkt mit Namen und einer Beschreibung der wichtigsten Angaben. Die Datei lässt sich in Navigationsgeräte, Einsatz-Apps oder Programme wie OsmAnd und Garmin BaseCamp laden.

**CSV** ist eine Tabelle mit Semikolon als Trennzeichen. Jede Zeile ist ein Objekt mit Typ, Subtyp, Name, Kennung, Koordinaten, Durchmesser, Druck, Durchfluss, Adresse, Betreiber, OSM-ID, Link zu OpenStreetMap, Datenquelle und Lizenz. Excel, LibreOffice und Numbers öffnen sie direkt.

## Grenzen {#grenzen}

- **Höchstens 10 × 10 Kilometer.** Größere Flächen würden den Browser überfordern. Ziehst du ein größeres Rechteck, begrenzt OpenFireMap es und sagt Bescheid.
- **Unter Zoomstufe 15** zeigt die Karte noch keine Hydranten. Der Export lädt die Daten dann selbst nach, das dauert etwas länger.
- **Nur am Computer.** Am Smartphone fehlt das Export-Menü.
- Enthält der Ausschnitt keine Objekte, erscheint die Meldung „Keine Objekte im gewählten Bereich!“.

:::note Quellenangabe
Die Daten stehen unter der Open Database License. Wenn du einen Plan weitergibst oder aushängst, muss „© OpenStreetMap-Mitwirkende“ sichtbar bleiben. Schneide die Quellenangabe deshalb nicht ab.
:::
