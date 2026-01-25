# OpenFireMapV2

## Deutsch

Interaktive Web‑Karte für Feuerwachen, Löschwasser‑Objekte und Defibrillatoren auf Basis von **OpenStreetMap**.  
Clientseitig, ohne Backend, mit Fokus auf Stabilität und Nachvollziehbarkeit.

---

### Kurzüberblick

- **Frontend only** (kein Server, kein Framework)
- **GitHub Pages** als Hosting (`docs/`)
- **Overpass & Nominatim** mit Cache, Abort, Backoff
- **Saubere Trennung**: Quellcode (`src/`) vs. Deploy‑Artefakte (`docs/`)

---

### Einordnung & Motivation

Dieses Projekt ist ein **privates Schulungs‑ und Übungsprojekt**.

Ziele:
- praktische Erfahrung mit **Vanilla JavaScript (White‑Coding)**
- sicherer Umgang mit **Git und GitHub**
- saubere Projektstruktur ohne Framework‑Abhängigkeiten

OpenFireMap entstand ursprünglich um **2011** als einfache Website.  
OpenFireMapV2 ist der bewusste Versuch, diese Idee **neu aufzusetzen**:
- mit aktueller Web‑Technik
- mit besserer Struktur
- mit Fokus auf Wartbarkeit und Robustheit

Das Projekt ist **nicht kommerziell**, dient dem Lernen und der technischen Weiterentwicklung.  
Ich bin mit dem aktuellen Stand **sehr zufrieden**.

---

### Internationalisierung (i18n)

- **Standard:** Deutsch (`de`)
- **Fallback:** Englisch (`en`)
- weitere Sprachen unter `src/js/lang/`

Qualitätsprüfung:
```bash
npm run i18n:check
```

---

## English

Interactive web map for fire stations, firefighting water sources and defibrillators based on **OpenStreetMap**.  
Client‑side only, no backend, focused on stability and transparency.

---

### Internationalization (i18n)

- **Default:** German (`de`)
- **Fallback:** English (`en`)
- additional languages in `src/js/lang/`

Quality check:
```bash
npm run i18n:check
```

---

### License

MIT
