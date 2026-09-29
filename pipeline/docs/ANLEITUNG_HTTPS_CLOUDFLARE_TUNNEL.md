# HTTPS und Cloudflare R2 – öffentliche Hinweise

Die öffentliche Pipeline wird über `https://pipeline.openfiremap.org` bereitgestellt. Cloudflare R2 dient als Objektspeicher für die vorbereiteten PMTiles-Daten. Die Webanwendung greift per HTTPS, CORS und HTTP-Range-Requests darauf zu.

## Sicherheitsregeln

- Tunnel-Token und andere Geheimnisse werden ausschließlich in einer geschützten Laufzeitumgebung hinterlegt.
- Token gehören nicht in Git, Issues, Chatverläufe, Screenshots oder öffentliche Dokumentation.
- Private IP-Adressen, interne DNS-Namen und lokale Pfade werden nicht veröffentlicht.
- Für lokale Entwicklung genügt eine nichtöffentliche Testumgebung oder ein explizit freigegebener Entwicklungsendpunkt.

## Frontend-Verhalten

Die Anwendung liest zuerst die Pipeline-Metadaten, versieht die PMTiles-URL mit der Build-Version und prüft die Abdeckung. So kann ein alter Cache erkannt werden. Wenn HTTPS, R2, die Abdeckung oder die PMTiles-Datei nicht verfügbar sind, wechselt die Anwendung auf Overpass.

## Betriebshinweis

Die lokale Test- und Backup-Umgebung ist intern als VM 102 bezeichnet. Ihre Netzwerkdaten und Zugangsinformationen sind bewusst nicht Bestandteil dieser öffentlichen Anleitung. Eine ausfüllbare Checkliste für den privaten Betrieb steht in [OPERATIONS_INTERNAL.md](OPERATIONS_INTERNAL.md).
