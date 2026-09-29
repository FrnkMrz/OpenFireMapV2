# Interne Betriebscheckliste – nicht öffentlich bewerben

Diese Datei trennt betriebliche Notizen von der öffentlichen Projektbeschreibung. Sie enthält absichtlich keine echten Geheimnisse. Konkrete Werte gehören in einen Passwortmanager oder in eine geschützte, nicht versionierte Betriebsdokumentation.

## Umgebung

- lokale Test- und Backup-VM: `VM 102`
- Hostname: `<PIPELINE_HOSTNAME>`
- interne Adresse: `<PIPELINE_SERVER_IP>`
- Projektpfad: `<PIPELINE_PROJECT_PATH>`
- Betriebsbenutzer: `<PIPELINE_OPERATOR>`
- Snapshot-/Restore-Referenz: `<RESTORE_REFERENCE>`

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

# 3. Cloudflare Cache Purge ausführen (optional via update.sh purge_cf_cache)
```

---

## Tägliche Prüfung & Monitoring

### Wo liegen Logs und Statusdateien?
- **Build- & Sync-Log:** `<DATA_DIR>/update.log` (z. B. `tail -50 <DATA_DIR>/update.log`)
- **Öffentliche Metadaten:** `<DATA_DIR>/publish/metadata.json`
- **Interner Sync-Status:** `<DATA_DIR>/raw/sync_status.json` (im LAN abrufbar unter `http://<PIPELINE_LAN_IP>:8080/internal/sync_status.json`)
- **Systemstatistiken:** `<DATA_DIR>/raw/system_stats.json` (im LAN abrufbar unter `http://<PIPELINE_LAN_IP>:8080/internal/system_stats.json`)

### Bedeutung der Synchronisations-Felder (`sync_status.json`)
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

## Vorbereitung: Cloudflare-Tunnel-Abbau

Seit dem 29.09.2026 zeigt der DNS-Eintrag von `pipeline.openfiremap.org` direkt auf Cloudflare R2. Der auf VM 102 laufende Tunnel-Container (`openfiremap-tunnel`) überträgt keinen produktiven Datenverkehr mehr. Folgender Ablauf beschreibt den sauberen, rückbaubaren Abbau:

### Schritt-für-Schritt-Anleitung
1. **Public Hostname im Cloudflare Zero Trust Dashboard entfernen:**
   - Navigieren zu *Networks* → *Tunnels* → Tunnel auswählen → *Public Hostnames*.
   - Prüfen, dass der Hostname `pipeline.openfiremap.org` nicht mehr aktiv auf `http://web:80` routet (DNS verweist bereits direkt auf den R2-Bucket bzw. Custom Domain).
   - Eintrag für den öffentlichen Hostnamen im Tunnel-Menü entfernen.
2. **Tunnel deaktivieren oder löschen:**
   - Im Zero Trust Dashboard den Tunnel auf *Inactive* stellen oder den Tunnel löschen (sofern keine anderen Dienste darüber laufen).
3. **Tunnel-Container auf VM 102 stoppen:**
   - Auf der VM den Container stoppen:
     ```bash
     cd <PROJECT_DIR>
     docker compose stop tunnel
     ```
   - *Vorschlag für die Zukunft:* Den Dienst `tunnel` erst aus `docker-compose.yml` entfernen, wenn der Betrieb über R2 für mindestens 14 Tage stabil gelaufen ist.
4. **`TUNNEL_TOKEN` entfernen:**
   - Aus der Datei `<PROJECT_DIR>/.env` den Eintrag `TUNNEL_TOKEN=...` entfernen.
5. **Absicherung von `/internal/` bleibt bestehen:**
   - Der Nginx-Schutz in `pipeline/nginx/default.conf` (`deny all` bei Vorhandensein des `CF-Connecting-IP`-Headers und strikte Beschränkung auf RFC1918/Localhost) verbleibt dauerhaft als Defense-in-Depth in der Konfiguration, um versehentliche Freigaben bei künftigen Reverse-Proxy-Konfigurationen auszuschließen.

### Prüfschritte nach dem Stoppen
- [ ] Öffentliche Pipeline testen: `curl -I https://pipeline.openfiremap.org/metadata.json` liefert unverändert HTTP 200 via Cloudflare R2.
- [ ] Internes Monitoring testen: `curl -I http://<PIPELINE_LAN_IP>:8080/internal/system_stats.json` liefert weiterhin HTTP 200 aus dem Heimnetz.
- [ ] Docker-Status auf der VM prüfen: `docker compose ps` zeigt `web` als *running* und `tunnel` als *stopped* (oder `exited 0`).

### Rückweg (Rollback im Bedarfsfall)
Sollte der Tunnel als Notfall-Kanal reaktiviert werden müssen:
1. `TUNNEL_TOKEN` in `<PROJECT_DIR>/.env` wieder eintragen.
2. `docker compose up -d tunnel` starten.
3. Im Cloudflare Zero Trust Dashboard den Public Hostname (z. B. als Backup-Subdomain `backup-pipeline.openfiremap.org`) wieder auf `http://web:80` verlinken.

---

Diese Datei ist eine interne Vorlage und kein Ersatz für ein sicheres Secret- oder Infrastrukturmanagement.
