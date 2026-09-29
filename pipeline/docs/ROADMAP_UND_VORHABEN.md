# Roadmap und technische Vorhaben

## Erreicht

- PMTiles-Vektorkacheln für DACHLiLu
- Auslieferung über Cloudflare R2
- HTTP-Range-Requests und CORS
- automatische Versionskennung und Cache-Busting
- Prüfung der Pipeline-Abdeckung mit Overpass-Fallback
- Integration in die weltweit nutzbare OpenFireMapV2-Webkarte
- 99 erfolgreiche Vitest-Tests und ein Playwright-Performance-Test

## Aktuelle technische Leitplanken

Die Pipeline soll statisch, nachvollziehbar und ressourcenschonend bleiben. Eine lokale VM 102 dient als Test- und Backup-Umgebung; private Betriebsdaten werden getrennt von der öffentlichen Projektdokumentation verwaltet.

## Mögliche nächste Schritte

- noch gezieltere Aktualisierung zwischen zwei Pipeline-Builds
- weitere Performance-Messungen für mobile Geräte und große Städte
- bessere Hinweise auf fehlende oder unvollständige OSM-Tags
- verständlichere Werkzeuge für OSM-Korrekturen aus der Kartenansicht
- optionale Offline-Funktionen nur nach sorgfältiger Prüfung von Aktualität und Einsatzrisiken

Neue Funktionen müssen die weltweite Overpass-Nutzung erhalten. Eine DACHLiLu-Optimierung darf nicht als Erweiterung der geografischen Abdeckung dargestellt werden.
