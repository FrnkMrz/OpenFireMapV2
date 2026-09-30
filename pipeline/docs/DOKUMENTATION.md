# Pipeline-Dokumentation

## Zweck

Die DACHLiLu-Pipeline bereitet OpenStreetMap-Daten für eine schnelle Darstellung in OpenFireMapV2 vor. Sie erzeugt statische Vektorkacheln und Metadaten; der Browser lädt davon nur die für den sichtbaren Ausschnitt benötigten Bereiche.

## Datenfluss & Zeitplan

1. Der nächtliche Update-Lauf (`update.sh`) startet täglich um **06:00 UTC** (08:00 MESZ / 07:00 MEZ) per Cronjob auf VM 102 (nach dem nächtlichen Veröffentlichungsfenster von Geofabrik).
2. Regionale PBF-Extrakte werden aus der Geofabrik-Quelle bezogen (mit intelligentem HEAD-Check, atomarer Validierung und robustem Fallback auf vorhandene lokale Extrakte bei Download-Ausfällen).
3. Der Builder filtert feuerwehrrelevante Objekte und erzeugt PMTiles.
4. `metadata.json` beschreibt Version, Build-Zeit, Statistiken und Zustand/Alter der verwendeten Extrakte.
5. Cloudflare R2 stellt die Artefakte über HTTPS bereit.
6. Das Frontend prüft Version und Abdeckung und greift bei Problemen auf Overpass zurück.

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
- **Öffentlicher CDN-Status (R2):** Erreichbarkeit, Datenalter in Stunden, Versions-Zeitstempel (`generated_at`), Extrakt-Alter in Stunden (`extracts_oldest_age_hours`), Objektzahlen (Hydranten, Wachen, Wasserstellen, Defis, Grenzen), PMTiles-Größe und MaxZoom.
- **Lokaler VM-Status:** Lokale Version auf VM 102, Festplattenbelegung (`/internal/system_stats.json`).
- **Synchronisations-Status:** Automatische Erkennung von Diskrepanzen zwischen lokalem Build und öffentlichem R2-Stand (`/internal/sync_status.json`) sowie Build-Warnungen.

### Einbindung der Vorlage:
1. In Home Assistant Packages aktivieren (in `/config/configuration.yaml`):
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
2. Datei `openfiremap.yaml` in den Home-Assistant-Ordner `/config/packages/` kopieren.
3. Platzhalter konfigurieren:
   - **Standardweg (Suchen & Ersetzen):**
     - `<PIPELINE_PUBLIC_URL>`: Öffentliche URL, z. B. `https://pipeline.openfiremap.org`
     - `<PIPELINE_LAN_URL>`: LAN-URL des Nginx-Servers, z. B. `http://<PIPELINE_LAN_IP>:8080` (Muster)
     - `<NOTIFY_SERVICE>`: Benachrichtigungsdienst, z. B. `notify.persistent_notification` oder `notify.mobile_app_smartphone` (muss direkt als Dienstname im YAML stehen; Home Assistant unterstützt kein `!secret` für Service-Namen).
   - **Alternative via `secrets.yaml`:**
     Home Assistant erlaubt kein Ersetzen von Teil-Strings innerhalb von URLs via `!secret`. Daher müssen vollständige URLs in `secrets.yaml` hinterlegt und die `resource:`-Zeilen in `openfiremap.yaml` angepasst werden:
     ```yaml
     # in /config/secrets.yaml
     openfiremap_public_metadata_url: "https://pipeline.openfiremap.org/metadata.json"
     openfiremap_lan_metadata_url: "http://<PIPELINE_LAN_IP>:8080/metadata.json"
     openfiremap_lan_system_stats_url: "http://<PIPELINE_LAN_IP>:8080/internal/system_stats.json"
     openfiremap_lan_sync_status_url: "http://<PIPELINE_LAN_IP>:8080/internal/sync_status.json"

     # in /config/packages/openfiremap.yaml
     rest:
       - resource: !secret openfiremap_public_metadata_url
         ...
     ```
     Auch bei dieser Variante muss `<NOTIFY_SERVICE>` in den Automationen direkt ersetzt werden.
4. **Hinweis zum Initialstatus:**
   Die Entitäten aus `sync_status.json` (`sensor.openfiremap_sync_*`, `binary_sensor.openfiremap_upload_erfolgreich`, `binary_sensor.openfiremap_in_sync`) zeigen bis zum ersten erfolgreichen nächtlichen `update.sh`-Lauf den Status `unavailable`. Dies ist normales Verhalten, da die Statusdatei erst beim Build erzeugt wird.
5. Konfigurationsprüfung in Home Assistant durchführen und YAML neu laden.
6. Vor dem Einbinden die Entitätsreferenzen prüfen:
   ```bash
   python3 pipeline/tools/check_ha_entities.py pipeline/monitoring/homeassistant/openfiremap.yaml
   ```
   Das Skript leitet die Entity-ID aus dem Anzeigenamen (nicht aus `unique_id`) ab,
   berücksichtigt die Home-Assistant-Slugifizierung einschließlich Umlauten und `ß`
   und meldet fehlende oder doppelte Referenzen. HA-Tags wie `!secret` und `!include`
   müssen dafür nicht aufgelöst werden.

### Ausfall- und Alarmverhalten

- Ein fehlgeschlagener öffentlicher REST-Abruf ergibt `unavailable`; der öffentliche
  Endpunkt-Alarm reagiert darauf nach 10 Minuten.
- `OpenFireMap Datenalter Stunden` und `OpenFireMap Daten Synchron` werden bei
  fehlenden Versionsdaten ebenfalls `unavailable`. Dadurch erzeugen sie während
  eines Endpunktausfalls keinen zweiten Alarm.
- Ein echter `upload_ok: false`-Status löst den Sync-Alarm nach 15 Minuten aus.
- Ein Hydranten-REST-Ausfall wird nicht als Bestandseinbruch auf null interpretiert.

## Rolle des Cloudflare-Tunnels vs. Cloudflare R2

- **Primäre Produktions-Auslieferung:** Läuft direkt über Cloudflare R2 unter `<PIPELINE_PUBLIC_URL>`. Der Browser bezieht Kacheln via HTTP Range Requests direkt aus dem R2 Object Storage.
- **Rolle des Nginx-Servers auf VM 102:** Dient als lokaler Build- und Backup-Server im Heimnetzwerk (Port 8080) für lokale Tests, Entwicklungszwecke und internes Monitoring (z. B. Home Assistant).
- **Rolle des Cloudflare-Tunnels (`openfiremap-tunnel`):** Der Tunnel leitete vor der R2-Migration Anfragen an Nginx weiter. Da R2 die öffentliche Last vollständig übernimmt, wird der Tunnel im Regelbetrieb nicht mehr zwingend benötigt. Er verbleibt vorerst als Fallback-/Redundanz-Kanal aktiv, sollte jedoch perspektivisch entweder auf eine dedizierte Backup-Subdomain umgestellt oder abgeschaltet werden.
- **Absicherung des Endpunkts `/internal/`:** Da der Tunnel-Container aus Nginx-Sicht aus dem internen Docker-Bridge-Netzwerk anfragt, sperrt Nginx `/internal/` sofort per HTTP 403, sobald der Cloudflare-Header `CF-Connecting-IP` erkannt wird.

## Qualitätssicherung

Builder-Tests, Abdeckungsprüfungen und der Playwright-Performance-Test prüfen die wesentlichen Pfade. Änderungen an der Pipeline sollten zusätzlich mit `npm run build`, den Vitest-Tests und den E2E-Tests der Hauptanwendung validiert werden.

Betriebsnamen, private IP-Adressen, Benutzer, lokale Pfade, Snapshot-Namen und Geheimnisse gehören nicht in öffentliche Dokumente. Siehe [OPERATIONS_INTERNAL.md](OPERATIONS_INTERNAL.md) für die private Checklistenstruktur.
