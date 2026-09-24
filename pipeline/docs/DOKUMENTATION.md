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
     Bündelt alle Layer (`fire_stations`, `hydrants`, `water_points`, `defibrillators`, `boundaries`) in eine einzige kompakte Datei `openfiremap.pmtiles` (12 MB inkl. aller Grenzlinien, Zoom 12–16) in unter 5 Sekunden.
  5. Berechnung von Differenzen zum Vortag (`diff`), Speicherauslastung und Schreiben von `metadata.json`.

### 3.2 `openfiremap-web` (Docker / Nginx Alpine)
* **Port:** `8080` (vermeidet Kollisionen mit Standard-Port 80)
* **Features:**
  * Auslieferung von `.pmtiles` mit **HTTP 206 Partial Content (Range Requests)**
  * `gzip off;` dediziert für `.pmtiles`, damit HTTP Byte Serving auch in Safari/WebKit mit `Accept-Encoding: gzip` standardkonform funktioniert
  * `gzip on;` aktiv für GeoJSON und JSON (reduziert Transfergröße um ~80 %)
  * Vollständige CORS-Header inklusive `Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges, ETag`
  * Healthcheck-Endpunkt `/healthz`
  * Logging: Maximal 3 Dateien à 10 MB

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
* **Container-Status prüfen:** `docker ps`
* **Webserver neustarten:** `cd /srv/docker/projects/openfiremap-pipeline && docker compose restart web`
* **Manuellen Datenbuild starten:** `cd /srv/docker/projects/openfiremap-pipeline && docker compose run --rm builder`
* **Update-Log ansehen:** `tail -n 50 /srv/docker/data/openfiremap/update.log`

### 4.3 Home-Assistant-Überwachung (KW3)
Home Assistant (`192.168.178.191`) fragt alle 5 Minuten `http://192.168.178.152:8080/metadata.json` über einen REST-Sensor ab.
Überwachte Werte:
* **Systemstatus:** `ok` / `offline`
* **Zusammenfassung:** z. B. `"38151 Hydranten (±0), 1212 Wachen (±0), 761 Wasserstellen (±0), 954 Defis (±0)"`
* **Tägliche Differenz:** `diff_text` pro Objekttyp
* **Speicherplatz:** `disk_free_gb`, `disk_used_percent`
* **Build-Dauer:** `timings.total_sec`

---

## 5. Sicherheit & Rollback

* **Keine Portweiterleitung im Router:** Der Dienst läuft ausschließlich im lokalen Heimnetz (`192.168.178.0/24`).
* **Sicherer Rollback:** Falls auf VM 102 Probleme auftreten, kann in Proxmox auf den Snapshot `docker-basis-20260921` zurückgerollt werden.
* **Neustart nach Stromausfall:** Das HP-BIOS ist auf automatischen Start nach Stromwiederkehr konfiguriert. Da VM 102 keinen Autostart hat, bleibt sie nach einem Host-Neustart aus, bis sie bewusst gestartet wird.
