OpenFireMapV2 – Architektur & Build-Flow

Dieses Dokument erklärt kurz und präzise, wie das Projekt aufgebaut ist, warum es so aufgebaut ist und wie Änderungen korrekt bis auf GitHub Pages gelangen. Kein Marketing. Nur Orientierung.

⸻

Ziel des Projekts

OpenFireMapV2 ist eine clientseitige Web‑Karte auf Basis von OpenStreetMap, mit Fokus auf:
	•	Feuerwachen
	•	Hydranten und weitere Löschwasser‑Objekte
	•	Defibrillatoren

Technische Ziele:
	•	Stabiler Umgang mit Overpass und Nominatim
	•	Kein Request‑Spam bei Pan/Zoom
	•	Saubere Trennung zwischen Quellcode und Deploy‑Artefakten

⸻

Repository‑Struktur (wichtig)

OpenFireMapV2/
├─ src/            # QUELLCODE (hier arbeitest du)
│  ├─ js/          # JavaScript‑Module
│  ├─ static/      # index.html, Assets, Favicons
│  └─ input.css    # Tailwind Entry
│
├─ docs/           # BUILD‑ERGEBNIS (GitHub Pages)
│  ├─ index.html
│  └─ assets/
│     ├─ css/
│     └─ js/
│
├─ scripts/        # Build‑/Copy‑Skripte
├─ package.json
└─ README.md

Merksatz:
	•	src/ ist die Quelle
	•	docs/ ist das Produkt

GitHub Pages liest ausschließlich docs/.

⸻

Build‑Flow (src → docs)

Der Build ist bewusst minimalistisch gehalten. Kein Vite, kein Webpack.

Was beim Build passiert
	1.	Tailwind CSS
	•	src/input.css
	•	scannt Klassen in src/
	•	erzeugt docs/assets/css/main.css
	2.	Statische Dateien
	•	src/static/* → docs/*
	•	JavaScript wird direkt referenziert (kein Bundling)

Build ausführen

npm install      # einmal pro Rechner
npm run build    # bei Änderungen

Ohne Build:
	•	bleibt docs/ unverändert
	•	GitHub Pages zeigt den alten Stand

⸻

Warum npm run build wichtig ist

Du änderst nie direkt das, was ausgeliefert wird.

Änderung	Build nötig
Neue CSS‑Klassen	ja
UI‑Status geändert	ja
JS‑Logik ohne neue Klassen	meist ja
Nur README	nein

Wenn du unsicher bist: Build machen.

⸻

API‑Architektur (Überblick)

Zentrale Bausteine
	•	api.js
	•	Overpass‑Queries
	•	Nominatim‑Geocoding
	•	Cache + Backoff + Abort
	•	net.js
	•	Einheitlicher fetch‑Wrapper
	•	Timeout
	•	HTTP‑Fehlerklassifikation
	•	cache.js
	•	In‑Memory Cache (BBox + Zoom)
	•	TTL, kein Persistenz‑Ballast

Warum das so ist
	•	Overpass ist langsam und rate‑limitiert
	•	User pannen und zoomen ständig
	•	Alte Requests müssen abbrechen

Das System verhindert:
	•	Request‑Stürme
	•	UI‑Freeze
	•	inkonsistente Zustände

⸻

Karten‑Logik
	•	Requests nur bei moveend / zoomend
	•	Debounce (≈ 400 ms)
	•	Abbruch alter Requests bei neuer Aktion
	•	BBox‑Rundung für Cache‑Treffer

Ergebnis:
	•	weniger Overpass‑Last
	•	flüssigere UI
	•	reproduzierbares Verhalten

⸻

Arbeiten auf mehreren Rechnern

Voraussetzungen:
	•	Git
	•	Node.js (LTS)

Setup:

git clone https://github.com/FrnkMrz/OpenFireMapV2.git
cd OpenFireMapV2
npm install
npm run build

Danach:

# ändern
npm run build
git commit
git push


⸻

Typische Fehler (und warum sie passieren)
	•	Seite zeigt alte Version
→ Build vergessen
	•	CSS fehlt
→ Tailwind nicht gebaut
	•	Overpass 504
→ Serverproblem, Code reagiert korrekt
	•	*404 auf .map Dateien
→ SourceMaps fehlen, harmlos

⸻

Design‑Entscheidungen (bewusst)
	•	Kein Framework
	•	Kein Bundler
	•	Kein Backend
	•	Maximale Transparenz
	•	Lange Lebensdauer

Das Projekt soll auch in 5 Jahren noch verständlich sein.

⸻

Kurzfassung
	•	Arbeite in src/
	•	Baue nach Änderungen
	•	docs/ ist Deploy‑Output
	•	Overpass ist launisch, Code ist vorbereitet

Wenn du das verstanden hast, verstehst du das Projekt.
