# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Neu
- **Pipeline-Statusseite unter `/status/`** (Deutsch und Englisch, Umschalter oben rechts; Sprache wie die Karte aus `ofm_lang`, sonst Browsersprache, `?lang=de|en` erzwingt eine): zeigt für alle veröffentlichten Karten, wann der OSM-Datenstand des Geofabrik-Auszugs war, wann die Karte hochgeladen wurde und wie dicht Hydranten pro Einwohner sind. Gruppen **DACH** (DE, AT, CH), **LuLi** (LU, LI), **Top 5** (die fünf Länder mit den meisten Hydranten außerhalb von DACHLiLu) und **Weitere Länder**. Bestandteile: Kennzahlen (Länder, Hydranten, Feuerwachen, Hydranten je 1.000 Einwohner, ältester Datenstand, letzter Upload), eine Karte je Gruppe, Zeitleiste OSM-Datenstand → Upload je Land, Balkendiagramm der Dichte, sortier- und durchsuchbare Tabelle aller Länder, eine Lauf-Tabelle je Gebiet (Datei, Upload, OSM-Datenstand, Verzug, Größe, Zoom, Objekte je Ebene; DACHLiLu als ein gemeinsamer Build mit Laufzeiten, Auszügen und PMTiles-Größe). Die Seite lädt `eu/regions.json` und `metadata.json` beim Öffnen direkt aus `pipeline.openfiremap.org` (CORS dort schon freigegeben) und aktualisiert sich alle 10 Minuten selbst, ein Cron ist nicht nötig. Fällt `metadata.json` aus, fehlen nur die fünf DACHLiLu-Länder und der Lauf-Abschnitt; fällt das Manifest aus, gibt es eine Fehlermeldung mit „Erneut versuchen“. Eigene Vite-Seite (`status/index.html`, `build.rollupOptions.input`), Code in `src/js/status/` (`model.js` rechnet, `texts.js` Texte und Formate, `charts.js` SVG, `load.js` Laden, `status.js` Einstieg), eigene CSP ohne Inline-Skript, ohne Tailwind, hell und dunkel. **Offene Punkte:** Die Einwohnerzahlen in `src/data/status-population.json` sind gerundete Schätzwerte (nicht amtlich) und werden auf der Seite als geschätzt bezeichnet. Hydranten, Wachen, Wasserstellen und Defibrillatoren je DACHLiLu-Land stammen aus einer einmaligen Zählung der Geofabrik-Auszüge vom 20.10.2026 (`src/data/status-dach-snapshot.json`), weil `metadata.json` nur Summen nennt; schreibt der Builder künftig `features.<ebene>.by_country`, hat das Vorrang. Laufzeiten gibt es nur für DACHLiLu, die Länder-Dateien veröffentlichen keine. Tests: `test/status-model.test.js`, `test/status-page.test.js` (Modell, Gruppen, Texte, Formate, Laden, CSP) und `tests/status.spec.js` (E2E mit abgefangenen Pipeline-Antworten, axe, Handy-Breite).

### Geändert
- **Europa: nur die Länder-Dateien öffnen, die ein Ausschnitt wirklich berührt**: Die Quellenwahl nutzte die Länder-RECHTECKE aus der Abdeckung, und die sind wegen Meeresrändern und Zipfeln groß: Frankreichs reicht bis Maastricht, Aachen und an den Rhein, Kroatiens bis Tarvisio, Norwegens bis Haparanda. Der Client öffnete deshalb Dateien, die im Ausschnitt nichts enthalten (leere Kacheln), und der erste Abruf einer großen Datei füllt den Cloudflare-Cache (Frankreich 171 MB: bis 15 s, nur kalt). Neu enthält `coverage/europe.js` grobe Umrisse je Land (`EUROPE_REGION_OUTLINES`, vom Pipeline-Repo erzeugt: Land auf 2 km vereinfacht, 5 km nach außen gepuffert, also immer größer als das Land); `requiredRegionIds(rect, regionBounds, regionOutlines)` verlangt zusätzlich zum Rechteck-Vorfilter, dass der Umriss den Ausschnitt schneidet (neu `isRectIntersectingPolygon` in `geometry.js`). Ohne Umriss eines Landes gilt weiter sein Rechteck (Rückfall), `loadEuropeData`/`getEuropeData` führen die Umrisse mit. Das wirkt auch auf die Eignung: Ein Ausschnitt braucht nur noch die Länder, die ihn berühren; fehlt ein weit entferntes Land im Manifest, bleibt der Ausschnitt in der Pipeline statt auf Overpass auszuweichen. Weil jeder Punkt der Abdeckung in einem Länderpolygon liegt und der Umriss das Polygon enthält, geht dabei keine Datenquelle verloren. **Gegen die echten Daten geprüft** (27 Grenzausschnitte, Zoom 16, jeweils mit und ohne Umrisse abgefragt, POI und Grenzlinien verglichen): in allen 27 identische Ergebnisse (0 fehlende Objekte oder Linien), in 9 davon weniger geöffnete Dateien (Maastricht und Aachen/Vaals ohne Frankreich, Venlo ohne Belgien, Tarvisio, Gorizia und Trieste ohne Kroatien, Tornio/Haparanda ohne Norwegen, Andorra ohne Frankreich, Derry ohne Großbritannien). Über ein Raster über Europa (21.263 Ausschnitte in der Abdeckung): im Mittel 0,99 statt 1,45 Länder je Ausschnitt, nie mehr als vorher, in 39 % weniger. Reine Meeresflächen (Bottnischer Meerbusen, Adria) bekommen jetzt keine Länder-Datei mehr und gehen über Overpass (dort gibt es keine Objekte). Der lazy Europa-Chunk wächst von 22,1 kB (gzip 8,7) auf 45,0 kB (gzip 17,0); das Haupt-Bundle bleibt gleich groß. Alle 17 E2E-Tests laufen lokal grün. Tests: 17 neue in `test/europe-outlines.test.js` (Geometrie, synthetische und echte Umrisse, alle 40 Länder an einem Ort erkannt, Raster-Eigenschaft), drei in `test/pipeline-europe.test.js` (Maastricht öffnet Frankreich weder Header noch Kachel, ohne Frankreich im Manifest bleibt Maastricht in der Pipeline, Paris öffnet Frankreich), Prüfung in `test/europe.test.js`; neun eingebaute Fehler werden alle erkannt. Gehört zu Pipeline-Repo-PR 50 (Generator-Version 5, `FrnkMrz/openfiremap-dach-pipeline#50`).

### Abhängigkeiten
- **Vite 8** (7.3.7 → 8.3.4, ersetzt Dependabot-PR 69). Vite 8 minifiziert CSS mit Lightning CSS; im Browser-Vergleich gegen das Live-CSS fielen zwei Unterschiede auf, beide behoben:
  - `backdrop-filter` vor `-webkit-backdrop-filter` (in `src/input.css`, 3 Stellen) ließ Lightning CSS nur die Präfix-Variante stehen. Chrome und Firefox zeigten Glas-Panels, Statusbox und Meldungen ohne Unschärfe (`backdrop-filter: none`). Jetzt in der üblichen Reihenfolge, Präfix zuerst.
  - Das neue Standardziel (Safari/iOS 16.4, Chrome 111) schreibt Media Queries als `(width>=768px)`, die iOS 16.0-16.3 ignoriert; das mobile Layout wäre dort weggefallen. `build.target` in `vite.config.mjs` hält das Ziel von Vite 7 (Chrome/Edge 107, Firefox 104, Safari/iOS 16).
  - Danach berechnete Styles von 307-312 Elementen bei 1440, 1024 und 375 px Breite (auch mit offenem Ebenen-Menü) identisch mit dem Live-CSS; Gegenprobe mit dem unkorrigierten Vite-8-CSS: 13-16 Abweichungen. Im CSS bleiben nur gleichwertige Umschreibungen (Hex-Farben, zusammengefasste `border`) und weggefallene `-moz-`/`-o-`-Präfixe, die die Zielbrowser nicht brauchen.
  - Neu `test/css-build.test.js`: baut die Seite mit `vite.config.mjs` und prüft beide Punkte im erzeugten CSS (beide Gegenproben schlagen an).
  - `vite.config.js` → `vite.config.mjs`, `vitest.config.js` → `vitest.config.mjs`: Vite 8 warnte bei jedem Build, dass ESM-Syntax in einer als CommonJS geladenen Datei steht (`package.json` hat `"type": "commonjs"`) und der künftige native Config-Loader das nicht unterstützt. `stripDevOnlyCspSources` liegt jetzt in `scripts/strip-dev-csp.mjs`; der benannte Export neben dem Default-Export in der Vite-Konfiguration erzeugte die Warnung `MIXED_EXPORTS`. Build-Ausgabe unverändert (gleiche Asset-Hashes).
- **Vitest 5**: `vitest` und `@vitest/coverage-v8` gemeinsam von 4.1.12 auf 5.0.5 (ersetzt die getrennten Dependabot-PRs 70 und 72, die einzeln an der exakten Peer-Abhängigkeit scheiterten). Keine Test- oder Konfigurationsänderung nötig. `dependabot.yml` bündelt `vitest` und `@vitest/*` künftig in einer Gruppe, auch bei Major-Versionen. Außerdem ist `version-update:semver-major` in der Tailwind-Ausnahme jetzt in Anführungszeichen: ungequotet ist der Doppelpunkt in einer YAML-Flow-Liste mehrdeutig (Ruby/Psych bricht ab).

### Sicherheit und Datenschutz (Review 17.10.2026)
- **Datenschutzerklärung an den tatsächlichen Datenfluss angepasst** (deutsch und englisch): Overpass wird nicht nur ohne vorberechnete Daten genutzt, sondern auch für den Abgleich mit den neuesten Änderungen (Live-Aktualisierung); Betreiber der Overpass-Server genannt (FOSSGIS e.V., Ausweichserver Kumi Systems); Nominatim liefert auch den Ortsnamen als Titelvorschlag beim Export (Kartenmitte wird übertragen); Esri und CARTO bei den US-Anbietern ergänzt.
- **CSP ohne Inline-Skript**: Die DPR-Skalierung liegt jetzt in `public/assets/boot/dpr.js` und wird erst nach der CSP geladen; vorher lief das Inline-Skript nur, weil es vor dem CSP-Meta-Tag stand. `http://localhost:*` und `ws://localhost:*` bleiben für den Dev-Server erhalten, der Produktions-Build entfernt sie (`stripDevOnlyCspSources` in `vite.config.js`). `overpass.openstreetmap.fr` aus `connect-src` entfernt (nicht genutzt, nur für freigeschaltete Nutzer). Neu `test/csp.test.js`: keine Inline-Skripte, CSP vor dem ersten Skript, alle Overpass-/Nominatim-/Pipeline-URLs und Kartenebenen aus `config.js` erlaubt, Build-Bereinigung.
- **Abhängigkeiten**: `canvas` (natives Paket, nur vom Bastelskript `test-canvas.js` genutzt) entfernt; Dev-Werkzeuge auf aktuelle Minor-Versionen (Vite 7.3.7, Vitest 4.1.12, Playwright 1.64.1, ESLint 10.13, Tailwind 3.4.19, PostCSS 8.5.30), `npm audit fix` (`source-map-js`), Override `postcss-selector-parser` 7.1.6 (erzeugtes CSS byte-identisch). Laufzeit-Abhängigkeiten weiter ohne Meldung; offen bleiben 5 Meldungen zu `braces` in Tailwind 3 (nur Build-Zeit, Behebung erst mit Tailwind 4).
- **Repo aufgeräumt**: veraltetes Build-Ergebnis in `docs/` (76 Dateien, Stand 10.10.) aus der Versionierung genommen, `docs/` versioniert nur noch Markdown (`.gitignore`); `archive/`, `test-canvas.js`, `test_oberkrumbach.js`, `test_marker.png` gelöscht; `SECURITY.md` ohne veraltete Versionsnummer; `.github/dependabot.yml` (wöchentlich gebündelt, Tailwind-Major ausgenommen).

## [v0.9.0] - 2026-10-17

**Europa:** Die schnelle PMTiles-Versorgung gilt jetzt nicht nur für DACHLiLu, sondern auch für 40 weitere europäische Länder (ohne Russland, Ukraine, Belarus, Türkei). Je Land gibt es eine eigene, wöchentlich neu gebaute Datei in Cloudflare R2 (zusammen etwa 634 MB, rund 1,0 Millionen Objekte plus 0,6 Millionen Grenzlinien), ein Manifest (`eu/regions.json`) verzeichnet die veröffentlichten Länder, und an Landesgrenzen öffnet die Karte mehrere Dateien zugleich. Wo keine Länder-Datei bereitsteht, bleibt Overpass die Datenquelle; `Config.pipeline.europe.enabled = false` schaltet Europa als Notbremse wieder ab. Die Pipeline selbst (Build, Cron, Überwachung in Home Assistant) liegt im privaten Pipeline-Repo. Die Einträge unten beschreiben die Client-Seite in der Reihenfolge ihrer Entstehung.

### Neu
- **Europa-Erweiterung eingeschaltet: 40 weitere Länder über PMTiles** (`Config.pipeline.europe.enabled` jetzt `true`): Für Ausschnitte in den 40 europäischen Ländern der Pipeline (jeweils eine eigene Datei, wöchentlich neu gebaut; ohne Russland, Ukraine, Belarus, Türkei) nutzt die Karte die schnellen PMTiles aus Cloudflare R2 statt Overpass, an Landesgrenzen mehrere Dateien zugleich. Alle Voraussetzungen sind erfüllt: alle 40 Länder veröffentlicht (Manifest, 634 MB, größte Datei Frankreich 171 MB), Texte und Datenstand-Anzeige (#60), Gemeindegrenzen an Landesgrenzen nur einmal (#61), Überwachung in Home Assistant (Pipeline-Repo), Cron `0 1 * * *`. Gegen die echten Daten geprüft (außerhalb von Vitest): Paris, Rom, Madrid, London, Oslo, Warschau, Athen, Lissabon, Stockholm, Dublin, Budapest, Valletta und Reykjavik laden mit Objekten, Kiew bleibt bei Overpass; Grenzfälle Maastricht (BE+FR+NL), Görlitz/Zgorzelec (PL), Tarvisio (HR+IT+SI), Straßburg/Kehl und Basel funktionieren, Flensburg, Salzburg und Lindau bleiben beim DACHLiLu-Weg. Der erste Abruf eines Gebiets ist kalt langsamer (Paris 16,8 s, Aachen/Vaals 14,8 s), danach liefert der Cloudflare-Cache (Paris 235 ms). Bekannt: Das Frankreich-Rechteck reicht bis Benelux und Rhein, daher öffnet der Client dort die Frankreich-Datei mit (leere Kacheln). **Notbremse:** `enabled: false` in `src/js/config.js`, dann gilt wieder nur DACHLiLu. README und Docs (Architektur, FAQ, Erste Schritte) nennen jetzt die Europa-Abdeckung. Beim Prüfen im Browser fiel auf: Der allererste Abruf nach dem Start (Start-Ort in Europa) ging über Overpass, weil Manifest und Abdeckung beim ersten Prüfen noch luden. Bei überlasteten Overpass-Servern (jeder Mirror wartet bis zu 25 s) hing die Karte minutenlang auf „LÄDT…", obwohl die Länder-Dateien bereitstanden. Neu: `ensureEuropeReady()` in `pipeline.js` wartet vor der Eignungsprüfung (höchstens `manifestTimeoutMs`, 3 s) auf die Europa-Daten, aufgerufen in `fetchOSMData` und `fetchBoundaryData`; kein Warten für DACHLiLu-Ausschnitte, grob außerhalb Europas (`Config.pipeline.europe.roughBounds`, Codex-Befund: Nutzer in Nordamerika oder Asien hätten bei langsamem `pipeline.openfiremap.org` bis zu 3 s gewartet; ein Test stellt sicher, dass jedes Länder-Rechteck in der Umrandung liegt), bei Zoom unter 12, wenn Daten schon da sind und nach einem Fehler innerhalb von `manifestRetryMs`. Der Test zum Auslieferungszustand erwartet `enabled: true`; neu ein Test der Notbremse und zehn Tests zum Warten (alle eingebauten Fehler außer einem gleichwertigen erkannt). `ensureEuropeReady()` liefert nur dann ein Promise, wenn wirklich gewartet wird (sonst `null`, kein zusätzlicher Wartepunkt, der bisherige Ablauf bleibt unverändert); wurde der Abruf währenddessen überholt (Schwenk/Zoom), startet er keine PMTiles-Arbeit mehr (zweiter Codex-Befund). **E2E (Playwright):** Die Overpass-Tests nutzten Paris als „außerhalb DACHLiLu“; Paris ist jetzt Europa und läuft über die Pipeline, deshalb stehen sie auf New York (außerhalb Europas, gleiche Verschiebung für Koordinaten und Bereichsprüfungen). Neu ein E2E-Test mit den echten Daten: Paris lädt über Manifest und Frankreich-Datei, Quelle `pipeline`/`europe`, Overpass nicht vor den Daten. Alle 17 E2E-Tests laufen lokal grün.
- **Europa-Erweiterung: Gemeindegrenzen an Landesgrenzen werden nicht doppelt gezeichnet (Schalter aus, für Nutzer unverändert)**: Ein Gemeindegrenz-Weg auf einer Landesgrenze liegt in den Auszügen beider Länder (Geofabrik schneidet mit ganzen Wegen, die Kacheln tragen keine OSM-ID für Grenzen) und kam bisher aus beiden Dateien an. Gemessen an echten Daten (DACHLiLu gegen Niederlande, vier Grenzabschnitte mit je 49 Kacheln): 29 von 30 bis 32 von 32 Linien in der Niederlande-Datei waren geometrisch identisch zu einer DACHLiLu-Linie (Venlo/Kaldenkirchen 29, Enschede/Gronau 29, Kranenburg 32, Vaals/Aachen 46), dazu wenige teilweise überlappende. Über die ganze Abfrage geprüft (echte Daten, Ausschnitt bei 51,70° N / 6,02° O, Zoom 15): ohne Abgleich 8 Linien, davon 4 doppelt, mit Abgleich 4. Neu: `boundaryLineSignature()` (Koordinaten auf 1e-5 Grad gerundet, richtungsunabhängig); `fetchPipelineBoundaries` merkt je Kachel, aus welcher Datei eine Linie zuerst kam, und lässt dieselbe Linie aus einer anderen Datei weg (DACHLiLu vor den Ländern, Länder in Reihenfolge). Innerhalb einer Datei und im DACHLiLu-Einzelquellen-Weg wird nichts entfernt. Gilt auch für Länder, die nur über den Ring in eine sichtbare Kachel ragen. Bekannte Grenze: Teilweise überlappende Linien (anders aufgeteilte Wege) bleiben als zwei Linien stehen. Tests in `test/pipeline-europe.test.js` (70 gesamt): gleiche Geometrie DACHLiLu/Land, umgekehrte Richtung, zwei Länder, verschiedene Linien bleiben, innerhalb einer Datei bleiben beide, DACHLiLu-Weg unverändert, Ring-Land, und die Kennung selbst; fünf von sechs eingebauten Fehlern werden erkannt (der sechste, Abgleich global statt je Kachel, ist mit den Test-Mocks nicht unterscheidbar, weil sie in jeder Kachel dieselbe Geometrie liefern).
- **Europa-Erweiterung: Datenstand-Anzeige und Texte (Schalter aus, für Nutzer unverändert)**: Sind Länder-Dateien beteiligt, nennt das Popover „Europa-Vektorkacheln (Cloudflare Edge)" statt „DACHLiLu Vektorkacheln", als Untergrund „Wöchentlicher Länderauszug (ältester Stand der beteiligten Länder)" und einen Hinweis auf wöchentliche statt tägliche Geofabrik-Auszüge (neue Schlüssel `data_source_pipeline_europe`, `data_base_sub_europe`, `data_info_hint_europe`, in allen 30 Sprachen übersetzt; Test, dass sie überall da und übersetzt sind). `State.dataStatus.sourceScope` (`dachlilu`|`europe`) schaltet das um und gilt nur für Pipeline-Daten; der Hinweis-Absatz bekommt dafür eine ID und bleibt bei Sprachwechsel richtig. Der angezeigte Stand ist der älteste Stand aller beteiligten Länder (`pipelineMeta.osmDataStand`), auch wenn er für ein Overpass-Delta zu alt ist (Delta aus, Anzeige weiter ehrlich): bisher wäre in diesem Fall „Aktuell" erschienen. `pipelineMeta.regions` nennt die beteiligten Länder-Dateien (DACHLiLu zählt nicht dazu). `api.js` reicht das Ergebnis an die Anzeige durch (kleine Änderung, DACHLiLu-Weg unverändert). Tests in `test/data-status.test.js`, `test/progressive-render-state.test.js`, `test/pipeline-europe.test.js` und neu `test/lang-europe-keys.test.js`; eingebaute Fehler (10 Stück) werden erkannt.
- **Europa-Erweiterung: `pipeline.js` kann mehrere Dateien abfragen (Schalter aus, für Nutzer unverändert)**: `isPipelineEligible` gilt jetzt für DACHLiLu (unveränderte Prüfung) ODER Europa (`europe.js`, nur mit `Config.pipeline.europe.enabled` und geladenen Daten, sonst wie bisher `false`). `fetchPipelinePmtiles` und `fetchPipelineBoundaries` bestimmen ihre Quellen über `planPipelineSources`: Liegt der Ausschnitt in DACHLiLu oder ist Europa aus bzw. nicht geeignet, bleibt es exakt beim bisherigen Weg (eine Datei, Abdeckung gegen den Header geprüft, `PmtilesCoverageMismatch`). Nur wenn DACHLiLu allein nicht reicht und Europa den Ausschnitt bedienen kann, werden DACHLiLu (wenn berührt) plus die Länder-Dateien aus dem Manifest geöffnet; Quellen, deren Header den Ausschnitt nicht berührt, entfallen; scheitert das Öffnen einer Quelle, wirft die Abfrage (Rückfall auf Overpass statt lückenhafter Daten). Punkte werden quellenübergreifend per `type:id` zusammengeführt. Grenzstücke aus Länder-Dateien tragen die Kennung des Landes vor der ID (`netherlands:17771@14/…`), weil `feat.id` (`--generate-ids`) je Datei von vorn zählt und sonst Grenzstücke verschiedener Dateien einander überschreiben würden; DACHLiLu behält die bisherigen IDs. `getVectorTile` bekommt einen Quellenbereich (`scope`) für den Kachel-Cache. Ein Kachelfehler in einer Quelle verwirft nur deren Kachel (Warnung), nicht die der anderen. `getPipelineOsmDataUntil(ergebnis)`/`getPipelineGeneratedAt(ergebnis)` liefern für ein Ergebnis über mehrere Quellen den ältesten Stand aller beteiligten Dateien (am Ergebnis als `pipelineMeta`, nicht global: eine überholte Anfrage kann den Stand einer neueren nicht überschreiben; `api.js` reicht das Ergebnis durch); fehlt einer, ist er unbekannt, und ist er älter als `Config.pipeline.europe.liveDeltaMaxAgeDays` (10 Tage, Länder werden wöchentlich gebaut), gibt es keinen (kein Overpass-Delta). Der Pufferring um den Ausschnitt wird nur geladen und als abgedeckt gemeldet, wenn der ganze Ring von veröffentlichten Ländern bedient wird (`planRingSources`); sonst bleibt die Abdeckung beim sichtbaren Ausschnitt, damit eine kleine Bewegung in ein noch nicht geladenes Land nicht als „schon da" gilt. Dateien, die nur der Ring berührt, werden für die Ring-Kacheln geöffnet und gehen in den Datenstand ein; ragen sie in eine sichtbare Kachel (eine Kachel ist größer als der Ausschnitt), werden sie auch für diese Kachel abgefragt, denn die Kachelgrenzen gelten danach als abgedeckt. Gibt es keinen Ring, gilt nur der Ausschnitt selbst als abgedeckt. Dasselbe gilt mit Europa an für einen DACHLiLu-Ausschnitt, dessen Pufferring über die DACHLiLu-Grenze in ein veröffentlichtes Nachbarland ragt (sonst blieben die Daten des Nachbarlandes nach einer kleinen Bewegung über die Grenze aus); mit Europa aus bleibt der Ring unverändert. Die Header der gewählten Quellen müssen den Ausschnitt (bzw. den Ring) zusammen vollständig abdecken, sonst `PmtilesCoverageMismatch` (Overpass) bzw. kein Ring: eine teilweise veröffentlichte Datei darf nicht als geladen gelten. Die Planung des Rings läuft parallel zu den sichtbaren Kacheln und wird erst danach abgewartet (höchstens `Config.pipeline.europe.ringPlanTimeoutMs`, 1500 ms; danach gibt es keinen Ring), ein langsamer Länder-Header verzögert den Erst-Render also nicht. Ausschnitt und Ring nutzen denselben Manifest-Stand (eine Auffrischung mitten in der Abfrage kann den Ring nicht aus anderen Ständen bestimmen als den Ausschnitt). Ein Ausschnitt, der nur dank Europa in der Pipeline liegt, fällt bei PMTiles-Ausfall nicht auf die GeoJSON-Dateien zurück, die nur DACHLiLu enthalten (vorher: leere Liste als Erfolg, kein Overpass-Rückfall; jetzt Fehler); die Europa-Eignung setzt `usePmtiles` voraus. `isPipelineEligible` stößt das (Neu-)Laden von Manifest und Abdeckung im Hintergrund an, wenn sie fehlen, abgelaufen oder zuletzt gescheitert sind (nach einem Fehler frühestens nach `Config.pipeline.europe.manifestRetryMs`, 30 s, nicht bei jeder Kartenbewegung): ein Fehler beim Start sperrt Europa nicht mehr für die ganze Sitzung (bisher wurde nur im Abruf selbst geladen, den die Eignungsprüfung davor ausschloss). Der allererste Ausschnitt an einem Start-Ort nur in Europa läuft über Overpass, solange die Daten noch laden. Eine überholte Anfrage bricht nach dem Öffnen der Header ab. `warmupPipeline` lädt Manifest und Abdeckung beim Start (blockiert nie). Neue Tests `test/pipeline-europe.test.js` (58): Eignung, Quellenwahl, Zusammenführen, Cache-Trennung, Überspringen, Header- und Kachelfehler, Datenstand je Anfrage, Pufferring, Grenzstücke, und dass der DACHLiLu-Weg unverändert bleibt (inklusive eines Datenstands über der Obergrenze); alle 246 bisherigen Tests laufen ohne Änderung. Gegenproben: eingebaute Fehler (jeweils einer) werden erkannt; zwei Umformungen sind gleichwertig und daher nicht erkennbar (Eignungsprüfung des Rings ist durch das Scheitern des Öffnens zusätzlich abgesichert). Zusätzlich gegen die echten, öffentlichen Daten geprüft (außerhalb von Vitest, dessen Netzsperre unangetastet bleibt): Manifest geladen, Amsterdam geeignet, Paris nicht (Frankreich nicht veröffentlicht), München wie bisher; 349 Objekte in 725 ms aus der echten Niederlande-Datei (235 Hydranten, 7 Wachen, 107 Defibrillatoren) mit dem richtigen OSM-Datenstand. **Vor dem Einschalten fehlt noch:** die Entscheidung über das Ausrollen der übrigen Länder und die Prüfung der Grenzstücke an Landesgrenzen (dasselbe Gemeindegrenz-Stück kann in zwei Auszügen stehen und würde doppelt gezeichnet).
- **Europa-Erweiterung, Grundlage (Schalter aus, Datenabfrage unverändert)**: Neues Modul `src/js/europe.js` für die Länder-Dateien der Pipeline (je Land eine PMTiles-Datei, verzeichnet im Manifest `eu/regions.json`). Es liest und prüft das Manifest (`parseManifest`: unbekannte Version oder Form ergibt `null`, ungültige Einträge werden einzeln verworfen; der Dateiname muss genau zum Land passen und dem Schema `eu/<land>-<Stempel>.pmtiles` entsprechen, weil er Teil einer URL wird), bestimmt für einen Kartenausschnitt die nötigen Länder (`requiredRegionIds`, aus den Rechtecken ALLER geplanten Länder, auch unveröffentlichter) und prüft die Eignung (`resolveEuropeSources`: Schalter, Zoom, Ausschnitt vollständig innerhalb der Abdeckung, jedes nötige Land im Manifest; sonst Overpass wie bisher). An Landesgrenzen liefert die Prüfung mehrere Quellen (DACHLiLu plus Länder). `loadEuropeData` lädt Manifest und Abdeckung, blockiert nie, wirft nie, teilt gleichzeitige Aufrufe, prüft nach 10 Minuten neu und behält bei Fehlern den letzten guten Stand. `src/js/coverage/europe.js` ist die Abdeckung (Europa plus DACHLiLu, mindestens 500 m Innenabstand zur Außengrenze) und die Länder-Rechtecke, erzeugt vom Pipeline-Repo (`tools/build_europe_coverage.py --client-output`), nicht von Hand ändern. `Config.pipeline.europe` (`enabled: false`, `manifestPath`, `manifestTimeoutMs`, `manifestTtlMs`, `minZoom`). **Noch nicht in `pipeline.js` und `api.js` eingebunden:** Mit dieser Änderung ändert sich für Nutzer nichts. Bekannte Einschränkung: Die Länder-Rechtecke sind wegen der Meeresränder der Auszüge groß (Norwegen reicht von -11° bis 35° Länge) und schneiden oft Nachbarländer; solange alle Länder veröffentlicht sind, ist das folgenlos, fehlt eines, weicht die Prüfung vorsichtshalber auf Overpass aus. Nächste Schritte: pro Land getrennte PMTiles-Instanzen und Metadaten in `pipeline.js`, Abfrage mehrerer Dateien mit Zusammenführen per `type:id`, Live-Delta-Obergrenze, Datenstand-Anzeige, i18n.
- **Geometrie-Hilfen in `geometry.js`**: `isPointInPolygon` und `isRectInPolygon` (samt `segmentsIntersect`) sind aus `pipeline.js` verschoben, damit `europe.js` sie nutzen kann, ohne dass sich beide Module gegenseitig importieren. `pipeline.js` exportiert sie unverändert weiter (Test: gleiche Funktionsobjekte), alle bisherigen Pipeline-Tests laufen ohne Änderung.

### Behoben
- **Abgebrochene Overpass-Requests räumen keine fremden Meldungen weg**: `showNotification()` liefert jetzt eine ID zurück (`#notification-box[data-notification-id]`), `hideNotification(id)` schließt nur die Meldung mit genau dieser ID. `fetchWithRetry` schließt damit bei Erfolg oder Abbruch nur seinen eigenen Hinweis. Ersetzt zwischenzeitlich ein anderer Ablauf die Meldung, auch mit gleichem Text (z. B. zweiter Overpass-Request beim Export), bleibt sie stehen (Codex-Review zu #54 und #56).
- **Rückkehr ins Pipeline-Gebiet nutzt wieder Cloudflare**: Die Abdeckungsprüfung in `map.js` prüfte nur, ob die geladenen Bounds den Ausschnitt enthalten, nicht woher die Daten stammen. Wurde ein Ausschnitt an der DACHLiLu-Grenze per Overpass geladen (mit Polsterung) und man zoomte/schob danach in einen Ausschnitt, der komplett im Pipeline-Gebiet liegt, aber noch innerhalb dieser Bounds, blieb die App bei Overpass ("LIVE") und fragte Cloudflare nie an. Umgekehrt konnten Pipeline-Daten einen über die Grenze ragenden Ausschnitt fälschlich als abgedeckt ausgeben. Neu: `State.loadedPoiSource` (`pipeline` | `overpass` | `overpass-fallback`). Ist die Pipeline ausgefallen (`overpass-fallback`), wird nicht bei jeder Bewegung neu versucht, sondern erst bei neuen Kacheln.
- **Warnung "zeige Cache" blieb nicht stehen**: Nach einem fehlgeschlagenen Hintergrundabruf gibt `fetchOSMData` die gecachten Daten zurück, und `map.js` schloss danach pauschal jede Benachrichtigung, also auch genau diese Warnung sowie fremde Meldungen wie "Link kopiert". Das pauschale `hideNotification()` ist entfernt. `fetchWithRetry` schließt seine eigenen Hinweise (Wartezeit, Serverwechsel) bei Erfolg und bei Abbruch selbst; Abbrüche beim Verschieben der Karte lassen also keinen "Versuche Server …"-Hinweis stehen.
- **Overpass-Hinweise wieder da**: #52 hatte die Meldungen bei Überlastung, Rate-Limit, Serverfehler und Serverwechsel entfernt. Sie erscheinen wieder oben mittig in `#notification-box` (`api.js` auf dem Stand vor #52); das Dock unten rechts kollidiert nicht damit.
- **Datenstand-Details bei 768 px (iPad hochkant)**: Tailwind-`md` (ab 768 px) und die Dock-CSS (ab 769 px) liefen auseinander, das Info-Icon ragte aus der Status-Box. Die Zeile wird jetzt allein per CSS ab 769 px eingeblendet. Im Mobile-UI-Modus (Touch oder Fenster < 1370 px) hängt das Popover unter der Status-Box oben rechts statt im Dock.
- **`State.queryBounds` nicht mehr im Getter**: `getTileBBoxKey` setzt keinen State mehr. Beim Wechsel Overpass → Pipeline werden veraltete Overpass-Bounds im Gate zurückgesetzt. Die Export-Cache-Prüfung nutzt `State.loadedPoiBounds` (tatsächlich geladener Bereich inkl. Pufferring).

### Geändert
- **Datenstand lokalisiert**: Die neuen Texte der Datenstand-Anzeige sind in allen 30 Sprachen übersetzt (bisher englische Kopien). `(+Sync)`/`(Sync…)` und das `aria-label` des Schließen-Buttons kommen aus der Übersetzung, das Datum folgt der Sprache (`Intl`, weiterhin UTC).
- `npm run i18n:check` weist auf Werte hin, die dem englischen Text entsprechen (`--copies` listet die Schlüssel).

## [v0.8.5] - 2026-10-04

### Neu
- **Schutzfilter für die Wachen-Ebene**: `geoJsonFeatureToElement()` ignoriert in der Ebene `fire_stations` Objekte ohne `amenity=fire_station` oder `building=fire_station` (`LAYER_TAG_GUARDS` in `pipeline.js`, gilt für PMTiles und GeoJSON-Rückfall). Schutz auch mit noch gecachten älteren Kacheln und gegen künftige Rückfälle.

### Behoben
- **Falsche Hydranten-Punkte an Feuerwachen**: Die Pipeline lieferte in der Wachen-Ebene neben den Wachen auch deren Referenzobjekte (Tore, Eingänge, Türen, Parkplatzzufahrten, Laternen, Gebäudeteile): am 04.10.2026 5.421 von 47.392 Einträgen (11,4 %). `renderMarkers` zeichnete jedes Objekt, das weder Wache noch Defibrillator ist, ab Zoom 15 als Hydranten-Punkt. Der Builder entfernt die Tags solcher Referenzobjekte jetzt (`osmium tags-filter --remove-tags`), sie werden nicht mehr exportiert. Die Zahl der Wachen sinkt dadurch einmalig um etwa 11 % (auf rund 42.000).

### Pipeline (Datenqualität und Zuverlässigkeit, Betrieb im privaten Pipeline-Repo)
- **Veröffentlichung nur vollständig**: GeoJSON, PMTiles und `metadata.json` entstehen in einem Zwischenordner, werden geprüft (GeoJSON lesbar und vollständig, PMTiles-Header und Länge) und erst dann umgeschaltet, `metadata.json` zuletzt. Ein abgebrochener Build lässt den veröffentlichten Stand unberührt. Ein Build wird nur übersprungen, wenn die veröffentlichten Dateien vollständig und stimmig sind; parallele Builder-Läufe werden gesperrt.
- **Quellen**: Zeigt `-latest` auf einen veralteten Geofabrik-Spiegel, wird ein neuerer datierter Tagesauszug verwendet. Heruntergeladene Auszüge werden vollständig auf Struktur geprüft (`osmium fileinfo -e`), nicht nur im Header. Ein älterer Quellstand überschreibt nie einen neueren lokalen Auszug; die Fallback-Reihenfolge versucht neuere datierte Kandidaten vor einem veralteten `-latest`.
- **Upload**: Reste eines abgebrochenen Builds werden nicht nach R2 übertragen (geordnete rclone-Filter); der optionale Cache-Purge hat Zeitlimits und kann Folgeläufe nicht mehr blockieren.
- **Monitoring**: Alarme für das Alter der OSM-Daten (`osm_data_until`), unbekannten Datenstand und Quellenwarnungen; Sync- und Upload-Alarme sind neustartfest.

### Geändert
- **Pipeline in eigenes privates Repo ausgelagert**: `pipeline/` (Builder, Nginx, Update-Skript, Monitoring, Betriebsdokumentation) ist mit vollständiger Historie nach `FrnkMrz/openfiremap-dach-pipeline` umgezogen und liegt nicht mehr in diesem öffentlichen Repo. Dieses Repo enthält nur noch die Client-Seite. Die Taginfo-Tests gegen die Pipeline-Filter laufen, wenn ein Checkout daneben liegt (`../openfiremap-dach-pipeline`) oder `PIPELINE_BUILDER` gesetzt ist, sonst werden sie übersprungen.

## [v0.8.4] - 2026-10-02

### Neu
- **Live-Änderungen per Overpass auf den PMTiles**: Nach dem Laden aus den Kacheln holt das Frontend im Hintergrund die seit dem OSM-Datenstand (`osm_data_until`) geänderten Feuerwachen, Hydranten, Löschwasserstellen und Defibrillatoren im Ausschnitt (`newer:`) und ersetzt bzw. ergänzt die Kachel-Objekte per `type:id`. So erscheinen frisch gemappte Objekte, auch wenn Geofabrik – wie am 01./02.10. für Europa – keine neuen Auszüge liefert. Gelöschte Objekte bleiben bis zum nächsten Build sichtbar. Abschaltbar über `Config.pipeline.liveDelta`.
  - Nachbesserungen nach Review (#40): Das Delta deckt den ganzen geladenen Bereich inklusive Pufferring ab (vorher nur den Bildausschnitt, eine kleine Bewegung in den Puffer lud nichts nach); nach dem Pufferring wird die Liste inklusive Delta gezeichnet (vorher verschwanden Delta-Marker bis zum nächsten Rendern); der Delta-Cache-Schlüssel stammt aus dem abgefragten Bereich statt aus dem Overpass-Gitter; der Marker-Cache zeichnet Marker neu, wenn sich Position oder Tags eines Objekts ändern (vorher blieben verschobene oder umgetaggte Hydranten mit altem Stand stehen). Hintergrund-Abfragen zeigen bei globalem Backoff keine Warte-Meldung mehr.
  - Marker-Cache vergleicht bei Hydranten-Clustern (Zoom 17/18) auch die Mitglieder (OSM-ID, Position, Tags); vorher blieb der Tooltip veraltet, wenn ein Delta nur ein Nicht-Haupt-Mitglied änderte (#41-Review).
- **OSM-Datenstand und OSM-IDs in der Pipeline** (Vorbereitung für das Nachladen von Änderungen per Overpass):
  - `metadata.json` enthält je Auszug `osm_data_timestamp` aus dem PBF-Header und gemeinsam `osm_data_until` (ältester Stand; leer, wenn einer fehlt). `generated_at` ist nur der Build-Zeitpunkt – am 01./02.10. lagen Datenstand (30.09. 20:22 UTC) und Build fast einen Tag auseinander.
  - Hydranten, Feuerwachen, Löschwasserstellen und Defibrillatoren tragen in GeoJSON und PMTiles `@type`/`@id` (`osmium export -a type,id`); bisher stand dort nur eine tippecanoe-Laufnummer. Geschätzt +10 MB PMTiles.
  - Frontend: `geoJsonFeatureToElement()` übernimmt `@type`/`@id` als `type`/`id` und entfernt sie aus den Tags (Tooltip, GPX). Kachel-Deduplizierung und Wachen-/Hydranten-Clustering nutzen `type:id`, da Knoten und Wege dieselbe ID haben können.
- **Taginfo-Projektdatei** (#24, Issue #21):
  - `public/taginfo.json` listet alle ausgewerteten OSM-Tags mit Beschreibung und ist unter https://openfiremap.org/taginfo.json abrufbar. Aufnahme in die [Taginfo-Projektliste](https://taginfo.openstreetmap.org/projects) ist beantragt (taginfo/taginfo-projects#293).
  - Neuer Abschnitt „Verwendete OSM-Tags“ in `docs/DATENQUELLEN.md`.
  - `test/taginfo.test.js` prüft Pflichtfelder und dass jeder Tag aus den Overpass-Abfragen und Pipeline-Filtern in der Datei steht.

### Datenschutz
- **Datenschutzerklärung für Cloudflare aktualisiert** (#23):
  - Cloudflare (Pipeline), GitHub Pages und BayernAtlas als externe Dienste aufgeführt; keine Cookies/kein Tracking; lokale Speicherung und Standortfreigabe beschrieben; Rechtsgrundlagen, US-Übermittlung (DPF) und Betroffenenrechte ergänzt.
  - Englische Fassung für nicht-deutsche Sprachen (deutsche Fassung bleibt verbindlich), Impressum auf § 5 DDG umgestellt, ungenutztes `maps.mail.ru` aus der CSP entfernt.
  - Cache-Einstellung „Aus“ liest und schreibt IndexedDB nicht mehr und löscht vorhandene Einträge.

### Behoben
- **Overpass: hängender Server führt jetzt zum nächsten Server**: `fetchJson` brach eine Zeitüberschreitung über denselben Mechanismus ab wie einen Nutzerabbruch (`AbortError`); `fetchWithRetry` reichte den Fehler deshalb sofort weiter, statt den nächsten Overpass-Server zu versuchen. Zeitüberschreitungen sind jetzt ein eigener `TimeoutError` und werden wie ein Serverfehler behandelt (Server 20 s gesperrt, nächster Server). Aufgefallen beim Live-Delta, betraf aber alle Overpass-Abfragen.
- **Gemeindegrenzen ohne Lücken (Auswahl über Relationen statt Weg-Tags)**:
  - Gemeindegrenzen werden über `admin_level=8`-Relationen statt über Tags am einzelnen OSM-Weg ausgewählt (Overpass + Pipeline). Wege, deren Gemeindegrenze mit einer höheren Grenze (Landkreis, Bezirk, Land, Staat) zusammenfällt oder die kein `boundary`-Tag am Weg tragen, werden vollständig erfasst.
  - Frontend-Overpass-Abfragen (`src/js/api.js` für Karte und Export) auf `rel["boundary"="administrative"]["admin_level"="8"]->.r; way(r.r)(${bbox})->.boundaries;` umgestellt mit expliziter Bounding-Box auf Mitglieds-Wege.
  - Cache-Schlüssel für Grenzen versioniert (`overpass:v4:boundaries` und `export_v3`), um lückenhafte Daten aus IndexedDB zu invalidieren.
  - Pipeline: Filterung auf Relationen umgestellt (`r/boundary=administrative`, `r/admin_level=8`) und `osmium export` mit `--keep-untagged` ergänzt, sodass referenzierte Mitglieds-Wege auch ohne eigene Tags als Linestrings exportiert werden.
  - `taginfo.json`: `boundary=administrative` und `admin_level=8` nur noch mit Objekttyp `relation` (#38); die Tags an den Mitglieds-Wegen wertet OpenFireMap nicht aus. `test/taginfo.test.js` prüft jetzt auch, dass jeder genannte Objekttyp von den Overpass-Abfragen und Pipeline-Filtern erfasst wird.
  - PMTiles-Pfad: Zugeschnittene Teilstücke eines Grenzwegs werden je Kachel behalten. Bisher galten sie wegen derselben `feat.id` (tippecanoe `--generate-ids`) als Duplikate, sodass nur das Stück der zuerst geladenen Kachel übrig blieb (Lücken an Kachelrändern). `MultiLineString`-Teile aus dem Kachel-Zuschnitt werden in einzelne Linien zerlegt statt als Punktliste fehlinterpretiert.
  - Grenz-Erkennung in Karte und Export über einen gemeinsamen Helfer `isBoundaryElement()`; Tests sichern ab, dass nur Grenzen mit `out geom` abgefragt werden. Builder: Export inkl. Segmentierungs-Fallback in `export_feature_geojson()` ausgelagert und direkt getestet.
- **Leere Karte in Safari nach Deploys**: Der Service Worker lieferte `index.html` cache-first aus; nach einem Deploy verwies die alte Seite auf gelöschte gehashte Bundles (404, keine Karte). Seitenaufrufe laufen jetzt network-first (Cache nur offline), Cache-Name auf `ofm-v15-static` erhöht. Als Offline-Fallback wird nur die App-Hülle (`/`, `/index.html`) abgelegt, damit z. B. ein Aufruf von `/taginfo.json` sie nicht überschreibt; Cache-Name auf `ofm-v16-static` erhöht.
- **OSM-Standardkarte ohne Subdomains** (#20, danieldegroot2): Kacheln kommen von `tile.openstreetmap.org` statt `{s}.tile.openstreetmap.org`, wie es die OSM Foundation empfiehlt; CSP `img-src` entsprechend angepasst.
- **CSV-Export: Untertyp von Feuerwachen** (#25): Gelesen wurde `tags.fire_station?.type`, das war immer leer. Jetzt `fire_station:type` über `getCsvSubtype()`, mit Tests.
- **Pipeline: nur noch Gemeindegrenzen** (#26):
  - Zweite `osmium tags-filter`-Stufe auf `admin_level=8`, passend zur Overpass-Abfrage. Bisher kamen alle Verwaltungsebenen 2–11 mit (123.642 Wege, 187 MB GeoJSON).
  - Für die Grenzen werden nur noch `boundary` und `admin_level` exportiert (`osmium export -c` mit `include_tags`); Grenzwege trugen oft komplette Straßen-Tags.

### Performance
- **curl-Zeitlimit je Versuch 20 statt 90 Minuten** (`CURL_MAX_TIME`, Standard 1200 s): Seit Neuversuche fortsetzen statt neu zu beginnen, kostet ein Abbruch nichts mehr. Eine Verbindung knapp über der Mindestrate wird so nach 20 Minuten gegen eine neue getauscht; der ungünstigste Fall eines Laufs (6 Versuche) sinkt von 9 auf 2 Stunden.
- **Vorfilterung in einem Durchlauf je Land**: `osmium tags-filter` las jeden Länderauszug einmal je Ebene (5×, für Deutschland ~17 von 23 Minuten Vorfilterung auf VM 102). Jetzt filtert ein Durchlauf mit allen Filtern in eine kleine Zwischendatei (Schweiz: 8,8 MB aus 522 MB), die Ebenen werden daraus getrennt. Ergebnis für Liechtenstein, Luxemburg und Schweiz objektgenau identisch geprüft; lokal Schweiz 10,5 s → 4,0 s.

### Monitoring
- **Home-Assistant-Paket = produktiver Stand**: `pipeline/monitoring/homeassistant/openfiremap.yaml` war seit dem 29.09. hinter dem live laufenden Paket zurück. Übernommen sind Schwellen als `input_number`, Regionserkennung für den Objekt-Einbruch, Publish-Verzug, Heartbeat, Speicherwerte per SSH-Forced-Command und gebündelte Warn-/Entwarn-Automation; LAN-Adressen, SSH-Ziel und Notify-Dienst sind Platzhalter.
  - Entitäts-IDs sind jetzt reproduzierbar: REST-/`command_line`-Sensoren tragen Namen, aus denen die bestehende ID entsteht (deutsche Anzeigenamen per `homeassistant: customize`), Template-Entitäten nutzen `default_entity_id`. Eine Neuinstallation erzeugt dieselben 33 IDs wie die produktive Installation.
  - Das Forced-Command-Skript liegt als `pipeline/monitoring/openfiremap-stats` im Repo; Einrichtung in `pipeline/docs/DOKUMENTATION.md`.
  - `check_ha_entities.py` berücksichtigt `default_entity_id` und `command_line`-Sensoren; neue Tests in `pipeline/tools/test_check_ha_entities.py` prüfen auch, dass das Paket keine LAN-Details enthält.

### Behoben & Resilienz
- **Downloads hängen nicht mehr an langsamen Geofabrik-Servern fest**: curls eigenes `--retry` begann nach einem Abbruch wieder bei Byte 0, sodass der Deutschland-Auszug (4,6 GB) bei einem langsamen Server nach jedem 90-Minuten-Timeout neu startete (am 01.10. ~0,9 MB/s statt bis zu 77 MB/s auf einer neuen Verbindung). Neuversuche laufen jetzt als eigene curl-Aufrufe mit `-C -` (setzen per HTTP 206 fort, `CURL_ATTEMPTS`, Standard 6), und `--speed-limit`/`--speed-time` brechen Verbindungen ab, die 60 s unter 1 MiB/s bleiben (`CURL_SPEED_LIMIT`, `CURL_SPEED_TIME`).
  - Fortsetzen nur bei unverändertem Serverstand: curl sendet `If-Range` mit dem geprüften `Last-Modified`. Liefert Geofabrik inzwischen einen anderen Stand (neuer Tagesauszug oder Spiegel mit anderem Snapshot), antwortet der Server mit 200 statt 206, curl bricht ab (Exit 33) ohne anzuhängen, und der Builder verwirft die Teildatei, prüft den Serverstand neu und lädt von vorn.
  - `CURL_MAX_TIME`, `CURL_SPEED_LIMIT`, `CURL_SPEED_TIME`, `CURL_ATTEMPTS`, `CURL_RETRY_DELAY` werden in `docker-compose.yml` an den Builder durchgereicht (aus Shell oder `.env`; ungesetzt gelten die Standardwerte).
- **Geofabrik-Härtung gegen Weiterleitungsschleifen (Fix A)**:
  - `pipeline/builder/build_features.py`: Wenn `-latest.osm.pbf` nicht erreichbar ist (z. B. Endlosschleife HTTP 301 oder Timeout), leitet der Builder automatisch datierte Tagesextrakte (`<basis>-YYMMDD.osm.pbf`) für heute, gestern und vorgestern (UTC) ab und prüft diese per HEAD.
  - Die erste erreichbare Datei mit HTTP 200 wird heruntergeladen (sofern neuer als die lokale mtime) und atomar auf den Zielpfad `<land>-latest.osm.pbf` verschoben (neuer Status: `downloaded_dated`).
  - Erst wenn auch alle datierten Kandidaten scheitern, greift der lokale Rückgriff (sofern <= 72 h).
  - Scheitert der Download oder die PBF-Validierung eines datierten Kandidaten, wird der nächste versucht (bisher wurde nach dem ersten erreichbaren Kandidaten direkt auf die lokale Datei zurückgegriffen). Ältere Kandidaten, die nicht neuer als die lokale Datei sind, werden dabei übersprungen.
- **Transparenz bei veralteten Quellen (Fix B)**:
  - `build_features.py`: Wenn keine Änderungen vorliegen, aber mindestens ein Land den Status `cached_head_failed` oder `fallback_after_error` hat, beendet sich der Builder mit **Exit-Code 11** (statt 10).
  - `pipeline/update.sh`: Behandelt Exit 11 wie Exit 10 (kein CPU-intensiver Neubau, kein Upload bei synchronem R2-Stand), setzt das Ergebnis jedoch transparent auf `result: "skipped_stale_source"`.
  - HA-Vorlage `pipeline/monitoring/homeassistant/openfiremap.yaml`: Dokumentation von `sensor.openfiremap_sync_ergebnis` um `skipped_stale_source` erweitert.
- **Robustere Downloads und Exporte**:
  - `osmium fileinfo` erhält das Format explizit (`-F pbf`), damit auch `.download`-Dateien geprüft werden können.
  - curl-Zeitlimit konfigurierbar über `CURL_MAX_TIME` (Standard 5400 s statt 1800 s). Abgebrochene Downloads werden mit `curl -C -` fortgesetzt, aber nur, wenn der Teil-Download nachweislich zur selben Quelle und zum selben Serverstand gehört (Begleitdatei `.download.source.json` mit finaler URL, `Last-Modified`, `Content-Length`). Sonst wird neu begonnen, damit keine aus zwei Tagesständen zusammengesetzte PBF-Datei entsteht.
  - Enthält die zusammengeführte PBF doppelte Objekt-IDs (z. B. Länderauszüge unterschiedlicher Tage), exportiert der Builder pro Land und dedupliziert die GeoJSON-Features anhand ihrer ID (`merge_geojson_files()`).

## [v0.8.3] - 2026-10-01

### Sicherheit
- **Abhängigkeiten aktualisiert (`npm audit fix`)**:
  - `jspdf` 4.2.0 → 4.2.1 (kritisch: PDF Object Injection via FreeText color, GHSA-7x6v-j9x4-qf24; HTML Injection in New-Window-Pfaden, GHSA-wfv2-pwc8-crg5).
  - `dompurify` 3.3.1 → 3.4.16 (mittel: Cross-Site-Scripting, GHSA-v2wj-7wpq-c8vv).
  - `fflate` 0.8.2 → 0.8.3 (mittel: Endlosschleife bei fehlerhaften ZIP64-Archiven, GHSA-px8p-9vwx-vf98).
  - Dev-Abhängigkeiten im erlaubten SemVer-Bereich mitaktualisiert (u. a. Vitest 4.1, Rollup 4.63, PostCSS 8.5.28); veraltete Projektversion in `package-lock.json` (0.6.11) korrigiert.
- **CI-Sicherheitsprüfung verschärft** (`.github/workflows/pages.yml`):
  - `npm audit --omit=dev --audit-level=high` bricht den Build bei High/Critical in Laufzeit-Abhängigkeiten jetzt ab. Bisher wurde ein Fehlschlag per `|| echo` verschluckt, wodurch die kritische jsPDF-Lücke unbemerkt blieb.
  - Dev-Abhängigkeiten werden weiterhin geprüft, erzeugen aber nur eine Warnung, damit Advisories in Build-Tooling kein Deployment blockieren.

## [v0.8.2] - 2026-09-30

### Performance & Ressourcenschonung
- **Skip-if-unchanged Build- & Upload-Logik**:
  - `pipeline/builder/build_features.py`: Berechnung von Extrakt-Fingerprints (`id`, `size_bytes`, `mtime` via `curl -R`) und deterministischem Builder-Hash (SHA-256 über Python-Code, Konfiguration, Layer und Tippecanoe-Argumente).
  - Unveränderte Quelldaten und identischer Builder-Hash überspringen den aufwendigen 25–30-minütigen Build-Prozess mit dem dedizierten Exit-Code 10 (`Keine Änderungen seit Build <generated_at> – Build übersprungen`).
  - `publish/` bleibt bei übersprungenen Läufen unangetastet.
  - Option `FORCE_BUILD=true` zur expliziten Erzwingung eines Neubaus auch bei identischen Extrakten (über `docker-compose.yml` durchgereicht).
- **Edge-Cache-Schonung & Kachel-Stabilität**:
  - `pipeline/update.sh`: Unterteilung jedes Laufs in drei klare Ergebnisse:
    - `built`: Quelldaten/Code geändert oder erzwungen -> Build, R2-Upload, Verifikation und Aktualisierung des `published_fingerprint.json`.
    - `upload_only`: Quelldaten unverändert, aber lokaler Stand weicht von R2 ab -> Nur R2-Upload und Verifikation (kein CPU-intensiver Neubau).
    - `skipped_no_changes`: Quelldaten unverändert und öffentlich == lokal -> Kein Upload, kein Cloudflare-Cache-Purge, Verifikation läuft als schlanker Heartbeat.
  - Verhindert unnötige Cache-Invalidierungen (`?v=<generated_at>`) auf Cloudflare R2: Kacheln bleiben für Web-Clients dauerhaft mit `HIT` im Edge-Cache.
  - Atomare Speicherung von `raw/build_fingerprint.json` und `raw/published_fingerprint.json`.

### Monitoring & Home Assistant
- **Pipeline-Heartbeat-Sensor & -Automation**:
  - Neuer Template-Sensor `sensor.openfiremap_sync_alter_stunden` auf Basis von `sync_status.json -> checked_at` (wird bei jedem Lauf aktualisiert).
  - Neue Automation `openfiremap_heartbeat_missing`: Alarmierung, wenn seit > 30 Stunden kein Update-Lauf auf VM 102 stattfand (ersetzt die Prüfung auf `generated_at`).
  - Neuer Sensor `sensor.openfiremap_sync_ergebnis` (`built`, `upload_only`, `skipped_no_changes`, `failed`).
  - Entkopplung von Datenalter und Heartbeat: `sensor.openfiremap_datenalter_stunden` bleibt als reine Info; Veraltungs-Alarme basieren sauber auf `sensor.openfiremap_extrakt_alter_stunden` > 48h.

### Betrieb & Infrastruktur
- **Entfernung des Cloudflare-Tunnel-Dienstes**:
  - `pipeline/docker-compose.yml`: Service `tunnel` (`openfiremap-tunnel`, Image `cloudflare/cloudflared:latest`) vollständig entfernt, da der produktive Datenverkehr von `pipeline.openfiremap.org` seit dem 29.09.2026 direkt über Cloudflare R2 läuft.
  - `pipeline/setup-vm102.sh`: Setup-Logik und Überprüfung von `TUNNEL_TOKEN` entfernt, doppelte Healthcheck-Zeile bereinigt und Endpunkt-Überschrift auf R2 angepasst.
  - `pipeline/docs/OPERATIONS_INTERNAL.md` & `pipeline/docs/DOKUMENTATION.md`: Dokumentation zum Tunnel-Rückbau aktualisiert sowie Rollback-Anleitung mit dem Compose-Snippet ergänzt; `pipeline/docs/ANLEITUNG_HTTPS_CLOUDFLARE_TUNNEL.md` gelöscht.
  - `pipeline/nginx/default.conf`: Schutz von `/internal/` gegen Zugriff mit Header `CF-Connecting-IP` sowie RFC1918-Beschränkung verbleibt unverändert als dauerhafte Defense-in-Depth.
  - `docs/ARCHITEKTUR.md`: Formulierung zur Nichterreichbarkeit interner Statusdateien auf lokales Netzwerk (Heimnetz) angepasst.

## [v0.8.1] - 2026-09-30

### Resilienz & Ausfallsicherheit
- **Automatischer Download-Fallback bei Geofabrik-Störungen**:
  - `pipeline/builder/build_features.py`: Schlägt ein PBF-Download fehl (z. B. durch Weiterleitungsschleifen oder Verbindungsabbrüche im nächtlichen Veröffentlichungsfenster von Geofabrik), greift der Builder automatisch auf die vorhandene lokale PBF-Datei zurück, sofern diese nicht älter als 72 Stunden ist (`MAX_FALLBACK_AGE_HOURS=72`).
  - Der Build läuft unterbrechungsfrei durch und vermeidet unnötige Komplettabbrüche; der Zustand wird transparent als Warnung protokolliert (`fallback_after_error`).
- **curl-Härtung**:
  - Ergänzung von `--max-redirs 5` zur Verhinderung von zirkulären HTTP-302-Weiterleitungsschleifen (wie Geofabrik-Fehler 47).
  - Stille Fehlerausgabe (`-sS`) eliminiert Hunderte unnötiger Fortschrittszeilen im Build-Log (`update.log`), während echte Fehlermeldungen sichtbar bleiben.
  - Hinzufügen von `--retry-all-errors` zur automatischen Wiederholung bei Server- und Proxy-Aussetzern (z. B. 429/5xx oder Verbindungsresets).
- **Integritätsprüfung vor Verschieben**:
  - Heruntergeladene PBF-Dateien werden vor dem atomaren Verschieben (`os.replace`) auf Mindestgröße (> 100 KB) und strukturelle Validität (`osmium fileinfo`) geprüft, um abgerissene oder unvollständige Downloads abzufangen.
- **Prozessverriegelung & Warnungs-Bereinigung**:
  - `pipeline/update.sh`: Absicherung gegen parallele Ausführung von Cronjob und manuellen Aufrufen mittels `flock` (Sperrdatei im Datenverzeichnis) mit Fehlercode `exit 3`.
  - Entfernung veralteter `build_warnings.json` direkt nach Lockfile-Übernahme vor dem Start des Builds.
  - Unterstützung für Pfad-Überschreibungen über Umgebungsvariablen (`DATA_DIR`, `PROJECT_DIR` etc.) für flexibleres Testen.
- **HEAD-Prüfung ohne GET-Umschaltung**:
  - `pipeline/builder/build_features.py`: Manuelles Verfolgen von HTTP-Redirects strikt mit `HEAD` (max. 5 Sprünge), um zu verhindern, dass Standard-Redirect-Handler bei 302-Weiterleitungen auf `GET` umschalten und Multi-Gigabyte-Dateien herunterladen.

### Transparenz & Monitoring
- **Metadaten-Erweiterung (`metadata.json`)**:
  - Neues Top-Level-Feld `extracts_oldest_age_hours` zur schnellen Erkennung veralteter Quelldaten.
  - Neues Objekt `extracts` mit Details zu jedem verwendeten Landes-Extrakt (Name, relative Dateinamen, Dateigröße in Bytes/MiB, Zeitstempel, Alter in Stunden und Status: `fresh_download`, `cached_head_ok`, `cached_head_failed`, `fallback_after_error`).
  - Strikte Datensicherheit: Keine internen Dateipfade oder lokalen IP-Adressen in den Metadaten.
- **Synchronisations-Status (`sync_status.json`)**:
  - Übernahme von `build_warnings` aus dem Builder in die Statusdatei für das interne Monitoring.
- **Home Assistant Integration (`openfiremap.yaml`)**:
  - Neuer Sensor `sensor.openfiremap_extrakt_alter_stunden` und neuer Sensor `sensor.openfiremap_build_warnungen`.
  - Neue Automation: Alarmierung, falls der älteste OSM-Auszug älter als 48 Stunden wird (`openfiremap_extracts_outdated`).
  - Validiert mit `check_ha_entities.py` (24 Entitätsdefinitionen, 0 fehlende Verweise).

### Betrieb & Dokumentation
- **Verschiebung des nächtlichen Cronjobs**:
  - Verlegung der Startzeit von `03:30 UTC` (05:30 MESZ) auf `05:43 UTC` (07:43 MESZ / 06:43 MEZ) auf VM 102 mit ausreichend zeitlichem Sicherheitsabstand zum täglichen Geofabrik-Generierungsfenster (ca. 01:00–04:15 UTC) und Vermeidung von Spitzenlasten zur vollen Stunde.
  - Klarstellung in der Betriebsdokumentation: Die VM läuft auf UTC; Zeitstempel im Log und in der Crontab sind UTC.
- **Betriebsdokumentation & Post-Mortem**:
  - `pipeline/docs/OPERATIONS_INTERNAL.md` um ein Runbook zur Behebung von Geofabrik-Downloadstörungen und ein detailliertes Post-Mortem zu den Vorfällen vom 30.09.2026 (Nachtlauf-Ausfall um 03:30 UTC und paralleler Lauf um 06:00 UTC) ergänzt.

## [v0.8.0] - 2026-09-29

### Performance
- **z14-Datenmodell & Cloudflare-Edge-Cache (HIT)**:
  - Optimierung des Vektorkachel-Datenmodells auf Zoomstufen z12–14 (Hydranten, Wasserstellen und Defibrillatoren auf z14 beschränkt; Wachen und Grenzen auf z12–14) (`ad36beb`).
  - Reduzierung der PMTiles-Dateigröße für DACHLiLu von 539.096.217 Bytes auf **201.892.499 Bytes (≈ 192,5 MiB)** (-62,5 %).
  - Cloudflare Edge Cache liefert Kacheln nun zuverlässig mit `cf-cache-status: HIT` aus, da die Datei weit unter der 512-MiB-Grenze für Cloudflare Free liegt (zuvor Cache-Bypass) (`79f2f9d`).
  - Live-Messungen (Desktop 1440×800, Kartenzoom 16): **2–6 statt zuvor 24–35 Kachel-Requests**, vollständige Datendichte ohne fehlende Hydranten (Nürnberg 241/241, Berlin 197/197, Zürich 392/392, Wien 299/298 mit ~0,6 m Randeffekt) (`51d8da1`, `6245958`).
- **Preconnect, Warmup & Progressives Rendern**:
  - Früher DNS-/TLS-Preconnect zu `pipeline.openfiremap.org` und Header-Warmup vor dem ersten Rendering (`777918c`).
  - Progressives Rendern: Sichtbarer Kartenausschnitt wird sofort gezeichnet (`isPartial: true`), der Pufferring wird asynchron im Hintergrund nachgeladen (`777918c`).
  - Dynamische Ermittlung der Kachel-Zoomstufe aus dem PMTiles-Header (`queryZoom`), voll abwärts- und aufwärtskompatibel mit z14- und z16-Dateien (`fdd696b`).

### Stabilität & Fehlerbehebungen
- **Zustandskonsistenz bei schnellen Kartenbewegungen (A → B → A)**:
  - Streaming-Fortschritt vom globalen App-Zustand isoliert; Beseitigung von Status-Flackern (`LÄDT...` / `AKTUELL`) (`e336572`).
  - Export-Konsistenz: Laufende Ladevorgänge für fremde Viewports verfälschen nicht mehr den Exportstatus (`e336572`).
- **Export-Wartezeit & Pufferring-Optimierung**:
  - `pendingBufferFetches` als `Set` implementiert; verhindert unendliche Export-Wartezeiten (5 s / 10 s Timeout) bei parallelen POI- und Grenz-Pufferringen (`f090800`).
  - Unnötiges Neu-Rendern (mit Flackern durch `clearLayers`) bei Bewegungen innerhalb bereits vollständig geladener Bereiche eliminiert (`f090800`).
  - Pufferringe brechen bei minimalen Kartenbewegungen innerhalb der aktiven Bounding-Box (`activeFetchBounds`) nicht mehr vorzeitig ab (`f090800`).
- **Controller-Reset & Ladezustandsprüfung**:
  - `AbortController` werden im `finally` auf `null` zurückgesetzt, sobald alle sichtbaren Abrufe und Pufferringe abgeschlossen sind (`1575b30`).
  - `hasActiveRequest` prüft nun den realen Ladezustand (`isFetchingData || isFetchingBoundaries || pendingBufferFetches.size > 0`) (`1575b30`).

### Pipeline & Betrieb
- **Upload-Verifikation & Synchronisations-Status**:
  - `pipeline/update.sh`: 3-fache automatisierte Verifikation gegen den öffentlichen R2-Endpunkt (`generated_at` und Byte-Größe via HTTP `Range: bytes=0-0`), Ergebnis wird nach `raw/sync_status.json` geschrieben (`1575b30`).
  - `pipeline/builder/build_features.py`: `metadata.json` um `pmtiles.size_bytes` (exakte Bytes) ergänzt; `size_mb` als MiB dokumentiert (`1575b30`).
- **Interner Nginx-Endpunkt `/internal/`**:
  - Bereitstellung von `system_stats.json` und `sync_status.json` für das interne Monitoring auf VM 102 (`1575b30`).
  - Strikter Zugriffsschutz: Nur RFC1918-Netzwerke und Localhost; sofortige HTTP 403-Sperre bei Anfragen über den Cloudflare-Tunnel via `CF-Connecting-IP` (`1575b30`).

### Monitoring
- **Home-Assistant-Paket (`openfiremap.yaml`)**:
  - Vorlage mit 22 Entitäten zur lückenlosen Überwachung von öffentlichem R2-CDN, lokalem Build-Zustand auf VM 102, Festplattenbelegung und R2-Synchronisation (`1575b30`).
  - Template-Sensoren auf moderne `template:`-Struktur migriert und mit Ausfall- und Verfügbarkeitslogik gehärtet (`9953ebf`).
- **Validierungswerkzeug (`check_ha_entities.py`)**:
  - Prüfskript zur Erkennung fehlender oder fehlerhafter Home-Assistant-Entitätsreferenzen mit HA-Slugifizierung (`1575b30`).

### Tests
- **Netzwerk-Sperre & Deterministische Tests**:
  - Globale Netzwerk-Sperre in Unit-Tests zur Verhinderung von ungewollten externen Netzwerkaufrufen (`6162ddc`).
  - Ausbau der Vitest-Testsuite auf 125 Tests und Hinzufügen von Playwright-E2E-Tests für progressives Rendern und Pipeline-Performance (`c05a3ff`, `f090800`, `1575b30`).

## [v0.7.2] - 2026-09-29

### Optimierung der Status- & Benachrichtigungsmeldungen
- **Klare Aufgabentrennung**:
  - Permanente Status-Box (`#status-box`): Zeigt dezent und dauerhaft die Zoomstufe und den Datenzustand (`AKTUELL`, `AKTUELL (Lokal)`, `LÄDT...`, `STANDBY`) mit weichen Farbübergängen (`transition-colors`).
  - Hydranten-Ladeanzeige (`#hydrant-download-status`): Übernimmt exklusiv detailliertes Feedback zum Ladevorgang von Hydrantendaten (Objektanzahl, Spinner, SWR-Refresh, Langläufer und Fehler mit Retry `↻`).
  - Toasts (`#notification-box` via `showNotification`): Ausschließlich für Nutzeraktionen (GPS-Ortung, Link teilen, Kartenexport) und Systemwarnungen/Fehler. Redundante Lade-Meldungen bei jeder Kartenbewegung wurden vollständig entfernt.
- **Typisierte Toasts mit Icons & Farben**:
  - Unterstützung für `success` (Grün mit Häkchen-Icon), `info` (Blau mit Info-Icon), `warning` (Gelb mit Warn-Icon) und `error` (Rot mit Ausrufezeichen-Icon).
  - Screenreader-optimierte ARIA-Rollen (`role="status"` vs `role="alert"`, dynamisches `aria-live`).
  - XSS-sicher über native DOM-Knoten (`textContent`).
  - Sanfte Ein- und Ausblendanimationen (`opacity` + `translateY`).
  - Neues `hideNotification()` zum vorzeitigen Schließen, sobald Netzwerk-Retries erfolgreich beendet sind.
- **Kollisionsfreies Mobile-Layout**:
  - Toasts auf Smartphones unterhalb der Top-Leiste zentriert (`top: 76px;`), sodass Burger-Menü und Status-Box nicht überdeckt werden.
  - Hydranten-Ladeanzeige auf `bottom: 92px; right: 16px;` gelegt, kollisionsfrei mit dem zentrierten Ortungs-Dock (`bottom: 32px`).
- **Pipeline-Performance (10x Ladebeschleunigung in Chrome)**:
  - **In-Flight Request Deduplication** (`getVectorTile` in `src/js/pipeline.js`): Parallele Kachelabrufe für POIs und Gemeindegrenzen teilen sich exakt dieselbe Netzwerk-Promise; jede Kachel wird nur noch 1x über HTTP Range-Requests geladen (spart 50 % der Anfragen).
  - **In-Memory Tile-Cache** (`_tileCache`, FIFO/LRU bis 256 Kacheln): Kacheln werden im RAM gehalten; wiederholte Ansichten schwenken in 0 ms.
  - **Kachelnetz-Pufferoptimierung**: Auf Desktop-Bildschirmen wird der Kachelpufferring vermieden, da das Kachelnetz das Sichtfeld bereits vollständig abdeckt. Verhindert das Vorladen von 26 unsichtbaren Randkacheln und senkt die Kachelanfragen von 108 auf 30 (-72 %).
  - **Deduplizierung von `metadata.json`**: Parallele Abrufe werden via `_pendingMetadataPromise` zusammengeführt (1 statt 2 Abrufe).
  - **Worker-Pool mit 10 parallelen Streams**: Verhindert HTTP/2-Stream-Stau und Socket-Blockaden in Chromium.
- **Tests & Qualität**:
  - Neue Vitest-Testsuite `test/notification.test.js` (6 Tests für Typen, Timer, Dismissal, Accessibility und XSS-Schutz).
  - 4 neue Unit-Tests in `test/pipeline.test.js` für Kachel-Caching, Promise-Sharing und Cache-Clear (insgesamt 99/99 Tests grün).
  - Neuer Playwright-Performance-Test `tests/pipeline-performance.spec.js` zur dauerhaften Überprüfung von Kacheldeduplizierung und Ladezeit.

## [v0.7.1] - 2026-09-29

### Stale-Cache-Schutz & Pipeline-Härtung
- **Automatisches Cache-Busting (`?v=<generated_at>`)**:
  - `src/js/pipeline.js` fragt vor dem Laden der PMTiles-Vektorkacheln `metadata.json` ab (3 s Timeout, `cache: 'no-cache'`).
  - Hängt den `generated_at`-Zeitstempel als Versionsparameter (`?v=...`) an die Kachel-URL an. Verhindert, dass Edge-Caches oder Browser nach einem Rollout veraltete Kacheln oder veraltete Header ausliefern.
  - Erkennt Versionsänderungen zur Laufzeit automatisch und invalidiert gecachte PMTiles-Instanzen und Header.
- **Coverage-Mismatch-Erkennung (`PmtilesCoverageMismatch`)**:
  - `src/js/pipeline.js` prüft die Header-Bounding-Box (`minLat`, `maxLat`, `minLon`, `maxLon`) vor dem Abruf gegen den angeforderten Viewport.
  - Liegt der Viewport außerhalb des Headers (z. B. wenn noch ein veralteter regionaler Header im Cache liegt), wird der Header einmalig mit `forceRefresh` neu geladen.
  - Passt die Abdeckung weiterhin nicht, wird `PmtilesCoverageMismatch` geworfen und der Overpass-Fallback aktiviert, anstatt leere Flächen anzuzeigen.
- **Gehärtetes Pipeline-Update (`pipeline/update.sh`)**:
  - Upload-Reihenfolge nach Cloudflare R2 abgesichert: Zuerst Daten (`*.pmtiles` und `*.geojson`), zuletzt `metadata.json` (erst nach vollständigem, fehlerfreiem Daten-Upload).
  - Spezifische `Cache-Control`-Header beim R2-Upload via rclone gesetzt (`*.pmtiles`: 86400 s / 24 h, `*.geojson`: 3600 s / 1 h, `metadata.json`: `no-cache, no-store, must-revalidate, max-age=0`).
  - Cloudflare Edge Cache Purge wird nur bei erfolgreichem Sync ausgeführt; Abbruch bei Sync-Fehlern (`exit 1`).
- **Dokumentation & Endpunktbereinigung**:
  - Obsoleszenter interner Endpunkt `/healthz` in allen externen Dokumenten und Setup-Skripten durch `https://pipeline.openfiremap.org/metadata.json` ersetzt.
  - Dokumentation des 512-MB-Cloudflare-Free-Limits (539 MB PMTiles geht als dynamischer Range-Request direkt an R2 mit 0 € Egress und 10 Mio. kostenlosen Class B Operations).
  - Anleitung zur Freigabe von `http://localhost:5173` in der R2 CORS-Policy für die lokale Entwicklung.
  - `CLAUDE.md` und `AGENTS.md` aktualisiert: R2 ist primäre Edge-Quelle; VM 102 dient als lokale Test- und Backup-Umgebung.

### Tests
- **Vitest Unit-Tests**: 89/89 Tests erfolgreich (+11 neue Tests für `isViewportInHeader`, `getPipelineVersion`, `getPipelinePmtilesUrl` und PMTiles Mock Coverage Mismatch / Version Switch).

## [v0.7.0] - 2026-09-29

### Neue Features: DACHLiLu-Erweiterung & Cloudflare R2
- **Länderübergreifende Pipeline-Abdeckung (DACHLiLu)**: Erweiterung der Vektorkachel-Pipeline von Bayern auf 5 Länder: Deutschland (DE), Österreich (AT), Schweiz (CH), Luxemburg (LU) und Liechtenstein (LI).
  - Über **1,25 Millionen POIs**: 1.019.158 Hydranten (+336 %), 47.379 Feuerwachen (+438 %), 25.610 Löschwasserstellen (+314 %), 40.347 Defibrillatoren (+597 %) sowie 123.618 Gemeindegrenzen.
  - Kompakte PMTiles-Datei `openfiremap.pmtiles` mit 514,12 MB (Zoom 12–16).
- **Cloudflare R2 Object Storage Integration**:
  - Weltweite Auslieferung der Vektorkacheln über Cloudflare R2 Edge unter `https://pipeline.openfiremap.org/openfiremap.pmtiles`.
  - Vollständige Entlastung des Heimnetzwerks/DSL-Uploads bei **0 € Egress-Kosten**.
  - HTTP Range Requests (HTTP 206 Partial Content) und CORS für `https://openfiremap.org` nahtlos aktiv.
- **Filter-then-Merge Builder-Architektur**:
  - `pipeline/builder/build_features.py`: Parallele/sequentielle Tag-Filterung einzelner Länder-Auszüge mit anschließender Osmium-Verschmelzung.
  - Intelligenter `HEAD`-Check: Überspringt unveränderte Geofabrik-PBFs in < 1 Sekunde; `FORCE_DOWNLOAD=true` für erzwungenes Neuladen.
  - RAM-Disk-Nutzung (`/dev/shm`) für performante I/O-Filterung mit automatischem Disk-Fallback.
- **MultiPolygon-Grenzabdeckung im Frontend**:
  - Neues hochpräzises Abdeckungspolygon `DACHLILU_COVERAGE` (`src/js/coverage/dachlilu.js`) mit 2.128 Stützpunkten und 500 m Innenpuffer.
  - `isPointInPolygon` und `isRectInPolygon` um native MultiPolygon-Unterstützung erweitert.
- **Automatischer R2-Sync**: Nächtlicher Cronjob auf VM 102 (`update.sh`) synchronisiert neue Builds automatisch per `rclone` zu Cloudflare R2.

### Qualitätssicherung & Tests
- **Vitest Unit-Tests**: 78/78 Tests erfolgreich (inklusive aller Städte in DE, AT, CH, LU, LI und Grenzprüfungen).
- **Playwright E2E-Tests**: 11/11 Tests erfolgreich (Koordinaten für Overpass-Fallback-Tests auf Paris außerhalb der DACHLiLu-Pipeline angepasst).

## [v0.6.13] - 2026-09-28

### Neue Features & Pipeline-Verbesserungen
- **Präzises Bayern-Abdeckungspolygon**: Neues nach innen gepuffertes Abdeckungspolygon mit 1.296 Stützpunkten (`BAYERN_COVERAGE`, generiert via `pipeline/tools/build_coverage_polygon.py` aus OSM-Relation R2145268, 500 m Innenpuffer, 250 m Toleranz). Verhindert, dass Grenzgebiete außerhalb Bayerns fälschlicherweise der Pipeline zugeordnet werden und leer bleiben.
- **Exakter Rechtecktest (`isRectInPolygon`)**: Viewports werden nun vollständig auf Kantenüberschneidungen und alle 4 Ecken geprüft (statt bisheriger 5-Punkt-Stichprobe). 40.000 zufällige Viewports in der Simulation verifiziert: 0 fehlerhafte Viewports (>0,1 % außerhalb Bayerns).
- **Direkter Overpass-Fallback (GeoJSON abgeschaltet)**: Deaktivierung des extrem datenintensiven GeoJSON-Fallbacks (`Config.pipeline.geojsonFallback: false`). Bei PMTiles-Problemen schaltet die App transparent direkt auf Overpass um, ohne mehr als 60 MB GeoJSON auf Mobilgeräten herunterzuladen.

### Sicherheit & Pipeline-Härtung
- **`metadata.json` entschärft**: Der `system`-Block mit internen Server-Festplattenbelegungen wurde aus der öffentlichen `metadata.json` entfernt und in eine interne `system_stats.json` ausgelagert.
- **Setup-Skript gehärtet**: `pipeline/setup-vm102.sh` um `openfiremap-tunnel` ergänzt mit Prüfung auf `TUNNEL_TOKEN` vor dem Start.
- **Automatisierter Cache-Purge**: Vorbereitung für gezielten Cloudflare-Cache-Purge in `pipeline/update.sh`.

### Aufräumarbeiten & Wartung
- **Service Worker Bereinigung**: Veraltete lokale IP- und Port-8080-Bypässe aus `public/sw.js` entfernt. Cache-Version auf `ofm-v11-static` erhöht.
- **Dokumentation aktualisiert**: Anpassung aller Dokumente und Roadmaps auf die neue 2-Stufen-Kaskade (PMTiles ➔ Overpass).

## [v0.6.12] - 2026-09-24

### Neue Features
- **Lokale Pipeline & PMTiles Integration**: Unterstützung für ultra-schnelle lokale Vektorkacheln (`openfiremap.pmtiles`) via HTTP Range Requests (`pmtiles.js`). Lädt nur die für den aktuellen Viewport benötigten Byte-Ausschnitte in 20–30 ms statt ganzer GeoJSON-Dateien.
- **Gemeindegrenzen lokal integriert**: Extraktionsebene `boundaries` (`w/boundary=administrative`, Geometrietyp `linestring`) in die Builder-Pipeline aufgenommen. Verwaltungsgrenzen laden nun verzögerungsfrei lokal aus den PMTiles-Vektorkacheln.
- **Kaskadierender 3-Stufen-Fallback**: Primär PMTiles-Vektorkacheln, sekundär lokale GeoJSON-Dateien (mit In-Memory-Cache), tertiär öffentliche Overpass-Server für weltweite Abdeckung.

### Verbesserungen & Fehlerbehebungen (Bugfixes)
- **Safari / macOS Panning-Stabilität**:
  - Behoben, dass Nginx bei gesetztem `Accept-Encoding: gzip` in Safari mit HTTP 200 OK statt 206 Partial Content antwortete (`gzip off;` für `.pmtiles`).
  - Gehärtete Intent-Steuerung (`lastRenderedFetchIntent`): Kinetische Trackpad-Gesten in Safari verwerfen fertig geladene Kacheldaten nicht mehr.
  - Deaktivierung der 1,2-Sekunden-Overpass-Pause für die lokale Pipeline für flüssiges Panning in Echtzeit.
- **Speikern & Kachelkollisions-Fix**: Sub-Dezimeter-genaue, global eindeutige Koordinaten-IDs als Fallback für PMTiles-Features ohne native ID verhindern fehlerhaftes Verwerfen von Hydranten an Kachelgrenzen im Clustering.
- **Service Worker Range-Bypass**: Range-Requests und Pipeline-Ressourcen werden im Service Worker direkt durchgewunken, um den bekannten WebKit-Range-Stripping-Bug zu umgehen. Cache-Version auf `ofm-v10-static` erhöht.

## [v0.6.11] - 2026-09-20

### Neue Features
- **CSV-Export**: Neuer Export-Button im Menü (direkt unterhalb von GPX). Exportiert alle sichtbaren POIs (Hydranten, Wasserentnahmestellen, Löschwasserbehälter, Saugstellen, AEDs) mit vollständigen Attributen als CSV-Datei. Ausgestattet mit UTF-8 BOM (`\uFEFF`) und Semikolon (`;`) als Separator für direkte, fehlerfreie Darstellung in Microsoft Excel.
- **Vollständige i18n-Unterstützung für CSV**: Übersetzungsschlüssel `csv_btn` und `csv_success` für alle 30 Sprachen hinzugefügt.

### Verbesserungen & Fehlerbehebungen (Bugfixes)
- **SWR Refresh Hydranten-Schutz**: Behoben, dass ein im Hintergrund laufender Overpass-Refresh bei leeren oder degradierten Server-Antworten (z. B. bei Überlastung oder Teilausfall) die bereits auf der Karte gerenderten Hydranten aus dem Cache überschrieb und vom Bildschirm löschte.
- **Overpass-Endpunkte aktualisiert**: Der schnelle, unabhängige französische OSM-Cluster (`https://overpass.openstreetmap.fr/api/interpreter`) wurde als primärer Spiegelserver in `src/js/config.js` hinzugefügt, die deutschen Server `lz4` und `z` dienen als Fallbacks, und der veraltete/inaktive russische Mail.ru-Mirror wurde entfernt.
- **Such-Zoomstufe optimiert (`searchZoom: 16`)**: Die Ziel-Zoomstufe nach einer Ortssuche via Nominatim wurde von 14 auf 16 angehoben. Dadurch landen Suchanfragen (z. B. nach Städten wie Ulm) direkt in der Detailstufe, in der Hydranten und Wasserentnahmestellen sofort geladen und angezeigt werden (ab Zoom $\ge 15$).
- **Benutzerdefinierte Cache-Dauer wirksam**: Die im Einstellungsdialog ("Info & Recht") gewählte Cache-Dauer (`ofm_cache_hours`: Aus, 1h, 1d, 3d, 7d, 30d) wird nun in `cache.js` (`getCachePolicy`) dynamisch ausgewertet.
- **CARTO Basemaps API-Key Integration**: Nach der Umstellung von CARTO auf obligatorische API-Keys für Kachelabrufe wurde die zentrale Konfiguration (`src/js/config.js`) um `cartoApiKey` erweitert. Das Wasserzeichen „API KEY REQUIRED / carto.com/basemaps/apikey“ auf den Basemaps `voyager`, `positron` und `dark` wird dadurch behoben.
- **Export Retina-Handling**: In `src/js/export.js` wird der Retina-Platzhalter `{r}` beim Nachladen von Kacheln nun sauber entfernt, sodass Kacheln mit Kacheltemplates wie CARTO im PNG/PDF-Export fehlerfrei geladen werden.
- **Service Worker Tile Cache**: `cartocdn` wurde zur Liste der vom Caching ausgeschlossenen Tile-Server in `public/sw.js` hinzugefügt, um veraltete oder fehlerhafte Kacheln im Offline-Cache zu vermeiden.
- **Playwright E2E-Testerweiterung**: Zusätzliche Ende-zu-Ende-Tests für Tastaturnavigation (<kbd>Escape</kbd>) inklusive Rückfokussierung des Triggers, Bestätigungs- und Abbruch-Workflows im Export-Modal sowie Test für die Platzierung des CSV-Buttons.
- **Desktop Viewport Stabilisierung im Test**: Viewport in `playwright.config.js` auf 1440x900 konfiguriert, um Desktop-Bedienelemente konsistent zu testen.

## [v0.6.10] - 2026-09-20

### Neue Features
- **Hydranten-Ladestatus-Anzeige:** Sichtbare, nicht-blockierende Rückmeldung beim Abruf von Hydrantendaten (`hydrant-download-status.js`). Zeigt den Ladefortschritt an (Laden, Aktualisieren mit Objektanzahl, Hinweis bei langsamer Verbindung nach 6s, Erfolgsbestätigung und Fehleranzeige mit direktem Wiederholen-Button ↻).

### Verbesserungen & Fehlerbehebungen (Bugfixes)
- **Export-Warteschleife gehärtet:** Die Warteschleife auf Hintergrund-Ladevorgänge im Export (`generateMapCanvas`) wurde mit einem 10-Sekunden-Timeout sowie sofortiger `signal.aborted`-Prüfung abgesichert, um Deadlocks und Einfrieren der Benutzeroberfläche zu verhindern. Nach dem Warten wird der Cache stets frisch ausgelesen.
- **Ladezustands-Integrität (`isFetchingData`):** `fetchOSMData` setzt `State.isFetchingData` nun über einen garantierten `finally`-Block zurück, sodass der globale Ladezustand auch bei Netzwerkfehlern oder Rennbedingungen nicht hängen bleibt.
- **UI Event-Listener Bereinigung:** Die Registrierung aller Export- und Dialog-Event-Listener (`png-btn`, `pdf-btn`, `gpx-btn`, `export-confirm-*`) wurde aus dem Top-Level-Modulcode in die zentrale Funktion `setupUI()` verschoben, wodurch potenzielle DOM-Timing-Probleme beim Start beseitigt wurden.
- **Export & Lade-Zuverlässigkeit:** Verbesserter Fallback auf Cache-Daten beim PNG/PDF/GPX-Export bei fehlgeschlagenen Online-Abrufen.

## [v0.6.9] - 2026-04-07

### Neue Features
- **Getrennte Client-Loads für POIs und Grenzen:** Verwaltungsgrenzen werden nicht mehr zusammen mit den normalen POI-Abfragen behandelt, sondern über einen eigenen Fetch- und Cache-Pfad geladen.
- **Cache-Profile pro Datenklasse:** Der Browser-Cache speichert nun zusätzliche Metadaten wie `dataClass`, `createdAt`, `ttlMs`, `staleTtlMs` und `version`, damit Grenzen, Feuerwachen und Hydranten/Wasserpunkte unterschiedlich lange wiederverwendet werden können.
- **Verbesserte Debug-Sicht:** Overpass-Debug-Events unterscheiden jetzt zwischen `poi`, `boundary` und `view`, sodass Request-Verhalten und Cache-Treffer im Debug-Overlay klarer nachvollziehbar sind.

### Änderungen
- **Stale-While-Moving:** Beim schnellen Verschieben oder Zoomen hält die Karte bereits geladene Daten bewusst sichtbar und verschiebt das Nachladen auf einen stabileren Moment, statt sofort neue Requests zu starten.
- **Export nutzt getrennte Caches:** PNG- und GPX-Export führen POI- und Boundary-Daten jetzt gezielt aus den getrennten Caches zusammen, anstatt implizit von einer einzigen kombinierten Liste abzuhängen.
- **Refresh-Erkennung robuster:** SWR-Refreshes erkennen echte inhaltliche Änderungen jetzt über einen stabilen Fingerprint von IDs, Positionen, Tags und Geometrien statt nur über die Elementanzahl.

### Fehlerbehebungen (Bugfixes)
- **Viewport-Coverage statt Key-Wechsel:** Kleine Pan-Bewegungen, besonders auf Zoom 16 bis 18, lösen nicht mehr allein wegen eines neuen gesnappten `bboxKey` einen Reload aus. Neu geladen wird jetzt erst, wenn der sichtbare Viewport die zuletzt geladene gepufferte Fläche für POIs oder Grenzen wirklich verlässt.
- **Export-Fallback stabilisiert:** Der Cache-Fallback im Export greift wieder zuverlässig, auch wenn ein Online-Fetch erzwungen wurde oder fehlschlägt.
- **Cache-SWR robuster gemacht:** Cache-Einträge mit alter Versionsnummer werden beim Lesen verworfen und gelöscht, hart abgelaufene stale-Einträge im SWR-Pfad aktiv aufgeräumt, und Background-Refreshes für POIs wie Grenzen schützen gute Cache-Daten jetzt konsistent mit einer Mindestschwelle vor degradierten Overpass-Antworten.

## [v0.6.8] - 2026-04-05

### Fehlerbehebungen (Bugfixes)
- **Cache-Key stabil (Mobile):** Der Overpass-Cache-Key wechselte bei Zoom-Animationen ständig, weil die Bbox-Ecken unabhängig auf ein 400m-Raster gesnapped wurden. Minimale Center-Verschiebungen durch Leaflet-Animationen kippten einzelne Ecken in benachbarte Grid-Zellen. Fix: Center wird gesnapped (1km-Raster), Ecken symmetrisch abgeleitet; `metersPerDegLon` wird von der gesnapten Latitude berechnet, damit auch West/Ost-Werte stabil bleiben. Cache-Hit bei Zoom/Pan innerhalb des gleichen Bereichs ist jetzt zuverlässig.
- **Blaue Distanz-Linie (Crash):** `drawLineToNearest()` speicherte den nächsten Hydranten als rohes Leaflet-`LatLng`-Objekt. Leaflet nutzt `.lng`, nicht `.lon` → `drawBlueLine(closest.lat, closest.lon)` übergab `undefined` als Longitude → `Invalid LatLng object`-Crash bei jedem Reload/Moveend. Fix: `closest = { lat, lon: markerLatLng.lng }`.
- **IndexedDB-Persistenz (iOS Safari):** `navigator.storage.persist()` wird beim App-Start aufgerufen, damit iOS Safari den IndexedDB-Cache nicht automatisch unter Speicherdruck löscht.
- **Cache-Schutz vor degradierten Overpass-Antworten:** Der SWR-Hintergrund-Refresh überschreibt den Cache nicht mehr wenn Overpass unter Last weniger als 50% der gecachten Elemente zurückgibt (`minElementCount`-Guard).
- **Cache-Key Konsistenz:** `State.queryMeta.bbox` nutzt jetzt `toFixed(5)` wie der Gate-Key – rohe IEEE-754-Floats wurden ersetzt.
- **CI:** Node.js auf Version 22 (LTS) angehoben; GitHub-Actions-Runtimes auf Node.js 24 umgestellt (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`).

## [v0.6.7] - 2026-04-03
### Neue Features
- **Einstellbarer Daten-Cache**: Benutzer können nun im "Info & Recht"-Modal die Dauer des lokalen Zwischenspeichers (Offline-Cache) einstellen: Aus, 1 Stunde, 1 Tag, 3 Tage, 7 Tage (Standard), 30 Tage.
- **Transparente Quellen**: Quellverweis für den BayernAtlas (LDBV) in den Lizenzen ergänzt.

### Fehlerbehebungen (Bugfixes)
- **Cache-Navigation**: Ein Bug wurde behoben, bei dem Hydranten beim schnellen Zurücknavigieren in einen bereits besuchten Bereich nicht sofort aus dem Cache angezeigt wurden (Optimierung der Request-Sperre).
- **Mobile-Fix**: Der Button "Info & Recht" im mobilen Burger-Menü wurde aktiviert und öffnet nun zuverlässig das Info-Modal (inkl. Einstellungen).
- **Lokalisierung**: Vollständige Synchronisation aller 30 Sprachdateien für die neuen Cache-Einstellungs-Keys.

## [v0.6.6] - 2026-04-02
### Neue Features
- **Regionale Hintergrundkarten (BayernAtlas)**: Integration der amtlichen "Webkarte Bayern" sowie der hochauflösenden digitalen Orthophotos (DOP/Luftbild) der bayerischen Vermessungsverwaltung über deren freie OpenData WMTS-Server.
- **Automatische Bounding-Box für regionale Daten**: Der BayernAtlas und das Bayern-Luftbild werden als Overlay-Option im Desktop-Layer-Menü dynamisch ein- und ausgeblendet, basierend auf dem geographischen Standort des Benutzers (Bayern Gemarkung). Ein weicher Fallback greift, falls der Benutzer den Gültigkeitsbereich verlässt.
- **Erweiterter CSP**: Anpassungen zur sicheren Einbindung der `bayernwolke.de` Kartenserver in die Content-Security-Policy von OpenFireMap.

## [v0.6.5] - 2026-04-01
### Neue Features
- **Permalink & Teilen**: Kartenansicht (Position, Zoom, aktiver Layer) kann nun direkt über die URL geteilt werden. Ein neuer "Teilen"-Button im Web und Mobile (nutzt native Share-API auf dem Smartphone) kopiert den genauen Link und erlaubt ein schnelles Weiterleiten des Kartenausschnitts.


## [v0.6.4] - 2026-03-29
### Neue Features
- **Württembergischer Schachthydrant (WSH)**: Spezielles Rendering (W-Icon mit gestricheltem Innenring) und exakte Tooltip-Warnung für Unterflurhydranten, die mit dem OSM-Tag `fire_hydrant:style=wsh` gekennzeichnet sind (auch bei abweichender Groß-/Kleinschreibung wie `WSH`).

### Fehlerbehebungen (Bugfixes)
- **100m Entfernungsring-Label**: Das 100-Meter-Label ("100 m") wurde optisch korrigiert und liegt nun wieder ordentlich auf zwei Dritteln des Radius innerhalb des gestrichelten Kreises anstatt zu weit nach außen zu ragen.
- **Hydranten Parser**: Case-Insensitivity-Bug („=== 'wsh'“) via `.toLowerCase()` behoben, sodass manuelle Großschreibungen durch OSM Mapper ("WSH") toleriert werden.

## [0.6.3] - 2026-03-06

### Added
- **i18n für Cluster-Tooltips:** Hydranten-Namen-Fallbacks ("Hydranten-Details") und Cluster-Header ("X Objekte innerhalb 5m") werden nun vollständig über das Übersetzungs-Wörterbuch abgehandelt und sind für alle 30 Sprachen verfügbar.
- **Hydranten-Clustering (Z17/Z18):** Das Rendern von extrem eng beieinander liegenden Hydranten (< 5 Meter) wurde überarbeitet. Sie werden nun visuell auf der Karte gebündelt, wobei ein Badge stattdessen das jeweilige Vielfache anzeigt ("2", "3" usw.). Die Einzelinformationen aller gebündelten POIs finden sich tabellarisch sortiert im dazugehörigen Tooltip-Fenster.

### Fixed
- **Root-Cause Fix (Clustering):** Behoben, dass der neue Code für das Hydranten-Clustering im Produktions-Build in der Rendering-Schleife nie aufgerufen wurde und eine versehentliche State-Mutation das Feature komplett blockiert hatte. Das Diffing- und Event-Caching arbeitet nun reibungslos, auch bei wilden Zoom- oder Schwenkmanövern im Zoom 17/18 Bereich.

## [0.6.2] - 2026-03-03

### Fixed
- **Map Export (Visuals):** Fixed an issue where exporting a very small map area would cause the generated title string on the document to be cut off horizontally. The export map width will now dynamically padded horizontally to ensure the title always fits cleanly.


## [0.6.1] - 2026-03-03

### Fixed
- **Map Export (Completeness):** Fixed issues where hydrants were excluded from GPX, PDF, and PNG exports when the map zoom was below 15. The Overpass API is now forced to fetch the area to ensure full coverage on the exported map.
- **Map Export (Visuals):** Removed an artificial visual limit that rendered hydrants as tiny invisible 5-pixel dots when exporting at zoom levels < 17. Hydrants will now always render with full identifiable icons regardless of chosen zoom scale.
- **Export Location Title:** Fixed a critical bug where the dialog title failed to adopt the user's selected map region ("Location A") and instead incorrectly defaulted to the center of the generic viewport ("Location B"), because the selection state was falsely read as inactive after drawing the box.


## [0.6.0] - 2026-02-24

### Added
- **Blaue Distanz-Linie**: Neue Funktion, die beim Klick auf "Locate Me" automatisch eine blaue, gestrichelte Linie zum nächstgelegenen Hydranten/Wasserstelle zieht. Inklusive Entfernungsangabe (in Metern).
- **Dynamische Linien-Updates**: Die Linie springt zum neu angeklickten Hydranten über und verschwindet nach 25 Sekunden automatisch.
- **Erweitertes Testing**: Umfassende Vitest Unit- und Playwright E2E-Tests inklusive CI/CD-Integration hinzugefügt.
- **Versionsnummer-Anzeige**: Versionslogik eingeführt und App-Version transparent im Footer/Legal-Bereich sichtbar gemacht.

### Changed
- **Lazy-Loading für Export**: Das PDF/PNG/GPX-Export-Modul (inkl. html2canvas/jspdf) wird erst bei Klick asynchron geladen, wodurch die initiale Ladezeit massiv sinkt.
- **Icon-Optimierung**: Alle Karten-Marker und UI-SVGs wurden stark komprimiert und für Android-Geräte auf die richtige Skalierung (`width: 100%`) festgelegt.
- **GPS-Rate-Limiting Fix**: Drei-stufiger Schutz gegen OS-seitige GPS-Sperren (Timeouts) in Safari/macOS eingebaut (Lock-State, `maximumAge: 10000`, 12s Fallback), plus sanftem Fallback auf Low-Accuracy-Ortung.
- **Offline-Architektur geklärt**: Das Service-Worker Caching wurde auf "Online-Only" (Network-first) korrigiert, PWA fungiert nur als schneller Shell-Loader, da Offline-Karten aus Platzgründen nicht realisierbar sind.

### Fixed
- Fehler behoben, bei dem Safari unter macOS wiederholt Location-API Fehler (Code 2) warf.
- Anzeigefehler behoben, bei dem die blaue Distanzlinie über tausende Kilometer gezogen wurde, wenn man auf der Karte extrem weit scrollte.
- UI: Überlappende weiße Labelboxen der blauen Distanzlinie entfernt und durch sauberen Outline-Textschatten ersetzt.
- SVG Rendering-Bug auf Android Chrome (zu kleine Icons) behoben.
