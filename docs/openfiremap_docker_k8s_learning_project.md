# OpenFireMap DACH Data Pipeline

## Zweck

Dieses Projekt ist mein technischer Lern- und Umsetzungsrahmen für eine neue, optionale Datenquelle für OpenFireMap.

Ziel ist **nicht**, die bestehende openfiremap.org-Lösung abzulösen. Ziel ist eine **zusätzliche DACH-Datenquelle**, die bevorzugt genutzt werden kann. Overpass bleibt als Fallback bestehen und weiterhin für Gebiete außerhalb von DACH.

Das Projekt dient zwei Zielen zugleich:

1. Eine belastbarere Datenversorgung für DACH aufbauen.
2. Docker und später Kubernetes praxisnah lernen.

## Lernansatz

Ich arbeite als **Orchestrator**.

Die eigentliche Umsetzung soll weitgehend durch **KI-Agenten** erfolgen, vor allem mit **Claude Code** und/oder **OpenCode**. Ich gebe Richtung, Architektur, Prioritäten und Review vor. Die Agenten erzeugen Code, Dateien, Tests, Infrastrukturdefinitionen und Dokumentation.

Meine Rolle:

- Zielbild festlegen
- Anforderungen formulieren
- Arbeitspakete schneiden
- Ergebnisse prüfen
- Entscheidungen treffen
- Deployment freigeben

Rolle der Agenten:

- Projektstruktur erzeugen
- Dockerfiles schreiben
- Compose-Setup bauen
- Build-Pipeline bauen
- Skripte für OSM-Datenverarbeitung schreiben
- Tests und Checks ergänzen
- Kubernetes-Manifeste vorbereiten
- Betriebsdoku mitschreiben

## Fachliches Zielbild

Für DACH sollen OSM-Daten regelmäßig aus regionalen Extracts eingelesen, gefiltert und als vorbereitete Datensätze veröffentlicht werden. Diese Datensätze sollen von OpenFireMap optional genutzt werden.

### Zielgebiet

- Deutschland
- Österreich
- Schweiz
- optional Liechtenstein

### Zielobjekte für den Start

- Hydranten
- Feuerwehrhäuser
- optionale Boundary-Daten

### Frontend-Ziel

OpenFireMap erhält später eine zusätzliche Datenquelle:

- `auto`
- `custom`
- `overpass`

Verhalten:

- In DACH bevorzugt `custom`
- Außerhalb DACH `overpass`
- Bei Fehlern in `custom` Fallback auf `overpass`

## Warum dieses Projekt sinnvoll ist

Öffentliche Overpass-Server sind für geteilte Nutzung gedacht und nicht ideal als Live-Backend für eine produktive Kartenanwendung. Für OpenFireMap ist eine vorbereitete DACH-Datenquelle daher mittelfristig die bessere Lösung. Docker eignet sich gut, um Anwendungen und ihre Abhängigkeiten reproduzierbar zu paketieren. Docker Compose ist für Multi-Container-Anwendungen gedacht. Docker Desktop bringt eine lokale Kubernetes-Umgebung mit. K3s ist eine leichtgewichtige, voll kompatible Kubernetes-Distribution und passt gut für Lernen und kleine Server. citeturn462957search0turn462957search3turn462957search1turn462957search2

## Lernpfad

### Phase 0: Architektur und Repo-Grundlage

Ziel:

- klares Zielbild
- saubere Verzeichnisstruktur
- Arbeitsweise mit KI-Agenten festlegen

Ergebnis:

- Git-Repository
- README
- Architektur-Skizze
- Task-Liste
- Agent-Regeln

### Phase 1: Lokal mit Docker arbeiten

Ziel:

- Container verstehen
- Images bauen
- Volumes nutzen
- Logs lesen
- lokale Build-Pipeline lauffähig machen

Geplante Komponenten:

- `builder` Container
- `web` Container
- gemeinsames Datenverzeichnis

Ergebnis:

- lokales `docker compose up`
- Build erzeugt Datendateien
- Web-Container liefert diese Dateien aus

Docker beschreibt Container als isolierte Prozesse mit allen benötigten Dateien. Compose definiert Multi-Container-Anwendungen in YAML und startet sie mit einem Befehl. citeturn462957search16turn462957search21

### Phase 2: Lokales Kubernetes verstehen

Ziel:

- Grundobjekte von Kubernetes lernen
- Deployments, Services, ConfigMaps, Volumes und Ingress verstehen
- denselben Stack lokal auf Kubernetes ausrollen

Vorgehen:

- Docker Desktop Kubernetes lokal aktivieren
- denselben Build- und Web-Stack in Kubernetes-Manifeste überführen

Docker Desktop enthält einen lokalen Kubernetes-Server und Client für Entwicklung und Tests direkt auf dem eigenen Rechner. citeturn462957search1turn462957search9

### Phase 3: Deployment auf kleinem Server

Ziel:

- ersten echten Linux-Server betreiben
- den Stack öffentlich erreichbar machen
- Logs, Dateien, Updates und Neustarts praktisch lernen

Vorgehen:

- kleinen VPS mieten
- zuerst Docker Compose deployen
- danach optional auf K3s umstellen

K3s bündelt die Kubernetes-Control-Plane in einer einzelnen Binärdatei, reduziert externe Abhängigkeiten und eignet sich gut für kleine Umgebungen. citeturn462957search2turn462957search6

### Phase 4: K3s auf dem Server

Ziel:

- denselben Stack mit Kubernetes auf dem Server betreiben
- Jobs, Deployments, Services und Ingress praktisch nutzen

Geplante Kubernetes-Bausteine:

- `Job` oder `CronJob` für Daten-Build
- `Deployment` für Web-Auslieferung
- `Service` für internen Zugriff
- `Ingress` für Domain und HTTPS
- `PersistentVolume` oder Host-Path für Datendateien

## Technische Zielarchitektur

### Startarchitektur

**Lokal und auf kleinem Server zuerst mit Docker Compose:**

- `builder`
  - lädt DACH-Extracts
  - filtert relevante OSM-Objekte
  - erzeugt vorbereitete JSON- oder GeoJSON-Dateien
- `web`
  - liefert die erzeugten Dateien aus
- `data volume`
  - gemeinsame Ablage für exportierte Daten

### Spätere Kubernetes-Architektur

- `builder-job`
- `web-deployment`
- `service`
- `ingress`
- `persistent storage`

## Geplanter Minimalumfang für MVP

Der erste MVP soll klein bleiben.

### Muss am Anfang können

- DACH-Extract laden
- Hydranten und Feuerwehrhäuser filtern
- statische Datendateien erzeugen
- Dateien lokal per Web-Container ausliefern
- OpenFireMap testweise gegen diese Quelle lesen lassen

### Muss am Anfang noch nicht können

- globale Abdeckung
- eigene Overpass-Instanz
- PostGIS
- Multi-Node-Kubernetes
- Hochverfügbarkeit
- automatische horizontale Skalierung
- perfektes Monitoring

## Empfohlener Stack für den Start

### Lokal

- macOS
- Docker Desktop
- Docker Compose
- Git
- Claude Code und/oder OpenCode

### Server später

- kleiner Ubuntu- oder Debian-VPS
- Docker Engine
- Docker Compose Plugin
- später K3s
- Nginx oder einfacher Web-Container

Docker Compose ist für das Definieren und Starten von Multi-Container-Anwendungen gedacht. Auf Linux wird Compose als Plugin für Docker Engine bereitgestellt. citeturn462957search3turn462957search13turn462957search11

## Repo-Struktur als Ausgangspunkt

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
│  ├─ docker/
│  │  ├─ builder.Dockerfile
│  │  ├─ web.Dockerfile
│  │  └─ docker-compose.yml
│  └─ k8s/
│     ├─ namespace.yaml
│     ├─ configmap.yaml
│     ├─ builder-job.yaml
│     ├─ web-deployment.yaml
│     ├─ service.yaml
│     └─ ingress.yaml
├─ scripts/
│  ├─ download_extracts.py
│  ├─ extract_features.py
│  ├─ build_tiles.py
│  └─ validate_output.py
├─ data/
│  ├─ raw/
│  ├─ build/
│  └─ publish/
├─ src/
│  └─ api_or_static_contract/
└─ tests/
```

## Arbeitsprinzip mit KI-Agenten

Dieses Projekt soll bewusst **agentisch** umgesetzt werden.

### Leitregel

Ich schreibe nicht jede Datei selbst.

Ich lasse Agenten die Umsetzung bauen und prüfe das Ergebnis. Ich führe, aber ich tippe nicht jeden Baustein von Hand. Das ist ausdrücklich Teil des Lernziels.

### Regeln für Claude Code / OpenCode

Die Agenten sollen:

- kleine, klar abgegrenzte Schritte liefern
- jede Änderung begründen
- neue Dateien vollständig ausgeben
- Shell-Befehle mitliefern
- Tests und Validierungen mitliefern
- bestehende Struktur achten
- keine unnötigen Plattformen einführen
- zuerst lokal lauffähig machen
- erst danach Server und Kubernetes ergänzen

Die Agenten sollen **nicht**:

- sofort auf PostGIS springen
- sofort auf echten Cluster-Betrieb mit mehreren Nodes springen
- eine eigene Overpass-Instanz bauen
- Architektur ohne Grund verkomplizieren
- mehrere neue Technologien gleichzeitig hineinziehen

## Definition of Done für die Lernphasen

### Phase 1 done

- Repository steht
- zwei Container laufen lokal
- Datendateien werden erzeugt
- Web-Container liefert Daten aus
- Build ist wiederholbar
- Start und Stop funktionieren per Compose

### Phase 2 done

- lokales Kubernetes ist aktiv
- derselbe Stack läuft in Docker Desktop Kubernetes
- ich verstehe Deployment, Service, Volume und Logs praktisch

### Phase 3 done

- kleiner VPS läuft
- SSH-Zugriff steht
- Docker-Deployment läuft öffentlich
- Daten können gebaut und ausgeliefert werden

### Phase 4 done

- K3s läuft auf dem Server
- Web-Komponente läuft als Deployment
- Build läuft als Job oder CronJob
- Domain und HTTPS funktionieren

## Offene Entscheidungen

Diese Punkte sollen am Anfang bewusst offen bleiben und später entschieden werden:

- JSON, GeoJSON oder gekacheltes Format?
- rein statische Auslieferung oder kleine API?
- ein DACH-Gesamtbuild oder Länder getrennt?
- täglicher Vollbuild oder später inkrementelle Updates?
- Host-Volume oder Persistent Volume im K8s-Betrieb?

## Erste konkrete Arbeitspakete

1. Neues Repository anlegen
2. `README.md` schreiben
3. `AGENTS.md` mit Arbeitsregeln für Claude Code / OpenCode anlegen
4. Docker-Compose-MVP definieren
5. `builder` Dockerfile erzeugen
6. `web` Dockerfile erzeugen
7. Dummy-Datenausgabe bauen
8. echten DACH-Download anschließen
9. ersten Datenfilter für Hydranten bauen
10. lokalen End-to-End-Test machen

## Startprompt für Claude Code oder OpenCode

```text
You are building a new hobby project called "OpenFireMap DACH Data Pipeline".

Goal:
Create a local-first Docker-based MVP that prepares OSM-derived DACH datasets for optional use in OpenFireMap.

Important constraints:
- Do not replace the existing OpenFireMap or Overpass logic.
- This project is an additional data source for DACH only.
- Overpass remains fallback and remains primary outside DACH.
- Start locally with Docker and Docker Compose.
- Kubernetes comes later.
- Keep the first MVP simple.
- No PostGIS in the first step.
- No own Overpass instance.
- Prefer static JSON/GeoJSON output.
- The human is the orchestrator. The agents do the implementation.
- Produce small, reviewable steps.
- For every step, create or update files completely and include run commands.

First task:
Create the initial repository structure, README.md, AGENTS.md, infra/docker/docker-compose.yml, a minimal builder Dockerfile, a minimal web Dockerfile, and a dummy data flow that writes a small JSON file and serves it locally.
```

## Schluss

Dieses Projekt ist zugleich Produktarbeit und Lernumgebung.

Es soll am Anfang klein, lokal und kontrollierbar bleiben. Erst danach geht es auf einen kleinen Server. Kubernetes kommt später, wenn Docker, Compose, Volumes, Logs und Deployments praktisch sitzen.

Ich baue das nicht allein per Hand. Ich arbeite bewusst mit KI-Agenten. Ich bin der Orchestrator. Die Agenten liefern die Umsetzung. Genau das ist Teil des Projekts.
