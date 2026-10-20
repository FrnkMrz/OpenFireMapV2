# Geschichte von OpenFireMap

Diese Zeitleiste fasst die belegbaren Meilensteine des Projekts zusammen. Persönliche Zuschreibungen und nicht dokumentierte Einzelheiten werden bewusst nicht ergänzt.

## 2010 – erste Hydrantenkarte

Im September 2010 entstand die erste Hydrantenkarte aus OpenStreetMap-Daten. Der Ausgangspunkt war die praktische Frage, wie feuerwehrrelevante Punkte auf einer offenen Karte sichtbar und durchsuchbar gemacht werden können.

## 2010–2011 – Austausch in der OSM-Community

Die Weiterentwicklung wurde durch Beiträge von OSM-Mitwirkenden, eine Mappingparty in Zürich und Gespräche am Nürnberger OSM-Stammtisch geprägt. Diese Einflüsse führten dazu, Feuerwehreinrichtungen und Wasserstellen als gemeinschaftlich pflegbare OSM-Daten zu betrachten.

## Januar 2012 – OpenFireMap.org

Seit Januar 2012 verweist `OpenFireMap.org` auf die weiterentwickelte Karte. Damit wurde OpenFireMap als eigenständiger Zugang zu feuerwehrrelevanten OpenStreetMap-Daten dauerhaft sichtbar.

## 2017 – FOSSGIS-Konferenz

Im Umfeld der FOSSGIS-Konferenz 2017 wurde OpenFireMap im Zusammenhang mit digitalen Feuerwehreinsatzkarten vorgestellt. Der Schwerpunkt lag auf dem Nutzen offener Geodaten und digitaler Karten für feuerwehrbezogene Anwendungen.

## 2025/2026 – technischer Neuaufbau

Mit OpenFireMapV2 begann 2025/2026 ein technischer Neuaufbau. Die neue clientseitige Anwendung nutzt moderne Webtechnik, eine klarere Modulstruktur, responsive Oberflächen, mehrsprachige Bedienung, lokalen Cache und mehrere Exportformate.

## 2026 – PMTiles- und Cloudflare-R2-Pipeline

2026 wurde eine schnelle, vorberechnete PMTiles-Pipeline für Deutschland, Österreich, die Schweiz, Luxemburg und Liechtenstein eingeführt. Die vorbereiteten Daten werden über Cloudflare R2 ausgeliefert; HTTP-Range-Requests laden nur benötigte Kachelbereiche.

Die Pipeline erweitert nicht die geografische Abdeckung. OpenFireMap bleibt weltweit nutzbar: Außerhalb der vorbereiteten DACHLiLu-Gebiete und bei Pipeline-Fehlern verwendet die Anwendung Overpass.

## Oktober 2026 – Europa

Im Oktober 2026 wurde die Pipeline um 40 weitere europäische Länder erweitert (ohne Russland, Ukraine, Belarus und die Türkei). Je Land gibt es eine eigene PMTiles-Datei, die wöchentlich neu gebaut und versioniert in Cloudflare R2 abgelegt wird; ein Manifest verzeichnet die veröffentlichten Länder. An Landesgrenzen öffnet die Karte mehrere Dateien zugleich und führt sie zusammen. Zusammen enthalten die Länder-Dateien rund 1,0 Millionen Objekte (etwa 634 MB). Mit Version v0.9.0 nutzt die Karte sie standardmäßig.

## Aktueller Stand – v0.10.0

OpenFireMapV2 steht aktuell bei **v0.10.0**. Die DACHLiLu-Pipeline versorgt rund **1,2 Millionen Objekte** aus einer durch MaxZoom 14 optimierten, etwa **182,4 MiB** großen PMTiles-Datei, dazu kommen 40 europäische Länder mit weiteren rund **1,0 Millionen Objekten** in eigenen Dateien; seit Oktober 2026 ergänzt die Anwendung sie per Overpass um alle seit dem Datenstand neu angelegten oder geänderten Objekte (bei den Länder-Dateien nur, solange deren Datenstand höchstens 10 Tage alt ist). Die Anwendung umfasst mehr als 30 Sprachen, IndexedDB-Caching, Exporte als PNG/PDF/GPX/CSV und responsive Nutzung auf Desktop und Mobilgeräten. Mit v0.10.0 (Oktober 2026) kamen Barrierefreiheit nach WCAG 2.2 (A/AA) mit Tastaturbedienung, Objektliste und geprüften Kontrasten sowie die öffentliche Pipeline-Statusseite unter `/status/` hinzu.
