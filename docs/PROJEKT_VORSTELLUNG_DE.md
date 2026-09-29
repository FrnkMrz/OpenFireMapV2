# OpenFireMapV2 – Projektvorstellung

OpenFireMap ist eine interaktive, weltweit nutzbare Karte für feuerwehrrelevante OpenStreetMap-Daten. Sie richtet sich an OSM-Mitwirkende, Feuerwehren, Karteninteressierte und alle, die Feuerwachen, Hydranten, Löschwasserstellen oder Defibrillatoren in einem Gebiet prüfen möchten.

Die Live-Karte: **[https://openfiremap.org](https://openfiremap.org)**  
Quellcode: **[github.com/FrnkMrz/OpenFireMapV2](https://github.com/FrnkMrz/OpenFireMapV2)**

## Von der Hydrantenkarte zur modernen Webkarte

Die erste Hydrantenkarte entstand im September 2010. OpenFireMap wurde durch OSM-Mitwirkende, eine Mappingparty in Zürich und Gespräche am Nürnberger OSM-Stammtisch geprägt. Seit Januar 2012 verweist `OpenFireMap.org` auf die weiterentwickelte Karte. Im Umfeld der FOSSGIS-Konferenz 2017 wurde das Projekt im Zusammenhang mit digitalen Feuerwehreinsatzkarten vorgestellt.

2025/2026 entstand mit OpenFireMapV2 ein technischer Neuaufbau. 2026 kam eine vorberechnete PMTiles-/Cloudflare-R2-Pipeline hinzu.

## Das Problem großer Overpass-Abfragen

Overpass ermöglicht weltweit gezielte Abfragen auf OSM-Daten. Große Kartenausschnitte und viele parallele Anfragen können öffentliche Overpass-Server jedoch stark belasten oder zu Wartezeiten führen. Für wiederkehrende Abfragen in einem klar definierten Gebiet ist eine vorberechnete Datenversorgung effizienter.

## Die technische Lösung

Für Deutschland, Österreich, die Schweiz, Luxemburg und Liechtenstein (DACHLiLu) werden relevante OSM-Objekte regelmäßig in PMTiles-Vektorkacheln vorbereitet. Cloudflare R2 liefert die etwa 514 MB große PMTiles-Datei aus. Der Browser lädt per HTTP-Range-Requests nur die Kachelbereiche, die im sichtbaren Ausschnitt benötigt werden.

Die Pipeline ist eine Beschleunigung, keine neue geografische Abdeckung. OpenFireMap war von Anfang an weltweit nutzbar. Außerhalb DACHLiLu und bei fehlenden, veralteten oder nicht erreichbaren Pipeline-Daten greift die Anwendung auf Overpass zurück.

```text
Browser → PMTiles / Cloudflare R2 → Overpass-Fallback
```

Cache-Busting über die Pipeline-Metadaten und die Erkennung veralteter PMTiles-Abdeckung verhindern, dass ein alter Datenstand dauerhaft als aktuell verwendet wird.

## Aktuelle Messwerte und Funktionen

- Version **v0.7.2**
- rund **1,25 Millionen** feuerwehrrelevante Objekte in der DACHLiLu-Pipeline
- PMTiles-Datei mit etwa **514 MB**
- Cloudflare R2 als primäre öffentliche Pipeline-Quelle
- 99 erfolgreiche Vitest-Tests sowie ein Playwright-Performance-Test
- Exporte als PNG, PDF, GPX und CSV
- mehr als 30 Sprachen
- IndexedDB-Cache und responsive Nutzung auf Desktop und Mobilgeräten
- lokale VM 102 als Test- und Backup-Umgebung für den Pipeline-Betrieb

## Nutzen für OSM und Feuerwehren

OSM-Mitwirkende erhalten eine sichtbare Anwendung, mit der fehlende oder widersprüchliche Einträge in einem Gebiet leichter auffallen können. Feuerwehren und interessierte Organisationen können offene Daten in einer schnellen Karte betrachten und Ausschnitte für weitere Arbeit exportieren.

OpenFireMap ist keine amtliche Einsatzkarte. OSM-Daten können unvollständig oder veraltet sein und müssen vor einer operativen Nutzung mit lokalen, verlässlichen Quellen abgeglichen werden.

## Daten und Lizenzen

Die Kartendaten stammen aus [OpenStreetMap](https://www.openstreetmap.org/). Sie werden unter der [ODbL](https://www.openstreetmap.org/copyright) bereitgestellt. Die Software von OpenFireMapV2 steht unter der [MIT-Lizenz](../LICENSE). Pipeline-Builds nutzen regionale [Geofabrik-Extrakte](https://download.geofabrik.de/); Suche und Live-Abfragen verwenden Nominatim beziehungsweise Overpass nach deren jeweiligen Nutzungsregeln.

Feedback, Korrekturen und technische Beiträge sind im [GitHub-Repository](https://github.com/FrnkMrz/OpenFireMapV2) willkommen. Fehler in den Kartendaten sollten direkt in OpenStreetMap korrigiert werden.
