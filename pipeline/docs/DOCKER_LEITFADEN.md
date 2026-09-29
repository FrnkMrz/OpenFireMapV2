# Docker-Leitfaden für die Pipeline

Die Pipeline besteht aus einem Builder und einem schlanken Webserver. Der Builder verarbeitet OSM-PBF-Extrakte, filtert feuerwehrrelevante Objekte und erzeugt statische PMTiles-, GeoJSON- und Metadaten-Dateien. Der Webserver liefert diese Dateien mit CORS und HTTP-Range-Unterstützung aus.

## Komponenten

```text
builder → publish/ → web (statische Dateien) → Cloudflare R2 → Browser
```

Es wird keine eigene PostGIS- oder Overpass-Datenbank benötigt. Das hält die Architektur portabel und reduziert den laufenden Ressourcenbedarf.

## Lokaler Test

Voraussetzung sind Docker und Docker Compose. Die Befehle werden aus dem Repository ausgeführt:

```bash
docker compose build
docker compose run --rm builder
docker compose up -d web
curl -s http://localhost:8080/metadata.json
```

Die lokale Adresse `localhost` ist nur ein Beispiel für einen Entwicklungsrechner. Öffentliche URLs, private LAN-Adressen und Zugangsdaten gehören nicht in Dokumentation oder Commits.

## Veröffentlichung

Ein erfolgreicher Build wird in einer geschützten Betriebsumgebung in den öffentlichen Objektspeicher synchronisiert. Die Reihenfolge sollte sein:

1. Artefakte vollständig bauen und prüfen.
2. PMTiles und optionale GeoJSON-Dateien übertragen.
3. Metadaten zuletzt veröffentlichen.
4. HTTP-Range-Requests, CORS und eine Stichprobe der Metadaten prüfen.

Interne Variablen und die genaue Umgebung sind in [OPERATIONS_INTERNAL.md](OPERATIONS_INTERNAL.md) nur als private Checkliste beschrieben.
