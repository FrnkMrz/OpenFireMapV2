# OpenFireMap-Overlay

Die eigenständige Seite liegt unter `/overlay/` und wird als Vite-Einstieg aus `overlay/index.html` gebaut. `src/js/overlay-page.js` verwendet Leaflet, die vorhandenen OFM-Symbole und die Pipeline-PMTiles für die Vektordemo. `src/js/raster-export.js` stellt die ZIP-Erzeugung für die Ausschnittsauswahl bereit.

## Lokale Entwicklung und Veröffentlichung

Für die Rasterdemo und den ZIP-Download die Seite lokal über den freigegebenen Entwicklungs-Origin aufrufen:

```sh
npm run dev -- --host localhost --port 5173
```

`VITE_RASTER_MANIFEST_URL` kann für einen abweichenden Manifest-Endpunkt gesetzt werden. Ohne Variable verwendet die Seite `https://raster-pilot.openfiremap.org/manifest.json`. Der Pages-Workflow setzt die Variable mit demselben Standardwert. Vite baut die Seite nach `docs/overlay/`.

Die Demo liest `schema_version`, `file` und `published_at` aus `manifest.json`. Der versionsgebundene Archivname darf nicht fest in die Seite eingetragen werden. Die Dateigröße für den Deutschland-Download kommt aus `Content-Length`; falls der Server sie nicht liefert, zeigt die Seite „Dateigröße nicht ermittelt“.

## Voraussetzungen für Browserzugriffe

Der Pilot erlaubt derzeit `https://openfiremap.org` und den lokalen Entwicklungs-Origin `http://localhost:5173`. Browserzugriffe einer fremden Website funktionieren erst nach einer gezielten R2-CORS-Freigabe für ihren exakten Origin (Schema, Host und gegebenenfalls Port, ohne Pfad). PMTiles liest Daten mit HTTP Range Requests; der R2-Endpunkt muss die benötigten `GET`/`HEAD`-Zugriffe und Range-Anfragen browserseitig zulassen. Diese Freigabe ist ein separater Betriebsschritt und wird durch diese Seite nicht geändert.

Vor einer breiteren Freigabe sollte die Overlay-Demo mit Browser-Entwicklertools und den R2-Metriken beobachtet werden. Beim Verschieben und Zoomen werden einzelne Bereichsanfragen ausgelöst; Zahl und Umfang der Lesezugriffe sollten vor und nach einer zusätzlichen Origin-Freigabe verglichen werden.

## PMTiles und XYZ

Die Rasterdatei ist ein PMTiles-Archiv mit transparenten PNG-Kacheln im XYZ-Schema und Zoomstufen 12–18. Es ist selbst keine klassische `{z}/{x}/{y}.png`-URL. Betreiber mit XYZ-Clients können das Archiv mit dem PMTiles-Kachelserver oder einem eigenen Tile-Service ausliefern. Dann verantworten sie selbst Hosting, TLS, Caching, Kapazität und CORS.

Auf der Karte ist `© OpenStreetMap contributors` anzugeben. Die Ausschnitt-ZIP enthält dieselbe Quellenangabe in `ATTRIBUTION.txt`.

## Abgrenzung der Datenprodukte

Die Demo bietet zwei unterschiedliche Ansichten, weil sie unterschiedliche Datenprodukte zeigt:

- **Raster-Overlay:** vorgerenderte transparente PNG-Kacheln in einem Raster-PMTiles-Archiv. Hydranten, Wachen und andere sichtbare Inhalte liegen gemeinsam in den Bildern; die Rasterdatei bietet keine OFM-Einzelschalter. Die Schalter innerhalb der Demo beziehen sich auf die separate Vektordemo.
- **OFM-Einzelebenen:** fachliche Vektordaten aus den bestehenden Pipeline-PMTiles, gerendert im Browser mit den OFM-Symbolen. Die Schalter filtern diese Vektoransicht.
- **Ortsplan-Grundkarte:** eigene Protomaps-Grundkarte für den Druck-Workflow. Feuerwehrdaten werden separat ergänzt. Sie ist weder das Raster-Overlay noch dieselbe Datei wie die Vektordaten der Hauptkarte.

Die Raster-PNGs sind fertig gerendert, aber ihre Symbolgestaltung und Zoomstufen sind Teil des Raster-Builds. Ein Darstellungsfehler in Zoom 17/18 muss daher im Raster-Renderer bzw. dessen veröffentlichtem Archiv behoben werden; das Umschalten auf OFM-Einzelebenen ändert die PNG-Kacheln nicht. Die Betriebsabläufe und Renderquellen sind im privaten Pipeline-Repository dokumentiert.
