# System- und Betriebsdokumentation: OpenFireMap DACH Data Pipeline

Stand: September 2026

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
  1. Download des aktuellen PBF von Geofabrik (mit Resume-Funktion und Retries).
  2. Filterung nach OSM-Tags (Hydranten, Wachen, Löschwasserstellen, Defibrillatoren sowie Verwaltungsgrenzen `boundaries`).
  3. Export als GeoJSON nach `/srv/docker/data/openfiremap/publish/`.
  4. **PMTiles Vektorkachel-Erzeugung (`tippecanoe`):**  
     Bündelt alle Layer (`fire_stations`, `hydrants`, `water_points`, `defibrillators`, `boundaries`) in eine einzige kompakte Datei `openfiremap.pmtiles` (**88,6 MB** für den gesamten Freistaat Bayern inkl. aller 12.493 Gemeindegrenzen und 233.534 Hydranten, Zoom 12–16) in ca. 62 Sekunden.
  5. Berechnung von Differenzen zum Vortag (`diff`), Speicherauslastung und Schreiben von `metadata.json`.

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
* **Manuellen Datenbuild starten:** `cd /srv/docker/projects/openfiremap-pipeline && docker compose run --rm builder`

#### Endpunkt-Verifikation von außen:
```bash
# 1. Healthcheck über HTTPS:
curl -4 -I https://pipeline.openfiremap.org/healthz
# ➔ HTTP/2 200 OK

# 2. PMTiles Byte-Range-Request (Vektorkacheln):
curl -4 -I -H "Range: bytes=0-100" https://pipeline.openfiremap.org/openfiremap.pmtiles
# ➔ HTTP/2 206 Partial Content

# 3. Metadaten-Status abrufen:
curl -4 -s https://pipeline.openfiremap.org/metadata.json | jq .summary
```

### 4.3 Home-Assistant-Überwachung (KW3)
Home Assistant (`192.168.178.191`) fragt alle 5 Minuten `http://192.168.178.152:8080/metadata.json` (oder `https://pipeline.openfiremap.org/metadata.json`) über einen REST-Sensor ab.
Überwachte Werte:
* **Systemstatus:** `ok` / `offline`
* **Zusammenfassung:** z. B. `"233534 Hydranten (+195377), 8802 Wachen (+7582), 6180 Wasserstellen (+5419), 5785 Defis (+4824), 12493 Grenzen (+10955)"`
* **Tägliche Differenz:** `diff_text` pro Objekttyp
* **Speicherplatz:** `disk_free_gb`, `disk_used_percent`
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
* **Öffentliches HTTPS:** Veraltete lokale IP-Adressen wurden aus dem Content-Security-Policy-Header (`connect-src`) entfernt. Der obsolete Header `Access-Control-Allow-Private-Network` wurde bereinigt.
* **Token-Sicherheit:** Das `TUNNEL_TOKEN` ist in `.env` gespeichert und wird niemals in Git versioniert (`.gitignore`).
* **Sicherer Rollback:** Falls auf VM 102 Probleme auftreten, kann in Proxmox auf den Snapshot `docker-basis-20260921` zurückgerollt werden.
* **Neustart nach Stromausfall:** Das HP-BIOS ist auf automatischen Start nach Stromwiederkehr konfiguriert. Da VM 102 keinen Autostart hat, bleibt sie nach einem Host-Neustart aus, bis sie bewusst gestartet wird.

---

## 7. Cloudflare Caching & PMTiles Edge-Beschleunigung

### 7.1 Hintergrund & Notwendigkeit einer Cache-Regel
Standardmäßig cacht Cloudflare nur statische Dateien bekannter Endungen (`.css`, `.js`, `.png`, `.jpg` etc.). Die Dateiendung `.pmtiles` gehört nicht zur Cloudflare-Standardliste und wird ohne Regel standardmäßig mit `cf-cache-status: DYNAMIC` an VM 102 durchgereicht.

Mit einer **Cloudflare Cache Rule** werden Byte-Ranges der Vektorkacheln direkt an den weltweiten Cloudflare-Edge-Knoten (z. B. Frankfurt, München, Berlin) zwischengespeichert. Beliebte Kacheln werden dadurch in **1–5 ms** ausgeliefert, während die Upstream-Bandbreite von VM 102 drastisch geschont wird.

### 7.2 Konfiguration im Cloudflare Dashboard
1. Öffne das [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ Zone `openfiremap.org`.
2. Navigiere zu **Caching** ➔ **Cache Rules** ➔ **Create rule**.
3. **Regel-Name:** `Cache PMTiles Vector Tiles`
4. **Wenn eingehende Anfragen übereinstimmen (Matching criteria):**
   * Feld: `Hostname` | Operator: `equals` | Wert: `pipeline.openfiremap.org`
   * **AND**
   * Feld: `URI Path` | Operator: `ends with` | Wert: `.pmtiles`
5. **Aktion / Cache-Berechtigung:**
   * **Cache eligibility:** `Eligible for cache` (Cache Everything)
   * **Edge TTL:** `Respect origin` (nutzt Nginx-Vorgabe: `max-age=86400` / 1 Tag)
   * **Browser TTL:** `Respect origin`
6. Klicke auf **Deploy**.

### 7.3 Cache-Invalidierung bei nächtlichen Builds
Wenn VM 102 jede Nacht um 03:30 Uhr `openfiremap.pmtiles` neu generiert:
* Durch `ETag` und `must-revalidate` im Nginx-Header prüft Cloudflare veraltete Kacheln automatisch.
* **Manueller / Automatisierter Purge via Cloudflare API:**
  ```bash
  curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
       -H "Authorization: Bearer <API_TOKEN>" \
       -H "Content-Type: application/json" \
       -d '{"files":["https://pipeline.openfiremap.org/openfiremap.pmtiles"]}'
  ```
  Dieser Aufruf kann optional am Ende von `update.sh` hinterlegt werden, sobald ein Cloudflare API-Token mit der Berechtigung `Zone:Cache Purge` existiert.
