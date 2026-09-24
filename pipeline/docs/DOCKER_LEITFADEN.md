# 🎓 Docker-Leitfaden & Architektur-Erklärung

Stand: September 2026

Dieses Dokument erklärt ausführlich und verständlich die Funktionsweise der **OpenFireMap DACH Data Pipeline**, wie Docker im Hintergrund arbeitet und wie dieses Setup auf andere Systeme portiert werden kann.

---

## 1. Das Problem und unsere Lösung

### Die Ausgangslage
Bisher hat OpenFireMap die Daten live von den **öffentlichen Overpass-Servern** abgefragt.  
* **Das Problem:** Diese Server sind oft überlastet, haben strikte Rate-Limits (Fehler 429), brechen bei großen Kartenausschnitten ab oder sind zeitweise offline.
* **Der falsche Weg:** Eine eigene Overpass-Datenbank aufzusetzen. Die benötigt für Deutschland 32 bis 64 GB RAM und Hunderte Gigabyte SSD – auf einer 4-GB-VM führt das unweigerlich zu Speicherüberläufen (OOM-Crashs).
* **Unsere Lösung:** Eine **statische Data Pipeline**. Wir laden einmalig einen Rohdatenauszug von Geofabrik herunter, filtern in C++ blitzschnell nur die feuerwehrrelevanten Punkte heraus (Hydranten, Wachen etc.) und legen sie als fertige `.geojson`-Dateien ab. Ein winziger Webserver liefert sie dann aus.

---

## 2. Wie funktioniert Docker? (Die Grundlagen)

### Was ist eigentlich ein Container?
Stell dir einen echten **Schiffscontainer** vor:
* Egal was drin ist (Möbel, Autos, Bananen) und egal auf welchem Schiff oder LKW er transportiert wird: Die Maße und Anschlüsse sind genormt.
* In der Softwarewelt ist ein **Docker-Container** ein isolierter Prozess. Er enthält nicht nur deinen Code, sondern sein **eigenes kleines Betriebssystem**, alle Systembibliotheken (wie C++ Libs) und Tools.
* **Der riesige Vorteil:** Es ist völlig egal, ob dein Host ein Debian 13, Ubuntu, ein Mac oder ein Cloud-Server ist. Der Container verhält sich **überall auf der Welt exakt gleich**.

### Image vs. Container
* **Image (Das Rezept / die Schablone):**  
  Wird über ein `Dockerfile` gebaut. Es ist die statische, unveränderliche Vorlage (wie eine ISO-Datei).
* **Container (Der Kuchen / die Ausführung):**  
  Eine lebende, laufende Instanz dieses Images. Wenn du ihn stoppst oder löschst, ist der Prozess beendet.

---

## 3. Was genau haben wir in Docker gebaut?

Wir haben **zwei getrennte Container** mit zwei völlig unterschiedlichen Aufgaben gebaut:

```
+-------------------------------------------------------------------------+
|                              VM 102                                     |
|                                                                         |
|  [Container 1: builder]                   [Container 2: web]            |
|  "Der Handwerker"                         "Der Kellner"                 |
|  - Python 3.12 + osmium-tool (C++)        - Nginx (Alpine Linux)        |
|  - Läuft nur bei Bedarf (Job)             - Läuft dauerhaft (Daemon)    |
|  - Lädt PBF & filtert Objekte             - Wartet auf HTTP-Anfragen    |
|               |                                         ^               |
|               v                                         |               |
|         +-----------------------------------------------+-----+         |
|         |            Gemeinsame Schublade (Volume)            |         |
|         |        /srv/docker/data/openfiremap/publish         |         |
|         |  (hydrants.geojson, fire_stations.geojson, ...)     |         |
|         +-----------------------------------------------------+         |
+-------------------------------------------------------------------------+
                                                          |
                                           Port 8080 <----+ (aus dem Heimnetz)
```

### Rolle 1: Der `builder` (Der Handwerker)
* **Image:** Basiert auf `python:3.12-slim` und installiert das C++ Werkzeug `osmium-tool`.
* **Arbeitsweise:** Er ist ein **Ephemerer Job** (flüchtig). Er startet, arbeitet ca. 18 Sekunden lang (Download, Filtern, GeoJSON schreiben) und **beendet sich danach selbst**.
* **Warum das schlau ist:** Während der restlichen 23 Stunden und 59 Minuten des Tages verbraucht dieser Container **0 % CPU und 0 MB RAM**!

### Rolle 2: Der `web` (Der Kellner / Nginx)
* **Image:** `nginx:alpine` (extrem schlank, verbraucht nur ca. **10 bis 15 MB RAM**).
* **Arbeitsweise:** Er läuft dauerhaft im Hintergrund (`restart: unless-stopped`).
* **Aufgabe:** Er kennt keine OSM-Rohdaten und keine Filter. Er sitzt einfach nur an **Port 8080** und serviert die fertigen GeoJSON-Dateien aus der Schublade an deinen Browser – extrem schnell, mit Gzip-Kompression und CORS-Headern.

---

## 4. Die Schlüssel-Konzepte: Volumes & Ports

### Das Volume (Die gemeinsame Schublade)
Wenn ein Container gelöscht wird, sind normalerweise alle Dateien in ihm verloren (*stateless*).  
Damit der `builder` dem `web`-Container Dateien übergeben kann, nutzen wir ein **Volume** (Mount):

```yaml
volumes:
  - /srv/docker/data/openfiremap/publish:/usr/share/nginx/html:ro
```
* `/srv/docker/data/openfiremap/publish` liegt als echter Ordner auf der NVMe-Festplatte deiner VM.
* Der `builder` hat Schreibrechte und legt dort `hydrants.geojson` ab.
* Der `web`-Container bekommt diesen Ordner als `/usr/share/nginx/html` eingehängt – aber als **`ro` (read-only)**. Er kann die Dateien nur lesen, aber niemals versehentlich löschen oder verändern.

### Port-Mapping (`8080:80`)
* Nginx lauscht innerhalb seines Containers auf dem Standard-Webport `80`.
* Wir sagen Docker: `ports: - "8080:80"`.
* Das bedeutet: Jeder Aufruf von außen an Port `8080` deiner VM (`192.168.178.152:8080`) wird von Docker automatisch in den Container auf Port `80` weitergeleitet.

### Docker Compose (Der Dirigent)
Statt dir lange, fehleranfällige Befehle wie:  
`docker run -d --name web -p 8080:80 -v /srv/...:/usr/... --restart unless-stopped nginx:alpine`  
merken zu müssen, steht alles sauber in der Textdatei **`docker-compose.yml`**.  
Ein einziges `docker compose up -d` liest diese Datei und baut das gesamte System exakt so auf, wie definiert.

---

## 5. Könntest du diesen Docker jetzt auch woanders hin deployen?

### **JA! Zu 100 % – genau dafür wurde Docker erfunden!**

Das ist der größte Vorteil von dem, was du heute auf GitHub gesichert hast. Du bist **nicht an deinen Proxmox-Server gebunden**.

### Wo könnte derselbe Stack laufen?

1. **Lokal auf deinem Mac:**
   * Docker Desktop auf dem Mac starten.
   * Repository-Ordner im Terminal öffnen.
   * `docker compose up -d web && docker compose run --rm builder`
   * Läuft sofort unter `http://localhost:8080`.

2. **Auf einem Cloud-VPS (z. B. Hetzner Cloud für 4 €/Monat):**
   * Kleinsten Debian-Server bei Hetzner anlegen.
   * `git clone https://github.com/FrnkMrz/openfiremap-dach-pipeline.git`
   * `docker compose up -d web && docker compose run --rm builder`
   * Schon ist deine OpenFireMap-Pipeline weltweit unter einer öffentlichen IP/Domain erreichbar!

3. **Auf einem Heim-NAS (Synology, QNAP, TrueNAS):**
   * Jedes moderne NAS hat eine Docker-Verwaltung. Compose-Datei reinkopieren -> läuft.

4. **Später auf Kubernetes (K3s):**
   * Container sind die atomaren Bausteine von Kubernetes. Derselbe `builder` und `web`-Container, den wir heute gebaut haben, kann 1:1 in einem Kubernetes-Cluster als *Pod* oder *CronJob* gestartet werden.

---

## 6. Zusammenfassung der Architektur

| Merkmal | Erklärung |
|---|---|
| **Zwei getrennte Container** | Trennung von schwerer Arbeit (Build) und leichter Auslieferung (Web). Spart 99 % RAM. |
| **Volumes genutzt** | Daten bleiben auf der VM erhalten, selbst wenn Container gelöscht oder aktualisiert werden. |
| **`osmium-tool` statt Overpass** | 41.000 Objekte in 18 Sekunden statt Serverüberlastung und OOM-Crashs. |
| **Cronjob auf VM-Ebene** | Der Build wird nachts automatisch als Docker-Kommando getriggert. |
| **Eigenes GitHub-Repo** | Dein Code ist gesichert, versioniert und kann mit einem `git clone` auf jeden beliebigen Server der Welt umgezogen werden. |
