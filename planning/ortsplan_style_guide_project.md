# Projekt: Ortsplan-Kartenstil (eigener Style Guide für OSM-Kacheln)

Status (26.10.2026): **Spike gebaut und gemergt** (PR #100, #101, #104), Ordner `tools/ortsplan-spike`. Er ist ein eigenständiger Versuch und **nicht Teil der App**. Offen sind die Messwerte an echten Plänen, der Test auf Endgeräten (Safari, iPhone), die Daten für mehr als einen Ort und die Einbindung in die App.

## Zweck

Ein eigener Kartenstil, der deutsche Ortschaften wie einen gedruckten **Ortsplan** darstellt und für den **Ausdruck in hoher Auflösung** optimiert ist (Referenz: Zoom 18, 300 dpi). Der Stil zeichnet Straßen, Schrift und Symbole nicht so breit, wie sie in der Wirklichkeit sind, sondern so breit, wie sie auf Papier lesbar sein müssen (kartographische **Überhöhung**). Erster Zweck: **Plan für die Feuerwehr** (Hydranten, Löschwasser, Wache, Hausnummern, Planquadrate, Straßenverzeichnis).

Heute: Der Export (`src/js/export.js`) setzt fertige Raster-Kacheln von Fremdanbietern (CARTO, OSM, OpenTopoMap …) zu einem Bild zusammen. Die Strichstärken, Schriftgrößen und Farben sind für Bildschirme gemacht und nicht änderbar. Ausgedruckt wirken Nebenstraßen dünn, Schrift klein, Hausnummern fehlen.

## Kernerkenntnis

**Die Überhöhung muss vom Druckmaßstab abhängen, nicht vom Zoom.**

- Zoom 18 liegt bei 48° N bei etwa 0,40 m je Pixel (256-px-Kachel). Bei 300 dpi (1 px = 0,085 mm) ergibt das rund **1:4.700**.
- Eine 6 m breite Fahrbahn ist dann etwa 1,3 mm breit, ein 3 m breiter Weg nur 0,6 mm. Das ist knapp, aber noch lesbar.
- Druckt man dagegen ein ganzes Dorf auf A4 (Zoom 16/17, 1:10.000 bis 1:20.000), wird dieselbe Fahrbahn 0,3 bis 0,6 mm breit. Dort braucht es deutlich mehr Überhöhung.
- Der Stil bekommt deshalb einen Parameter **„Druckmaßstab"** und rechnet daraus Linienbreiten, Schriftgrößen und Symbolgrößen um. Im Spike sind alle Maße des Stils **Millimeter auf dem Papier** (`tools/ortsplan-spike/style.js`).

## Stand der Umsetzung (Spike)

Pilotgebiet: **Neunkirchen am Sand** (Schnaittachtal, Landkreis Nürnberger Land). Ein Auszug des Gemeinde-Rechtecks plus Rand reicht für den Test, es sind keine DACH-Daten nötig.

**Gebaut und getestet** (Bedienung und alle Parameter: `tools/ortsplan-spike/README.md`):

- **Technik:** Vektorkacheln als PMTiles, gezeichnet mit MapLibre (Version 6; der Spike läuft auch mit 5.x), Stil als Generator-Skript aus dem Druckmaßstab. Headless-Export mit Playwright.
- **Grundkarte:** Protomaps-Basemap (Ausschnitt per `pmtiles extract`). Hausnummern (`buildings`, `kind=address`), Straßennamen und Orte, wichtige Einrichtungen (`pois`) sind enthalten.
- **Feuerwehr-Ebene aus der OpenFireMap-Pipeline** (Ebenen `fire_stations`, `hydrants`, `water_points`, `defibrillators`, `boundaries`) mit den **Original-Symbolen und Regeln der App** (`getSVGContent`/`renderMarkers` in `src/js/map.js`: Wachen innerhalb 150 m zusammengefasst, Hydranten und Wasser innerhalb 5 m als Zähler-Symbol, Schutzfilter für Wachen). Gemeindegrenzen wie in `renderBoundaries()`. Die Symbole sind nach Maßstab abgestuft (1:2.500 bis 1:20.000: 3,6 bis 2,2 mm, Wache 1,84-mal so groß).
- **Planblatt** (`sheet=1`): Rahmen, Planquadrate (Zellgröße nach Maßstab), Titel, Legende (nur mit tatsächlich vorkommenden Symbolen, Linien und Straßenarten), Maßstabsleiste, Nordpfeil, Datenstand der Pipeline, Quellenangabe, **Straßenverzeichnis** mit allen Planquadraten je Straße (optional, Schriftgröße einstellbar, volle Breite der Seitenleiste, Folgeseiten bei Überlauf).
- **Formate:** A4, A3, A2, A1, jeweils quer und hoch. Die Oberfläche des Blatts (Schrift, Seitenleiste, Ränder) wächst mit dem Papier. Ein A3-Blatt mit 300 dpi (4961 × 3508 px) entsteht in etwa 12 Sekunden.
- **Beschriftung:** Straßennamen weichen den Symbolen aus (dichte Kandidaten), Namen, die nirgends Platz fanden, stehen einmal über den Symbolen. Messung bei 1:5.000: 36 statt 18 verschiedene Straßennamen im Bild gegenüber „alle Namen über den Symbolen". Einsatzwichtige Einrichtungen (Schule, Kita, Klinik, Pflege, Rathaus, Kirche) stehen blau-kursiv im Plan.
- **Tests:** `node --test` (Planquadrat-Zuordnung, Kurzschreibweise der Planquadrate, höhenbasierte Seitenaufteilung des Verzeichnisses), Belastungstest `stress.mjs` mit 400 langen Straßennamen.

**Platzhalterwerte des Stils** (noch **nicht** an echten Plänen gemessen, Phase 1/2):

| Straßenart | echte Breite | Mindestbreite Papier | Kontur |
|---|---|---|---|
| Zufahrt/Erschließung | 3,5 m | 0,7 mm | 0,22 mm |
| Wohn- und Nebenstraße | 5,5 m | 1,2 mm | 0,22 mm |
| Sammelstraße (Kreis-/Staatsstraße) | 7 m | 1,6 mm | 0,22 mm |
| Hauptstraße (Bundesstraße) | 9 m | 1,9 mm | 0,22 mm |
| Autobahn | 14 m | 2,3 mm | 0,22 mm |

Straßennamen 1,75 bis 2,1 mm, Hausnummern 1,7 mm, Ortsnamen 3,6 mm (bei 1:5.000).

**Noch nicht gebaut oder offen:**

- Messwerte, Schriftgrößen und Farben an echten Ortsplänen (Phase 1/2).
- **Einbahn, Sackgassen, Höhen- und Gewichtsbeschränkungen, Durchfahrtsbreiten** als eigene Zeichen (siehe Risiko „Überhöhung kann täuschen").
- Punktlinie zwischen Straßenname und Planquadraten im Verzeichnis (Lesbarkeit bei breiter Seitenleiste).
- Teilbilder für sehr große Blätter: die Karte hat je Seite höchstens 8192 px, darüber sinkt ihre Auflösung automatisch (`mapDpi`).
- Test in Safari und auf dem iPhone (Canvas-Grenzen, siehe Risiken).
- Daten für mehr als einen Ort (eigener Build oder Auszüge je Ort), Einbindung in die App, Mehrsprachigkeit der Beschriftungen.
- Schriften (Glyphen) laden die Testseite noch von `protomaps.github.io`; für den Einsatz selbst hosten (OFL-Lizenz).

## Entscheidungen

- **Technik: Option A** (Vektorkacheln + MapLibre im Browser, kein Backend), siehe Tabelle unten. Hat sich im Spike bewährt.
- **Zweck: Plan für die Feuerwehr.** Hydranten, Löschwasser, Wache und Hausnummern stehen im Vordergrund. Planquadrate und Straßenverzeichnis gehören dazu (Verzeichnis ist optional abschaltbar).
- **Symbole und Daten wie die App:** Die Feuerwehr-Ebene nutzt die eigene Pipeline und die Original-Symbole, nicht eine Overpass-Abfrage und nicht nachgebaute Zeichen.
- **Beschriftung:** Straßennamen dürfen Symbole nicht überdecken, fehlende Namen bekommen eine Ersatzbeschriftung über den Symbolen. Alle Straßen im Verzeichnis sollen auch im Plan stehen.
- **Entwicklung:** in einer eigenen, von der Pipeline getrennten Entwicklungs-VM, ohne Zugangsdaten für Cloudflare/R2 (der Spike braucht keine). Hosts, Pfade und Zugänge gehören nicht in dieses Repo. Der echte Canvas-Größentest bleibt auf Endgeräten nötig.
- **Referenz:** Als Vergleichsbild dient die amtliche Bayern-Webkarte (`bayern` in `Config.layers`); ein Feuerwehrplan der Gemeinde ist später als Soll-Bild willkommen.

## Ausgangslage im Projekt

- Leaflet, Raster-Basemaps in `Config.layers` (`src/js/config.js`), kein Vektor-Renderer für die Grundkarte.
- Die Pipeline liefert **nur Fachobjekte** (Wachen, Hydranten, Löschwasser, Defis, Grenzen) als PMTiles, **keine Grundkarte** (Straßen, Gebäude, Flächen).
- `export.js` lädt 256-px-Kacheln bei `targetZoom` (maximal 18) und zeichnet Marker und Overlays darüber. Größenlimits über `Config.exportZoomLimitsKm`.
- Cloudflare R2 mit PMTiles-Hosting existiert bereits (Betrieb im privaten Pipeline-Repo).

## Was Ortspläne anders machen (Recherche)

Gesichert durch Quellen (siehe unten):

- **Generalisierung**: Auswahl, Vereinfachung, Symbolisierung, Zusammenfassung, **Überhöhung** (wichtige Straßen verbreitern) und **Verdrängung** (sich überlappende Objekte leicht verschieben, typisch an Kreuzungen und bei Beschriftung). Gewässer gelten als nicht verdrängbar.
- **Hierarchie**: Hauptstraßen dicker und kontrastreicher, Wohn- und Nebenstraßen dünner und zurückhaltender.
- **Mindestmaße** auf Papier hängen an der Sehschärfe: schwarze Linie etwa 0,08 bis 0,10 mm auf farbigem Grund, Abstand zwischen Linien und Flächen etwa 0,15 bis 0,25 mm.
- **Inhalt eines Stadtplans**: Bebauung, Grün, Wasser, nach Bedeutung gestaffeltes Straßennetz, Bahn und Haltestellen, Straßennamen, Stadtteile, wichtige Gebäude, dazu **Straßenverzeichnis mit Planquadrat**, Legende und Maßstabsleiste.
- Schweizer Ortspläne (1:5000) kommen mit Legende für öffentliche Gebäude und Einrichtungen, Straßenverzeichnis und Nordpfeil.
- Praxis: Ausschnitt **in 100 % ausdrucken** und prüfen, ob Hauptstraßen und Beschriftung lesbar bleiben.
- **MapOSMatic/OCitySMap** macht aus OSM-Daten schon Stadtpläne mit beschriftetem Gitter und Straßenverzeichnis. Vorbild für den Seitenaufbau.
- Eine OSM-Diskussion hält fest: Zoom 18 entspricht der Auflösung eines 300-dpi-Drucks, aber Schrift und Straßen wirken dann zu klein.
- **Feuerwehrpläne** (DIN 14095, kommunale Gestaltungsrichtlinien): Maßstab so wählen, dass das Blatt gefüllt und gut lesbar ist, Meter-Gitter oder Maßstabsleiste, Legende, Symbole nach DIN 14034-6, Löschwasserentnahmestellen mit Mengen. Gilt für Objektpläne, liefert aber Hinweise für unsere Symbolik.

**Noch nicht belegt, selbst zu erheben (Phase 1):** konkrete Strichstärken in mm je Straßenklasse bei 1:5.000 bis 1:15.000, Schriftgrößen für Straßennamen, Ortsteile und Hausnummern, Farbgebung deutscher Verlagspläne, Imhofs Regeln zur Straßenbeschriftung (ggf. Hake/Grünreich/Meng „Kartographie"). Dafür ein Referenz-Set von etwa 5 bis 8 echten Ortsplänen sammeln und ausmessen.

## Stil-Spezifikation (Entwurf, Messwerte folgen in Phase 2)

| Thema | Vorgabe |
|---|---|
| Straßenklassen | Autobahn, Bundes-/Landesstraße, Kreisstraße, Sammel-/Hauptstraße, Wohnstraße, Erschließung/Service, Fuß-/Radweg, Wirtschaftsweg. Je Klasse Füllbreite + Kontur (Casing) in **mm Papier** |
| Überhöhung | Breite = max(echte Breite, Mindestbreite in mm); Parameter Druckmaßstab |
| Kreuzungen | Konturen laufen an Einmündungen durch, Füllungen verschmelzen (kein „Perlenketten-Effekt"); Brücken und Tunnel gekennzeichnet |
| Einbahn | kleine Pfeile, nur ab einer Mindestlänge (offen) |
| Gebäude | Grundriss in neutralem Grau/Beige, Wohnhäuser zurückhaltend; Hausnummern |
| Flächen | Wohn-, Gewerbe-, Grün-, Wald-, Friedhofs-, Wasserflächen blass, damit Straßen und Schrift vorne liegen; Gewässer nicht verdrängen |
| Beschriftung | Straßennamen **entlang der Linie**, Mindestgröße, weißer Halo; Ortsteile gesperrt; Hausnummern klein; einsatzwichtige Einrichtungen blau-kursiv |
| POI | Feuerwehr-Objekte (Wache, Hydrant, Löschwasser, Defi) als eigene Ebene darüber, Größen mit dem Maßstab abgestuft |
| Farben | Muss auch in **Graustufen** und auf billigen Druckern funktionieren (noch nicht geprüft); Kontrast Schrift/Grund prüfen (wie in `tests/helpers/contrast.mjs`) |
| Seitenelemente | Titel, Maßstabsleiste, Nordpfeil, Legende, Quellenangabe (ODbL), Datenstand |
| Gitter | Planquadrate mit Buchstabe/Zahl am Rand + **Straßenverzeichnis** (Straße → Planquadrate) |

## Technische Optionen

| | A: Vektorkacheln + MapLibre (Client) | B: Raster vorab rendern | C: Server rendert (Mapnik/MapLibre Native) |
|---|---|---|---|
| Grundidee | Grundkarte als PMTiles, Stil als JSON, Browser zeichnet | Kacheln in 2×/3× rendern und als PMTiles/PNG hosten | Dienst rendert Ausdruck auf Anfrage |
| Überhöhung je Druckmaßstab | **ja**, Stil-Ausdrücke und `pixelRatio` | nein, nur fest je Zoom | ja |
| Hohe Export-Auflösung | ja (Canvas-Grenzen beachten) | nur wie vorgerendert | ja |
| Backend nötig | nein (passt zum Projekt: rein clientseitig) | Render-Farm | **ja** (widerspricht „kein Backend") |
| Aufwand | mittel | hoch (Rendering ganz DACH) | hoch |

**Entscheidung: A.** Passt zur Architektur (PMTiles auf R2, kein Backend). Für die App bleibt die Frage, ob Leaflet über `maplibre-gl-leaflet` bleibt oder der Export eine eigene, unsichtbare MapLibre-Instanz nutzt.

**Datenquellen für die Grundkarte:**

- **Protomaps-Basemap** (im Spike genutzt, passt direkt): Ebenen `earth`, `landuse`, `water`, `buildings`, `roads`, `places`, `pois`, `boundaries`. Hausnummern in `buildings` (`kind=address`, `addr_housenumber`), Gebäude einzeln ab z15 (die Quelle hört bei z15 auf, darüber wird überzoomt). Straßenbreite/Spuren fehlen als Attribut (Breite kommt aus der Klasse).
- **Shortbread** (Geofabrik/VersaTiles): eigene Ebenen `addresses`, `street_labels`, `buildings`. Alternative, falls Protomaps nicht reicht.
- **OpenMapTiles-Schema** über Planetiler: verbreitet, viele Vorlagen.
- **Eigener Build** aus dem Geofabrik-Auszug, den die Pipeline ohnehin nutzt (Planetiler/Tilemaker): wäre eine zweite Datei neben `openfiremap.pmtiles` im privaten Pipeline-Repo.

Offen: Eigener Build oder öffentliche Protomaps-Builds? Ein Ausschnitt je Ort per `pmtiles extract` genügt für Einzelfälle; für alle Orte in DACH braucht es Hosting der Grundkarte.

## Phasen

**Phase 0 – Spike: erledigt (24.–26.10.2026).** Entscheidung für A getroffen, Nutzen im Vergleich zum heutigen Export sichtbar.

**Phase 1 – Referenzen und Messwerte: offen.**
- 5 bis 8 deutsche Ortspläne sammeln (Gemeinde, Verlag, Landesvermessung), Maße je Straßenklasse, Schrift, Konturen, Farben erfassen.
- Testorte festlegen: Dorf, Kleinstadt, Stadtrand, Altstadt (enge Gassen), Hanglage, Stadt mit Bahn und Fluss.

**Phase 2 – Stil-Spezifikation: teilweise.** Platzhaltertabelle oben mit Messwerten ersetzen; Farbpalette inklusive Graustufentest.

**Phase 3 – Daten: teilweise.** Schema gewählt (Protomaps), Probe-Auszug erledigt, Hausnummern und Namen geprüft. Offen: Datenhaltung für mehr Orte, Hosting (Betrieb im privaten Pipeline-Repo; hier keine Hosts, Pfade, Zugänge ablegen), ODbL-Hinweis (steht im Blatt).

**Phase 4 – Stil-Implementierung: weitgehend erledigt im Spike.** Offen: Schriften und Sprites selbst hosten (OFL), Style-Schema-Validierung, Visual-Regression-Tests mit Screenshots für die Testorte.

**Phase 5 – Einbindung in die App: offen.**
- Neue Ebene „Ortsplan" im Ebenenmenü; Feature-Flag in `Config`; Fallback auf Voyager bei Fehler.
- Mobil: Bundle-Größe, Speicher und Akku beobachten (MapLibre ist deutlich größer als Leaflet allein, nur bei Bedarf laden).
- Barrierefreiheit und Kontrast-Tests wie bei den anderen Overlays (`tests/a11y-contrast.spec.js`), i18n für alle neuen Texte.

**Phase 6 – Hochauflösender Export: teilweise.** Blatt mit Rahmen, Gitter, Verzeichnis, Legende, Maßstab, Nordpfeil ist gebaut. Offen: Teilbilder für sehr große Blätter, Grenzen je Format für Safari und iOS festlegen (analog zu `exportZoomLimitsKm`), PDF (Rasterbild in 300 dpi als Standard).

**Phase 7 – Abnahme und Ausrollen: offen.** Probedrucke in Farbe und Graustufen, Rückmeldung von Feuerwehr und Gemeinde, Dokumentation (`USER_MANUAL.md`, `CLAUDE.md`), Changelog, Flag erst nach Abnahme anschalten.

## Risiken und offene Fragen

- **Canvas-Limits** beim Export: Im Headless-Chromium der Entwicklungs-VM gingen 8192 px je Seite; das zusammengesetzte Blatt hat bei A3/300 dpi rund 17, bei A1/300 dpi etwa 70 Megapixel. Safari und iOS erlauben deutlich weniger (Größenordnung 16 Megapixel): dort ungetestet, vermutlich nur kleinere Formate oder niedrigere dpi.
- **Überhöhung kann täuschen:** Breit gezeichnete enge Gassen können eine Zufahrt für ein Löschfahrzeug vortäuschen. Einbahn, Sackgassen, Höhen- und Gewichtsbeschränkungen, Brücken brauchen eigene Zeichen.
- **Beschriftung:** MapLibre verdrängt nicht, es lässt Beschriftungen weg. Der Spike gleicht das mit der Ersatzbeschriftung aus; an sehr dichten Stellen kann ein Name trotzdem über einem Symbol stehen.
- **Datenqualität:** Hausnummern und Namen in OSM sind nicht überall vollständig. Der Plan wirkt dann lückenhaft; einsatzwichtige Einrichtungen stehen nur, wenn sie in OSM benannt sind.
- **Datenvolumen:** Grundkarte DACH ist um ein Vielfaches größer als die POI-Datei (Größenordnung zu prüfen). R2-Kosten und Cache-Verhalten klären.
- **Bundle/Performance:** MapLibre zusätzlich zu Leaflet; nur laden, wenn die Ebene gewählt wird.
- **Versionspflege:** MapLibre 6 war ein Bruch (kein Default-Export, eigene Worker-Datei, `querySourceFeatures` lieferte nur Ebenen, die der Stil nutzt; so beobachtet, nicht in der Dokumentation belegt). Aktualisierungen vorher im Spike gegen die Bilder prüfen, der Build-Check deckt den Spike nicht ab.
- **Stilpflege:** Ein eigener Stil muss bei Schema-Änderungen der Kachelquelle nachgezogen werden.
- **Scope:** Nur Deutschland zuerst (Namen, Straßentypen, Bezeichnungen); Europa-Erweiterung später.
- **Entscheidung für später:** Soll der Ortsplan-Stil auch auf dem Bildschirm als Ebene sichtbar sein oder nur im Export?

## Quellen

- Generalisierung: [Wikipedia](https://en.wikipedia.org/wiki/Cartographic_generalization), [Spektrum Lexikon](https://www.spektrum.de/lexikon/geographie/Generalisierung/2889), [MapTiler](https://docs.maptiler.com/guides/maps-apis/maps-platform/generalization-in-maps)
- Minimaldimensionen von Kartenzeichen: [Spektrum Lexikon](https://www.spektrum.de/lexikon/kartographie-geomatik/minimaldimensionen-von-kartenzeichen/3436), [TU Wien Ledermann 2022](https://repositum.tuwien.at/handle/20.500.12708/139892)
- Straßenbreite/Überhöhung: [OSM-talk 2008](https://lists.openstreetmap.org/pipermail/talk/2008-February/023304.html), [Esri „make maps people want to look at"](https://www.esri.com/news/arcuser/0112/make-maps-people-want-to-look-at.html)
- Stadtplan allgemein: [Wikipedia Stadtplan](https://de.wikipedia.org/wiki/Stadtplan)
- Schweizer Ortspläne: [Staatsarchiv Aargau, Oberendingen](https://www.ag.ch/staatsarchiv/suche/detail.aspx?ID=586952)
- Druckauflösung und OSM: [OSM-talk-fr 2008](https://lists.openstreetmap.org/pipermail/talk-fr/2008-July/003022.html), [OSM-talk 2007](https://lists.openstreetmap.org/pipermail/talk/2007-March/011911.html)
- MapOSMatic: [Ankündigung](https://lists.openstreetmap.org/pipermail/dev/2009-September/016879.html)
- Vektorkachel-Schemata: [Protomaps Basemap Layers](https://docs.protomaps.com/basemaps/layers), [Shortbread Schema 1.0](https://shortbread.geofabrik.de/schema/1.0/), [VersaTiles-Erweiterungen](https://docs.versatiles.org/compendium/specification_shortbread_extensions.html)
- Stil-Werkzeuge: [OSM Liberty](https://github.com/maputnik/osm-liberty), [Stadia: Custom Styles / Maputnik](https://docs.stadiamaps.com/custom-styles/), [maplibre-gl-export](https://npmjs.org/package/@watergis/maplibre-gl-export)
- Feuerwehrpläne: [Wuppertal Gestaltungsrichtlinie 1.4](https://www.wuppertal.de/microsite/feuerwehr/berufsfeuerwehr/abteilungen/Gestaltungsrichtlinie-fuer-Feuerwehrplaene-Ver.1.4.pdf), [Hagen Gestaltungsrichtlinie](https://hagen.de/web/media/files/fb/fb_37/vorbeugende_gefahrenabwehr/Gestaltungsrichtlinie_Feuerwehrplaene.pdf)
