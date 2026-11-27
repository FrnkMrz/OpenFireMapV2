---
title: Technik & Aufbau
description: Wie OpenFireMap technisch funktioniert: Web-App im Browser, Kartendienste, Datenpipeline mit PMTiles bei Cloudflare, Overpass und Nominatim, Barrierefreiheit, Sicherheit und Datenschutz.
eyebrow: Für Technik-Interessierte
lead: Ein Blick unter die Haube. Diese Seite beschreibt, aus welchen Bausteinen OpenFireMap besteht, welche Dienste beteiligt sind und was beim Laden eines Kartenausschnitts passiert. Für die Bedienung brauchst du nichts davon.
order: 11
languages: de, en
---

## Auf einen Blick {#ueberblick}

OpenFireMap ist eine reine Web-App. Es gibt **keinen eigenen Anwendungsserver**, keine Datenbank mit Nutzerdaten und keine Konten. Dein Browser lädt die App von GitHub Pages und holt sich alles Weitere direkt bei den beteiligten Diensten: Kartenbilder bei den Kartenanbietern, Feuerwehr-Objekte als vorbereitete Kacheln von Cloudflare oder live von Overpass, Suchergebnisse von Nominatim.

:::diagram architecture
Aufbau von OpenFireMap: Die Web-App läuft im Browser und spricht Kartenanbieter, Overpass, Nominatim und den Cloudflare-Speicher direkt an. Die Datenpipeline baut aus OpenStreetMap die Kacheln für Cloudflare.
:::

| Baustein | Technik | Aufgabe |
|---|---|---|
| Web-App | JavaScript (ES-Module, ohne Framework), [Vite](https://vite.dev/), [Leaflet](https://leafletjs.com/), [Tailwind CSS](https://tailwindcss.com/) | Karte, Symbole, Bedienung, Export |
| Hosting | [GitHub Pages](https://pages.github.com/) | liefert HTML, JavaScript und CSS aus |
| Feuerwehr-Daten | [OpenStreetMap](https://www.openstreetmap.org/), aufbereitet als [PMTiles](https://docs.protomaps.com/pmtiles/) | Hydranten, Wasserstellen, Wachen, Defibrillatoren, Gemeindegrenzen |
| Datenauslieferung | [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/) mit Edge-Cache | vorbereitete Kacheln für 45 Länder |
| Live-Daten | [Overpass API](https://wiki.openstreetmap.org/wiki/DE:Overpass_API) | Änderungen seit dem Datenstand, übrige Welt |
| Suche | [Nominatim](https://nominatim.org/) | Orte und Adressen finden |
| Ortsplan | [MapLibre GL JS](https://maplibre.org/), [Protomaps](https://protomaps.com/)-Basiskarte | druckfertiger Plan im Browser |

Der Quellcode der Web-App liegt öffentlich auf GitHub: [FrnkMrz/OpenFireMapV2](https://github.com/FrnkMrz/OpenFireMapV2), unter MIT-Lizenz. Eine ausführliche Architektur-Beschreibung für Entwickler steht in [docs/ARCHITEKTUR.md](https://github.com/FrnkMrz/OpenFireMapV2/blob/main/docs/ARCHITEKTUR.md).

## Die Web-App im Browser {#web-app}

Die App besteht aus JavaScript-Modulen ohne Framework. [Vite](https://vite.dev/) bündelt sie beim Bauen, [Leaflet](https://leafletjs.com/) zeichnet Karte, Symbole und Kreise. Die Startreihenfolge:

:::steps
1. **Sprache:** Die Oberfläche lädt ihre Texte (30 Sprachen, Deutsch und Englisch als Rückfall).
2. **Oberfläche:** Knöpfe, Menüs und Dialoge werden verdrahtet. Am Smartphone legt sich eine eigene Bedienschicht darüber, die die Knöpfe der Desktop-Fassung auslöst, statt Logik doppelt zu haben.
3. **Karte:** Leaflet startet am Ausschnitt aus der Adresszeile (`#zoom/breite/länge/ebene`) oder am zuletzt gesehenen Ort.
4. **Export:** Der Export-Teil (PDF, PNG, GPX, CSV) lädt erst nach dem Start nach, damit die Karte schneller erscheint.
:::

Alle festen Werte wie Adressen, Zeitgrenzen und Farben stehen zentral in [`src/js/config.js`](https://github.com/FrnkMrz/OpenFireMapV2/blob/main/src/js/config.js). Der Kartenausschnitt steht immer in der Adresszeile, darum kann man jeden Ausschnitt als Link teilen.

## Kartenhintergründe {#karten}

Die Hintergrundkarten sind Rasterkacheln (256 × 256 Pixel), die der Browser direkt beim jeweiligen Anbieter abruft. OpenFireMap speichert oder verändert sie nicht.

| Ebene | Anbieter |
|---|---|
| Standard, Hell, Dunkel | [CARTO](https://carto.com/attributions) Basemaps auf Basis von OpenStreetMap |
| OpenStreetMap, OSM Deutsch | [OpenStreetMap](https://www.openstreetmap.org/) und [OpenStreetMap Deutschland](https://www.openstreetmap.de/) |
| Topografisch | [OpenTopoMap](https://opentopomap.org/) (OSM und SRTM-Höhendaten) |
| Satellit | [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9) |
| BayernAtlas, Luftbild Bayern | [Bayerische Vermessungsverwaltung](https://geodaten.bayern.de/) (Open Data) |

Die Quellenangaben stehen unten rechts in der Karte und in jedem Export.

## Die Feuerwehr-Objekte {#objekte}

Alle Feuerwehr-Objekte stammen aus [OpenStreetMap](https://www.openstreetmap.org/). OpenFireMap liest diese Merkmale (Tags):

| Ebene | OSM-Merkmale | ab Zoom |
|---|---|---|
| Feuerwachen | `amenity=fire_station`, `building=fire_station` | 12 |
| Hydranten und Löschwasser | `emergency=fire_hydrant`, `water_tank`, `suction_point`, `fire_water_pond`, `cistern` | 15 |
| Defibrillatoren | `emergency=defibrillator` | 15 |
| Gemeindegrenzen | `boundary=administrative` mit `admin_level=8` | 14 |

Die vollständige Liste der genutzten Merkmale steht maschinenlesbar in [taginfo.json](/taginfo.json) und auf [Taginfo](https://taginfo.openstreetmap.org/projects/openfiremap).

## Ein Kartenausschnitt Schritt für Schritt {#ladeweg}

Bei jeder Kartenbewegung wartet OpenFireMap kurz, bis die Karte ruht, bricht eine noch laufende Anfrage per `AbortController` ab und lädt dann neu.

:::diagram loading
Ladeweg eines Kartenausschnitts: Liegt er im Pipeline-Gebiet, liest die App die vorbereiteten Kacheln, zeichnet sofort und holt Änderungen per Overpass nach. Sonst, oder wenn die Kacheln nicht passen, fragt sie Overpass direkt.
:::

:::steps
1. **Gebiet prüfen:** Liegt der Ausschnitt in Deutschland, Österreich, der Schweiz, Liechtenstein oder Luxemburg (DACHLiLu) oder in einem der 40 Europa-Länder, deren Datei im Manifest steht? Grobe Rechtecke filtern vor, vereinfachte Länderumrisse entscheiden.
2. **Kacheln lesen:** Eine PMTiles-Datei ist ein einziges großes Archiv aus Vektorkacheln. Der Browser liest zuerst das Verzeichnis und dann mit **HTTP-Range-Anfragen** nur die Bytes der 2 bis 6 Kacheln, die der Ausschnitt braucht. Die Kacheln sind bis Zoom 14 gebaut, darüber werden sie vergrößert.
3. **Sofort zeichnen:** Der sichtbare Ausschnitt erscheint, sobald seine Kacheln da sind. Ein Rand drumherum lädt im Hintergrund nach, damit kleine Verschiebungen keine neue Anfrage brauchen.
4. **Live-Delta:** Die Kacheln haben einen Datenstand (`osm_data_until`). Für alles, was danach in OpenStreetMap geändert wurde, fragt die App Overpass mit `newer:` und ersetzt oder ergänzt Objekte per OSM-Typ und -ID.
5. **Ausweichweg:** Außerhalb des Pipeline-Gebiets, bei Fehlern oder wenn die Dateien den Ausschnitt nicht vollständig abdecken, fragt die App Overpass direkt.
:::

So sieht die Live-Abfrage für Hydranten aus (gekürzt):

```
[out:json][timeout:10][bbox:49.54,11.33,49.57,11.38];
(
  nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"]
     (newer:"2026-11-20T21:21:21Z");
  node["emergency"="defibrillator"](newer:"2026-11-20T21:21:21Z");
)->.pois;
.pois out center;
```

### Overpass-Server {#overpass}

OpenFireMap kennt vier öffentliche Overpass-Server und probiert sie in zufälliger Reihenfolge, jeden höchstens einmal. Antwortet einer mit 429 (zu viele Anfragen), einem 5xx-Fehler oder gar nicht, setzt die App ihn für einige Minuten aus und geht zum nächsten. Eine Antwort mit zu altem Datenstand (`timestamp_osm_base`) verwirft sie für das Live-Delta, damit nicht fälschlich „aktuell“ angezeigt wird.

:::note Was das Live-Delta nicht kann
`newer:` findet neue und geänderte Objekte, aber keine gelöschten. Ein gelöschter Hydrant verschwindet erst mit dem nächsten Datenstand der Kacheln.
:::

## Die Datenpipeline {#pipeline}

Die vorbereiteten Kacheln entstehen in einer automatischen Pipeline des Projekts. Ihr Code liegt in einem eigenen, nicht öffentlichen Repository. Der Ablauf:

:::steps
1. **Aktualisieren:** Die Länderauszüge von [Geofabrik](https://download.geofabrik.de/) im Format `.osm.pbf`. Für DACHLiLu lädt die Pipeline sie nicht jedes Mal neu (zusammen mehrere Gigabyte), sondern spielt mit [pyosmium](https://osmcode.org/pyosmium/) nur die täglichen Änderungsdateien von Geofabrik ein. Fehlt eine Datei, ist sie beschädigt oder kommen keine Änderungsdateien mehr, lädt sie den Auszug komplett. Die 40 Länder Europas lädt sie weiterhin komplett herunter.
2. **Filtern:** [Osmium](https://osmcode.org/osmium-tool/) zieht nur die Feuerwehr-Objekte und Gemeindegrenzen heraus.
3. **Aufbereiten:** Ein Python-Programm macht daraus je Ebene GeoJSON, mit OSM-Typ und -ID an jedem Objekt (für das Live-Delta) und dem Datenstand aus dem PBF-Kopf.
4. **Kacheln bauen:** [Tippecanoe](https://github.com/felt/tippecanoe) erzeugt daraus Vektorkacheln bis Zoom 14 und schreibt sie als eine PMTiles-Datei.
5. **Nur fertige Ergebnisse:** Schlägt ein Schritt fehl, wird nichts veröffentlicht, der bisherige Stand bleibt online.
6. **Veröffentlichen:** Upload nach Cloudflare R2, danach die Beschreibungsdateien und zuletzt ein gezieltes Leeren des Cloudflare-Caches.
:::

| Gebiet | Datei |
|---|---|
| DACHLiLu | eine gemeinsame Datei |
| 40 Länder Europas | eine Datei je Land, mit Zeitstempel im Namen |
| Ortsplan-Basiskarte (Deutschland) | eigene Datei, mit [Planetiler](https://github.com/onthegomap/planetiler) gebaut |

Wie aktuell die Daten in welchem Gebiet sind, steht unter [Daten & Aktualität](../data/#aktualitaet).

### Öffentliche Beschreibungsdateien {#metadaten}

Zwei Dateien kann jeder lesen, sie steuern die App:

- [`metadata.json`](https://pipeline.openfiremap.org/metadata.json): Datenstand (`osm_data_until`), Bauzeit (`generated_at`), Objektzahlen und Alter der Auszüge für DACHLiLu. Die App hängt den Bauzeitpunkt an die Kachel-Adresse (`?v=…`), so lädt nach einem neuen Bau niemand alte Kacheln aus einem Zwischenspeicher.
- [`eu/regions.json`](https://pipeline.openfiremap.org/eu/regions.json): das Manifest der Europa-Länder mit Dateiname, Rechteck, Datenstand und Objektzahlen je Land. Die App liest es streng: Ein Dateiname muss genau zum Land passen, sonst wird der Eintrag ignoriert.

### Mehrere Länder in einem Ausschnitt {#europa}

Ein Ausschnitt an der Grenze braucht mehrere Dateien. Die App öffnet sie parallel, führt Objekte per OSM-Typ und -ID zusammen und zeichnet Grenzlinien, die in beiden Auszügen stecken, nur einmal. Als Datenstand zeigt sie den ältesten der beteiligten Dateien. Ist der für ein Live-Delta zu alt (mehr als 10 Tage), lässt sie das Delta weg, statt eine riesige Abfrage zu stellen.

:::tip Nachbauen oder mehr wissen?
Die Pipeline ist hier bewusst nur im Prinzip beschrieben. Wer Einzelheiten wissen oder etwas Ähnliches aufbauen möchte, schreibt bitte an [info@openfiremap.org](mailto:info@openfiremap.org).
:::

## Ortssuche {#suche}

Die Suche nutzt den öffentlichen Dienst [Nominatim](https://nominatim.org/) der OpenStreetMap Foundation. OpenFireMap hält sich an dessen [Nutzungsregeln](https://operations.osmfoundation.org/policies/nominatim/): Eine Anfrage geht erst raus, wenn du die Suche mit Enter oder dem Knopf abschickst, nicht schon beim Tippen.

## Zwischenspeicher und Offline {#cache}

- **Geladene Daten** liegen im Browser in IndexedDB. Wie lange, stellst du selbst ein (Aus, 1 Stunde, 1 Tag, 3 Tage, 7 Tage oder 30 Tage, Standard 7 Tage).
- **Einstellungen** wie Sprache und letzter Ausschnitt liegen in `localStorage`.
- **Ein Service Worker** speichert nur die App-Hülle, damit die App schnell startet und sich installieren lässt. Daten und Kartenbilder speichert er bewusst nicht. Eine Offline-Karte würde veraltete Wasserentnahmestellen als gültig anzeigen.

## Export und Ortsplan {#export}

Auch der Export läuft vollständig im Browser: [jsPDF](https://github.com/parallax/jsPDF) erzeugt PDF-Dateien, die Karte wird aus den Kacheln in einen Canvas gezeichnet. GPX und CSV schreibt die App selbst. Die Fläche ist auf **10 km je Seite** begrenzt, damit dem Browser nicht der Speicher ausgeht. Unter Zoom 15 lädt der Export die Hydranten selbst nach, weil die Karte sie dort noch nicht geladen hat.

Der [Ortsplan](../town-plan/) nutzt [MapLibre GL JS](https://maplibre.org/) mit einer eigenen Vektor-Basiskarte im Stil von [Protomaps](https://protomaps.com/), ebenfalls als PMTiles bei Cloudflare.

## Datenstand und Statusseite {#status}

Das Fenster „Datenstand & Herkunft“ in der Karte zeigt, woher die Daten im Ausschnitt kommen (Kacheln, Overpass oder Cache) und wie alt der Basis-Stand ist. Die [Statusseite](/status/) liest live `metadata.json` und `eu/regions.json` und zeigt je Land Datenstand, Objektzahlen und Dichte je Einwohner (Einwohnerzahlen von Eurostat, Weltbank und NISRA).

## Barrierefreiheit {#barrierefreiheit}

Barrierefreiheit ist in der Technik verankert, nicht nur im Design. Was es für dich bedeutet, steht auf der Seite [Barrierefreiheit](../accessibility/). Technisch:

- **Dialoge:** Ein gemeinsamer Helfer steuert alle Fenster. Er setzt den Fokus hinein, hält die Tab-Taste im Dialog, sperrt den Rest per `inert`, schließt mit Escape und gibt den Fokus an den Auslöser zurück.
- **Marker:** Ab Zoom 17 sind die Symbole Tab-Stopps mit sprechendem `aria-label`. Enter öffnet die Details und sagt sie über eine Live-Region an.
- **Meldungen:** Zwei feste Live-Regionen, `role="alert"` nur für Fehler und `role="status"` für alles andere, damit Screenreader nichts doppelt oder gar nicht vorlesen.
- **Kontraste:** Text auf den halbtransparenten Panels muss 4,5:1 erreichen, Symbole 3:1, auf hellem und dunklem Kartenhintergrund. Weil Prüfwerkzeuge Panels über Kartenkacheln nicht bewerten können, misst ein eigener Test das nach.
- **Automatische Prüfung:** [axe-core](https://github.com/dequelabs/axe-core) prüft Karte, Dialoge, alle Sprachen und die Hilfeseiten bei jeder Änderung.

## Sicherheit {#sicherheit}

Ohne Server und Konten gibt es wenig, was man angreifen kann. Was bleibt, ist abgesichert:

### Im Browser {#sicherheit-browser}

- **Content Security Policy:** Skripte kommen nur von openfiremap.org selbst, ohne Inline-Skripte. Verbindungen und Bilder sind nur zu den oben genannten Diensten erlaubt. Ein Test stellt sicher, dass jeder Dienst aus der Konfiguration in der Richtlinie steht, und nur dieser. Die Hilfeseiten erlauben auch keine Inline-Stile.
- **Permissions-Policy:** Kamera, Mikrofon, Zahlungen, USB und Bewegungssensoren sind abgeschaltet. Den Standort darf nur die Seite selbst abfragen, und nur auf deinen Knopfdruck.
- **Fremde Daten maskiert:** Alles aus OpenStreetMap ist Eingabe von Dritten. Namen und Merkmale werden vor der Anzeige maskiert, damit kein eingeschleustes HTML ausgeführt wird. Der GPX-Export maskiert XML-Sonderzeichen.
- **Strenge Prüfung der Pipeline-Dateien:** Manifest, Dateinamen und Abdeckung werden geprüft, bevor die App ihnen vertraut.
- **Nur HTTPS:** Die Seite und alle Dienste laufen verschlüsselt. Externe Links öffnen mit `rel="noopener"`.

### Im Code und bei der Auslieferung {#sicherheit-code}

- **Wenige Abhängigkeiten:** Die App braucht zur Laufzeit nur wenige Bibliotheken, ihre Versionen sind in `package-lock.json` festgeschrieben.
- **Automatische Prüfung bei jeder Änderung:** GitHub Actions führt `npm audit` aus (hohe Risiken in Laufzeit-Abhängigkeiten stoppen den Bau), dazu Linter, Unit- und Browser-Tests. Nur ein grüner Lauf wird ausgeliefert.
- **Updates:** Dependabot schlägt wöchentlich Updates vor, Sicherheitsupdates sofort.
- **Geheimnisse:** GitHub Secret Scanning mit Push-Schutz verhindert, dass Schlüssel ins Repository gelangen. Jeder Job im Workflow hat nur die Rechte, die er braucht.
- **Pipeline:** Schreibrechte für den Speicher gibt es nur auf dem Build-Rechner, jeder Zugang ist auf seine Aufgabe beschränkt. Der Speicher ist von außen nur lesbar, Abrufe aus dem Browser (CORS) erlaubt er nur für openfiremap.org und die lokale Entwicklung.

:::note Sicherheitslücke gefunden?
Bitte nicht öffentlich melden. Schreib an [info@openfiremap.org](mailto:info@openfiremap.org) oder nutze eine private Sicherheitsmeldung auf GitHub. Einzelheiten stehen in der [Sicherheitsrichtlinie](https://github.com/FrnkMrz/OpenFireMapV2/blob/main/SECURITY.md).
:::

## Datenschutz technisch {#datenschutz}

OpenFireMap setzt keine Cookies und nutzt kein Tracking und keine Statistikdienste. Weil die App im Browser läuft, sieht jeder angefragte Dienst deine IP-Adresse und den angefragten Ausschnitt:

| Dienst | Wann | Was übertragen wird |
|---|---|---|
| GitHub Pages | beim Öffnen | Abruf der App |
| Kartenanbieter | beim Anzeigen | Kachel-Koordinaten der gewählten Ebene |
| Cloudflare | im Pipeline-Gebiet | Kachel-Bereiche der PMTiles-Dateien |
| Overpass | Live-Delta, übrige Welt, Export | Rechteck des Ausschnitts |
| Nominatim | nur beim Suchen | dein Suchbegriff |

Die rechtlichen Einzelheiten stehen in der [Datenschutzerklärung](/?legal=1).

## Qualität und Auslieferung {#qualitaet}

- **Unit-Tests** mit [Vitest](https://vitest.dev/) für Datenaufbereitung, Pipeline-Logik, Geometrie, Export und die Hilfeseiten.
- **Browser-Tests** mit [Playwright](https://playwright.dev/) in Chromium: Karte, Laden mit echten Daten, Export, Ortsplan, Barrierefreiheit und Kontraste.
- **Übersetzungen:** Ein Skript prüft, ob alle 30 Sprachen jeden Text haben.
- **Auslieferung:** Jede Änderung kommt über einen Pull Request mit Prüfung. Nach dem Zusammenführen in `main` baut GitHub Actions die Seite neu und veröffentlicht sie auf GitHub Pages, ohne Handarbeit.

## Links und Quellen {#links}

- Quellcode: [github.com/FrnkMrz/OpenFireMapV2](https://github.com/FrnkMrz/OpenFireMapV2), Fehler und Wünsche als [Issue](https://github.com/FrnkMrz/OpenFireMapV2/issues)
- Versionsverlauf: [CHANGELOG](https://github.com/FrnkMrz/OpenFireMapV2/blob/main/CHANGELOG.md)
- Daten: [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL), Auszüge von [Geofabrik](https://download.geofabrik.de/)
- Formate und Werkzeuge: [PMTiles](https://github.com/protomaps/PMTiles), [Tippecanoe](https://github.com/felt/tippecanoe), [Osmium](https://osmcode.org/osmium-tool/), [pyosmium](https://osmcode.org/pyosmium/), [Planetiler](https://github.com/onthegomap/planetiler)
- Dienste: [Overpass API](https://wiki.openstreetmap.org/wiki/DE:Overpass_API), [Nominatim](https://nominatim.org/), [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/), [GitHub Pages](https://pages.github.com/)
- Bibliotheken: [Leaflet](https://leafletjs.com/), [MapLibre GL JS](https://maplibre.org/), [jsPDF](https://github.com/parallax/jsPDF), [Vite](https://vite.dev/), [Tailwind CSS](https://tailwindcss.com/)
- Status der Daten: [Statusseite](/status/)
