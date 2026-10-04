# FAQ

## Warum werden manche Daten verzögert geladen?

Die Anwendung lädt nur den sichtbaren Kartenausschnitt und wartet dabei auf externe Dienste. Große Ausschnitte, schwache Verbindungen, Browser-Caches oder ausgelastete Overpass-Endpunkte können die Antwort verzögern. Die Statusanzeige informiert über laufende Abrufe; ein erneuter Versuch kann nötig sein.

## Warum wird außerhalb bestimmter Gebiete Overpass verwendet?

OpenFireMap war von Anfang an weltweit nutzbar. Die PMTiles-Pipeline ist derzeit für Deutschland, Österreich, die Schweiz, Luxemburg und Liechtenstein vorbereitet. Außerhalb dieser DACHLiLu-Abdeckung bleibt Overpass die normale Datenquelle. Die Pipeline beschleunigt ausgewählte Gebiete, ersetzt aber nicht die weltweite Overpass-Abdeckung.

## Ist die Anwendung offline nutzbar?

Nein, nicht vollständig. Neue Kartenausschnitte, Suche und aktuelle Daten benötigen eine Internetverbindung. Bereits geladene Daten können im lokalen IndexedDB-Cache liegen und bei schlechtem Netz noch verfügbar sein; das ist keine verlässliche Offline-Karte für Einsätze.

## Wie aktuell sind die Daten?

Overpass liefert Daten aus dem Stand, den der verwendete Dienst aktuell bereitstellt. PMTiles sind vorberechnete Datenstände; ihr OSM-Datenstand steht in den Pipeline-Metadaten (`osm_data_until`). In DACHLiLu lädt OpenFireMap nach den PMTiles im Hintergrund über Overpass alle seitdem neuen oder geänderten Feuerwachen, Hydranten, Löschwasserstellen und Defibrillatoren im Ausschnitt nach. Neu eingetragene Objekte erscheinen so meist nach wenigen Sekunden. Gelöschte Objekte erkennt dieses Nachladen nicht; sie verschwinden erst mit dem nächsten Pipeline-Build.

## Wie können Fehler in OSM korrigiert werden?

Korrigiere die Quelle direkt in [OpenStreetMap](https://www.openstreetmap.org/), zum Beispiel mit iD oder JOSM. Achte auf die lokalen Mapping-Regeln und ergänze nur Informationen, die du zuverlässig belegen kannst. Nach einer Änderung müssen Overpass und gegebenenfalls der nächste PMTiles-Build die Änderung übernehmen.

## Warum kann die Karte bei Überlastung mehrmals laden müssen?

Overpass ist ein öffentlicher Gemeinschaftsdienst und kann Abfragen bei hoher Last verzögern oder ablehnen. OpenFireMap bricht veraltete Abrufe ab, versucht bei Bedarf einen anderen Endpunkt und nutzt Backoff sowie Wiederholungen. Bei PMTiles kann zusätzlich die Verfügbarkeit oder Aktualisierung der Pipeline geprüft werden.

## Was wurde an der R2-Auslieferung optimiert?

Der DACHLiLu-Pipeline-Build verwendet MaxZoom 14 und ist aktuell etwa 182,4 MiB groß. PMTiles werden per HTTP-Range-Requests ohne Gzip-Transformation ausgeliefert; ETags, CORS und abgestimmte Cache-Zeiten unterstützen die Wiederverwendung bereits geladener Daten. Nach einem Upload wird der öffentliche Stand anhand von Build-Zeitstempel und Dateigröße verifiziert. So wird `metadata.json` erst dann als neue Version veröffentlicht, wenn die eigentlichen Daten vollständig in R2 angekommen sind.

## Sind die Daten für einen Feuerwehreinsatz verbindlich?

Nein. OpenFireMap ist eine offene Informations- und Mapping-Anwendung. OSM-Daten können unvollständig, veraltet oder fehlerhaft sein und ersetzen keine lokalen Einsatzunterlagen, Leitstelleninformationen oder amtlichen Daten.
