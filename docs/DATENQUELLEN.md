# Datenquellen

## OpenStreetMap

Die fachlichen Objekte der Karte stammen aus [OpenStreetMap (OSM)](https://www.openstreetmap.org/). Dazu gehören unter anderem Feuerwehrstandorte, Hydranten, Wasserentnahmestellen und Defibrillatoren. OpenFireMap kann nur anzeigen, was in OSM erfasst und mit passenden Tags versehen ist.

Fehlen Objekte oder sind Angaben falsch, sollte die Korrektur direkt in OpenStreetMap vorgenommen werden. Siehe dazu auch die [FAQ](FAQ.md).

## Geofabrik

Für die vorberechnete Pipeline werden regionale OSM-PBF-Extrakte von [Geofabrik](https://download.geofabrik.de/) verarbeitet. Die Extrakte werden gefiltert, zu relevanten Objektarten verarbeitet und als PMTiles veröffentlicht.

Geofabrik ist damit eine Quelle für den Pipeline-Build, nicht eine zweite unabhängige Kartendatenbank. Die zugrunde liegenden Daten bleiben OpenStreetMap-Daten.

## Overpass

[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) beantwortet gezielte Abfragen gegen die OSM-Datenbank. OpenFireMap nutzt Overpass weltweit und als Fallback, wenn PMTiles für einen Ausschnitt nicht verwendet werden können.

Overpass ist ein gemeinsamer öffentlicher Dienst. Große oder sehr häufige Abfragen können gedrosselt werden. Die Anwendung verwendet mehrere Endpunkte, Wiederholungen und Abbruchlogik, um damit möglichst schonend umzugehen.

## Nominatim

[Nominatim](https://nominatim.openstreetmap.org/) wird für die Orts- und Adresssuche verwendet. Die Suchergebnisse stammen aus OSM. Nominatim hat Rate-Limits und Nutzungsregeln; die Anwendung sollte nicht automatisiert oder in hoher Frequenz abgefragt werden.

## Datenaktualität

Overpass-Abfragen greifen auf den aktuellen Stand zu, den der jeweilige Overpass-Dienst bereitstellt. PMTiles sind vorberechnete Stände: Sie werden mit einem Pipeline-Build erzeugt und über `metadata.json` mit einem Build-Zeitstempel versehen. Zwischen zwei Builds können Änderungen in OSM daher zuerst über Overpass sichtbar sein.

Die Pipeline prüft ihre Versionskennung und erkennt widersprüchliche oder veraltete Abdeckung. In solchen Fällen fällt die Anwendung auf Overpass zurück, statt eine nicht passende PMTiles-Datei als aktuell auszugeben.

## Lizenzen und Quellenhinweise

- OSM-Daten: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), verfügbar unter der [ODbL](https://opendatacommons.org/licenses/odbl/).
- Geofabrik-Extrakte: [Geofabrik Download Server](https://download.geofabrik.de/), auf Basis von OSM-Daten.
- Nominatim und Overpass: Dienste der OSM-Community; bitte die jeweiligen Nutzungsregeln beachten.
- Basiskarten können zusätzliche Quellen wie CARTO, Esri, OpenTopoMap oder amtliche regionale Dienste enthalten. Die konkrete Attribution wird in der Karte und im Export angezeigt.

OpenFireMapV2 selbst ist als Software unter der [MIT-Lizenz](../LICENSE) veröffentlicht. Die Softwarelizenz ändert nichts an den Lizenzbedingungen der Kartendaten und Basiskarten.
