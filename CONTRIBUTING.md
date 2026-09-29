# Mitmachen

OpenFireMapV2 verbindet OpenStreetMap-Daten mit einer offenen clientseitigen Webanwendung. Beiträge sind willkommen, wenn sie nachvollziehbar, datensparsam und mit den OSM-Lizenzen vereinbar sind.

## Fehler melden

Öffne ein [GitHub Issue](https://github.com/FrnkMrz/OpenFireMapV2/issues) mit:

- kurzer Beschreibung und erwarteter Funktion
- konkreten Schritten zur Reproduktion
- Browser, Gerät und Sprache
- betroffener Region oder einem anonymisierten Permalink, falls relevant
- Konsolenfehlern ohne Zugangsdaten oder Tokens

Prüfe vor dem Erstellen, ob das Problem bereits gemeldet wurde.

## Verbesserung vorschlagen

Beschreibe bei größeren Änderungen zuerst den Anwendungsfall und die Auswirkungen auf Datenquellen, mobile Nutzung, Performance und Übersetzungen. Die Anwendung ist weltweit nutzbar; eine Pipeline-Optimierung für DACHLiLu darf nicht als geografische Erweiterung beschrieben werden.

## OSM-Daten korrigieren

Fehler in Feuerwachen, Hydranten oder Wasserstellen werden direkt in [OpenStreetMap](https://www.openstreetmap.org/) korrigiert, nicht in OpenFireMap. Nutze geeignete Editoren und belege Änderungen. Siehe [Datenquellen](docs/DATENQUELLEN.md).

## Code beitragen

1. Fork oder Branch auf Basis von `main` erstellen.
2. Änderungen klein und nachvollziehbar halten.
3. Bestehende Module und die zentrale Konfiguration verwenden.
4. Übersetzungen in allen Sprachdateien berücksichtigen.
5. Tests und Build lokal ausführen.
6. Pull Request mit Motivation, Teststatus und möglichen Einschränkungen eröffnen.

Kommentare und interne Dokumentation im Quellcode sind überwiegend deutsch; Commit-Nachrichten sollen kurz und beschreibend sein.

## Tests ausführen

```bash
npm ci
npm run lint
npm run i18n:check
npm run test:ci
npx playwright test
npm run build
```

Playwright kann je nach lokaler Umgebung einen laufenden Entwicklungsserver oder installierte Browser benötigen. Keine privaten IP-Adressen, Zugangsdaten oder Tunnel-Token in Issues, Commits, Tests oder Pull Requests aufnehmen.
