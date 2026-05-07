# OpenFireMap Docker/K8s Learning Project: Vorgehensplan

## Ziel

Dieses Dokument hält den Umsetzungsplan für das spätere Projekt `openfiremap-dach-pipeline` fest.

Das Projekt soll eine optionale DACH-Datenquelle für OpenFireMap vorbereiten. Es ersetzt weder OpenFireMapV2 noch Overpass. Overpass bleibt Fallback und bleibt außerhalb von DACH die primäre Datenquelle.

## Grundsatz

Das Projekt wird schrittweise aufgebaut:

```text
Konzept -> Docker Dummy -> kleiner echter Datensatz -> DACH-Daten -> OpenFireMap-Testintegration -> Server Compose -> Kubernetes
```

Kubernetes kommt bewusst spät. Zuerst sollen Docker, Compose, Volumes, Logs, Datenformat und der Datenfluss praktisch verstanden werden.

## Empfehlung zur Ablage

Bevorzugt als eigenes Repository:

```text
openfiremap-dach-pipeline/
```

Vorteile:

- klare Trennung zwischen Frontend-App und Datenpipeline
- Docker- und Kubernetes-Lernen bleibt isoliert
- keine Vermischung mit dem GitHub-Pages-Build von OpenFireMapV2
- spätere Deployments sind einfacher

Falls das Projekt im bestehenden Repository bleiben soll, dann nur klar getrennt, zum Beispiel:

```text
experiments/openfiremap-dach-pipeline/
```

## Phase 0: Projektgrundlage

Ziel:

- eigenes Projektgerüst schaffen
- Ziel und Nicht-Ziele dokumentieren
- Agenten-Arbeitsweise festlegen

Geplante Struktur:

```text
openfiremap-dach-pipeline/
├─ README.md
├─ AGENTS.md
├─ docs/
│  ├─ architecture.md
│  ├─ roadmap.md
│  ├─ learning-notes.md
│  └─ operations.md
├─ infra/
│  └─ docker/
├─ scripts/
├─ data/
│  ├─ raw/
│  ├─ build/
│  └─ publish/
└─ tests/
```

Ergebnis:

- README beschreibt Ziel, Grenzen und Startbefehle
- AGENTS.md beschreibt Arbeitsregeln fuer KI-Agenten
- Roadmap ist nachvollziehbar
- noch keine komplexe Technik

## Phase 1: Docker-Compose-Dummy-MVP

Ziel:

- Container-Grundfluss verstehen
- gemeinsames Volume nutzen
- Daten per Webcontainer ausliefern

Komponenten:

- `builder`: schreibt eine Dummy-Datei nach `data/publish/objects.json`
- `web`: liefert `data/publish/` statisch aus
- gemeinsames Datenvolume

Erfolgskriterium:

```text
docker compose up
http://localhost:8080/objects.json
```

Die Datei soll im Browser abrufbar sein. Der Inhalt darf in dieser Phase Dummy-Daten enthalten.

## Phase 2: Datenvertrag definieren

Ziel:

- festlegen, welches Format OpenFireMap spaeter lesen soll
- Frontend und Pipeline lose koppeln

Empfehlung:

- GeoJSON als Startformat
- getrennte Dateien pro Objekttyp

Moegliche Ausgabe:

```text
publish/
├─ hydrants.geojson
└─ fire_stations.geojson
```

Spaeter optional nach Laendern getrennt:

```text
publish/
├─ de/
│  ├─ hydrants.geojson
│  └─ fire_stations.geojson
├─ at/
├─ ch/
└─ li/
```

## Phase 3: Kleiner echter OSM-Datensatz

Ziel:

- nicht sofort ganz DACH verarbeiten
- erst einen kleinen, kontrollierbaren Extract verwenden

Vorgehen:

- kleinen OSM-Extract laden oder lokal bereitstellen
- Hydranten filtern
- GeoJSON erzeugen
- Ausgabe validieren

Startobjekte:

- Hydranten
- Feuerwehrhaeuser

Empfehlung:

- zuerst einfache Python-Skripte nutzen
- Performance-Werkzeuge wie `osmium` erst spaeter ergaenzen, falls noetig

## Phase 4: DACH-Extracts

Ziel:

- Verarbeitung auf Deutschland, Oesterreich und Schweiz erweitern
- optional Liechtenstein ergaenzen

Entscheidung:

- Laender getrennt starten
- spaeter bei Bedarf DACH-Gesamtdateien oder Kacheln ergaenzen

Erfolgskriterium:

- wiederholbarer Build fuer DACH-Laender
- valide GeoJSON-Ausgaben
- Webcontainer liefert die Dateien aus

## Phase 5: OpenFireMapV2-Testintegration

Ziel:

- OpenFireMapV2 testweise gegen die neue statische Datenquelle lesen lassen
- Overpass-Fallback unveraendert erhalten

Geplante Datenquellen:

```text
auto
custom
overpass
```

Verhalten:

- innerhalb DACH bevorzugt `custom`
- bei Fehlern in `custom` Fallback auf `overpass`
- ausserhalb DACH weiter `overpass`
- manuelles Umschalten fuer Tests

Diese Phase sollte erst beginnen, wenn die Pipeline stabil statische Dateien liefert.

## Phase 6: Server mit Docker Compose

Ziel:

- erster Betrieb auf kleinem VPS
- ohne Kubernetes produktionsnahe Abläufe lernen

Vorgehen:

- kleiner Ubuntu- oder Debian-Server
- Docker Engine und Docker Compose Plugin
- Webcontainer oeffentlich erreichbar machen
- Datenbuild manuell oder per Cron starten

Erfolgskriterium:

- eine oeffentliche Daten-URL liefert GeoJSON-Dateien aus
- Logs, Neustarts und Updates sind praktisch verstanden

## Phase 7: Lokales Kubernetes

Ziel:

- denselben Stack lokal in Kubernetes abbilden
- Kubernetes-Grundobjekte praktisch lernen

Bausteine:

- Namespace
- ConfigMap
- PersistentVolume oder HostPath
- Job fuer Build
- Deployment fuer Web
- Service
- optional Ingress

Erfolgskriterium:

- derselbe Datenfluss laeuft lokal in Docker Desktop Kubernetes
- Logs, Services, Volumes und Deployments sind nachvollziehbar

## Phase 8: K3s auf Server

Ziel:

- K3s als leichtgewichtiges Kubernetes auf einem kleinen Server betreiben

Bausteine:

- CronJob fuer regelmaessigen Build
- Deployment fuer Web-Auslieferung
- Service
- Ingress
- HTTPS ueber Traefik oder cert-manager
- persistente Ablage fuer Publish-Daten

Erfolgskriterium:

- Datenbuild und Web-Auslieferung laufen auf K3s
- Domain und HTTPS funktionieren
- Betrieb ist dokumentiert

## Erste konkrete Arbeitspakete

1. Neues Repository `openfiremap-dach-pipeline` anlegen
2. README und AGENTS.md erstellen
3. Docker-Compose-Dummy-MVP bauen
4. Dummy-Datei per Webcontainer ausliefern
5. GeoJSON-Datenvertrag festlegen
6. kleinen echten OSM-Extract verarbeiten
7. Hydranten filtern
8. Feuerwehrhaeuser ergaenzen
9. DACH-Laender getrennt bauen
10. OpenFireMapV2 testweise an die neue Quelle anbinden

## Offene Fragen vor Umsetzung

- Eigenes GitHub-Repository oder Unterordner im bestehenden Repo?
- GeoJSON als verbindliches Startformat?
- Welches kleine Testgebiet soll zuerst verwendet werden?
- Sollen DACH-Laender von Anfang an getrennt gebaut werden?
- Soll der erste Build rein statisch bleiben oder eine kleine API vorbereiten?
