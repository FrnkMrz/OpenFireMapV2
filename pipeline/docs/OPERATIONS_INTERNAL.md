# Interne Betriebscheckliste – nicht öffentlich bewerben

Diese Datei trennt betriebliche Notizen von der öffentlichen Projektbeschreibung. Sie enthält absichtlich keine echten Geheimnisse. Konkrete Werte gehören in einen Passwortmanager oder in eine geschützte, nicht versionierte Betriebsdokumentation.

## Umgebung

- lokale Test- und Backup-VM: `VM 102`
- Hostname: `<PIPELINE_HOSTNAME>`
- interne Adresse: `<PIPELINE_SERVER_IP>`
- Projektpfad: `<PIPELINE_PROJECT_PATH>`
- Betriebsbenutzer: `<PIPELINE_OPERATOR>`
- Snapshot-/Restore-Referenz: `<RESTORE_REFERENCE>`
- Zeitzone: Die VM läuft auf **UTC** (`Etc/UTC`). Alle Zeitangaben in `update.log`, Statusdateien und in der Crontab sind UTC.

## Öffentliche Auslieferung

- R2-Endpunkt: `https://pipeline.openfiremap.org`
- Bucket: `<R2_BUCKET>`
- Upload-Werkzeug: `<SYNC_TOOL>`
- letzter geprüfter Build: `<BUILD_TIMESTAMP>`

## Geheimnisse

Tunnel-Token, R2-Schlüssel, API-Schlüssel und Passwörter werden ausschließlich außerhalb des Git-Repositories verwaltet. In `.env`-Dateien dürfen nur lokale Laufzeitwerte stehen; `.env` wird nicht committed.

## Betriebsprüfung

1. Builder erfolgreich ausführen.
2. Objektzahlen und Build-Zeit in `metadata.json` prüfen.
3. PMTiles-Datei und Metadaten vollständig übertragen.
4. Metadaten erst nach den Artefakten veröffentlichen.
5. `Content-Range`, CORS und die Version über den öffentlichen Endpunkt prüfen.
6. Fallback auf Overpass in einem Testbereich außerhalb DACHLiLu prüfen.
7. Logs auf Tokens, Passwörter und private Adressen prüfen, bevor sie geteilt werden.

## Runbook: Rollout eines neuen Datenmodells

VM 102 läuft auf UTC. Zeiten im Log und in der Crontab sind UTC.

Dieses Verfahren beschreibt die schrittweise Umstellung des Pipeline-Datenmodells (z. B. Zoomstufen-Anpassungen wie z12–14).

### 1. Reihenfolge: Frontend zuerst
- Vor dem Ausrollen eines neuen Pipeline-Datenmodells muss das Frontend bereits imstande sein, sowohl das alte als auch das neue Datenmodell zu verarbeiten (z. B. dynamische Kachel-Zoomstufenberechnung aus dem PMTiles-Header via `queryZoom = Math.min(tileZoom, header.maxZoom)`).
- Dadurch bleibt die Anwendung während des gesamten Build- und Upload-Vorgangs für alle Nutzerinnen und Nutzer unterbrechungsfrei funktionsfähig.

### 2. Vorab-Sicherung in R2 (serverseitig ohne Re-Upload)
Vor Änderungen an den Produktionsdaten auf R2 werden die bestehenden Dateien in ein Zeitstempel-Backup kopiert:
```bash
# Zeitstempel festlegen (z. B. TS=$(date -u +%Y%m%dT%H%M%SZ))
rclone copyto <R2_REMOTE>:<R2_BUCKET>/openfiremap.pmtiles <R2_REMOTE>:<R2_BUCKET>/backup/<TS>/openfiremap.pmtiles
rclone copyto <R2_REMOTE>:<R2_BUCKET>/metadata.json <R2_REMOTE>:<R2_BUCKET>/backup/<TS>/metadata.json
# Prüfen:
rclone lsl <R2_REMOTE>:<R2_BUCKET>/backup/<TS>/
```

### 3. Builder auf der VM aktualisieren
- Vorab-Sicherung der Builder-Datei:
  ```bash
  cp -p <PROJECT_DIR>/builder/build_features.py <PROJECT_DIR>/builder/build_features.py.bak-<TS>
  ```
- Neue Builder-Definition (`build_features.py`) einspielen und Konfiguration prüfen (`diff`, Zoomstufen, Layer).

### 4. Build und Upload durchführen
- `update.sh` ausführen (oder über nächtlichen Cronjob abwarten).
- `update.sh` stellt sicher:
  1. Daten-Upload (`openfiremap.pmtiles` und GeoJSON-Dateien) erfolgt zuerst.
  2. `metadata.json` wird strikt **als letztes** nach erfolgreichem Daten-Upload hochgeladen.
  3. Dreifache Verifikation gegen den öffentlichen R2-Endpunkt (`generated_at` und Byte-Größe via HTTP `Range: bytes=0-0`).

### 5. Prüfpunkte nach Rollout (Checkliste)
- [ ] Öffentlicher Endpunkt antwortet mit HTTP 200/206:
  `curl -s -D - -o /dev/null -H "Range: bytes=0-0" "https://pipeline.openfiremap.org/openfiremap.pmtiles?cb=$(date +%s)"`
- [ ] `metadata.json` enthält die neuen Werte (`status: "ok"`, `pmtiles.size_bytes`, `pmtiles.maxzoom`).
- [ ] Live-Anwendung aufrufen: Kacheln laden in Zoomstufen 14–16, `cf-cache-status: HIT` im Netzwerk-Tab, keine Ladefehler.

### 6. Rollback-Verfahren (bei Fehlern)
Tritt während oder nach dem Rollout ein Fehler auf, wird der vorherige Stand aus dem R2-Backup wiederhergestellt:
```bash
# 1. Zuerst PMTiles wiederherstellen:
rclone copyto --header-upload "Cache-Control: public, max-age=86400" <R2_REMOTE>:<R2_BUCKET>/backup/<TS>/openfiremap.pmtiles <R2_REMOTE>:<R2_BUCKET>/openfiremap.pmtiles

# 2. Zuletzt Metadaten wiederherstellen (aktiviert die alte Version im Client):
rclone copyto --header-upload "Cache-Control: no-cache, no-store, must-revalidate, max-age=0" <R2_REMOTE>:<R2_BUCKET>/backup/<TS>/metadata.json <R2_REMOTE>:<R2_BUCKET>/metadata.json

# 3. Cache-Control Header nach Rollback verifizieren:
# Hinweis: rclone copyto (serverseitiger Kopiervorgang innerhalb von R2) aktualisiert Header via --header-upload
# womöglich nicht zuverlässig. Nach dem Rollback die Header immer mit curl -I prüfen:
curl -s -I "https://pipeline.openfiremap.org/metadata.json" | grep -i cache-control
curl -s -I -H "Range: bytes=0-0" "https://pipeline.openfiremap.org/openfiremap.pmtiles" | grep -i cache-control
```

---

## Tägliche Prüfung & Monitoring

### Wo liegen Logs und Statusdateien?
- **Build- & Sync-Log:** `<DATA_DIR>/update.log` (z. B. `tail -50 <DATA_DIR>/update.log`)
- **Öffentliche Metadaten:** `<DATA_DIR>/publish/metadata.json`
- **Interner Sync-Status:** `<DATA_DIR>/raw/sync_status.json` (im LAN abrufbar unter `http://<PIPELINE_LAN_IP>:8080/internal/sync_status.json`)
- **Systemstatistiken:** `<DATA_DIR>/raw/system_stats.json` (im LAN abrufbar unter `http://<PIPELINE_LAN_IP>:8080/internal/system_stats.json`)

### Bedeutung der Synchronisations-Felder (`sync_status.json`)
- `result` – Status des letzten Laufs:
  - `built` – Neuer Build gebaut und erfolgreich nach R2 hochgeladen.
  - `upload_only` – Datenbestand unverändert, aber lokaler Stand wurde nach R2 synchronisiert.
  - `skipped_no_changes` – Keine Änderungen an Extrakten oder Code; Build und Upload übersprungen (Kacheln bleiben im CDN-Cache gecacht).
  - `failed` – Fehler während des Laufs aufgetreten.
- `last_build_generated_at` – Zeitstempel des letzten echten Daten-Builds (bleibt bei `skipped_no_changes` stabil).
- `upload_ok: true` – Der Upload von Daten und Metadaten nach R2 wurde ohne Übertragungsfehler abgeschlossen.
- `in_sync: true` – Die öffentliche Version auf R2 (`generated_at` und Byte-Größe) stimmt exakt mit dem lokalen Build auf der VM überein.
- `in_sync: false` – Diskrepanz erkannt (z. B. lokaler Build abgeschlossen, aber Upload unvollständig oder Edge liefert noch alte Metadaten).
- `last_error` – Enthält die Fehlermeldung der letzten Prüfung oder `null` im fehlerfreien Zustand.

### Verhalten bei Fehler-Exit (`exit 2`)
- Wenn `update.sh` mit Exit-Code 2 abbricht, ist die Upload-Verifikation nach R2 fehlgeschlagen.
- **Sofortmaßnahme:**
  1. `<DATA_DIR>/update.log` auf Fehlermeldungen von `rclone` oder `curl` untersuchen.
  2. R2-Bucket-Erreichbarkeit und Netzwerkverbindung der VM prüfen.
  3. `sync_status.json` prüfen.
  4. Nach Behebung des Netzwerk- oder R2-Problems `update.sh` manuell neu starten.

---

## Umgang mit Browser- und Edge-Cache

- **Automatisches Cache-Busting (`?v=<generated_at>`)**:
  Das Frontend ruft `metadata.json` regelmäßig ab und hängt die Build-Version als URL-Parameter (`?v=...`) an die Kachelabrufe an.
- **Aktualisierungsintervall**:
  `metadata.json` wird vom Client maximal alle 10 Minuten neu geladen. Nach einem nächtlichen Update oder Rollout aktualisieren sich geöffnete Browser-Tabs innerhalb von höchstens 10 Minuten vollautomatisch auf den neuen Versionsstand.
- **Manueller Cache-Purge**:
  Da Kacheln durch den Versionsparameter versioniert sind, ist ein manueller Purge im Cloudflare-Dashboard bei regulären Updates **nicht erforderlich**. Ein Purge empfiehlt sich ausschließlich, wenn Dateien unter identischem Namen und unverändertem `generated_at`-Zeitstempel überschrieben wurden.

---

## Cloudflare-Tunnel (abgebaut)

Seit dem 29.09.2026 zeigt der DNS-Eintrag von `pipeline.openfiremap.org` direkt auf Cloudflare R2. Der Tunnel überträgt keinen produktiven Datenverkehr mehr und der Service `tunnel` wurde am 30.09.2026 aus `docker-compose.yml` entfernt. Am 30.09.2026 wurden auf VM 102 der Container entfernt, das Image gelöscht und das Token aus `.env` bereinigt.

### Bereinigung auf der VM
Um verbliebene Container und das Docker-Image auf VM 102 aufzuräumen (am 30.09.2026 durchgeführt):
1. **Verwaiste Container entfernen:**
   ```bash
   cd <PROJECT_DIR>
   docker compose up -d --remove-orphans
   ```
2. **Docker-Image entfernen:**
   ```bash
   docker image rm cloudflare/cloudflared:latest
   ```
3. **`TUNNEL_TOKEN` entfernen:**
   - Aus der Datei `<PROJECT_DIR>/.env` den Eintrag `TUNNEL_TOKEN=...` entfernen.
4. **Absicherung von `/internal/` bleibt bestehen:**
   - Der Nginx-Schutz in `pipeline/nginx/default.conf` (`deny all` bei Vorhandensein des `CF-Connecting-IP`-Headers und strikte Beschränkung auf RFC1918/Localhost) verbleibt dauerhaft als Defense-in-Depth in der Konfiguration, um versehentliche Freigaben bei künftigen Reverse-Proxy-Konfigurationen auszuschließen.

### Prüfschritte nach dem Abbau
- [x] Öffentliche Pipeline testen: `curl -I https://pipeline.openfiremap.org/metadata.json` liefert unverändert HTTP 200 via Cloudflare R2 (geprüft am 30.09.2026).
- [x] Internes Monitoring testen: `curl -I http://<PIPELINE_LAN_IP>:8080/internal/system_stats.json` liefert weiterhin HTTP 200 aus dem Heimnetz (geprüft am 30.09.2026).
- [x] Docker-Status auf der VM prüfen: `docker compose ps` zeigt `web` als *running* und *healthy* (kein `tunnel`-Container mehr vorhanden, geprüft am 30.09.2026).
- [x] Defense-in-Depth testen: `curl -sI -H "CF-Connecting-IP: 1.2.3.4" http://<PIPELINE_LAN_IP>:8080/internal/sync_status.json` liefert HTTP 403 Forbidden (geprüft am 30.09.2026).

### Rückweg (Rollback im Bedarfsfall)
Sollte der Tunnel als Notfall-Kanal reaktiviert werden müssen:
1. Den entfernten Service `tunnel` wieder in `<PROJECT_DIR>/docker-compose.yml` unter `services:` einfügen:
   ```yaml
     tunnel:
       image: cloudflare/cloudflared:latest
       container_name: openfiremap-tunnel
       restart: unless-stopped
       command: tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}
       depends_on:
         - web
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```
2. `TUNNEL_TOKEN` in `<PROJECT_DIR>/.env` wieder eintragen.
3. `docker compose up -d tunnel` starten.
4. Im Cloudflare Zero Trust Dashboard den Public Hostname wieder auf `http://<PIPELINE_LAN_IP>:8080` verlinken.

---

## Störung: Geofabrik-Download (Weiterleitungsschleife / Timeout)

### Symptome
- Fehler im Log `<DATA_DIR>/update.log`: `curl: (47) Maximum (50) redirects followed` oder `Operation timed out after 15000 milliseconds with 0 out of 0 bytes received`.
- Builder bricht ab mit `FEHLER: Daten-Build (builder) fehlgeschlagen!`.
- In `sync_status.json`: `upload_ok: false`, `in_sync: false`, `last_error` enthält Fehlermeldung zum Builder.
- Home Assistant meldet Sync-Diskrepanz oder veraltete Extrakte.

### Ursachen
1. **Veröffentlichungsfenster von Geofabrik (ca. 01:00–04:15 UTC):**
   Geofabrik generiert die nationalen Extrakte nachts neu (Deutschland wird meist zwischen 01:30 und 02:30 UTC fertiggestellt, die Schweiz erst gegen 04:00–04:15 UTC; Belege vom 30.09. via `Last-Modified`: Liechtenstein 01:02 UTC, Österreich 02:24 UTC, Deutschland 02:26 UTC, Luxemburg 02:28 UTC, Schweiz 04:03 UTC). Während eine Datei auf dem Geofabrik-Server noch geschrieben oder indiziert wird, kann die HTTP-Weiterleitung von `-latest.osm.pbf` auf die datierte Datei in eine zirkuläre 302-Schleife geraten oder der Server antwortet verzögert (HEAD-Timeout).
2. **Server-Last / Squid-Proxy-Fluktuation bei Geofabrik:**
   Kurzzeitige Aussetzer, 502/503-Meldungen oder Verbindungsabbrüche beim Herunterladen von Multi-Gigabyte-Dateien.

### Diagnose-Befehle
```bash
# 1. Geofabrik HTTP-Status und Weiterleitung manuell prüfen:
curl -sI "https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf"
curl -sI "https://download.geofabrik.de/europe/germany-latest.osm.pbf"

# 2. Prüfen, ob eine Weiterleitungsschleife vorliegt:
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf"

# 3. Log-Auszug des letzten Laufs analysieren:
tail -n 50 <DATA_DIR>/update.log | grep -E -i "FEHLER|curl|redirect|timeout"

# 4. Status der lokalen Extrakte und deren Alter prüfen:
ls -lh <DATA_DIR>/raw/*-latest.osm.pbf
```

### Sofortmaßnahmen
1. **Prüfen, ob Geofabrik wieder erreichbar ist:**
   Wenn der manuelle HEAD-Request wieder einen regulären 302-Redirect auf eine existierende datierte Datei (mit HTTP 200) liefert, kann ein Update manuell angestoßen werden:
   ```bash
   nohup <PROJECT_DIR>/update.sh > /dev/null 2>&1 &
   ```
2. **Resilienz & lokaler Fallback (ab v0.8.1):**
   Der Builder bricht bei einzelnen Download-Fehlern nicht mehr ab, sofern eine lokale Kopie vorliegt, die nicht älter als 72 Stunden ist (`MAX_FALLBACK_AGE_HOURS=72`). Der Build läuft mit der vorhandenen Datei weiter, protokolliert eine Warnung und aktualisiert die Metadaten transparent (`status: "fallback_after_error"`).
3. **Download manuell erzwingen (Cache ignorieren):**
   ```bash
   FORCE_DOWNLOAD=true <PROJECT_DIR>/update.sh
   ```

---

## Runbook: Build-Steuerung & Skip-Logik

### 1. Wie erzwinge ich einen vollständigen Neubau?
Falls trotz unveränderter Geofabrik-Extrakte ein Neubau der PMTiles erzwungen werden soll (z. B. nach manuellen Anpassungen):
```bash
cd <PROJECT_DIR>
FORCE_BUILD=true ./update.sh
```
Sollen gleichzeitig auch alle OSM-Extrakte neu von Geofabrik heruntergeladen werden:
```bash
FORCE_DOWNLOAD=true FORCE_BUILD=true ./update.sh
```

### 2. Was bedeutet das Ergebnis `upload_only`?
- **Ursache:** Die Quelldaten und der Builder haben sich seit dem letzten Lauf nicht geändert, aber der lokale Build in `<DATA_DIR>/publish/` stimmt nicht mit dem öffentlichen Cloudflare-R2-Stand überein (z. B. weil beim vorherigen Lauf der R2-Upload abbrach oder `published_fingerprint.json` fehlte).
- **Aktion von `update.sh`:** Der Builder wird übersprungen (keine 25–30 min CPU-Zeit). Stattdessen werden direkt PMTiles, GeoJSON und `metadata.json` nach R2 übertragen, die Konsistenz verifiziert und `published_fingerprint.json` geschrieben.

### 3. Warum steht `generated_at` still, und wann ist das ein Problem?
- **Normalzustand:** Wenn Geofabrik am Vorabend keine neuen Extrakte bereitgestellt hat oder der Cronjob ein zweites Mal am selben Tag läuft, erkennt der Builder `skipped_no_changes`. Es wird weder neu gebaut noch neu hochgeladen. `metadata.json` behält den bisherigen `generated_at`-Zeitstempel. Dies ist **ausdrücklich gewollt**, da Kacheln im Cloudflare Edge-Cache dadurch mit `HIT` gecacht bleiben und Web-Clients keine Kacheln neu laden müssen.
- **Wann ist es ein Problem?**
  - Wenn `sensor.openfiremap_sync_alter_stunden` > 30 h steigt: Der Cronjob auf VM 102 läuft nicht mehr (Alarmierung via Home Assistant Automation 3.2).
  - Wenn `sensor.openfiremap_extrakt_alter_stunden` > 48 h steigt: Die Extrakte veralten, weil Geofabrik-Downloads dauerhaft scheitern (Alarmierung via Home Assistant Automation 3.8).

---

## Post-Mortem: Vorfälle vom 30.09.2026

### Vorfall 1: Ausfall des Nachtlaufs durch Geofabrik-Veröffentlichungsfenster (03:30 UTC)
- **Datum & Uhrzeit:** 30.09.2026, 03:30 UTC (05:30 MESZ)
- **Schweregrad:** Niedrig (kein Ausfall des Live-Betriebs; bestehender Datenstand auf R2 blieb aktiv)
- **Betroffene Komponenten:** Nächtlicher Cronjob auf VM 102 (`update.sh`), Builder (`build_features.py`)

#### Was ist passiert?
Beim planmäßigen Nachtlauf um 03:30 UTC (05:30 MESZ) liefen die HEAD-Prüfungen für DE, AT, CH und LU bei Geofabrik in einen 15s-Timeout, woraufhin der Builder planmäßig die lokalen Vorlagen behielt. Beim anschließenden Versuch, `liechtenstein-latest.osm.pbf` herunterzuladen, geriet curl in eine Weiterleitungsschleife (`curl: (47) Maximum (50) redirects followed`).
Der Builder warf eine `RuntimeError`-Exception und brach den gesamten Build ab. Folglich fand kein Daten- und Metadaten-Upload statt. `sync_status.json` meldete korrekterweise `upload_ok: false`.

#### Warum ist es passiert?
Der Cronjob-Start um 03:30 UTC lag mitten im täglichen Veröffentlichungsfenster von Geofabrik (ca. 01:00–04:15 UTC). Zu diesem Zeitpunkt erzeugte Geofabrik gerade die neuen Tages-Extrakte (Belege vom 30.09. via `Last-Modified`: Liechtenstein 01:02 UTC, Österreich 02:24 UTC, Deutschland 02:26 UTC, Luxemburg 02:28 UTC, Schweiz 04:03 UTC). Um 03:30 UTC war die Schweiz noch nicht fertiggestellt, und die Weiterleitung von `liechtenstein-latest.osm.pbf` führte temporär im Kreis (HTTP 302 Loop). Um 05:17 UTC antwortete Geofabrik wieder regulär (1 Weiterleitung, HTTP 200). Da der Builder zuvor keinen Fallback auf die lokal vorhandene Datei des Vortags hatte, führte ein einziger fehlgeschlagener Extrakt-Download zum Abbruch des gesamten Prozesses.

### Vorfall 2: Paralleler Lauf nach manuellem Neustart (06:00 UTC)
- **Datum & Uhrzeit:** 30.09.2026, 06:00 UTC (08:00 MESZ)
- **Schweregrad:** Niedrig (keine Datenbeschädigung)
- **Betroffene Komponenten:** `update.sh`, Builder-Dateisystem (`/dev/shm/openfiremap_tmp`)

#### Was ist passiert?
- **05:23 UTC:** Manueller Neustart von `update.sh` (Download aller 5 Extrakte, ~20 min, Build bis 06:11:40 UTC, Upload 06:12 UTC).
- **06:00 UTC:** Der neu eingestellte Cronjob startete **parallel** (noch ohne `flock`), Build bis 06:26:28 UTC, Upload 06:26 UTC.
- Beide Läufe nutzten dasselbe Temp-Verzeichnis `/dev/shm/openfiremap_tmp`. Lauf 1 hat es bei seinem planmäßigen Abschluss (06:11:40 UTC) gelöscht, während Lauf 2 noch vorfilterte.
- **Auswirkung:** Keine. Beide Builds lieferten identische Zahlen (1.019.274 Hydranten) und identische PMTiles-Größe (201.909.999 Bytes). Live-Kacheln wurden stichprobenartig geprüft. Das Ergebnis ohne Datenbeschädigung war jedoch reines Glück.

### Getroffene Maßnahmen
1. **Cronjob verschoben:** Startzeit von `03:30 UTC` auf `05:43 UTC (VM läuft auf UTC) = 07:43 MESZ / 06:43 MEZ` verlegt (`43 5 * * *`). Dies liegt mit ca. 1,5 Stunden Sicherheitsabstand weit nach Abschluss der Geofabrik-Tagesläufe (ca. 04:15 UTC) und vermeidet Lastspitzen zur vollen Stunde auf den Download-Servern.
2. **Prozess-Verriegelung:** Absicherung von `update.sh` mit `flock` (`<DATA_DIR>/update.lock`), um Überschneidungen zwischen manuellem Lauf und Cronjob mit `exit 3` zu verhindern.
3. **Betriebshinweis:** Keine manuellen Läufe zwischen 05:15 und 06:45 UTC starten (bzw. `flock` blockiert parallele Läufe automatisch).
4. **Download-Fallback auf lokale PBFs:** Schlägt ein Download fehl, greift der Builder auf die lokale PBF-Datei zurück (sofern maximal 72 h alt), setzt den Build fort und markiert den Zustand transparent in den Metadaten (`fallback_after_error`).
5. **curl-Härtung:** Ergänzung von `--max-redirs 5` (verhindert Endlosschleifen), `-sS` (kein Log-Spamming, Fehlerausgabe bleibt erhalten), `--retry 5`, `--retry-delay 3` und `--retry-all-errors` (wiederholt auch bei Proxy- und Verbindungsaussetzern).
6. **HEAD-Prüfung ohne GET-Umschaltung:** Manuelles Verfolgen von HTTP-Redirects strikt mit `HEAD` (max. 5 Sprünge), um ungeplante Gigabyte-Downloads beim Header-Check zu verhindern.
7. **PBF-Integritätsprüfung:** Validierung der Mindestgröße (> 100 KB) und Struktur (`osmium fileinfo`) vor dem atomaren Verschieben via `os.replace`.
8. **Bereinigung alter Warnungen:** `update.sh` entfernt veraltete `build_warnings.json` direkt nach erfolgreichem `flock` vor dem Build.
9. **Monitoring:** Neuer Home Assistant Sensor `sensor.openfiremap_extrakt_alter_stunden` mit Automation bei Alter > 48 h sowie Übernahme von `build_warnings` in `sync_status.json`.

---

Diese Datei ist eine interne Vorlage und kein Ersatz für ein sicheres Secret- oder Infrastrukturmanagement.

