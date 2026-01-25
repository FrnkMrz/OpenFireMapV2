# OpenFireMapV2

## 🇩🇪 Deutsch

### Überblick

**OpenFireMapV2** ist eine interaktive, rein clientseitige Webkarte für feuerwehrrelevante Objekte wie  
Feuerwachen, Löschwasserentnahmestellen, Hydranten und Defibrillatoren auf Basis von **OpenStreetMap (OSM)**.

Das Projekt ist **nicht kommerziell** und dient als **Schulungs- und Übungsprojekt**.  
Ziel ist es, moderne Webentwicklung ohne Framework-Overhead praxisnah zu verstehen.

Die ursprüngliche OpenFireMap entstand um **2011**.  
OpenFireMapV2 ist ein bewusster Neuaufbau mit aktueller Technik, klarer Struktur und guter Wartbarkeit.

---

### Ziele des Projekts

- White-Coding mit **Vanilla JavaScript**
- Saubere Projekt- und Dateistruktur
- Sicherer Umgang mit **Git & GitHub**
- Nutzung von **GitHub Pages** inkl. Actions
- Verständnis von Build-Pipelines ohne SPA-Frameworks
- Klare Trennung von Quellcode und Build-Output

---

### Technische Eigenschaften

- **Frontend only** (kein Backend)
- **Leaflet** für Kartenlogik (lokal eingebunden)
- **OpenStreetMap**, **Overpass API**, **Nominatim**
- **Tailwind CSS** (nur Build-Step)
- Mehrsprachigkeit mit Fallback (Deutsch / Englisch)
- Keine externen CDN-Abhängigkeiten zur Laufzeit

---

### Projektstruktur

```
OpenFireMapV2/
├─ src/
│  ├─ js/
│  ├─ lang/
│  ├─ static/
│  └─ input.css
├─ scripts/
├─ docs/
├─ package.json
└─ README.md
```

---

### Build & Entwicklung

```bash
npm install
npm run build
```

---

### Lizenz

MIT License

---

## 🇬🇧 English

### Overview

**OpenFireMapV2** is a fully client-side interactive web map for fire-service-related objects such as  
fire stations, water supply points, hydrants and defibrillators based on **OpenStreetMap (OSM)**.

This is a **non-commercial learning project** focused on clean JavaScript, maintainable structure and GitHub workflows.

---

### License

MIT License

