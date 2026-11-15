# Subprojekt: klassischer XYZ-Kachelserver für das Raster-Overlay

## Ziel

Ein bereits erzeugtes und nach R2 hochgeladenes Raster-PMTiles-Archiv soll zusätzlich über eine klassische PNG-Kachelvorlage abrufbar sein:

```text
https://tiles.openfiremap.org/hytiles/{z}/{x}/{y}.png
```

(Standard-Host ist die Subdomain, weil der Apex nicht über Cloudflare läuft; die Pfadvorlage `…/hytiles/{z}/{x}/{y}.png` bleibt bei einem späteren Host-Wechsel gleich. Siehe „Cloudflare und Domain“.)

Damit kann ALARMiator den Layer wie den früheren OpenFireMap-Endpunkt als XYZ-Kachelebene einbinden. Das PMTiles-Archiv bleibt die gespeicherte Quelle; der Endpunkt liest daraus nur die angeforderte Kachel und liefert ein PNG zurück. Das Subprojekt rendert in seiner ersten Stufe keine OSM-Daten und verändert weder den bestehenden Kartenclient noch die produktive Vektor-Pipeline.

## Stand der Umsetzung (15.11.2026)

Der Kachelserver läuft im Testbetrieb unter `https://tiles.openfiremap.org/hytiles/{z}/{x}/{y}.png` (nur Deutschland, Zoom 12–18). Worker, Runbook und Rauchtest liegen im privaten Pipeline-Repository (siehe „Repository-Grenze“).

| Paket | Stand |
| --- | --- |
| 0. Datei- und Domain-Check | Archiv und Manifest geprüft, Host `tiles.openfiremap.org` entschieden. Clientvertrag mit den Interessenten steht noch aus |
| 1–3. Gerüst, PMTiles-Adapter, Tests | umgesetzt und in der CI, 99 Tests; Kachel aus dem Live-Archiv ist byte-identisch zur Archivkachel |
| 4. Testbereitstellung | ausgerollt (Test auf `workers.dev`, Produktion auf der Custom Domain); Browser-Prüfseite getrennt von der Overlay-Demo, Letztere bleibt unverändert |
| 5. Produktionsroute und Betrieb | Subdomain live, Runbook (Ausrollen, Rollback, Fehlerbilder), Rauchtest und Betriebsstatistik vorhanden. Zugriffsschutz und Rate-Limit stehen aus |

**Abnahmebedingungen, soweit geprüft:** reale PNG-Kachel per HTTPS, Nutzung ohne PMTiles-Unterstützung, nur Bereichslesezugriffe, Abdeckung (Deutschland) und Zoomstufen dokumentiert, transparente Ersatzkacheln. **Noch nicht abgenommen:** Durchmesser im Raster für den Kartendruck, Kachelränder in Stichproben, Archivwechsel im Betrieb (erster automatischer Wechsel: Raster-Timer vom 16.11.2026), Zugriffsschutz, Monitoring über die Betriebsstatistik hinaus, Rollback des Archivs (das Vorgängerarchiv wird 120 s nach dem Wechsel gelöscht, Entscheidung 6).

**Zielweg:** Mittelfristig ist der effizientere Weg, das PMTiles-Archiv direkt von den Clients per HTTP-Bereichsabruf lesen zu lassen (oder als Vektorarchiv, das der Client selbst zeichnet). Dann braucht es keinen Kachelserver. Die klassische Kachel-URL bleibt als einfacher Weg für Clients ohne PMTiles-Unterstützung bestehen.

## Ausgangslage im OpenFireMap-Projekt

- Die Website wird statisch mit Vite gebaut und über GitHub Pages veröffentlicht. GitHub Pages kann eine feste Datei wie `z/x/y.png` ausliefern, aber keine beliebigen dynamischen XYZ-Pfade aus einem Archiv auflösen.
- Die Overlay-Demo beschreibt bereits ein transparentes Raster-PMTiles-Archiv und kann ein solches Archiv im Browser lesen. Die klassische XYZ-Vorlage braucht einen zusätzlichen Auslieferungsbaustein.
- Der Overlay-Build liest `https://raster-pilot.openfiremap.org/manifest.json`. Sein aktueller Clientvertrag erwartet `schema_version: 1`, einen versionierten Dateinamen der Form `germany-<64-stellige-SHA256>.pmtiles` und `published_at` im UTC-ISO-Format. Der Worker kann denselben versionierten Archivverweis übernehmen, statt eine zweite Dateiauswahl einzuführen.
- Beim Check am 15.11.2026 zeigte das Live-Manifest bereits auf `germany-2263aa2b1c86003c22615a56575176fe07fb0601c8880eeeda34598942957b74.pmtiles` (4.439.448.614 Bytes, veröffentlicht 2026-11-15 09:55:35 UTC); als vorherige Version war `germany-b2669752f956a3ddd22cbf258755504402648ede4fdf1949a19a23f50a076337.pmtiles` eingetragen. Das aktive Archiv ist also bereits hochgeladen und muss für den Server nicht erneut bereitgestellt werden. Die Größe macht es besonders wichtig, ausschließlich gezielte Range-Lesezugriffe zu verwenden und nie die ganze Datei pro Anfrage zu laden.
- Ein PMTiles-Archiv ist ein einzelnes Archiv mit internem Kachelverzeichnis. Die Bibliothek `pmtiles` kann `getZxy(z, x, y)` auf einer eigenen Datenquelle ausführen. Ein R2-Binding kann die notwendigen Bytebereiche lesen, ohne das gesamte Archiv in den Worker-Speicher zu laden.
- Der Header des aktiven Archivs wurde am 15.11.2026 per Range-Request (erste 127 Bytes) gelesen: PMTiles Version 3, Tile-Typ PNG, Zoom 12–18, Kachelkompression `none` (die PNGs können unverändert durchgereicht werden), Verzeichniskompression gzip, rund 2,56 Mio. Kacheln, Bounds ca. 5,87–15,04° O und 47,27–55,10° N. **Das Archiv deckt nur Deutschland ab**; die Schweiz und fast ganz Österreich fehlen.
- Stichprobe an echten Kacheln (15.11.2026, Nürnberg, Hamburg, Wien, Zürich, je z11/12/15/18, gelesen mit `pmtiles` 4.5.0 per Range-Request): alle gelieferten Kacheln sind gültige PNGs mit 256×256 Pixel, 8 Bit RGBA (Farbtyp 6), 1–25 KB groß. Wien und Zürich liefern auf allen Stufen keine Kachel, z11 liefert nirgends eine. Die Kachelgröße ist damit geklärt; offen bleibt nur die visuelle Prüfung der Symbolqualität.
- Lesekosten aus derselben Stichprobe: Root-Verzeichnis 2,9 KB, Leaf-Verzeichnisse zusammen 5,7 MB (gzip). Mit Header und Root im Speicher braucht eine vorhandene Kachel zwei Range-Reads (Leaf-Verzeichnis, Kachel), eine fehlende Kachel innerhalb der Bounds einen (Leaf), eine Koordinate außerhalb von Zoom oder Root-Bereich keinen. Liegt das Leaf-Verzeichnis schon im Speicher, bleibt nur der Kachel-Read.
- Die Archiv-Metadaten tragen `attribution: "© OpenStreetMap-Mitwirkende"`, `type: overlay`, `format: png`. Diese Werte kann eine TileJSON-Antwort übernehmen.
- **Das Vorgängerarchiv existiert nicht mehr:** Der im Manifest als `previous_file` genannte Name antwortete am 15.11.2026 mit 404. Der Veröffentlichungslauf des Raster-Jobs entfernt das alte Archiv kurz nach dem Umschalten des Manifests (Frist und Ablauf stehen im Veröffentlichungsskript unter `raster/` im Pipeline-Repository). `previous_file` ist also ein Verlaufseintrag, kein abrufbares Rollback-Ziel. Folgen für Cache, Manifest-TTL und Rollback siehe „Cache und Aktualisierung“.
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

**Repository-Grenze:** Dieses öffentliche Repository enthält nur den Vertrag (dieses Dokument: URL-Vorlage, API-Verhalten, Cache-/CORS-Regeln, Attribution) und eine spätere Client-Doku. Der Worker selbst (Quellcode, Wrangler-Konfiguration, Bucket-Binding, Deployment, Runbook, Monitoring) ist Betrieb und liegt im privaten Pipeline-Repository `FrnkMrz/openfiremap-dach-pipeline`, wie alle anderen Betriebsteile der Datenprodukte. Hier entsteht kein `tools/xyz-tile-server/` und keine Wrangler-Konfiguration. Der Worker liest nur aus R2. Die Cloudflare-Dokumentation (Stand 15.11.2026) nennt für R2-Bindings keine Nur-Lese-Option; „lesend“ wird deshalb im Code durchgesetzt: der Worker ruft am Bucket ausschließlich `get` und `head` auf, ein Test stellt sicher, dass im Quelltext kein `put`, `delete`, `list` oder Multipart-Aufruf vorkommt. Das ist auch betrieblich nötig: der Veröffentlichungslauf bricht ab, wenn im Raster-Bucket unerwartete Objekte liegen. Ein explizit veröffentlichter, unveränderlicher Archivname wird über ein Manifest oder eine Worker-Konfiguration ausgewählt. Benutzer dürfen über URL-Parameter keine beliebigen R2-Objekte oder Archive öffnen. Auch das Manifest gilt als Eingabe: der Dateiname wird vor der Verwendung als R2-Key gegen `^germany-[0-9a-f]{64}\.pmtiles$` geprüft, ein ungültiges oder nicht erreichbares Manifest lässt den zuletzt gültigen Stand weiterlaufen (kein Wechsel auf einen unbekannten Namen). „Zuletzt gültig“ existiert nur im Speicher eines Isolates. Ein frisch gestartetes Isolate ohne gültiges Manifest hat keinen Stand und antwortet mit 503 (siehe Fehlertabelle); es rät keinen Archivnamen und nutzt keinen fest eingetragenen Ersatz.

### Ausgangspunkt: Referenz-Worker von Protomaps

Das PMTiles-Projekt pflegt einen fertigen Cloudflare-Worker für genau diesen Zweck (`protomaps/PMTiles`, Verzeichnis `serverless/cloudflare`, BSD-3-Lizenz). Er enthält die drei Bausteine, die sonst neu zu schreiben wären, und dient als Vorlage:

- `R2Source` (implementiert `Source` aus `pmtiles`): `getBytes(offset, length, signal, etag)` ruft `env.BUCKET.get(key, { range: { offset, length }, onlyIf: { etagMatches: etag } })`, wirft `EtagMismatch`, wenn der Body fehlt, und einen eigenen Fehler, wenn das Objekt fehlt.
- `nativeDecompress`: entpackt gzip-Verzeichnisse mit `DecompressionStream("gzip")` (das Archiv nutzt gzip für die Verzeichnisse; ohne diese Funktion schlägt das Lesen im Worker fehl).
- `new ResolvedValueCache(25, undefined, nativeDecompress)` auf Modulebene als Speicher für Header und Verzeichnisse je Isolate, übergeben an `new PMTiles(source, CACHE, nativeDecompress)`.

Bewusste Abweichungen von der Vorlage:

| Vorlage | Dieser Worker |
| --- | --- |
| Archivname kommt aus dem URL-Pfad (`/{name}/{z}/{x}/{y}.{ext}`) | Archivname kommt nur aus dem validierten Manifest; der Pfad ist fest `/hytiles/{z}/{x}/{y}.png` |
| Fehlende Kachel: 204 ohne Body | Transparentes PNG mit 200 (Druck- und XYZ-Clients ohne 204-Behandlung) |
| Zoom außerhalb des Archivs: 404 | Transparentes PNG mit 200 |
| Cache-Schlüssel ist die Request-URL | Synthetischer Schlüssel mit Archivname |
| Fehlerantworten (404, 400) werden gecacht | Fehler werden nie gecacht |
| Ein `Cache-Control` für Edge und Browser | Lange Edge-Zeit, kurze Browser-Zeit |
| TileJSON unter `/{name}.json` | TileJSON unter `/hytiles.json` |
| Alle Kacheltypen | Nur PNG; ein Archiv mit anderem Typ gilt als Archivfehler (503) |

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
- `HEAD` liefert dieselben Metadaten ohne Body. `OPTIONS` wird nur dann ergänzt, wenn der Browser/WebView es für CORS benötigt (ein einfacher `GET` auf ein Bild löst keinen Preflight aus).
- Fehlerantworten für ungültige Pfade, ungültige Koordinaten und Archivfehler sind knapp, maschinenlesbar und enthalten keine Bucket- oder Pfadinterna. Ein Zoom außerhalb des Archivbereichs ist kein Fehler (siehe oben).

Verbindliche Antworttabelle (z, x, y sind Dezimalzahlen ohne Vorzeichen und ohne führende Nullen, also `^(0|[1-9]\d*)$`):

| Fall | Status | Body | Cache |
| --- | --- | --- | --- |
| Kachel im Archiv vorhanden | 200 | PNG-Bytes unverändert | Edge lang, Browser kurz |
| Gültige Koordinate, `0 ≤ z ≤ 22`, `0 ≤ x,y < 2^z`, keine Kachel (auch Zoom außerhalb des Archivs) | 200 | konstantes transparentes PNG 256×256 | Edge lang, Browser kurz |
| `If-None-Match` passt zum ETag | 304 | leer | wie 200 |
| Pfad passt zum Muster, aber `z > 22` oder x/y außerhalb des Gitters | 400 | `{"error":"invalid_tile"}` | `no-store` |
| Jeder andere Pfad (außer `/hytiles.json`) | 404 | `{"error":"not_found"}` | `no-store` |
| Andere Methode als `GET`/`HEAD` (und ggf. `OPTIONS`) | 405 mit `Allow` | `{"error":"method_not_allowed"}` | `no-store` |
| Kein gültiges Manifest, Archiv nicht lesbar, falscher Archivtyp | 503 mit `Retry-After: 30` | `{"error":"unavailable"}` | `no-store` |

Die Obergrenze `z ≤ 22` begrenzt die Rechenarbeit und den Schlüsselraum; Clients sollen `maxNativeZoom` 18 setzen und darüber hochskalieren.

### Metadaten (TileJSON)

```http
GET /hytiles.json
```

Liefert TileJSON 3.0 aus Header und Archiv-Metadaten: `tiles` (die URL-Vorlage auf dem eigenen Host), `minzoom`, `maxzoom`, `bounds`, `attribution`, dazu `version` mit `published_at` aus dem Manifest. Das ist die Statusantwort für Monitoring und die maschinenlesbare Attribution für Clients. Der Archivname steht nicht darin. Browser-Cache 60 s, kein Edge-Cache.

### Cache und Aktualisierung

- Erfolgreiche Kacheln erhalten einen `ETag`, abgeleitet aus Archivname plus z/x/y (Archive sind unveränderlich). Der Worker beantwortet `If-None-Match` mit 304.
- **Der Archivname gehört in den Edge-Cache-Schlüssel** (synthetischer Schlüssel mit Archivname, z, x, y). Dann ist der Edge-Cache je Archiv unveränderlich und kann lang sein; nach einem Archivwechsel bestimmt nur die Manifest-TTL (Startwert 60 s), wann neue Kacheln erscheinen. Ohne Archivname im Schlüssel bliebe ein altes Archiv bis zum Ablauf der Edge-Zeit sichtbar.
- Für den Browser gilt ein kurzer Cache (Startwert 5 Minuten, `ETag`-Revalidierung danach). Die Werte werden anhand der Updatehäufigkeit und Last angepasst.
- Leere/transparente Ersatzkacheln liegen im Edge-Cache unter demselben Schlüsselschema. Weil der Archivname im Schlüssel steht, ist auch „keine Kachel“ je Archiv unveränderlich; eine eigene kürzere Edge-Zeit ist dafür nicht nötig. Eine neue Abdeckung kommt immer mit einem neuen Archivnamen. Die Browser-Zeit ist für leere und vorhandene Kacheln gleich.
- Startwerte: Edge `max-age=86400` am gespeicherten Objekt, Browser `public, max-age=300`. Der Worker speichert die Antwort mit dem Edge-Wert und setzt beim Ausliefern (Treffer wie Neuaufbau) den Browser-Wert, den ETag und die CORS-Header neu. CORS-Header werden nie mitgespeichert (sonst bekäme eine zweite Origin die Freigabe der ersten); jede Antwort trägt `Vary: Origin`.
- Regeln der Cache API (Cloudflare-Dokumentation, geprüft 15.11.2026): `cache.put` nimmt nur `GET` an und lehnt Status 206 sowie `Vary: *` ab. Der synthetische Schlüssel ist deshalb immer ein `GET`-Request ohne Bedingungs-Header, z. B. `https://<host>/__tile/<archivname>/<z>/<x>/<y>.png` (der Pfad `/__tile/` ist von außen nicht abrufbar, er fällt unter 404). `HEAD` nutzt denselben Schlüssel und lässt nur den Body weg. Weil der Schlüssel keine Bedingungs-Header trägt, beantwortet der Worker `If-None-Match` selbst. Gespeichert wird mit `ctx.waitUntil(cache.put(...))`, damit die Antwort nicht darauf wartet.
- ETag-Form: stark, `"<erste 16 Hex-Zeichen der SHA-256 aus dem Archivnamen>-<z>-<x>-<y>"`; für die Ersatzkachel `"<dieselben 16 Zeichen>-empty"`.
- Jedes Archiv wird unter einem unveränderlichen Namen hochgeladen. Nach Prüfung wird nur der aktuelle Manifestverweis umgestellt.
- **Rollback (korrigiert):** Ein Zurückstellen des Manifests auf `previous_file` reicht heute nicht, weil das Vorgängerarchiv nach dem Umschalten gelöscht wird (Befund oben). Rollback heißt derzeit: das alte Archiv aus der lokalen Ablage der Build-VM erneut veröffentlichen, sofern es dort noch liegt. Ob der Veröffentlichungslauf das Vorgängerarchiv künftig bis zum nächsten Wechsel im Bucket behält (kostet rund 4,4 GB Speicher zusätzlich und muss zur Speichergrenze des Pilot-Buckets passen), ist offene Entscheidung 6.
- **Kopplung an die Löschfrist:** Zwischen Manifestwechsel und Löschen des alten Archivs liegt nur die Übergangsfrist des Veröffentlichungslaufs. Die Manifest-TTL des Workers (60 s) muss deutlich darunter bleiben. Zusätzlich gilt: meldet R2 für das gemerkte Archiv „nicht gefunden“, lädt der Worker das Manifest sofort neu (ohne TTL) und versucht die Anfrage genau einmal mit dem neuen Namen; scheitert auch das, 503. Wer die Frist im Veröffentlichungsskript ändert, muss die TTL mitprüfen; ein Kommentar an beiden Stellen hält das fest.
- Das Manifest wird über das R2-Binding gelesen (`manifest.json` im selben Bucket), nicht per HTTP. Geprüft werden `schema_version === 1`, der Dateiname gegen das Muster und `published_at` als UTC-ISO-Zeit, also derselbe Vertrag wie im Client (`overlay-page.js`, `raster-export.js`). Gleichzeitige Anfragen teilen sich einen laufenden Manifest-Abruf (ein gemerktes Promise), damit ein Druckauftrag nach TTL-Ablauf nicht dutzende Abrufe auslöst.
- Die Cloudflare-Dokumentation sagt nur, dass Worker auf eigenen Domains funktionierende Cache-Operationen haben; zu `workers.dev` steht dort nichts (geprüft 15.11.2026). Die Cache-Stichproben gehen deshalb nur auf einem eigenen Hostnamen. Der Code muss ohne Cache-Treffer korrekt arbeiten.
- Für den MVP wird kein manueller Purge für jede einzelne XYZ-URL vorausgesetzt.

### CORS und Attribution

- Der Layer muss von ALARMiators tatsächlicher Einbindungs-Origin aus erreichbar sein. Vor dem Rollout wird geklärt, ob ALARMiator die Kacheln nativ oder in einer WebView lädt.
- Bei Browser/WebView-Zugriff wird die benötigte Origin gezielt freigegeben; keine beliebigen Origins mit Credentials. Die CORS-Regeln des Workers sind die einzige Stelle für den XYZ-Weg; die R2-CORS-Allowlist des Pilot-Archivs betrifft nur den direkten PMTiles-Zugriff und muss dafür nicht erweitert werden.
- OpenStreetMap-Attribution und ODbL-Hinweis werden dokumentiert und in der ALARMiator-Einbindung sichtbar gehalten. Der Tile-Endpunkt selbst kann zusätzlich Attribution-Metadaten liefern, ersetzt aber keine sichtbare Quellenangabe auf der Karte.
- **CORS ist kein Zugriffsschutz.** Die CORS-Freigabe steuert nur, ob ein Browser einem Skript einer fremden Seite die Antwort zeigt. Normale Kachelbilder, Serverabrufe und `curl` ignorieren sie. Eine echte Beschränkung auf berechtigte Clients ist mittelfristig vorgesehen und läuft über Cloudflare vor dem Worker (Regeln nach IP-Adresse, Schlüssel oder Header; Auswahl nach der Abrufart der Clients), ergänzt um eine Mengenbegrenzung. Im Testbetrieb ist der Zugriff offen. Die Grenzwerte werden aus gemessener Nutzung abgeleitet (Betriebsstatistik ohne Koordinaten, Pfade und IP-Adressen).

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

- R2-Bucket beziehungsweise vorhandene Rasterablage mit lesendem Worker-Binding (Bucketname und Wrangler-Konfiguration gehören ins private Pipeline-Repository, nicht in dieses).
- Worker-Projekt (privates Pipeline-Repository), Testumgebung und ein Produktionsrelease. Wegen der CPU- und Request-Limits des kostenlosen Worker-Tarifs den bezahlten Plan einplanen; Druckläufe holen viele Kacheln in kurzer Zeit. Grenzen laut Cloudflare-Dokumentation (15.11.2026): kostenlos 100.000 Anfragen pro Tag, 10 ms CPU je Anfrage, 50 Subrequests je Anfrage; bezahlt keine Tagesgrenze, CPU-Standard 30 s, 10.000 Subrequests. R2-Zugriffe über das Binding und Cache-API-Aufrufe zählen als Subrequests; je Kachel fallen höchstens fünf an (Cache lesen, Manifest, Leaf, Kachel, Cache schreiben). Kritisch im kostenlosen Tarif ist die CPU-Zeit: das Entpacken eines gzip-Leaf-Verzeichnisses kann 10 ms überschreiten. Speicher je Isolate 128 MB in beiden Tarifen; 25 Verzeichnisse im `ResolvedValueCache` bleiben weit darunter.
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

Die Arbeitspakete 1–5 werden im privaten Pipeline-Repository umgesetzt (siehe „Repository-Grenze“). Hier bleiben nur dieses Dokument und die Client-Doku; nach Paket 4 und 5 wird der bestätigte Vertrag hier nachgeführt.

### Leitfaden für die Umsetzung der Pakete 1–3 (Agent)

Die Pakete 1–3 sind ohne Cloudflare-Zugang und ohne Antwort auf die offenen Entscheidungen umsetzbar und gehören in einen Pull Request im Pipeline-Repository. Die Pakete 0, 4 und 5 brauchen den Betreiber (Cloudflare-Konto, DNS, Absprache mit ALARMiator) und sind nicht Teil dieses Auftrags.

**Vor dem Start lesen (Pipeline-Repository):** `AGENTS.md`, das Veröffentlichungsskript des Raster-Jobs unter `raster/` samt seinem Test unter `tools/`, `.github/workflows/tests.yml`, `CHANGELOG.md`. In einem eigenen Worktree auf einem Branch `feature/xyz-tile-worker` arbeiten.

**Vorgaben, passend zum Bestand des Repositories:**

- Eigenes Verzeichnis für den Worker auf oberster Ebene mit eigener `package.json` (`"type": "module"`, `"private": true`) und eigener Lockdatei. Einzige Laufzeitabhängigkeit: `pmtiles`, exakt gepinnt auf die Version, die das Repository schon nutzt (4.5.0). `wrangler` nur als Entwicklungsabhängigkeit, ebenfalls exakt gepinnt.
- Reines JavaScript als ES-Module (`.mjs`), kein TypeScript und kein Build-Schritt, wie die übrigen Node-Werkzeuge des Repositories. Kommentare auf Deutsch.
- Aufteilung in kleine, einzeln testbare Module ohne Cloudflare-Globale:
  - Pfad und Koordinaten: `parseTilePath(pathname)` liefert `{ kind: 'tile', z, x, y }`, `{ kind: 'tilejson' }`, `{ kind: 'invalid_tile' }` oder `{ kind: 'not_found' }`.
  - Manifest: `createManifestReader({ bucket, ttlMs, now })` mit `current()` und `refresh()`; Validierung, TTL, geteilter laufender Abruf, „zuletzt gültig“.
  - R2-Quelle und Entpacken nach der Protomaps-Vorlage.
  - Antworten: Ersatzkachel (als Byte-Konstante im Quelltext, einmal erzeugt, im Test als 256×256 RGBA mit Alpha 0 geprüft), ETag, Header, Fehler-JSON.
  - `handleRequest(request, env, ctx, deps)`: `deps` enthält `cache` (Standard `caches.default`) und `now`, damit Tests beides ersetzen.
  - Einstiegsdatei: nur `export default { fetch }`, das `handleRequest` aufruft.
- Konfiguration über Wrangler-Variablen, nicht im Code: erlaubte Origins (kommagetrennt, Standard leer = kein CORS-Header), Edge- und Browser-Cachezeit, Manifest-TTL. Der Bucketname steht nur in der Wrangler-Konfiguration des privaten Repositories. Zwei Umgebungen (Test, Produktion), beide lesen denselben Bucket; Routen und Custom Domain bleiben auskommentiert, bis der Betreiber sie freigibt.
- Tests mit `node --test` (so laufen die vorhandenen `.test.mjs`), ohne Netzwerk und ohne produktives Archiv:
  - Falscher Bucket als Objekt mit `get(key, { range })` und `head`, gespeist aus einer kleinen eingecheckten PMTiles-Datei (wenige Kacheln auf z12–13, PNG, gzip-Verzeichnisse). Die Datei wird einmal mit der Python-Bibliothek `pmtiles` erzeugt, die der Packer des Raster-Jobs schon nutzt; das Erzeugungsskript wird mit eingecheckt, damit sie reproduzierbar bleibt. Der falsche Bucket zählt die Aufrufe.
  - Falscher Cache als `Map` mit `match`/`put`.
  - Pflichtfälle: jede Zeile der Antworttabelle; Byte-Gleichheit der gelieferten Kachel mit der Kachel aus der Testdatei; `HEAD` ohne Body mit gleichen Headern; 304; Ersatzkachel bei z11, z19 und fehlender Kachel; Pfade wie `/hytiles/12/1/1.png/`, `/hytiles/012/1/1.png`, `/hytiles/12/-1/1.png`, `/hytiles/12/1/1.jpg`, `/hytiles/12/1.5/1.png`; Manifest mit falschem Schema, falschem Namen, kaputtem JSON, fehlendem Objekt (jeweils: mit vorherigem gültigem Stand weiter, ohne vorherigen Stand 503); TTL-Ablauf mit gesteuerter Uhr; Archivwechsel ändert Cache-Schlüssel und ETag; „Archiv nicht gefunden“ führt zu genau einem Manifest-Neuabruf und Wiederholung; zweite Anfrage derselben Kachel trifft den Cache und löst keinen Bucket-Zugriff auf das Archiv aus; CORS-Header nur für erlaubte Origin und nie im gespeicherten Objekt; Quelltextprüfung auf verbotene Bucket-Methoden; Fehlerantworten enthalten weder Bucket- noch Archivnamen.
  - Tests dürfen nicht vom Kalendertag oder von „jetzt“ gegen feste Daten abhängen (Regel des Repositories).
- CI: im bestehenden Workflow einen Schritt ergänzen (Abhängigkeiten des Worker-Verzeichnisses installieren, `node --check` für die Module, `node --test`). Kein Deploy aus der CI.
- `CHANGELOG.md` unter `[Unreleased]` ergänzen. Kurzes README im Worker-Verzeichnis: Zweck, lokaler Start mit `wrangler dev` gegen einen lokalen Test-Bucket, Tests, Verweis auf dieses Dokument als Vertrag.

**Nicht tun:** kein `wrangler deploy`, keine DNS-, Routen- oder Bucket-Änderung, kein Zugriff auf produktive Zugangsdaten, keine Änderung am Veröffentlichungsskript (nur der Kommentar zur TTL-Kopplung; die Frage, ob das Vorgängerarchiv bleibt, ist Entscheidung 6), keine Änderung im öffentlichen Repository, keine Umkodierung oder Bildbearbeitung der Kacheln, kein Rate-Limit im Worker-Code (das regelt Cloudflare davor).

**Fertig ist der Auftrag, wenn:** alle Tests lokal und in der CI grün sind, `wrangler dev` lokal eine Kachel aus der Testdatei ausliefert (Abruf mit `curl`, PNG-Signatur und Header im PR-Text zeigen), und der PR-Text nennt, was offen bleibt (Pakete 0, 4, 5 und die offenen Entscheidungen). Stößt die Umsetzung auf einen Widerspruch zu diesem Dokument, gilt: anhalten, im PR beschreiben, nicht stillschweigend abweichen.

### 1. Isoliertes Worker-Gerüst

- Worker-Projekt im privaten Pipeline-Repository mit eigenem Paket und fest gepinnten Laufzeitabhängigkeiten anlegen.
- R2-Binding lesend konfigurieren; Test- und Produktionskonfiguration trennen.
- Request-Parser für genau `/hytiles/{z}/{x}/{y}.png` bauen.
- Koordinaten validieren, erlaubte Methoden festlegen und Fehlerantworten standardisieren.
- Upload/Archiv-Auswahl nicht über frei wählbare URL-Parameter zulassen.

**Ergebnis:** lokaler Worker startet und beantwortet ungültige Anfragen deterministisch.

### 2. PMTiles-Adapter und PNG-Ausgabe

- Eigene `pmtiles.Source`-Implementierung an das R2-Binding anbinden (Vorlage: `R2Source` und `nativeDecompress` aus dem Protomaps-Worker, siehe „Ausgangspunkt“).
- TileJSON unter `/hytiles.json` aus Header, Archiv-Metadaten und Manifest ausgeben.
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
- Kurze Runbook-Anleitung im privaten Pipeline-Repository ergänzen: Archiv validieren, versioniert hochladen, Manifest umschalten, Stichprobe abrufen, Rollback. Hier wird nur der öffentliche Vertrag nachgeführt.
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

1. **Gebiet (entschieden 15.11.2026):** Der Start deckt nur Deutschland ab (aktives Archiv, Header 15.11.2026). Ein DACH-Raster-Build ist dafür nicht nötig; er bleibt ein eigenes Datenaufbereitungs-Paket für später.
2. **Datenquelle (geklärt):** Das Live-Manifest zeigt auf ein Raster-PMTiles (Typ PNG, Zoom 12–18, unkomprimierte Kacheln). Typ und Zoomstufen passen zum Endpunkt; die Kachelgröße ist gemessen (256×256, RGBA); offen bleibt die visuelle Prüfung der Symbolqualität. Vektor-PMTiles kann dieser Raster-Endpunkt nicht direkt als PNG ausliefern.
3. **Symbolstil:** Soll der Kachelserver die Symbole unverändert aus dem Archiv übernehmen oder wird vor dem Test ein Raster-Build mit historischen Hydrantenzeichen und Durchmesserkennzeichnung benötigt? Der Server kann die Pixel einer gerenderten Kachel nicht nachträglich sinnvoll umstylen.
4. **Host (entschieden und ausgerollt 15.11.2026):** Der Apex ist nicht über Cloudflare geproxied, die Root-Route ist also nicht ohne DNS-Umbau möglich. Der Worker läuft deshalb auf der Subdomain `tiles.openfiremap.org` als Custom Domain; eine Apex-Umstellung bleibt eine bewusste, getrennte Entscheidung.
5. **Client:** Welche ALARMiator-Origin, Zoomgrenzen, Attribution und Updatefrequenz müssen im Test unterstützt werden? Dazu: kommt der Client mit transparenten Ersatzkacheln (200) zurecht, und fragt er über z18 hinaus an?
6. **Rollback:** Soll der Veröffentlichungslauf das Vorgängerarchiv bis zum nächsten Wechsel im Bucket behalten (schnelles Zurückstellen des Manifests, rund 4,4 GB mehr Speicher), oder bleibt Rollback ein erneutes Veröffentlichen des alten Archivs? Für einen produktiven Kachel-Endpunkt mit fremden Nutzern spricht viel für das Behalten.

Diese Entscheidungen blockieren das isolierte Worker-Gerüst nicht. Sie blockieren aber die Freigabe einer produktiven URL und die Aussage, dass der Layer inhaltlich dem alten Drucklayer entspricht.

## Bewusst nicht Bestandteil der ersten Stufe

- OSM-PBF-Verarbeitung oder regelmäßiger Raster-Renderer.
- Hydrantendurchmesser nachträglich aus Vektordaten in den Tile-Worker zeichnen.
- Getrennte PNG-URLs pro Objektklasse, sofern das Quellarchiv nur einen kombinierten Rasterlayer enthält.
- Betriebsdetails in diesem öffentlichen Repository: Worker-Code, Wrangler-Konfiguration, Bucketname, interne Hosts, Dateipfade und Zugangsdaten bleiben im privaten Pipeline-Repository.
- Änderung des OpenFireMap-Hauptclients.

Wenn Archivprüfung zeigt, dass der Durchmesser oder die gewünschte DACH-Abdeckung fehlt, wird zuerst ein eigenes Raster-Build-Arbeitspaket festgelegt. Danach bleibt der XYZ-Worker als stabiler, unveränderter Auslieferungsweg bestehen.
