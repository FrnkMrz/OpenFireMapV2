# Pipeline-Dokumentation

## Zweck

Die DACHLiLu-Pipeline bereitet OpenStreetMap-Daten für eine schnelle Darstellung in OpenFireMapV2 vor. Sie erzeugt statische Vektorkacheln und Metadaten; der Browser lädt davon nur die für den sichtbaren Ausschnitt benötigten Bereiche.

## Datenfluss

1. Regionale PBF-Extrakte werden aus der Geofabrik-Quelle bezogen.
2. Der Builder filtert feuerwehrrelevante Objekte und erzeugt PMTiles.
3. `metadata.json` beschreibt Version, Build-Zeit und Statistiken.
4. Cloudflare R2 stellt die Artefakte über HTTPS bereit.
5. Das Frontend prüft Version und Abdeckung und greift bei Problemen auf Overpass zurück.

## Öffentliche Qualitätsmerkmale

- HTTP-Range-Requests statt vollständigem Download der PMTiles-Datei
- CORS für den Browserzugriff
- Cache-Busting über die Pipeline-Version
- Erkennung einer nicht passenden oder veralteten PMTiles-Abdeckung
- Overpass-Fallback außerhalb DACHLiLu und bei Pipeline-Fehlern
- keine Veröffentlichung von Systemmetriken, Zugangsdaten oder internen Netzwerkdaten

## Aktuelle Größenordnung

Die DACHLiLu-Ausgabe umfasst rund 1,25 Millionen feuerwehrrelevante Objekte. Das PMTiles-Archiv ist dank optimiertem Zoom-Level 14 etwa **192,5 MB** groß (201.892.499 Bytes) und liegt damit weit unter dem Cloudflare Free-Cache-Limit von 512 MiB. Diese Werte sind Momentaufnahmen; der aktuelle Build-Zeitstempel und detaillierte Statistiken stehen in `metadata.json`.

## Home-Assistant-Überwachung

Die Pipeline lässt sich über das vorgefertigte Home-Assistant-Package unter `pipeline/monitoring/homeassistant/openfiremap.yaml` überwachen.

### Überwachte Metriken:
- **Öffentlicher CDN-Status (R2):** Erreichbarkeit, Datenalter in Stunden, Versions-Zeitstempel (`generated_at`), Objektzahlen (Hydranten, Wachen, Wasserstellen, Defis, Grenzen), PMTiles-Größe und MaxZoom.
- **Lokaler VM-Status:** Lokale Version auf VM 102, Festplattenbelegung (`/internal/system_stats.json`).
- **Synchronisations-Status:** Automatische Erkennung von Diskrepanzen zwischen lokalem Build und öffentlichem R2-Stand (`/internal/sync_status.json`).

### Einbindung der Vorlage:
1. In Home Assistant Packages aktivieren (in `/config/configuration.yaml`):
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
2. Datei `openfiremap.yaml` in den Home-Assistant-Ordner `/config/packages/` kopieren.
3. Platzhalter konfigurieren (entweder direkt in der Datei oder in `/config/secrets.yaml`):
   - `<PIPELINE_LAN_URL>`: z. B. `http://<PIPELINE_LAN_IP>:8080`
   - `<NOTIFY_SERVICE>`: z. B. `notify.mobile_app_smartphone` oder `notify.persistent_notification`
4. Konfigurationsprüfung in Home Assistant durchführen und YAML neu laden.

## Rolle des Cloudflare-Tunnels vs. Cloudflare R2

- **Primäre Produktions-Auslieferung:** Läuft direkt über Cloudflare R2 unter `https://pipeline.openfiremap.org`. Der Browser bezieht Kacheln via HTTP Range Requests direkt aus dem R2 Object Storage.
- **Rolle des Nginx-Servers auf VM 102:** Dient als lokaler Build- und Backup-Server im Heimnetzwerk (Port 8080) für lokale Tests, Entwicklungszwecke und internes Monitoring (z. B. Home Assistant).
- **Rolle des Cloudflare-Tunnels (`openfiremap-tunnel`):** Der Tunnel leitete vor der R2-Migration Anfragen an Nginx weiter. Da R2 die öffentliche Last vollständig übernimmt, wird der Tunnel im Regelbetrieb nicht mehr zwingend benötigt. Er verbleibt vorerst als Fallback-/Redundanz-Kanal aktiv, sollte jedoch perspektivisch entweder auf eine dedizierte Backup-Subdomain umgestellt oder abgeschaltet werden.
- **Absicherung des Endpunkts `/internal/`:** Da der Tunnel-Container aus Nginx-Sicht aus dem internen Docker-Bridge-Netzwerk anfragt, sperrt Nginx `/internal/` sofort per HTTP 403, sobald der Cloudflare-Header `CF-Connecting-IP` erkannt wird.

## Qualitätssicherung

Builder-Tests, Abdeckungsprüfungen und der Playwright-Performance-Test prüfen die wesentlichen Pfade. Änderungen an der Pipeline sollten zusätzlich mit `npm run build`, den Vitest-Tests und den E2E-Tests der Hauptanwendung validiert werden.

Betriebsnamen, private IP-Adressen, Benutzer, lokale Pfade, Snapshot-Namen und Geheimnisse gehören nicht in öffentliche Dokumente. Siehe [OPERATIONS_INTERNAL.md](OPERATIONS_INTERNAL.md) für die private Checklistenstruktur.
