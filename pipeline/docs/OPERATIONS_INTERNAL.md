# Interne Betriebscheckliste – nicht öffentlich bewerben

Diese Datei trennt betriebliche Notizen von der öffentlichen Projektbeschreibung. Sie enthält absichtlich keine echten Geheimnisse. Konkrete Werte gehören in einen Passwortmanager oder in eine geschützte, nicht versionierte Betriebsdokumentation.

## Umgebung

- lokale Test- und Backup-VM: `VM 102`
- Hostname: `<PIPELINE_HOSTNAME>`
- interne Adresse: `<PIPELINE_SERVER_IP>`
- Projektpfad: `<PIPELINE_PROJECT_PATH>`
- Betriebsbenutzer: `<PIPELINE_OPERATOR>`
- Snapshot-/Restore-Referenz: `<RESTORE_REFERENCE>`

## Öffentliche Auslieferung

- R2-Endpunkt: `https://pipeline.openfiremap.org`
- Bucket: `<R2_BUCKET>`
- Upload-Werkzeug: `<SYNC_TOOL>`
- letzter geprüfter Build: `<BUILD_TIMESTAMP>`

## Geheimnisse

Tunnel-Token, R2-Schlüssel, API-Schlüssel und Passwörter werden ausschließlich außerhalb des Git-Repositories verwaltet. In `.env`-Dateien dürfen nur lokale Laufzeitwerte stehen; `.env` wird nicht committed.

## Betriebsprüfung

1. Builder erfolgreich ausführen.
2. Objektzahlen und Build-Zeit in `metadata.json` prüfen.
3. PMTiles-Datei und Metadaten vollständig übertragen.
4. Metadaten erst nach den Artefakten veröffentlichen.
5. `Content-Range`, CORS und die Version über den öffentlichen Endpunkt prüfen.
6. Fallback auf Overpass in einem Testbereich außerhalb DACHLiLu prüfen.
7. Logs auf Tokens, Passwörter und private Adressen prüfen, bevor sie geteilt werden.

Diese Datei ist eine interne Vorlage und kein Ersatz für ein sicheres Secret- oder Infrastrukturmanagement.
