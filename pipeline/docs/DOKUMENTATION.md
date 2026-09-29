# System- und Betriebsdokumentation: OpenFireMap DACH Data Pipeline

Stand: 29. September 2026

Diese Dokumentation beschreibt die technische Architektur, den Betrieb und die Wiederherstellung der **OpenFireMap DACH Data Pipeline** auf dem Proxmox-Heimserver (KW3).

---

## 1. Infrastruktur & Zielsystem

### 1.1 Proxmox Host (KW3 / Schnaittach)
* **Plattform:** HP EliteDesk/ProDesk 800 G4 Mini
* **CPU:** Intel Core i5-8500T (6 Threads)
* **Arbeitsspeicher:** 16 GiB RAM
* **Speicher:** 512 GB NVMe (LVM-Thin `local-lvm`)
* **Proxmox:** PVE 9.2 (No-Subscription Repos)
* **Netzwerk:** `192.168.178.8` an `vmbr0` (Heimnetz `192.168.178.0/24`)

### 1.2 Virtuelle Maschine 102 (`docker-lab-KW3`)
* **Zweck:** Dedizierte, isolierte Docker-Laufzeitumgebung
* **Betriebssystem:** Debian 13 (Trixie), Cloud-Image
* **Ressourcen:** 2 vCPU (`host`), 4 GiB RAM (kein Ballooning), 128 GiB NVMe
* **Netzwerk:** Feste IP `192.168.178.152` (FRITZ!Box DHCP-Reservierung)
* **Benutzer:** `frank` (in `docker`-Gruppe)
* **Pfade:**
  * Projektbasis: `/srv/docker/projects/openfiremap-pipeline`
  * Persistente Daten: `/srv/docker/data/openfiremap`
* **Snapshot-Basis:** `docker-basis-20260921` (Rücksprungpunkt vor Projekt-Setup)

---

## 2. Architektur & Designentscheidungen

### Warum keine eigene Overpass-Instanz oder PostGIS?
* Eine vollständige Overpass-Datenbank (für Deutschland oder DACH) benötigt mindestens 32–64 GiB RAM und Hunderte Gigabyte NVMe-I/O. Auf einer 4-GiB-VM würde der OOM-Killer (Out of Memory) sofort greifen.
* PostGIS mit `osm2pgsql` wäre möglich, erfordert aber ständige Datenbankpflege, Migrationen, Indizes und einen API-Layer (z. B. Node.js oder Python-Backend).
* **Die gewählte Lösung (Static-First mit Osmium & Nginx):**
  * `osmium-tool` (C++) filtert Millionen OSM-Objekte direkt aus `.osm.pbf` in Sekunden (< 20 Sekunden für 90 MB Rohdaten).
  * Vorkomprimierte GeoJSON-Dateien werden direkt über Nginx ausgeliefert.
  * **Vorteil:** Extrem schlank (< 200 MB RAM-Bedarf zur Laufzeit), keine offenen Datenbank-Ports, keine Absturzgefahr durch Speicherlecks.

---

## 3. Komponenten der Pipeline

### 3.1 `openfiremap-builder` (Docker)
* **Basis:** Python 3.12-slim mit installiertem `osmium-tool`, `tippecanoe` (C++) und `curl`.
* **Aufgabe:**
  1. Download der aktuellen Geofabrik-PBFs (mit Resume-Funktion, Retries und intelligentem `HEAD`-Check).
  2. Filterung nach OSM-Tags (Hydranten, Wachen, Löschwasserstellen, Defibrillatoren sowie Verwaltungsgrenzen `boundaries`).
  3. Export als GeoJSON nach `/srv/docker/data/openfiremap/publish/`.
  4. **PMTiles Vektorkachel-Erzeugung (`tippecanoe`):**  
     Bündelt alle Layer (`fire_stations`, `hydrants`, `water_points`, `defibrillators`, `boundaries`) in eine einzige kompakte Datei `openfiremap.pmtiles` (**514,12 MB** für den gesamten DACHLiLu-Raum inkl. aller 123.618 Gemeindegrenzen und 1.019.158 Hydranten, Zoom 12–16) in ca. 370 Sekunden (6,1 Minuten).
  5. Berechnung von Differenzen zum Vortag (`diff`) und Schreiben von `metadata.json`.
  6. Schreiben der Systemmetriken nach `/data/raw/system_stats.json`; diese Datei liegt außerhalb des öffentlichen `publish/`-Verzeichnisses.

Der Standardmodus verarbeitet DACHLiLu (Deutschland, Österreich, Schweiz, Luxemburg
und Liechtenstein) nach dem Filter-then-Merge-Verfahren. Für einen einzelnen
Geofabrik-Auszug kann `OSM_EXTRACT_URL` gesetzt werden, beispielsweise für einen
schnellen Bayern-Test. Mit `FORCE_DOWNLOAD=true` lässt sich der intelligente
Download-Check bewusst umgehen. Für die temporäre Filterung wird bevorzugt
`/dev/shm` (RAM-Disk) verwendet; bei fehlendem Speicher erfolgt ein NVMe-Fallback.
Nach Abschluss des Builds synchronisiert `rclone` alle Ausgabedateien automatisch
in den Cloudflare R2 Bucket `openfiremap-pipeline`.

### 3.2 `openfiremap-web` (Docker / Nginx Alpine)
* **Port:** `8080` (vermeidet Kollisionen mit Standard-Port 80)
* **Features:**
  * Auslieferung von `.pmtiles` mit **HTTP 206 Partial Content (Range Requests)**
  * `gzip off;` dediziert für `.pmtiles`, damit HTTP Byte Serving auch in Safari/WebKit mit `Accept-Encoding: gzip` standardkonform funktioniert
  * `gzip on;` aktiv für GeoJSON und JSON (reduziert Transfergröße um ~80 %)
  * Vollständige CORS-Header inklusive `Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges, ETag`
  * `etag on;` für versionsgenaue Client-Validierung
  * `autoindex off;` zur Absicherung gegen ungewollte Verzeichnislisten
  * Healthcheck-Endpunkt `/healthz`
  * Logging: Maximal 3 Dateien à 10 MB

### 3.3 `openfiremap-tunnel` (Docker / Cloudflared)
* **Image:** `cloudflare/cloudflared:latest`
* **Container:** `openfiremap-tunnel` (Restart: `unless-stopped`)
* **Aufgabe:**
  * Baut 4 redundante, verschlüsselte Outbound-Tunnel-Verbindungen (QUIC/HTTP/2 via UDP/TCP Port 443) zur Cloudflare Edge (z. B. Frankfurt `fra08`, `fra10`, `fra16`, `fra18`) auf.
  * Leitet Anfragen an `https://pipeline.openfiremap.org` direkt an den internen Container `openfiremap-web:80` weiter.
  * Keine Portweiterleitung an der FRITZ!Box erforderlich (eingehende Ports bleiben vollständig geschlossen).
  * Löst das Mixed-Content-Problem auf der Live-Webseite `https://openfiremap.org` (HTTPS zu HTTPS).
* **Konfiguration & Token:**
  * Das Authentifizierungs-Token wird aus `/srv/docker/projects/openfiremap-pipeline/.env` bezogen (`TUNNEL_TOKEN=...`).
  * Datei-Rechte: `chmod 600 .env` (nur für Benutzer `frank` lesbar).
  * Wird durch `.gitignore` vor versehentlichem Git-Commit geschützt.
* **Edge-Zertifikat:**
  * Let's Encrypt Wildcard-Zertifikat (`*.openfiremap.org`) via Cloudflare Universal SSL (automatische Verlängerung alle 90 Tage).

### 3.4 Client-Kaskade & Fallback-Strategie (PMTiles → Overpass)
Im OpenFireMap Frontend (`src/js/pipeline.js` und `src/js/api.js`) gilt folgende Kaskade:
1. **PMTiles (Standard):** Lädt nur die Kacheln für den aktuellen Sichtbereich per HTTP-206-Range-Requests (~10–50 KB je Kachel).
2. **Overpass-Fallback:** Bei PMTiles-Fehlern (z. B. Netzwerkabbruch, 404, Tile-Fehler) wechselt die Anwendung sofort und transparent auf die Overpass-API (`pipeline_fallback_to_overpass`).
3. **GeoJSON-Fallback (optional):** Das Laden kompletter GeoJSON-Dateien (`hydrants.geojson` ~57 MB, `boundaries.geojson` ~35 MB) ist standardmäßig **deaktiviert** (`Config.pipeline.geojsonFallback: false`), um mobile Endgeräte und Mobilfunkverbindungen vor massiven Datenmengen und Speicherengpässen zu schützen.

---

## 4. Betrieb, Wartung & Automatisierung

### 4.1 Nächtliches Daten-Update (Cronjob)
Auf VM 102 läuft in der Crontab von `frank`:
```bash
30 3 * * * /srv/docker/projects/openfiremap-pipeline/update.sh
```
* **Zeitpunkt:** 03:30 Uhr nachts (Geofabrik erzeugt neue Auszüge meist zwischen 01:00 und 02:30 Uhr).
* **Log-Datei:** `/srv/docker/data/openfiremap/update.log`

### 4.2 Wichtige Steuerungsbefehle

#### Status & Überwachung:
* **Container-Status prüfen:** `docker ps`
* **Tunnel-Logs live einsehen:** `docker logs -f openfiremap-tunnel`
* **Nginx-Logs live einsehen:** `docker logs -f openfiremap-web`
* **Update-Log ansehen:** `tail -n 50 /srv/docker/data/openfiremap/update.log`

#### Neustart & Wartung:
* **Webserver neustarten:** `cd /srv/docker/projects/openfiremap-pipeline && docker compose restart web`
* **Tunnel neustarten:** `cd /srv/docker/projects/openfiremap-pipeline && docker compose restart tunnel`
* **Alle Dienste neu starten:** `cd /srv/docker/projects/openfiremap-pipeline && docker compose up -d`
* **DACHLiLu-Datenbuild starten:** `cd /srv/docker/projects/openfiremap-pipeline && docker compose run --rm builder`
* **Einzelregion testen:** `OSM_EXTRACT_URL=https://download.geofabrik.de/europe/germany/bayern-latest.osm.pbf docker compose run --rm builder`
* **Download erzwingen:** `FORCE_DOWNLOAD=true docker compose run --rm builder`
* **Builder-Tests ausführen:** `python3 pipeline/tools/test_builder.py`

#### Endpunkt-Verifikation von außen:
```bash
# 1. Status & Metadaten über HTTPS:
curl -4 -I https://pipeline.openfiremap.org/metadata.json
# ➔ HTTP/2 200 OK

# 2. PMTiles Byte-Range-Request (Vektorkacheln):
curl -4 -I -H "Range: bytes=0-100" https://pipeline.openfiremap.org/openfiremap.pmtiles
# ➔ HTTP/2 206 Partial Content

# 3. Metadaten-Status abrufen:
curl -4 -s https://pipeline.openfiremap.org/metadata.json | jq .summary

# 4. Interne Systemmetriken prüfen (nur lokal auf VM 102):
jq . /srv/docker/data/openfiremap/raw/system_stats.json
```

### 4.3 Home-Assistant-Überwachung (KW3)
Home Assistant (`192.168.178.191`) fragt alle 5 Minuten `http://192.168.178.152:8080/metadata.json` (oder `https://pipeline.openfiremap.org/metadata.json`) über einen REST-Sensor ab.
Überwachte Werte:
* **Systemstatus:** `ok` / `offline`
* **Zusammenfassung:** z. B. `"233534 Hydranten (+195377), 8802 Wachen (+7582), 6180 Wasserstellen (+5419), 5785 Defis (+4824), 12493 Grenzen (+10955)"`
* **Tägliche Differenz:** `diff_text` pro Objekttyp
* **Speicherplatz:** `disk_free_gb`, `disk_used_gb`, `disk_total_gb` und
  `disk_used_percent` (gespeichert in der internen
  `/srv/docker/data/openfiremap/raw/system_stats.json`; aus Sicherheitsgründen
  nicht in der öffentlichen `metadata.json`)
* **Build-Dauer:** `timings.total_sec`

---

## 5. DNS- & Netzwerkarchitektur

### 5.1 Domain-Delegation (`openfiremap.org`)
* **Registrar:** United-Domains (Eigene Nameserver konfiguriert).
* **Autoritative Nameserver:**
  * `autumn.ns.cloudflare.com`
  * `morgan.ns.cloudflare.com`
* **DNSSEC:** Deaktiviert bei United-Domains (keine DS-Einträge).

### 5.2 DNS-Einträge bei Cloudflare
| Typ | Name | Ziel | Proxy-Status | Zweck |
|---|---|---|---|---|
| `A` | `openfiremap.org` (4x) | `185.199.108-111.153` | **DNS only (grau)** | GitHub Pages Apex |
| `CNAME` | `www` | `frnkmrz.github.io.` | **DNS only (grau)** | GitHub Pages www Subdomain |
| `CNAME` | `pipeline` | `<tunnel-id>.cfargotunnel.com.` | **Proxied (orange)** | Cloudflare Zero Trust Tunnel zu VM 102 |
| `MX` | `openfiremap.org` | `mx00.udag.de.` (Prio 10) | DNS only | E-Mail-Empfang United-Domains |
| `MX` | `openfiremap.org` | `mx01.udag.de.` (Prio 20) | DNS only | E-Mail-Empfang United-Domains Backup |
| `TXT` | `openfiremap.org` | `"v=spf1 include:_smtp.udag.de ~all"` | DNS only | SPF E-Mail-Authentifizierung |

> **Wichtig für GitHub Pages:** Die Apex-A-Records und der `www`-CNAME müssen dauerhaft auf **„DNS only“ (graue Wolke)** stehen, damit das SSL-Zertifikat von GitHub Pages / Let's Encrypt direkt ohne Proxy-Konflikte verwaltet wird.

### 5.3 Service Worker & Safari WebKit Schutz
* In `public/sw.js` ist `url.hostname === 'pipeline.openfiremap.org'` hinterlegt.
* **Hintergrund:** Safari und WebKit-Browser haben einen bekannten Bug, bei dem Service Worker HTTP-`Range`-Header bei abgefangenen Fetch-Requests verwerfen. Durch den expliziten Bypass lädt Safari alle PMTiles-Kacheln direkt ohne Service-Worker-Eingriff via HTTP 206.

---

## 6. Sicherheit & Rollback

* **Keine Portweiterleitung im Router nötig:** Eingehende Anfragen laufen gesichert über den Cloudflare Zero Trust Tunnel (`cloudflared`). Eingehende Ports an der FRITZ!Box bleiben vollständig geschlossen.
* **Keine Verzeichnisauflistung:** `autoindex off;` in Nginx verhindert Directory-Browsing.
* **Systemmetriken geschützt:** `metadata.json` enthält keine Server-Speicherwerte. Die Werte werden ausschließlich in `/srv/docker/data/openfiremap/raw/system_stats.json` abgelegt; das `raw/`-Verzeichnis wird nicht vom Webcontainer gemountet.
* **Öffentliches HTTPS:** Veraltete lokale IP-Adressen wurden aus dem Content-Security-Policy-Header (`connect-src`) entfernt. Der obsolete Header `Access-Control-Allow-Private-Network` wurde bereinigt.
* **Token-Sicherheit:** Das `TUNNEL_TOKEN` ist in `.env` gespeichert und wird niemals in Git versioniert (`.gitignore`).
* **Sicherer Rollback:** Falls auf VM 102 Probleme auftreten, kann in Proxmox auf den Snapshot `docker-basis-20260921` zurückgerollt werden.
* **Neustart nach Stromausfall:** Das HP-BIOS ist auf automatischen Start nach Stromwiederkehr konfiguriert. Da VM 102 keinen Autostart hat, bleibt sie nach einem Host-Neustart aus, bis sie bewusst gestartet wird.

---

## 7. Cloudflare Caching, R2 Edge & PMTiles Performance

### 7.1 Cloudflare Free Tier Cache-Limit (512 MB) & R2 Dynamic Range Requests
Im Cloudflare Free Tier gilt ein striktes Limit für die maximale Dateigröße im Edge-Cache von **512 MB** pro Datei.
* Die DACHLiLu-Vektorkacheldatei `openfiremap.pmtiles` hat eine Größe von ca. **539 MB** (bzw. 514–539 MB unkomprimiert) und überschreitet dieses Limit.
* Cloudflare markiert Anfragen an Dateien über 512 MB automatisch mit `cf-cache-status: DYNAMIC` und leitet die HTTP-206-Range-Requests transparent und direkt an den **Cloudflare R2 Object Storage** weiter.
* **Kosten & Kontingente bei R2:**
  * Range-Requests an R2 zählen als **Class B Operations**.
  * Im Cloudflare Free Tier sind **10 Millionen Class B Operations pro Monat kostenlos** (sowie 0 € Egress-Gebühren).
  * Selbst bei intensiver Nutzung liegt OpenFireMap weit unterhalb dieser Grenze.

### 7.2 Stale-Cache-Schutz: Query-String Cache-Busting (`?v=<generated_at>`)
Da Browser und Proxies HTTP-200- und 206-Responses anhand der Header (`max-age=86400`) bis zu 24 Stunden im lokalen Browser-Cache vorhalten können und die Client-Bibliothek `pmtiles` (v4.5.0) Header-ETags erst bei aktiven Kachelanfragen prüft (was bei Abdeckungswechseln außerhalb des alten Headers nie getriggert wird), implementiert `src/js/pipeline.js` ein zweistufiges Schutzkonzept:
1. **Query-String Cache-Busting:** Vor dem Laden von PMTiles wird `metadata.json` abgefragt (3 s Timeout, `cache: 'no-cache'`). Die PMTiles-URL wird dynamisch mit `?v=<generated_at>` versehen (z. B. `openfiremap.pmtiles?v=2026-09-29T10%3A00%3A00Z`). Cloudflare und Browser behandeln unterschiedliche Query-Strings als eigenständige Cache-Keys.
2. **Coverage-Mismatch-Erkennung (`PmtilesCoverageMismatch`):** Liegt der angeforderte Viewport außerhalb der im PMTiles-Header deklarierten Bounding-Box (`minLat`, `maxLat`, `minLon`, `maxLon`), wird der Header einmalig mit `forceRefresh` neu geladen. Passt die Abdeckung weiterhin nicht, wird `PmtilesCoverageMismatch` geworfen, was sofort den Overpass-Fallback aktiviert, anstatt fälschlicherweise eine leere Karte anzuzeigen.

### 7.3 R2 CORS-Konfiguration für die lokale Entwicklung (`localhost:5173`)
Standardmäßig erlaubt der Cloudflare R2 Bucket nur Zugriffe von `https://openfiremap.org` und `https://*.openfiremap.org`.
Für lokale Entwickler- und Test-Sessions mit dem Vite-Dev-Server (`http://localhost:5173`) kann `localhost:5173` in der R2 CORS-Policy hinterlegt werden:

1. Öffne das [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ **R2** ➔ Bucket `openfiremap-pipeline`.
2. Navigiere zu **Settings** ➔ **CORS Policy** ➔ **Edit CORS Policy**.
3. JSON-Konfiguration (reine Dokumentation, nicht automatisiert ausführen):
```json
[
  {
    "AllowedOrigins": [
      "https://openfiremap.org",
      "https://*.openfiremap.org",
      "http://localhost:5173"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Range",
      "Content-Type",
      "If-Match",
      "If-None-Match"
    ],
    "ExposeHeaders": [
      "Content-Range",
      "Content-Length",
      "ETag",
      "Accept-Ranges"
    ],
    "MaxAgeSeconds": 86400
  }
]
```
4. Auf **Save** klicken. Damit können Vite-Entwicklungsinstanzen direkt auf die weltweiten R2-Vektorkacheln zugreifen.

### 7.4 Gezielter Cache-Purge in `update.sh`
In `pipeline/update.sh` werden Daten mit strikter Reihenfolge nach R2 übertragen:
1. Zuerst `*.pmtiles` (`Cache-Control: public, max-age=86400`) und `*.geojson` (`Cache-Control: public, max-age=3600`).
2. Zuletzt `metadata.json` (`Cache-Control: no-cache, no-store, must-revalidate, max-age=0`).
3. Nur wenn alle Uploads fehlerfrei abgeschlossen wurden, wird der optionale Cloudflare Edge Purge für `openfiremap.pmtiles` und `metadata.json` ausgeführt.
