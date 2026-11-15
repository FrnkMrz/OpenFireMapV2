# Subprojekt: klassischer XYZ-Kachelserver für das Raster-Overlay

## Ziel

Ein bereits erzeugtes und nach R2 hochgeladenes Raster-PMTiles-Archiv soll zusätzlich über eine klassische PNG-Kachelvorlage abrufbar sein:

```text
https://tiles.openfiremap.org/hytiles/{z}/{x}/{y}.png
```

(Standard-Host ist die Subdomain, weil der Apex nicht über Cloudflare läuft; die Pfadvorlage `…/hytiles/{z}/{x}/{y}.png` bleibt bei einem späteren Host-Wechsel gleich. Siehe „Cloudflare und Domain“.)

Damit kann ALARMiator den Layer wie den früheren OpenFireMap-Endpunkt als XYZ-Kachelebene einbinden. Das PMTiles-Archiv bleibt die gespeicherte Quelle; der Endpunkt liest daraus nur die angeforderte Kachel und liefert ein PNG zurück. Das Subprojekt rendert in seiner ersten Stufe keine OSM-Daten und verändert weder den bestehenden Kartenclient noch die produktive Vektor-Pipeline.

## Ausgangslage im OpenFireMap-Projekt

- Die Website wird statisch mit Vite gebaut und über GitHub Pages veröffentlicht. GitHub Pages kann eine feste Datei wie `z/x/y.png` ausliefern, aber keine beliebigen dynamischen XYZ-Pfade aus einem Archiv auflösen.
- Die Overlay-Demo beschreibt bereits ein transparentes Raster-PMTiles-Archiv und kann ein solches Archiv im Browser lesen. Die klassische XYZ-Vorlage braucht einen zusätzlichen Auslieferungsbaustein.
- Der Overlay-Build liest `https://raster-pilot.openfiremap.org/manifest.json`. Sein aktueller Clientvertrag erwartet `schema_version: 1`, einen versionierten Dateinamen der Form `germany-<64-stellige-SHA256>.pmtiles` und `published_at` im UTC-ISO-Format. Der Worker kann denselben versionierten Archivverweis übernehmen, statt eine zweite Dateiauswahl einzuführen.
- Beim Check am 15.11.2026 zeigte das Live-Manifest bereits auf `germany-2263aa2b1c86003c22615a56575176fe07fb0601c8880eeeda34598942957b74.pmtiles` (4.439.448.614 Bytes, veröffentlicht 2026-11-15 09:55:35 UTC); als vorherige Version war `germany-b2669752f956a3ddd22cbf258755504402648ede4fdf1949a19a23f50a076337.pmtiles` eingetragen. Das aktive Archiv ist also bereits hochgeladen und muss für den Server nicht erneut bereitgestellt werden. Die Größe macht es besonders wichtig, ausschließlich gezielte Range-Lesezugriffe zu verwenden und nie die ganze Datei pro Anfrage zu laden.
- Ein PMTiles-Archiv ist ein einzelnes Archiv mit internem Kachelverzeichnis. Die Bibliothek `pmtiles` kann `getZxy(z, x, y)` auf einer eigenen Datenquelle ausführen. Ein R2-Binding kann die notwendigen Bytebereiche lesen, ohne das gesamte Archiv in den Worker-Speicher zu laden.
- Der Header des aktiven Archivs wurde am 15.11.2026 per Range-Request (erste 127 Bytes) gelesen: PMTiles Version 3, Tile-Typ PNG, Zoom 12–18, Kachelkompression `none` (die PNGs können unverändert durchgereicht werden), Verzeichniskompression gzip, rund 2,56 Mio. Kacheln, Bounds ca. 5,87–15,04° O und 47,27–55,10° N. **Das Archiv deckt nur Deutschland ab**; die Schweiz und fast ganz Österreich fehlen. Kachelgröße (256 px) und Symbolqualität sind noch an echten Kacheln zu messen.
- Das Archiv ist **nicht privat**: `raster-pilot.openfiremap.org` liefert es öffentlich per Range-Request aus (die Overlay-Demo liest es im Browser; Browser-Zugriff ist über eine R2-CORS-Allowlist auf `https://openfiremap.org` und `http://localhost:5173` beschränkt). Die Archivantworten tragen `cache-control: no-store`; ein HTTP-Fetch des Workers gegen diese Domain würde also nie aus dem Edge-Cache bedient. Der Worker liest deshalb über das R2-Binding.
- `docs/OVERLAY.md` (auf `origin/main` und den Overlay-Branches, nicht auf allen Arbeitsbranches) verweist Betreiber von XYZ-Clients auf den PMTiles-Kachelserver oder einen eigenen Tile-Service und überlässt ihnen Hosting, TLS, Caching, Kapazität und CORS. Der Worker nimmt ihnen genau das ab; das ist die Begründung für einen eigenen Dienst statt `pmtiles serve` auf einer VM.
- Der Demo-Vertrag beschreibt Deutschland und Zoom 12–18, der Header bestätigt das. Für den gewünschten DACH-Bereich fehlt damit ein neuer Raster-Build (siehe unten).
- Der Rasterlayer enthält alle gerenderten Inhalte gemeinsam. Getrennte Ein-/Ausschalter für Hydranten, Löschwasserstellen, Wachen und AEDs sind in einem einzelnen Rasterarchiv nicht möglich.

## Vorgeschlagene Architektur

```text
ALARMiator / Browser
        │ GET /hytiles/{z}/{x}/{y}.png
        ▼
Cloudflare Worker auf der OpenFireMap-Domain
        ├─ prüft Pfad, Methode, Zoom und Tile-Koordinaten
        ├─ liest den aktuellen Archivverweis aus dem Manifest (R2-Binding, kurz gecacht, validiert)
        ├─ PMTiles-Leser fordert nur benötigte Bytebereiche an
        ├─ R2-Binding liest diese Bereiche aus dem Archiv
        └─ gibt image/png mit Cache- und CORS-Headern zurück
```

Der Worker liegt als abgegrenztes Quellprojekt unter `tools/xyz-tile-server/` mit eigener Abhängigkeit, Wrangler-Konfiguration, lokaler Entwicklungsanleitung und Tests. Er bekommt ausschließlich ein lesendes R2-Binding. Ein explizit veröffentlichter, unveränderlicher Archivname wird über ein Manifest oder eine Worker-Konfiguration ausgewählt. Benutzer dürfen über URL-Parameter keine beliebigen R2-Objekte oder Archive öffnen. Auch das Manifest gilt als Eingabe: der Dateiname wird vor der Verwendung als R2-Key gegen `^germany-[0-9a-f]{64}\.pmtiles$` geprüft, ein ungültiges oder nicht erreichbares Manifest lässt den zuletzt gültigen Stand weiterlaufen (kein Wechsel auf einen unbekannten Namen).

### Warum Worker plus PMTiles/R2

- Es wird kein dauerhaft laufender Tile-Server und keine zusätzliche VM benötigt.
- Die vorhandene PMTiles-Datei muss nicht entpackt und als Tausende einzelner PNG-Objekte kopiert werden.
- Der Worker liefert die standardisierte URL mit eigenen Cache-, CORS- und Fehlerregeln; die Clients müssen weder Range-Requests noch PMTiles können.
- Entwicklung und erster Funktionstest sind über eine Worker-Testadresse möglich. Erst nach erfolgreicher Prüfung wird die gewünschte Route auf der Produktionsdomain verbunden.

Ein dauerhaft laufender `pmtiles serve`-Prozess wäre eine mögliche Alternative, falls die Archivbibliothek im Worker nicht performant genug ist. Er bräuchte jedoch Hosting, Updates, Verfügbarkeitsüberwachung und TLS-Proxy. Diese Variante wird erst erwogen, wenn Messungen einen konkreten Grund dafür zeigen.

## API-Vertrag

### Kachelabruf

```http
GET /hytiles/{z}/{x}/{y}.png
```

- Koordinatensystem: Web Mercator, XYZ (nicht TMS mit umgedrehter Y-Achse).
- Ausgabe: `Content-Type: image/png`, transparente 256×256-Kachel.
- Der Zoombereich des Archivs (zurzeit 12–18) kommt aus dem Header, nicht aus fester Konfiguration.
- Ungültige Koordinaten (Zoom über dem Web-Mercator-Limit, x/y außerhalb des Gitters für dieses z, keine Ganzzahlen) werden mit 400 abgewiesen.
- Eine **gültige** Koordinate, zu der das Archiv keine Kachel hat, wird als transparentes PNG beantwortet. Das gilt ausdrücklich auch für Zoomstufen außerhalb des Archivbereichs (z. B. 5–11): ein Client, der den Layer auch bei kleinem Zoom anfragt, bekommt so keine Fehlerkacheln. Das entspricht dem Verhalten eines Overlay-Layers außerhalb der Abdeckung.
- `HEAD` liefert dieselben Metadaten ohne Body. `OPTIONS` wird nur dann ergänzt, wenn der Browser/WebView es für CORS benötigt.
- Fehlerantworten für ungültige Pfade, nicht unterstützte Zooms und Archivfehler sind knapp, maschinenlesbar und enthalten keine Bucket- oder Pfadinterna.

### Cache und Aktualisierung

- Erfolgreiche Kacheln erhalten einen `ETag`, abgeleitet aus Archivname plus z/x/y (Archive sind unveränderlich). Der Worker beantwortet `If-None-Match` mit 304.
- **Der Archivname gehört in den Edge-Cache-Schlüssel** (synthetischer Schlüssel mit Archivname, z, x, y). Dann ist der Edge-Cache je Archiv unveränderlich und kann lang sein; nach einem Archivwechsel bestimmt nur die Manifest-TTL (Startwert 60 s), wann neue Kacheln erscheinen. Ohne Archivname im Schlüssel bliebe ein altes Archiv bis zum Ablauf der Edge-Zeit sichtbar.
- Für den Browser gilt ein kurzer Cache (Startwert 5 Minuten, `ETag`-Revalidierung danach). Die Werte werden anhand der Updatehäufigkeit und Last angepasst.
- Leere/transparente Ersatzkacheln bekommen eine kürzere Cache-Zeit als vorhandene Kacheln, damit eine spätere Abdeckungsänderung nicht lange als leer erscheint.
- Jedes Archiv wird unter einem unveränderlichen Namen hochgeladen. Nach Prüfung wird nur der aktuelle Manifestverweis umgestellt (das Manifest führt `previous_file` bereits mit). Ein Rollback ist ein Zurückstellen auf den vorherigen Archivnamen.
- Hinweis: Die Cache API greift meines Wissens nicht auf `workers.dev`-Adressen. Die Cache-Stichproben gehen daher nur auf einem eigenen Hostnamen. Vor dem Festschreiben in der Cloudflare-Dokumentation prüfen.
- Für den MVP wird kein manueller Purge für jede einzelne XYZ-URL vorausgesetzt.

### CORS und Attribution

- Der Layer muss von ALARMiators tatsächlicher Einbindungs-Origin aus erreichbar sein. Vor dem Rollout wird geklärt, ob ALARMiator die Kacheln nativ oder in einer WebView lädt.
- Bei Browser/WebView-Zugriff wird die benötigte Origin gezielt freigegeben; keine beliebigen Origins mit Credentials. Die CORS-Regeln des Workers sind die einzige Stelle für den XYZ-Weg; die R2-CORS-Allowlist des Pilot-Archivs betrifft nur den direkten PMTiles-Zugriff und muss dafür nicht erweitert werden.
- OpenStreetMap-Attribution und ODbL-Hinweis werden dokumentiert und in der ALARMiator-Einbindung sichtbar gehalten. Der Tile-Endpunkt selbst kann zusätzlich Attribution-Metadaten liefern, ersetzt aber keine sichtbare Quellenangabe auf der Karte.

## Was für die Umsetzung gebraucht wird

### Eingabedaten und Freigabe des Archivs

Die PMTiles-Datei wird über das Overlay-Manifest referenziert und muss nicht im Website-Repository liegen. Für einen produktiven Endpunkt muss die dort referenzierte `.pmtiles`-Datei geprüft werden:

1. PMTiles-Version und Archivtyp (`PNG`) auslesen.
2. Zoomminimum, Zoommaximum, Bounds und XYZ/TMS-Schema verifizieren.
3. Abdeckung mit dem vereinbarten Gebiet vergleichen: Deutschland allein oder DACH inklusive Österreich und Schweiz (sowie gegebenenfalls Luxemburg/Liechtenstein).
4. Stichproben aus mehreren Regionen und Zoomstufen als PNG extrahieren und visuell ansehen.
5. Transparenz, Kachelgröße, Symbolanker, lesbare Hydrantendurchmesser und fehlende/leere Kacheln prüfen.
6. Dateigröße, Prüfsumme, Herkunft und Erstellungszeit im Veröffentlichungsmanifest festhalten.
7. Den vorhandenen versionierten Archivnamen aus dem Manifest übernehmen. Erst wenn später ein neues Archiv erforderlich ist, dieses unter einem unveränderlichen Namen ablegen und das Manifest nach erfolgreicher Prüfung umschalten.

Die Headerprüfung (Stand 15.11.2026) bestätigt Deutschlandabdeckung und Zoom 12–18 und belegt damit keine DACH-Abdeckung. Falls der erste ALARMiator-Rollout DACH umfassen muss, braucht es zusätzlich einen DACH-Raster-Build. Das ist eine getrennte Datenaufbereitungsaufgabe und keine Funktion des Kachelservers.

### Cloudflare und Domain

- R2-Bucket beziehungsweise vorhandene Rasterablage mit lesendem Worker-Binding (Bucketname gehört in die private Worker-Konfiguration, nicht in dieses Repository).
- Worker-Projekt, Testumgebung und ein Produktionsrelease. Wegen der CPU- und Request-Limits des kostenlosen Worker-Tarifs den bezahlten Plan einplanen; Druckläufe holen viele Kacheln in kurzer Zeit.
- Missbrauchsschutz für den öffentlichen Endpunkt (WAF-/Rate-Limit-Regel), Grenzwerte nach Messung.
- TLS/HTTPS für den öffentlichen Host.
- **Befund DNS (15.11.2026):** Die Nameserver von `openfiremap.org` sind Cloudflare, die A-Records des Apex zeigen aber direkt auf die GitHub-Pages-IPs (185.199.x), sind also nicht über Cloudflare geproxied. Eine Worker-Route auf `openfiremap.org/hytiles/*` setzt einen geproxten Record voraus; damit liefe die gesamte Website über Cloudflare (Risiko: Pages-Zertifikat, SSL-Modus, Caching der Seite). Das ist ein eigener Umbau mit Rollback-Plan, kein Nebeneffekt des Workers.
- **Standard daher:** `tiles.openfiremap.org/hytiles/{z}/{x}/{y}.png` als Worker Custom Domain. Die Root-Route bleibt Option und wird nur nach bewusster DNS-Entscheidung verfolgt. Ein ALARMiator-eigener Alias (z. B. `openfiremap.alarmiator.de`) kann später per CNAME auf denselben Dienst zeigen, sofern der ALARMiator-Betreiber diese Domain einrichtet.
- Zugangsdaten und interne Betriebswerte gehören in Cloudflare-Secrets beziehungsweise private Umgebungsvariablen, nie in dieses öffentliche Repository.

## Arbeitspakete

### 0. Datei- und Domain-Check

- Aktuelles Overlay-Manifest und die darin referenzierte Datei prüfen (derzeit bereits veröffentlicht; Dateiname nicht fest in den Worker schreiben).
- Archivmetadaten, Abdeckung, Zooms, Transparenz und Symbolqualität am vorhandenen Archiv verifizieren.
- Host entscheiden: Subdomain (Standard) oder Apex-Umstellung auf Cloudflare-Proxy (siehe Befund DNS).
- Mit ALARMiator den Clientvertrag bestätigen: XYZ, Tilegröße, Zoomminimum/-maximum, Attribution, erlaubte Origin, gewünschter Aktualisierungsrhythmus und die Zahl der Kacheln, die ein Druckauftrag gleichzeitig anfordert.

**Ergebnis:** dokumentierter Datenvertrag, bestätigter Host und Go/No-Go für den Test mit dem vorhandenen Archiv.

### 1. Isoliertes Worker-Gerüst

- `tools/xyz-tile-server/` mit eigenem Paket und fest gepinnten Laufzeitabhängigkeiten anlegen.
- R2-Binding lesend konfigurieren; Test- und Produktionskonfiguration trennen.
- Request-Parser für genau `/hytiles/{z}/{x}/{y}.png` bauen.
- Koordinaten validieren, erlaubte Methoden festlegen und Fehlerantworten standardisieren.
- Upload/Archiv-Auswahl nicht über frei wählbare URL-Parameter zulassen.

**Ergebnis:** lokaler Worker startet und beantwortet ungültige Anfragen deterministisch.

### 2. PMTiles-Adapter und PNG-Ausgabe

- Eigene `pmtiles.Source`-Implementierung an das R2-Binding anbinden.
- Bereichslesevorgänge durch R2-Range-Reads erfüllen; kein vollständiger Datei-Download in den Worker.
- PMTiles-Header beim Isolate-Start beziehungsweise beim ersten Zugriff validieren (Typ PNG, Version 3, Zoombereich) und wiederverwenden. Verzeichnisse (Root und Leaf) im Isolate und im Cache halten: eine kalte Kachel braucht sonst bis zu drei R2-Lesezugriffe (Header/Root, Leaf-Verzeichnis, Kachel).
- `getZxy(z,x,y)` aufrufen und die Bytes unverändert als PNG ausgeben (Kachelkompression ist `none`, keine Umkodierung).
- Fehlende gültige Kacheln und Zoom außerhalb des Archivbereichs als konstantes transparentes PNG zurückgeben.
- Cache-Control, ETag und Cache-Schlüssel aus dem Archivnamen der Manifestversion ableiten.

**Ergebnis:** eine bekannte Kachel aus dem Testarchiv kann über die XYZ-URL abgerufen und als Bild angezeigt werden.

### 3. Lokale und automatische Prüfungen

- Unit-Tests: Pfad-Parsing, z/x/y-Grenzen, ungültige Methoden, Zoom außerhalb des Archivbereichs (transparentes PNG, nicht 4xx), Fehler- und No-Tile-Verhalten, Manifest-Validierung (ungültiger Dateiname, Manifest nicht erreichbar → letzter gültiger Stand), `If-None-Match`/304.
- Archivintegration mit einer kleinen, eingecheckten Testdatei oder einer reproduzierbar erzeugten Mini-PMTiles-Datei.
- Prüfen: Antwortstatus, MIME-Type, PNG-Signatur, 256×256 Pixel, Transparenz, Cache-Header, `HEAD` und CORS.
- Stichprobe gegen die PMTiles-Quelle: gelieferte XYZ-Kachel muss byte-identisch zur extrahierten Archivkachel sein (der Worker kodiert nicht um).
- Last-/Latenzstichprobe mit wiederholten und kalten Kachelabrufen; R2-Bereichsabrufe pro Kachel erfassen.

**Ergebnis:** reproduzierbare CI- und lokale Prüfung ohne Zugriff auf produktive Archive.

### 4. Testbereitstellung

- Worker zuerst auf temporärer `workers.dev`-Adresse oder isoliertem Testhostname bereitstellen; Cache-Verhalten nur auf dem Testhostnamen messen (siehe Hinweis zur Cache API).
- Testworker das aktuelle Live-Manifest lesen lassen, ohne das Archiv zu kopieren oder umzubenennen.
- Im Browser die Overlay-Demo auf den Worker umstellen und Kachelränder, Zoom, Transparenz sowie Fehlverhalten prüfen.
- Falls ALARMiator testet, Test-URL und Attribution bereitstellen; noch keine stabile produktive URL kommunizieren.

**Ergebnis:** bestätigter Ende-zu-Ende-Test mit dem echten ALARMiator-Einbindungsweg.

### 5. Produktionsroute und Betrieb

- Mit `tiles.openfiremap.org` als Worker Custom Domain starten; die Pfadvorlage bleibt gleich.
- Die Route `openfiremap.org/hytiles/*` nur nach bewusster Umstellung des Apex auf den Cloudflare-Proxy aktivieren (siehe Befund DNS), nicht als Nebeneffekt.
- TLS, CORS, Cachezeiten, Statusantwort und Logs überprüfen.
- Kurze Runbook-Anleitung ergänzen: Archiv validieren, versioniert hochladen, Manifest umschalten, Stichprobe abrufen, rollback.
- Keine personenbezogenen oder vollständigen Request-URLs mit Koordinaten dauerhaft protokollieren; operative Metriken auf Status, Latenz, Cache-Hit und Fehlerklasse begrenzen.

**Ergebnis:** dauerhaft nutzbare HTTPS-XYZ-URL mit dokumentiertem Update- und Rollbackweg.

## Abnahmebedingungen

- Die vereinbarte URL liefert eine reale, gültige PNG-Kachel per HTTPS.
- Ein Client ohne PMTiles-Unterstützung kann den Layer mit der simplen XYZ-Vorlage nutzen.
- Der Worker liest nur kleine Archivbereiche und puffert nicht das gesamte Archiv.
- Deutschland/DACH-Abdeckung und Zoomstufen sind im veröffentlichten Archiv geprüft und dokumentiert.
- Fehlende Kacheln bleiben transparent; Kachelgrenzen oder versetzte Symbole sind in Stichproben nicht sichtbar.
- Der Durchmesser ist in den Rasterkacheln so erkennbar, wie ALARMiator ihn für den Kartendruck braucht.
- Attribution, CORS, Cache-Verhalten, Monitoring und Rollback sind festgelegt.
- Ein Archivwechsel erfordert keine Änderung an der ALARMiator-URL.

## Abgrenzung und offene Entscheidungen

1. **Gebiet:** Das aktive Archiv deckt nur Deutschland ab (Header 15.11.2026). Reicht das für den ersten Test, oder muss der erste Live-Stand direkt DACH abdecken? Dann ist zuerst ein DACH-Raster-Build nötig.
2. **Datenquelle (geklärt):** Das Live-Manifest zeigt auf ein Raster-PMTiles (Typ PNG, Zoom 12–18, unkomprimierte Kacheln). Typ und Zoomstufen passen zum Endpunkt; offen bleibt die Stichprobe zu Kachelgröße und Symbolqualität. Vektor-PMTiles kann dieser Raster-Endpunkt nicht direkt als PNG ausliefern.
3. **Symbolstil:** Soll der Kachelserver die Symbole unverändert aus dem Archiv übernehmen oder wird vor dem Test ein Raster-Build mit historischen Hydrantenzeichen und Durchmesserkennzeichnung benötigt? Der Server kann die Pixel einer gerenderten Kachel nicht nachträglich sinnvoll umstylen.
4. **Host:** Der Apex ist nicht über Cloudflare geproxied, die Root-Route ist also nicht ohne DNS-Umbau möglich. Entscheidung: Subdomain `tiles.openfiremap.org` als Standard, Apex-Umstellung nur bewusst und getrennt.
5. **Client:** Welche ALARMiator-Origin, Zoomgrenzen, Attribution und Updatefrequenz müssen im Test unterstützt werden?

Diese Entscheidungen blockieren das isolierte Worker-Gerüst nicht. Sie blockieren aber die Freigabe einer produktiven URL und die Aussage, dass der Layer inhaltlich dem alten Drucklayer entspricht.

## Bewusst nicht Bestandteil der ersten Stufe

- OSM-PBF-Verarbeitung oder regelmäßiger Raster-Renderer.
- Hydrantendurchmesser nachträglich aus Vektordaten in den Tile-Worker zeichnen.
- Getrennte PNG-URLs pro Objektklasse, sofern das Quellarchiv nur einen kombinierten Rasterlayer enthält.
- Betrieb im privaten Pipeline-Repository oder Veröffentlichung interner Pipeline-Hosts, Dateipfade und Zugangsdaten.
- Änderung des OpenFireMap-Hauptclients.

Wenn Archivprüfung zeigt, dass der Durchmesser oder die gewünschte DACH-Abdeckung fehlt, wird zuerst ein eigenes Raster-Build-Arbeitspaket festgelegt. Danach bleibt der XYZ-Worker als stabiler, unveränderter Auslieferungsweg bestehen.
