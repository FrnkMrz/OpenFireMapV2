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

Die aktuelle DACHLiLu-Datei ist ungefähr **514 MB** groß und enthält Daten für rund **1,25 Millionen feuerwehrrelevante Objekte**. Die exakten Build-Zeitpunkte und Statistiken werden über `metadata.json` der Pipeline veröffentlicht.

## Cloudflare R2

Cloudflare R2 ist die primäre öffentliche Quelle für die vorbereiteten PMTiles-Daten. Die Auslieferung erfolgt über `https://pipeline.openfiremap.org`. CORS und Range-Requests ermöglichen den direkten Zugriff aus dem Browser. Eine lokale VM (intern als **VM 102** bezeichnet) dient als Test- und Backup-Umgebung für den Pipeline-Betrieb; private Netzwerkadressen, Zugangsdaten und interne Pfade gehören nicht zur öffentlichen Dokumentation.

## Cache und Cache-Busting

Es gibt mehrere Cache-Ebenen:

1. Der lokale IndexedDB-Cache kann vom Benutzer konfiguriert werden.
2. Bereits dekodierte PMTiles-Kacheln werden während der Sitzung im Speicher wiederverwendet.
3. Die Pipeline meldet ihre Build-Version über `metadata.json`.

Die PMTiles-URL erhält automatisch einen Versionsparameter. Ändert sich die Pipeline-Version, werden die PMTiles-Instanz, der Header und der Kachel-Cache verworfen. So wird verhindert, dass ein alter Browser- oder CDN-Cache eine neue Abdeckung verdeckt.

## Fallback-Logik

1. Liegt der sichtbare Ausschnitt in der validierten DACHLiLu-Abdeckung, versucht der Browser PMTiles über R2 zu laden.
2. Ist die Datei nicht erreichbar, veraltet oder deckt der Header den Ausschnitt nicht ab, wird die Pipeline-Anfrage verworfen.
3. Die Anwendung fragt den Bereich über einen Overpass-Endpunkt ab und kann bei Überlastung auf weitere Endpunkte wechseln.
4. Liegt der Ausschnitt außerhalb DACHLiLu, wird Overpass direkt als normale Datenquelle verwendet.

Die Abdeckung wird vor der Anfrage geprüft, damit ein veralteter PMTiles-Header nicht zu einer scheinbar leeren Karte führt.
