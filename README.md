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
- **Vite** als Build-Tool und Dev-Server
- **Leaflet** für Kartenlogik (lokal eingebunden)
- **OpenStreetMap** Daten (via Overpass API & Nominatim)
- **Tailwind CSS** für das Styling
- Mehrsprachigkeit mit Fallback (Deutsch / Englisch)
- Keine externen CDN-Abhängigkeiten zur Laufzeit

---

### Features

- 🗺️ **Interaktive Karte** mit Feuerwachen, Hydranten, Wasserstellen und Defibrillatoren
- 📦 **Intelligentes Caching** (IndexedDB) – einmal geladen, offline verfügbar
- 🔄 **Stale-While-Revalidate** – sofortige Anzeige, Aktualisierung im Hintergrund
- 🌍 **28 Sprachen** unterstützt
- 📤 **Export** als PNG, PDF oder GPX
- 🛰️ **Satellitenansicht** mit optimierten Grenzen
- 📱 **Responsive Design** – funktioniert auf Desktop und Mobil

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

---

### Tech Stack

- **Vite** (Bundler & Dev Server)
- **Vanilla JS** (ES Modules)
- **Leaflet** (Map logic)
- **Tailwind CSS**
- **GitHub Pages** Hosting

### Development

```bash
npm install
npm run dev     # Start dev server
npm run build   # Build for production
```

### License

**Code:** MIT License  
**Map Data:** © OpenStreetMap contributors (ODbL)
