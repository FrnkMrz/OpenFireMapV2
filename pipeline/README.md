# OpenFireMap DACHLiLu Data Pipeline

Die Pipeline bereitet relevante OpenStreetMap-Daten für Deutschland, Österreich, die Schweiz, Luxemburg und Liechtenstein (DACHLiLu) vor und stellt sie als PMTiles sowie optionale GeoJSON-Dateien bereit.

Sie ist eine Beschleunigung für ausgewählte Gebiete, keine geografische Erweiterung von OpenFireMap. Die Hauptanwendung bleibt weltweit nutzbar und verwendet außerhalb DACHLiLu Overpass.

## Öffentliche Architektur

```text
Geofabrik-OSM-Extrakte
        ↓ Filterung und Build
PMTiles / Metadaten
        ↓ HTTP Range Requests über CORS
Cloudflare R2 / pipeline.openfiremap.org
        ↓
OpenFireMap-Browserclient
        ↘ bei Fehlern, veralteter Abdeckung oder außerhalb DACHLiLu: Overpass
```

Cloudflare R2 ist die primäre öffentliche Quelle der vorbereiteten PMTiles-Daten. Der Browser lädt nur die benötigten Bytebereiche. Cache-Busting über `metadata.json` und die Prüfung der PMTiles-Abdeckung verhindern, dass ein veralteter Stand als passend ausgegeben wird.

Der Upload überträgt PMTiles zuerst, GeoJSON danach und `metadata.json` zuletzt. PMTiles erhalten eine Cache-Dauer von 24 Stunden, GeoJSON eine Stunde und `metadata.json` wird ohne Cache veröffentlicht. Anschließend werden `generated_at` und die PMTiles-Größe per Range-Request gegen den öffentlichen R2-Stand geprüft. Ein optionaler Cache-Purge erfolgt nur nach erfolgreicher Synchronisation.

Für den internen Betrieb steht außerdem ein Home-Assistant-Package zur Verfügung. Es überwacht den öffentlichen R2-Stand, Datenalter, Objektzahlen, PMTiles-Größe und MaxZoom sowie die Synchronisation zwischen lokaler Test-/Backup-Umgebung und R2. Die Monitoring-Vorlage verwendet Platzhalter und enthält keine privaten Zugangsdaten.

## Aktueller Stand

- ungefähr **1,25 Millionen** feuerwehrrelevante Objekte
- PMTiles-Datei von ungefähr **192,5 MiB** (**201.892.499 Bytes**) durch optimierten MaxZoom-14-Build
- unter dem Cloudflare-Free-Cache-Limit von **512 MiB**
- HTTP-Range-Requests und CORS
- abgestufte Cache-Control-Header, ETags und Upload-Verifikation gegen den öffentlichen R2-Stand
- automatische Pipeline-Versionsprüfung
- Fallback auf Overpass im Frontend
- lokale **VM 102** als Test- und Backup-Umgebung

## Datenendpunkte

Die öffentliche Pipeline-Domain ist `https://pipeline.openfiremap.org`. Typische Ressourcen sind:

| Ressource | Zweck |
| --- | --- |
| `/metadata.json` | Build-Version, Zeitstempel und Objektstatistiken |
| `/openfiremap.pmtiles` | vorberechnete Vektorkacheln |
| optionale GeoJSON-Dateien | kompatible Fallback- oder Analyseartefakte |

Interne LAN-Adressen, Benutzer, Serverpfade, Snapshot-Namen und Tunnel-Token werden nicht in dieser öffentlichen Dokumentation veröffentlicht.

## Entwicklung

Der Builder verarbeitet Geofabrik-PBF-Extrakte mit Docker, Python und `osmium-tool`. Die konkrete Ausführungsumgebung kann lokal oder in einer internen VM eingerichtet werden. Zugangsdaten und Infrastrukturkonfigurationen gehören in eine nicht versionierte `.env`-Datei.

```bash
docker compose run --rm builder
docker compose up -d web
curl -s http://localhost:8080/metadata.json
```

Weitere öffentliche Hinweise:

- [Architektur der Anwendung](../docs/ARCHITEKTUR.md)
- [Datenquellen](../docs/DATENQUELLEN.md)
- [interne Betriebsnotizen](docs/OPERATIONS_INTERNAL.md) – nicht als Projektwerbung gedacht
