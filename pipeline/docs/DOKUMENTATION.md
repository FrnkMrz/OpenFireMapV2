# Pipeline-Dokumentation

## Zweck

Die DACHLiLu-Pipeline bereitet OpenStreetMap-Daten für eine schnelle Darstellung in OpenFireMapV2 vor. Sie erzeugt statische Vektorkacheln und Metadaten; der Browser lädt davon nur die für den sichtbaren Ausschnitt benötigten Bereiche.

## Datenfluss & Zeitplan

1. Der nächtliche Update-Lauf (`update.sh`) startet täglich um **05:43 UTC** (07:43 MESZ / 06:43 MEZ) per Cronjob auf VM 102 (nach dem nächtlichen Veröffentlichungsfenster von Geofabrik, krumme Minute zur Vermeidung von Spitzenlasten).
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

## Build nur bei Änderungen („Skip if unchanged“)

Um unnötige CPU-Last (25–30 min Buildzeit), Bandbreite und vor allem Kachel-Invalidierungen im Cloudflare Edge-Cache zu vermeiden, baut der Builder nur neu, wenn sich die Quelldaten oder der Build-Code tatsächlich geändert haben:

| Ergebnis (`sync_status.result`) | Bedingung | Aktion |
|---|---|---|
| `built` | Mindestens ein OSM-Extrakt neu/geändert, **oder** Builder-Fingerprint geändert, **oder** `FORCE_BUILD=true`, **oder** kein gültiger Fingerprint vorhanden (erster Lauf) | Build + R2-Upload + Verifikation + Published-Fingerprint |
| `upload_only` | Quelldaten und Builder unverändert, aber der **lokale** Stand ist noch nicht auf R2 veröffentlicht (z. B. nach Upload-Fehler) | Kein Build, nur R2-Upload + Verifikation + Published-Fingerprint |
| `skipped_no_changes` | Quelldaten unverändert **und** R2 ist bereits synchron zum lokalen Stand | Kein Build, kein Upload, Verifikation läuft als Heartbeat |
| `skipped_stale_source` | Keine Änderungen an lokalen Vorlagen, aber Quelle für mindestens ein Land nicht prüfbar oder fehlerhaft (Exit 11) **und** R2 synchron | Kein Build, kein Upload, Warnungen protokolliert |

### Fingerprints & Erkennung

1. **Extrakt-Fingerprint**: Pro Land wird `{ id, size_bytes, mtime }` erfasst. Die `mtime` entspricht dank `curl -R` dem exakten `Last-Modified`-Header von Geofabrik.
2. **Builder-Fingerprint**: Ein deterministischer SHA-256-Hash über den Python-Quellcode von `build_features.py` und alle ergebnisrelevanten Parameter (`PIPELINE_REGION`, `OSM_EXTRACT_URL`, Zielländer, `TIPPECANOE_CONFIG`, Layer-Definitionen).
3. **Speicherorte (intern unter `raw/`, nicht öffentlich)**:
   - `raw/build_fingerprint.json`: Fingerprint des letzten erfolgreichen lokalen Builds.
   - `raw/published_fingerprint.json`: Fingerprint des erfolgreich auf Cloudflare R2 veröffentlichten Stands.
4. **Cache-Vorteile**: Da bei `skipped_no_changes` kein Upload und kein Cache-Purge stattfindet, bleibt `generated_at` in `metadata.json` und damit der Parameter `?v=` für Web-Clients stabil. Der Cloudflare Edge Cache liefert Kacheln dauerhaft mit `HIT` aus.

## Aktuelle Größenordnung

Die DACHLiLu-Ausgabe umfasst rund 1,25 Millionen feuerwehrrelevante Objekte. Das PMTiles-Archiv ist dank optimiertem Zoom-Level 14 etwa **182,3 MiB** groß (191.103.472 Bytes) und liegt damit weit unter dem Cloudflare Free-Cache-Limit von 512 MiB. Diese Werte sind Momentaufnahmen; der aktuelle Build-Zeitstempel und detaillierte Statistiken stehen in `metadata.json`.

## Home-Assistant-Überwachung

Die Pipeline lässt sich über das Home-Assistant-Package `pipeline/monitoring/homeassistant/openfiremap.yaml` überwachen. Es entspricht dem produktiv laufenden Paket; LAN-Adressen, SSH-Ziel und Benachrichtigungsdienst sind durch Platzhalter ersetzt.

### Überwachte Metriken
- **Öffentlicher Stand (R2, `metadata.json`):** Status und Erreichbarkeit, Zusammenfassung, `generated_at`, Objektzahlen je Ebene (mit `previous_count`/`diff_text` als Attribute), Build-, Download-, Extraktions- und PMTiles-Dauer, PMTiles-Größe.
- **Lokaler Stand auf VM 102 (`<PIPELINE_LAN_URL>/metadata.json`):** Status und `generated_at`; daraus der Publish-Verzug zwischen lokalem und öffentlichem Stand.
- **R2-Sync (`<PIPELINE_LAN_URL>/internal/sync_status.json`):** Ergebnis des letzten Laufs, letzte Prüfung (Heartbeat), letzter Fehler, Upload erfolgreich, in Sync.
- **Speicher der VM:** freier und belegter Speicher per SSH (siehe unten); `system_stats.json` bleibt dafür absichtlich nicht öffentlich.

Schwellenwerte (Publish-Verzug, Objekt-Einbruch, Build-Dauer, freier Speicher) sind als `input_number` in der Oberfläche einstellbar. Eine Automation meldet Eintritt und Entwarnung jeder Warnung; der Objekt-Einbruch wird nur bewertet, solange die Region gleich bleibt (`input_text.openfiremap_current_region`/`_previous_region`).

### Einbindung
1. Packages in `/config/configuration.yaml` aktivieren:
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
2. `openfiremap.yaml` nach `/config/packages/` kopieren und die Platzhalter direkt ersetzen (Home Assistant erlaubt kein `!secret` in Dienstnamen oder innerhalb von Zeichenketten):
   - `<PIPELINE_PUBLIC_URL>`: z. B. `https://pipeline.openfiremap.org`
   - `<PIPELINE_LAN_URL>`: `http://<PIPELINE_LAN_IP>:8080`
   - `<PIPELINE_SSH_TARGET>`: `<benutzer>@<PIPELINE_LAN_IP>`
   - `<NOTIFY_SERVICE>`: z. B. `notify.mobile_app_<geraet>`
3. SSH-Zugang für die Speicherwerte einrichten:
   - Skript `pipeline/monitoring/openfiremap-stats` auf der VM nach `/usr/local/bin/openfiremap-stats` kopieren (ausführbar). Es gibt `system_stats.json` plus aktuelle `df`-Werte von `/srv/docker/data` als JSON aus.
   - In Home Assistant einen eigenen Schlüssel erzeugen (`/config/.ssh/openfiremap_stats`) und den Host-Schlüssel der VM in `/config/.ssh/known_hosts` eintragen.
   - Auf der VM in `~/.ssh/authorized_keys` des Benutzers den öffentlichen Schlüssel eingeschränkt freigeben:
     ```text
     from="<HA_LAN_IP>",command="/usr/local/bin/openfiremap-stats",no-agent-forwarding,no-port-forwarding,no-pty,no-user-rc,no-X11-forwarding ssh-ed25519 <SCHLÜSSEL> openfiremap-stats-ha
     ```
     Der Schlüssel kann so nur dieses Skript ausführen und nur von Home Assistant aus.
4. Entitäts-IDs prüfen:
   ```bash
   python3 pipeline/tools/check_ha_entities.py pipeline/monitoring/homeassistant/openfiremap.yaml
   ```
   Automationen und Dashboards nutzen feste IDs wie `sensor.openfiremap_hydrants`. REST- und `command_line`-Sensoren bilden ihre ID aus `name`, deshalb sind diese Namen englisch; die deutschen Anzeigenamen setzt `homeassistant: customize` am Ende der Datei. Template-Entitäten legen ihre ID mit `default_entity_id` fest. Das Skript berücksichtigt beides sowie die Home-Assistant-Slugifizierung (Umlaute, `ß`) und meldet fehlende oder doppelte IDs.
5. Konfiguration in Home Assistant prüfen und neu laden; neue `rest:`- oder `command_line:`-Sensoren erfordern einen Neustart.

Die Sensoren aus `sync_status.json` sind bis zum ersten Lauf von `update.sh` `unavailable`, weil die Datei erst dabei entsteht.

### Ausfall- und Alarmverhalten

- Ein fehlgeschlagener öffentlicher REST-Abruf macht die Sensoren `unavailable`; `OpenFireMap Warnung Öffentlicher Endpunkt` meldet nach 60 Minuten. Ein Status ungleich `ok` meldet nach 30 Minuten.
- `OpenFireMap Sync Alter Stunden` ist der Heartbeat (Zeit seit `checked_at`). Über 30 Stunden meldet `openfiremap_heartbeat_missing` – unabhängig vom Alter der OSM-Daten.
- `OpenFireMap Sync Ergebnis` spiegelt den letzten Lauf (`built`, `upload_only`, `skipped_no_changes`, `skipped_stale_source`, `failed`). `upload_ok: false` meldet nach 15 Minuten, eine Sync-Diskrepanz nach 2 Stunden.
- Lokaler Endpunkt oder SSH-Speicherabfrage nicht erreichbar: Meldung nach 60 Minuten; freier Speicher unter der Schwelle: nach 30 Minuten.
- Ein REST-Ausfall wird nicht als Bestandseinbruch auf null gewertet.

## Rolle des Cloudflare-Tunnels vs. Cloudflare R2

- **Primäre Produktions-Auslieferung:** Läuft direkt über Cloudflare R2 unter `<PIPELINE_PUBLIC_URL>`. Der Browser bezieht Kacheln via HTTP Range Requests direkt aus dem R2 Object Storage.
- **Rolle des Nginx-Servers auf VM 102:** Dient als lokaler Build- und Backup-Server im Heimnetzwerk (Port 8080) für lokale Tests, Entwicklungszwecke und internes Monitoring (z. B. Home Assistant).
- **Status des Cloudflare-Tunnels (`openfiremap-tunnel`):** Der Tunnel leitete vor der R2-Migration Anfragen an Nginx weiter. Seit dem 29.09.2026 zeigt der DNS-Eintrag direkt auf R2; der Tunnel wurde abgeschaltet und am 30.09.2026 aus `docker-compose.yml` entfernt.
- **Absicherung des Endpunkts `/internal/`:** Als Defense-in-Depth für künftige Reverse-Proxy- oder Tunnel-Konfigurationen sperrt Nginx Anfragen an `/internal/` sofort per HTTP 403, sobald der Cloudflare-Header `CF-Connecting-IP` erkannt wird, und erlaubt ausschließlich Zugriffe aus RFC1918-Netzwerken und von Localhost.

## Qualitätssicherung

Builder-Tests, Abdeckungsprüfungen und der Playwright-Performance-Test prüfen die wesentlichen Pfade. Änderungen an der Pipeline sollten zusätzlich mit `npm run build`, den Vitest-Tests und den E2E-Tests der Hauptanwendung validiert werden.

Betriebsnamen, private IP-Adressen, Benutzer, lokale Pfade, Snapshot-Namen und Geheimnisse gehören nicht in öffentliche Dokumente. Siehe [OPERATIONS_INTERNAL.md](OPERATIONS_INTERNAL.md) für die private Checklistenstruktur.
