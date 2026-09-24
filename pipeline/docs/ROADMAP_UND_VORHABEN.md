# 🗺️ Roadmap & Nächste Vorhaben

Stand: 23. September 2026

Dieses Dokument hält den aktuellen Stand sowie die geplanten nächsten Schritte für die **OpenFireMap DACH Data Pipeline** und deren Integration in **OpenFireMap** fest.

---

## 🏁 Bisher erreicht (Meilensteine 1 & 2)

- [x] **Proxmox VM 102 (`docker-lab-KW3`):** Docker & Docker Compose Umgebung betriebsbereit.
- [x] **High-Performance Filterung mit Osmium:** Über 41.000 feuerwehrrelevante Objekte aus Mittelfranken in ~18 Sekunden extrahiert.
- [x] **Vektor-Kacheln mit `tippecanoe` (Option A - PMTiles):**
  - Alle Zoomstufen (Z12–Z16) in einer kompakten Einzeldatei `openfiremap.pmtiles` (**1,95 MB**).
  - Nginx mit HTTP 206 Partial Content (Range Requests) und vollständigen CORS-Headern konfiguriert.
- [x] **Automatischer nächtlicher Cronjob:** Tägliches Update um 03:30 Uhr nachts eingerichtet und verifiziert.
- [x] **Erweiterte Metadaten für Home Assistant:**
  - Automatische Berechnung von Differenzen zum Vortag (`diff: +2` Hydranten).
  - Kompakte Statuszeile (`summary`), NVMe-Speicherplatzüberwachung (`system.disk_free_gb`) und Zeitmessung.
- [x] **Code & Dokumentation gesichert:** Eigenständiges GitHub-Repository `FrnkMrz/openfiremap-dach-pipeline` erstellt und gepflegt.

---

## 🎯 Geplante nächste Schritte (Nach der Pause)

### Schritt 1: Lokale Frontend-Einbindung in OpenFireMap (Abgeschlossen)
- **Status:** ✅ Erfolgreich implementiert & verifiziert (24. September 2026).
- **Architektur (Ansatz 1A - On-Demand PMTiles Decoding):**
  1. `pmtiles`, `@mapbox/vector-tile` und `pbf` integriert.
  2. Direkte Byte-Range-Anfragen (HTTP 206) an `http://192.168.178.152:8080/openfiremap.pmtiles` nur für die im Viewport sichtbaren Kacheln.
  3. Vollständige Abwärtskompatibilität: Alle SVG-Icons (`U`, `O`, `W`), Detail-Popups (Nenndurchmesser, Druck, Typ), 100m-Wirkungskreis, Entfernungsmesslinie, Marker-Clustering sowie hochauflösender PDF/PNG/GPX/CSV-Export bleiben zu 100 % erhalten.
  4. **Vollbild-Rendering-Fix:** Viewport-Berechnung nutzt exakte Kartengrenzen (`actualViewBounds` + 1-Tile-Puffer) statt veralteter 2,5-km-Beschränkung. 875 Objekte über 42 Kacheln rendern in ~135 ms über den gesamten Bildschirm.
  5. **3-Stufen-Fallback-Kaskade:** PMTiles (Stufe 1) ➔ GeoJSON (Stufe 2) ➔ Öffentliche Overpass API (Stufe 3).
  6. **Tippecanoe-Anpassung:** `build_features.py` auf `-z 16` erweitert für native Zoomstufen 15 & 16.
  7. Alle 60 Vitest-Unit-Tests und 11 Playwright-E2E-Tests erfolgreich.

---

### Schritt 2: Live-Delta-Abfragen (Hybrid-Architektur)
- **Ziel:** 100 % Aktualität garantieren, selbst wenn Daten nach dem nächtlichen Update in OSM editiert wurden.
- **Konzept:**
  1. Großes Fundament (38.151 Objekte) kommt blitzschnell aus der lokalen `openfiremap.pmtiles`.
  2. Winzige Overpass-Abfrage holt nur Objekte, die *nach* dem Zeitstempel `metadata.json.generated_at` geändert wurden (`(newer:"...")`).
  3. Minimale Serverlast bei maximaler Aktualität.

---

### Schritt 3: Sicherer externer Zugriff & HTTPS (Cloudflare Tunnel)
- **Ziel:** Zugriff auf die Pipeline von unterwegs (Smartphone im Mobilfunknetz) und von der HTTPS-Live-Webseite `https://openfiremap.org`.
- **Konzept:**
  1. Kleinen `cloudflared`-Container (ca. 15 MB RAM) in die `docker-compose.yml` auf VM 102 aufnehmen.
  2. Verschlüsselter ausgehender Tunnel zu Cloudflare (keine offenen Ports / Portweiterleitungen am Router nötig).
  3. Automatische HTTPS-Verschlüsselung mit gültigem Zertifikat.

---

### Schritt 4: Skalierung auf DACH
- **Ziel:** Erweiterung der Pipeline von Mittelfranken auf ganz Bayern und später DACH (Deutschland, Österreich, Schweiz).
- **Konzept:**
  1. Testen des Bayern-Auszugs (~700 MB `.osm.pbf`).
  2. Prüfung der PMTiles-Dateigröße und Erstellungsdauer mit `tippecanoe`.
