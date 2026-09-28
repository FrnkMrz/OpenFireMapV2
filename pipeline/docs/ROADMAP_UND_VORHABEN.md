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
  2. Direkte Byte-Range-Anfragen (HTTP 206) an `https://pipeline.openfiremap.org/openfiremap.pmtiles` nur für die im Viewport sichtbaren Kacheln.
  3. Vollständige Abwärtskompatibilität: Alle SVG-Icons (`U`, `O`, `W`), Detail-Popups (Nenndurchmesser, Druck, Typ), 100m-Wirkungskreis, Entfernungsmesslinie, Marker-Clustering sowie hochauflösender PDF/PNG/GPX/CSV-Export bleiben zu 100 % erhalten.
  4. **Vollbild-Rendering-Fix:** Viewport-Berechnung nutzt exakte Kartengrenzen (`actualViewBounds` + 1-Tile-Puffer) statt veralteter 2,5-km-Beschränkung. 875 Objekte über 42 Kacheln rendern in ~135 ms über den gesamten Bildschirm.
  5. **Fallback-Kaskade:** PMTiles (Stufe 1) ➔ Öffentliche Overpass API (Stufe 2); GeoJSON optional via `Config.pipeline.geojsonFallback`.
  6. **Tippecanoe-Anpassung:** `build_features.py` auf `-z 16` erweitert für native Zoomstufen 15 & 16.
  7. Alle 60 Vitest-Unit-Tests und 11 Playwright-E2E-Tests erfolgreich.

---

### Schritt 2: Live-Delta-Abfragen (Hybrid-Architektur)
- **Status:** ⏳ Vorgemerkt für spätere Iteration (Backlog / ToDo).
- **Ziel:** 100 % Aktualität garantieren, selbst wenn Daten nach dem nächtlichen Update in OSM editiert wurden.
- **Konzept:**
  1. Großes Fundament (233.534 Objekte in Bayern) kommt blitzschnell (1–3 ms) aus der lokalen `openfiremap.pmtiles` via Cloudflare-Cache.
  2. Winzige Overpass-Abfrage holt im Hintergrund nur Objekte, die *nach* dem Zeitstempel `metadata.json.generated_at` geändert wurden (`(newer:"...")`).
  3. Minimale Serverlast bei maximaler Aktualität. Falls Overpass nicht erreichbar ist, greift kein Fehler durch.

---

### Schritt 3: Sicherer externer Zugriff & HTTPS (Cloudflare Tunnel)
- **Status:** ✅ Vollständig abgeschlossen & produktiv live (28. September 2026).
- **Ziel:** Zugriff auf die Pipeline von unterwegs (Smartphone im Mobilfunknetz) und von der HTTPS-Live-Webseite `https://openfiremap.org` (Mixed-Content-Blockade aufgehoben).
- **Erreichte Meilensteine:**
  1. **Cloudflare Zero Trust Tunnel:** Container `openfiremap-tunnel` (`cloudflared`) läuft auf VM 102 mit 4 redundanten QUIC-Verbindungen zur Cloudflare Edge in Frankfurt.
  2. **Vollwertiges HTTPS:** Gültiges Let's Encrypt Wildcard-Zertifikat (`*.openfiremap.org`, TLS 1.3) aktiv.
  3. **PMTiles HTTP 206 Byte-Range-Requests:** Vollständig funktionsfähig über HTTPS weltweit mit Latenzen unter 30 ms.
  4. **Unterbrechungsfreier Betrieb:** GitHub Pages (`https://openfiremap.org` und `www`) sowie United-Domains E-Mail-Empfang (`mx00/mx01.udag.de` + SPF) blieben zu 100 % stabil.
  5. **Frontend-Umstellung:** `src/js/config.js` auf `https://pipeline.openfiremap.org` umgestellt, Service Worker Bypass gegen Safari WebKit Bug aktiv, Produktions-Build nach `main` deployed.
  6. **Automatisierte Qualitätssicherung:** Alle 63 Vitest-Tests und 11 Playwright-E2E-Tests erfolgreich.
- **Dokumentation:** [`pipeline/docs/ANLEITUNG_HTTPS_CLOUDFLARE_TUNNEL.md`](file:///Users/frank/Library/Mobile%20Documents/com~apple~CloudDocs/GitHub/Play_Antigravtiy/OpenFireMap.org/pipeline/docs/ANLEITUNG_HTTPS_CLOUDFLARE_TUNNEL.md) und [`pipeline/docs/DOKUMENTATION.md`](file:///Users/frank/Library/Mobile%20Documents/com~apple~CloudDocs/GitHub/Play_Antigravtiy/OpenFireMap.org/pipeline/docs/DOKUMENTATION.md).

---

### Schritt 4: Skalierung auf Bayern (Abgeschlossen) & DACH
- **Status Bayern:** ✅ Erfolgreich umgesetzt & live (28. September 2026).
- **Ergebnisse Bayern:**
  - **Download:** `bayern-latest.osm.pbf` (813,5 MB in 31,8 Sek.).
  - **Objektzahlen:**
    - **233.534 Hydranten** (+195.377)
    - **8.802 Feuerwachen** (+7.582)
    - **6.180 Löschwasserstellen** (+5.419)
    - **5.785 Defibrillatoren** (+4.824)
    - **12.493 Gemeindegrenzen** (+10.955)
  - **PMTiles-Generierung:** `openfiremap.pmtiles` ist **88,62 MB** groß (in 61,9 Sek. gebaut).
  - **Gesamte Build-Dauer:** 280,11 Sekunden (~4,6 Minuten).
  - **Systemstabilität:** 4 GB NVMe-Swap auf VM 102 eingerichtet; Auslastung der NVMe liegt bei nur 5,8 % (113,3 GB frei).
  - **Frontend:** Exakte Grenzabdeckung via 124-Punkt-Polygon des Freistaates Bayern mit Ray-Casting Jordan Curve Theorem und 4-Ecken-Viewport-Prüfung in `src/js/pipeline.js` implementiert (verhindert leere Karten in Nachbarländern/Grenzgebieten wie Ulm oder Salzburg).

- **Nächster Ausbauschritt: DACHLiLu & Cloudflare R2 (Umsetzung in den nächsten Tagen):**
  * Geltungsbereich: Deutschland (DE), Österreich (AT), Schweiz (CH), Liechtenstein (LI), Luxemburg (LU).
  * Hosting über **Cloudflare R2** (10 GB Free Tier, 0 € Egress, 100 % unabhängig vom Heimnetz).
  * **Direkt mit eingeplante Build-Optimierungen (Punkt 1):**
    1. *Conditional Download:* Vor dem Download prüft ein `HEAD`-Request `If-Modified-Since` bei Geofabrik, um unnötigen Traffic zu vermeiden.
    2. *RAM-Disk (`tmpfs` in `/dev/shm`):* Zwischenfilterung der 5 PBFs läuft im RAM (0 NVMe-Schreiblast, 30 % schneller).
    3. *Automatischer Cache-Purge:* `update.sh` leert den Cloudflare R2 Edge Cache nach erfolgreichem Upload automatisch per API.
    4. *Auto-Cleanup:* Bereinigung temporärer Zwischendateien älter als 24 Stunden.
  * Siehe vollständiges Konzept: [`dachlilu_r2_masterplan.md`](file:///Users/frank/.gemini/antigravity/brain/7d91eb9c-1098-4005-a9d5-7161f0e16cf2/dachlilu_r2_masterplan.md)

---

### Schritt 5: Zukünftige Frontend- & Client-Performance (Backlog: Bauen wir später)
- **Status:** ⏳ Vorgemerkt für spätere Iteration nach dem DACHLiLu-Rollout.
- **Geplante Maßnahmen:**
  1. **Web Worker für Vektorkachel-Decoding:**
     - Auslagerung des `@mapbox/vector-tile` und PBF-Parsings in einen Web Worker.
     - Der Haupt-Thread bleibt bei 60/120 FPS absolut flüssig, selbst beim schnellen Scrollen über Metropolregionen (Ruhrgebiet, Berlin, Wien).
  2. **Kachel-Vorabruf (Tile-Prefetching):**
     - Vorausschauendes Nachladen eines 1-Kachel-Kranzes um den aktuellen Viewport im Leerlauf.
     - Beim Weiterziehen der Karte sind die Hydranten bereits im Browser-Speicher (0 ms Ladezeit).
  3. **Offline-Fähigkeit für Einsatzfahrzeuge (IndexedDB Kachel-Cache):**
     - Persistentes Caching geladener PMTiles-Kacheln in der IndexedDB des Endgeräts.
     - Einsatztablets behalten einmal angesehene Einsatzgebiete auch bei vollständigem Funkloch vor Ort.

---

### Schritt 6: Ideen-Pool: Feuerwehr-Fachfunktionen & Datenqualität (In Prüfung)
- **Status:** 💡 Ideen-Pool (wird vor einer etwaigen Umsetzung erst detailliert geprüft – nicht alles soll übernommen werden).
- **Mögliche Optionen zur Auswahl:**
  1. *Qualitäts-Ampel / Fehlende Attribute:* Optische Kennzeichnung in Popups oder Icons, wenn in OSM wichtige Angaben fehlen (z. B. Nenndurchmesser `ref`, Typ Über-/Unterflur).
  2. *„Hydrant melden / OSM-Korrektur“-Link:* Ein-Klick-Link im Popup zum Öffnen des OSM-Editors an der genauen GPS-Position zur einfachen Bürger-/Feuerwehr-Mitarbeit.
  3. *B-Schlauchdistanzen:* Umrechnung der Entfernungslinie in B-Schlauchlängen (z. B. 20-Meter-Einheiten).
