# Pipeline-Dokumentation

## Zweck

Die DACHLiLu-Pipeline bereitet OpenStreetMap-Daten für eine schnelle Darstellung in OpenFireMapV2 vor. Sie erzeugt statische Vektorkacheln und Metadaten; der Browser lädt davon nur die für den sichtbaren Ausschnitt benötigten Bereiche.

## Datenfluss

1. Regionale PBF-Extrakte werden aus der Geofabrik-Quelle bezogen.
2. Der Builder filtert feuerwehrrelevante Objekte und erzeugt PMTiles.
3. `metadata.json` beschreibt Version, Build-Zeit und Statistiken.
4. Cloudflare R2 stellt die Artefakte über HTTPS bereit.
5. Das Frontend prüft Version und Abdeckung und greift bei Problemen auf Overpass zurück.

## Öffentliche Qualitätsmerkmale

- HTTP-Range-Requests statt vollständigem Download der PMTiles-Datei
- CORS für den Browserzugriff
- Cache-Busting über die Pipeline-Version
- Erkennung einer nicht passenden oder veralteten PMTiles-Abdeckung
- Overpass-Fallback außerhalb DACHLiLu und bei Pipeline-Fehlern
- keine Veröffentlichung von Systemmetriken, Zugangsdaten oder internen Netzwerkdaten

## Aktuelle Größenordnung

Die DACHLiLu-Ausgabe umfasst rund 1,25 Millionen feuerwehrrelevante Objekte. Das PMTiles-Archiv ist etwa 514 MB groß. Diese Werte sind Momentaufnahmen; der aktuelle Build-Zeitstempel und detaillierte Statistiken stehen in `metadata.json`.

## Qualitätssicherung

Builder-Tests, Abdeckungsprüfungen und der Playwright-Performance-Test prüfen die wesentlichen Pfade. Änderungen an der Pipeline sollten zusätzlich mit `npm run build`, den Vitest-Tests und den E2E-Tests der Hauptanwendung validiert werden.

Betriebsnamen, private IP-Adressen, Benutzer, lokale Pfade, Snapshot-Namen und Geheimnisse gehören nicht in öffentliche Dokumente. Siehe [OPERATIONS_INTERNAL.md](OPERATIONS_INTERNAL.md) für die private Checklistenstruktur.
