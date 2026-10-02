# Datenquellen

## OpenStreetMap

Die fachlichen Objekte der Karte stammen aus [OpenStreetMap (OSM)](https://www.openstreetmap.org/). Dazu gehören unter anderem Feuerwehrstandorte, Hydranten, Wasserentnahmestellen und Defibrillatoren. OpenFireMap kann nur anzeigen, was in OSM erfasst und mit passenden Tags versehen ist.

Fehlen Objekte oder sind Angaben falsch, sollte die Korrektur direkt in OpenStreetMap vorgenommen werden. Siehe dazu auch die [FAQ](FAQ.md).

## Verwendete OSM-Tags

Die maschinenlesbare Liste aller ausgewerteten Tags liegt unter [`openfiremap.org/taginfo.json`](https://openfiremap.org/taginfo.json) (Quelle: `public/taginfo.json`) und wird von [Taginfo](https://taginfo.openstreetmap.org/projects) eingelesen. Kurzfassung:

| Objekt | Tags | Darstellung |
| --- | --- | --- |
| Feuerwache | `amenity=fire_station`, `building=fire_station` | ab Zoom 12, zusammengehörige Objekte werden zu einem Marker gebündelt |
| Hydrant | `emergency=fire_hydrant` | ab Zoom 15, Symbol nach `fire_hydrant:type` (`pillar`, `underground`, `wall`, `pipe`, `dry_barrel`) |
| Württembergischer Schachthydrant | `fire_hydrant:type=underground` + `fire_hydrant:style=wsh` | eigenes Symbol mit Hinweis |
| Löschwasserentnahme | `emergency=water_tank`, `suction_point`, `fire_water_pond`, `cistern` | ab Zoom 15, blaues Symbol |
| Defibrillator | `emergency=defibrillator` | ab Zoom 15 |
| Gemeindegrenze | Relationen `boundary=administrative` + `admin_level=8` (inkl. Mitglieds-Wege) | Overlay ab Zoom 14 |

Im Tooltip werden alle Tags eines Objekts angezeigt. Der CSV-Export übernimmt zusätzlich `name`, `ref`, `operator`, `addr:*` sowie `fire_hydrant:diameter`, `fire_hydrant:pressure` und `fire_hydrant:flow` (ersatzweise `diameter`, `pressure`, `flow`).

Wer neue Tags auswertet, ergänzt sie in `public/taginfo.json` und passt `data_updated` an. `test/taginfo.test.js` schlägt fehl, wenn ein in Overpass-Abfragen oder Pipeline-Filtern verwendeter Tag dort fehlt.

## Geofabrik

Für die vorberechnete Pipeline werden regionale OSM-PBF-Extrakte von [Geofabrik](https://download.geofabrik.de/) verarbeitet. Die Extrakte werden gefiltert, zu relevanten Objektarten verarbeitet und als PMTiles veröffentlicht.

Geofabrik ist damit eine Quelle für den Pipeline-Build, nicht eine zweite unabhängige Kartendatenbank. Die zugrunde liegenden Daten bleiben OpenStreetMap-Daten.

## Overpass

[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) beantwortet gezielte Abfragen gegen die OSM-Datenbank. OpenFireMap nutzt Overpass weltweit und als Fallback, wenn PMTiles für einen Ausschnitt nicht verwendet werden können.

Overpass ist ein gemeinsamer öffentlicher Dienst. Große oder sehr häufige Abfragen können gedrosselt werden. Die Anwendung verwendet mehrere Endpunkte, Wiederholungen und Abbruchlogik, um damit möglichst schonend umzugehen.

## Nominatim

[Nominatim](https://nominatim.openstreetmap.org/) wird für die Orts- und Adresssuche verwendet. Die Suchergebnisse stammen aus OSM. Nominatim hat Rate-Limits und Nutzungsregeln; die Anwendung sollte nicht automatisiert oder in hoher Frequenz abgefragt werden.

## Datenaktualität

Overpass-Abfragen greifen auf den aktuellen Stand zu, den der jeweilige Overpass-Dienst bereitstellt. PMTiles sind vorberechnete Stände: Sie werden mit einem Pipeline-Build erzeugt; `metadata.json` nennt den Build-Zeitpunkt (`generated_at`) und den OSM-Datenstand der Quellauszüge (`osm_data_until`). Nach dem Laden der PMTiles fragt die Anwendung Overpass nach Objekten, die seit diesem Datenstand neu angelegt oder geändert wurden (`newer:`), und ergänzt bzw. ersetzt die Kachel-Objekte anhand ihrer OSM-ID. Gelöschte oder umgetaggte Objekte erfasst diese Abfrage nicht; sie bleiben bis zum nächsten Build sichtbar.

Die Pipeline prüft ihre Versionskennung und erkennt widersprüchliche oder veraltete Abdeckung. In solchen Fällen fällt die Anwendung auf Overpass zurück, statt eine nicht passende PMTiles-Datei als aktuell auszugeben.

## Auslieferung über Cloudflare

Die vorberechneten PMTiles und `metadata.json` liegen in Cloudflare R2 und werden über `pipeline.openfiremap.org` (Cloudflare CDN) ausgeliefert. Der Browser lädt sie direkt; Cloudflare verarbeitet dabei technisch bedingt IP-Adresse und Anfragedaten. Es werden keine Cookies gesetzt. Die Webseite selbst wird über GitHub Pages ausgeliefert.

Wer Cloudflare-Funktionen wie Bot Fight Mode, Web Analytics oder Zaraz aktiviert, muss vorher die Datenschutzerklärung in `index.html` prüfen, da diese Funktionen Cookies oder Skripte einbringen können.

## Lizenzen und Quellenhinweise

- OSM-Daten: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), verfügbar unter der [ODbL](https://opendatacommons.org/licenses/odbl/).
- Geofabrik-Extrakte: [Geofabrik Download Server](https://download.geofabrik.de/), auf Basis von OSM-Daten.
- Nominatim und Overpass: Dienste der OSM-Community; bitte die jeweiligen Nutzungsregeln beachten.
- Basiskarten können zusätzliche Quellen wie CARTO, Esri, OpenTopoMap oder amtliche regionale Dienste enthalten. Die konkrete Attribution wird in der Karte und im Export angezeigt.

OpenFireMapV2 selbst ist als Software unter der [MIT-Lizenz](../LICENSE) veröffentlicht. Die Softwarelizenz ändert nichts an den Lizenzbedingungen der Kartendaten und Basiskarten.
