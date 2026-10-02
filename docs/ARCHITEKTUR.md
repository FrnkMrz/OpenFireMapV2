# Architektur

OpenFireMapV2 ist eine clientseitige Webanwendung. Es gibt kein eigenes Backend, das Benutzerkonten oder Kartensuchen zentral verwaltet. Der Browser lädt die Anwendung, Kartenhintergründe und die jeweils benötigten Geodaten direkt aus den konfigurierten Diensten.

## Frontend

- Vanilla JavaScript als ES-Module
- Vite für Entwicklung und Produktions-Build
- Leaflet für Karte, Layer, Marker und Permalinks
- Tailwind CSS für die Oberfläche
- IndexedDB und `localStorage` für lokalen Cache und Einstellungen
- lazy geladene Exportmodule für PNG und PDF sowie Datenexporte als GPX und CSV
- 30+ Sprachdateien mit Deutsch als Standardsprache und Englisch als Fallback

Der Build wird nach `docs/` geschrieben und über GitHub Pages veröffentlicht.

## Datenpfad

```text
Browser
  ├─ DACHLiLu: metadata.json → PMTiles-Header → benötigte Kacheln
  │             └─ Cloudflare R2 über pipeline.openfiremap.org
  └─ weltweit oder bei Fehlern: Overpass-Abfrage
                         └─ Nominatim für Orts- und Adresssuche
```

Die geografische Nutzung bleibt weltweit möglich. Die PMTiles-Pipeline ist eine beschleunigte Datenversorgung für Deutschland, Österreich, die Schweiz, Luxemburg und Liechtenstein; sie ist keine Erweiterung der weltweiten Abdeckung.

## PMTiles und HTTP-Range-Requests

Die Pipeline stellt vorberechnete Vektorkacheln in einer PMTiles-Datei bereit. Der Browser lädt nicht die gesamte Datei, sondern fordert per HTTP-Range-Request nur die Bytebereiche an, die für die sichtbaren Kacheln benötigt werden. Das reduziert Datenmenge und Wartezeit besonders bei großen Gebieten.

Die aktuelle DACHLiLu-Datei ist ungefähr **192,5 MiB** groß (**201.892.499 Bytes**) und enthält Daten für rund **1,25 Millionen feuerwehrrelevante Objekte**. Der Build verwendet für die relevanten Layer MaxZoom 14. Dadurch bleibt die Datei unter dem Cloudflare-Free-Cache-Limit von **512 MiB**, während der Browser weiterhin nur benötigte Bytebereiche abruft. Die exakten Build-Zeitpunkte, Dateigröße und Statistiken werden über `metadata.json` der Pipeline veröffentlicht.

## Cloudflare R2

Cloudflare R2 ist die primäre öffentliche Quelle für die vorbereiteten PMTiles-Daten. Die Auslieferung erfolgt über `https://pipeline.openfiremap.org`. CORS und Range-Requests ermöglichen den direkten Zugriff aus dem Browser. Eine lokale VM (intern als **VM 102** bezeichnet) dient als Test- und Backup-Umgebung für den Pipeline-Betrieb; private Netzwerkadressen, Zugangsdaten und interne Pfade gehören nicht zur öffentlichen Dokumentation.

### R2-Auslieferung und Synchronisation

Die Veröffentlichung ist auf die unterschiedlichen Datenrollen abgestimmt:

1. PMTiles werden zuerst mit einer Cache-Dauer von 24 Stunden übertragen.
2. Optionale GeoJSON-Dateien erhalten eine kürzere Cache-Dauer von einer Stunde.
3. `metadata.json` wird zuletzt und mit `no-cache` veröffentlicht. Dadurch markiert es erst dann eine neue Pipeline-Version, wenn die Datenartefakte bereits übertragen wurden.
4. Anschließend prüft der Update-Lauf den öffentlichen `generated_at`-Wert und ermittelt die PMTiles-Gesamtgröße über einen HTTP-Range-Request. Bei Abweichungen wird der Lauf mit Fehler beendet; ein optionaler Cloudflare-Cache-Purge erfolgt nur nach erfolgreicher Synchronisation.

Für PMTiles ist die Nginx-Kompression deaktiviert, damit HTTP-206-Range-Responses und `Content-Range` zuverlässig funktionieren. ETags, CORS und die exponierten Range-Header unterstützen Browser- und R2-Kompatibilität. Der aktuelle MaxZoom-14-Build bleibt mit rund 192,5 MiB unter dem 512-MiB-Free-Cache-Limit.

Die lokale Umgebung stellt zusätzlich interne Statusdateien für Monitoring bereit. Sie sind nicht öffentlich erreichbar (nur Heimnetz); öffentliche Projektseiten dokumentieren nur den technischen Zweck, nicht private Netzwerkadressen oder Zugangsdaten.

## Cache und Cache-Busting

Es gibt mehrere Cache-Ebenen:

1. Der lokale IndexedDB-Cache kann vom Benutzer konfiguriert werden.
2. Bereits dekodierte PMTiles-Kacheln werden während der Sitzung im Speicher wiederverwendet.
3. Die Pipeline meldet ihre Build-Version über `metadata.json`.

Die PMTiles-URL erhält automatisch einen Versionsparameter (`?v=`). Ändert sich die Pipeline-Version, werden die PMTiles-Instanz, der Header und der Kachel-Cache verworfen. So wird verhindert, dass ein alter Browser- oder CDN-Cache eine neue Abdeckung verdeckt. Dank der Skip-if-unchanged-Logik der Pipeline (`built`, `upload_only`, `skipped_no_changes`) wird `generated_at` nur aktualisiert, wenn Geofabrik tatsächlich veränderte Daten bereitgestellt hat oder der Builder-Code angepasst wurde. Unveränderte Quelldaten erzeugen keinen neuen Versionsparameter, sodass der Cloudflare Edge Cache Kacheln stabil mit Cache-Hits ausliefert.

`generated_at` ist der Build-Zeitpunkt, nicht der Datenstand. Den OSM-Datenstand liest der Builder aus dem PBF-Header jedes Auszugs (`extracts.<land>.osm_data_timestamp`, bei Geofabrik der Stand der letzten eingespielten Replikation); `osm_data_until` ist der älteste davon und bleibt leer, wenn er bei einem Land fehlt. Ab diesem Zeitpunkt können Änderungen per Overpass (`newer:`) nachgeladen werden. Damit Overpass-Treffer den Kachel-Objekten zugeordnet werden können, tragen Hydranten, Feuerwachen, Löschwasserstellen und Defibrillatoren in den PMTiles ihren OSM-Typ und ihre OSM-ID (`@type`, `@id`); das Frontend übernimmt sie als `type`/`id` und zeigt sie nicht als Tags an.

Nach dem Laden aus den PMTiles fragt das Frontend im Hintergrund Overpass nach Änderungen im sichtbaren Ausschnitt: dieselben POI-Filter wie bei der Vollabfrage, ergänzt um `(newer:"<osm_data_until>")`. Treffer ersetzen Kachel-Objekte mit gleichem `type:id` oder kommen hinzu; das gilt auch, wenn danach der Pufferring nachgeladen wird. Das Ergebnis wird je Ausschnitt 10 Minuten gecacht (`Config.pipeline.liveDeltaCacheTtlMs`), Fehler bleiben ohne Meldung. Gelöschte oder umgetaggte Objekte erkennt `newer:` nicht; sie verschwinden erst mit dem nächsten Build. Ohne `osm_data_until` (ältere Builds) oder mit `Config.pipeline.liveDelta = false` bleibt das Nachladen aus.

## Fallback-Logik

1. Liegt der sichtbare Ausschnitt in der validierten DACHLiLu-Abdeckung, versucht der Browser PMTiles über R2 zu laden.
2. Ist die Datei nicht erreichbar, veraltet oder deckt der Header den Ausschnitt nicht ab, wird die Pipeline-Anfrage verworfen.
3. Die Anwendung fragt den Bereich über einen Overpass-Endpunkt ab und kann bei Überlastung auf weitere Endpunkte wechseln.
4. Liegt der Ausschnitt außerhalb DACHLiLu, wird Overpass direkt als normale Datenquelle verwendet.

Die Abdeckung wird vor der Anfrage geprüft, damit ein veralteter PMTiles-Header nicht zu einer scheinbar leeren Karte führt.
