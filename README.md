# OpenFireMapV2

## 🇩🇪 Deutsch

### Überblick

**OpenFireMapV2** ist eine interaktive, rein clientseitige Webkarte für feuerwehrrelevante Objekte wie  
Feuerwachen, Löschwasserentnahmestellen, Hydranten und Defibrillatoren auf Basis von **OpenStreetMap (OSM)**.

Das Projekt ist **nicht kommerziell** und dient als **Schulungs- und Übungsprojekt**.  
Ziel ist es, moderne Webentwicklung ohne Framework-Overhead praxisnah zu verstehen.

Die ursprüngliche OpenFireMap entstand um **2011**.  
OpenFireMapV2 ist ein bewusster Neuaufbau mit aktueller Technik (Vite, ES Modules), klarer Struktur und guter Wartbarkeit.

---

### Ziele des Projekts

- White-Coding mit **Vanilla JavaScript** (ES Modules)
- Saubere Projekt- und Dateistruktur
- Sicherer Umgang mit **Git & GitHub**
- Nutzung von **GitHub Pages** (Deployment via Actions)
- Modernes Tooling mit **Vite** (statt komplexer Custom-Skripte)
- Klare Trennung von Quellcode und Build-Output

---

### Technische Eigenschaften

- **Frontend only** (kein Backend)
- **Online-Only by Design** (setzt eine aktive Internetverbindung für Live-Kartendaten voraus, keine Offline-App)
- **Vite** als Build-Tool und Dev-Server
- **Leaflet** für Kartenlogik (lokal eingebunden)
- **OpenStreetMap** Daten (via Overpass API & Nominatim)
- **Tailwind CSS** für das Styling
- **PWA Ready** (Installierbar via Browser)
- Mehrsprachigkeit mit Fallback (Deutsch / Englisch)
- Keine externen CDN-Abhängigkeiten zur Laufzeit

---

### Features

- 🗺️ **Interaktive Karte** mit Feuerwachen, Hydranten, Wasserstellen und Defibrillatoren
- 📦 **Intelligentes Caching** (IndexedDB) für schnelles Neuladen bekannter Bereiche
- 🔄 **Stale-While-Revalidate** – sofortige Anzeige veralteter Daten, Live-Aktualisierung im Hintergrund
- 🌍 **30+ Sprachen** unterstützt
- 📤 **Export** als PNG, PDF, GPX oder CSV (inkl. UTF-8 BOM für direkte Excel-Kompatibilität, vollständigen Attributen aller POIs und skalierungsfreier Hydranten-Renderings auf allen Zoomstufen)
- 🛰️ **Satellitenansicht** (Bing Maps, benötigt Online-Verbindung)
- 📱 **Responsive Design** – funktioniert auf Desktop und Mobil
- 🔧 **Smart Clustering & POI Bündelung**: Intelligente Gruppierung nah beieinander liegender Hydranten (unter 5m) inkl. Multi-Tooltips.
- 💧 **Support für spezielle Typen**: Nativer Support für besondere regionale Hydrantentypen wie den *Württembergischen Schachthydrant (WSH)* inkl. visuellem Hinweis auf das benötigte spezielle Standrohr.
- 🔗 **Permalink & Teilen**: Teile die exakte Sicht auf die Karte inklusive Kartenebene als Web-Link oder per nativer Smartphone-Share-API (WhatsApp, SMS, etc.).
- 🗺️ **Regionale Basisdaten**: Vollautomatische, standortbezogene Einblendung der perfekten lokalen Daten, wie z.B. die amtlichen Luftbilder (DOP) und die Webkarte des Freistaats Bayern (nur Desktop).

### Hydranten-Ladestatus

Beim Abruf von Hydrantendaten zeigt die Karte einen nicht blockierenden Status an. Damit schnelle Overpass-Antworten nicht flackern, erscheint er erst nach 500 ms. Nach 6 Sekunden weist er auf einen weiterhin laufenden Abruf hin und nennt die bislang geladene Hydrantenanzahl. Ein erfolgreicher Abruf wird für 1,6 Sekunden bestätigt; bei einem Fehler kann der Abruf direkt über den Wiederholen-Button erneut gestartet werden.

Die Zeitwerte liegen zentral unter `Config.performance` in `src/js/config.js`:

- `hydrantStatusShowDelayMs`
- `hydrantStatusSlowAfterMs`
- `hydrantStatusSuccessDurationMs`

### Zuverlässigkeit von Datenabruf und Export

Overpass-Abfragen verwenden mehrere Endpunkte, einen lokalen IndexedDB-Cache sowie einen Backoff bei Überlastung. Beim Verschieben der Karte werden veraltete Abrufe abgebrochen; nur die Antwort des aktuellsten Ausschnitts darf die angezeigten Daten aktualisieren. Schlägt ein Abruf für den aktuellen Bereich endgültig fehl, startet die Anwendung nach kurzer Wartezeit automatisch einen neuen Versuch.

Beim PNG- und PDF-Export wird der gewählte Kartenausschnitt unverändert übernommen. Ein erneuter Klick auf **„Ausschnitt wählen“** verwirft das vorherige Rechteck. Kopfzeile und Karte werden getrennt gerendert, damit die Kopfzeile auch bei kleinen Ausschnitten keine Kartendaten verdeckt.

### Projektstruktur

```
OpenFireMapV2/
├─ public/          # Statische Assets (Favicons, etc.)
├─ src/
│  ├─ js/           # App-Logik (Module)
│  ├─ lang/         # Übersetzungen
│  └─ input.css     # Tailwind CSS Einstiegspunkt
├─ docs/            # Build-Output (für GitHub Pages)
├─ index.html       # Haupt-Einstiegspunkt
├─ vite.config.js   # Konfiguration
├─ package.json
└─ README.md
```

---

### Build & Entwicklung

Voraussetzung: [Node.js](https://nodejs.org/) installiert.

```bash
# Abhängigkeiten installieren
npm install

# Lokalen Entwicklungsserver starten (Hot Module Replacement)
npm run dev

# Projekt bauen (Output in /docs)
npm run build

# Gebautes Projekt lokal testen
npm run preview
```

---

### Lizenz & Daten

**Code:**  
[MIT License](LICENSE) (siehe Repository)

**Kartendaten:**  
© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)  
Veröffentlicht unter der **Open Data Commons Open Database License (ODbL)**.

**Geocoding:**  
Nominatim Search API (nutzt OSM Daten).

---

## 🇬🇧 English

### Overview

**OpenFireMapV2** is a fully client-side interactive web map for fire-service-related objects such as  
fire stations, water supply points, hydrants and defibrillators based on **OpenStreetMap (OSM)**.

This is a **non-commercial learning project** focused on clean JavaScript, maintainable structure and GitHub workflows.
Please note: This is an **online-only application** by design and requires an active internet connection to stream live map data and search results. It is not intended for offline use in emergency situations.

---

### Tech Stack

- **Vite** (Bundler & Dev Server)
- **Vanilla JS** (ES Modules)
- **Leaflet** (Map logic)
- **Tailwind CSS**
- **GitHub Pages** Hosting
- **Hydrant loading status** with delayed display, slow-load feedback, success confirmation, and retry
- **Multi-format Export** (PNG, PDF, GPX, CSV with Excel-ready UTF-8 BOM)

### Development

```bash
npm install
npm run dev     # Start dev server
npm run build   # Build for production
```

### License

**Code:** MIT License  
**Map Data:** © OpenStreetMap contributors (ODbL)
