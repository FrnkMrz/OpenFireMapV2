# Sicherheitsrichtlinie

## Sicherheitsprobleme melden

Bitte melde Sicherheitsprobleme nicht öffentlich mit Zugangsdaten, Tunnel-Token, privaten URLs oder anderen vertraulichen Informationen. Nutze nach Möglichkeit eine private Sicherheitsmeldung über GitHub. Falls diese Funktion für das Repository nicht verfügbar ist, eröffne ein Issue ohne vertrauliche Details und bitte um einen privaten Kontaktweg.

Für normale Fehler und Verbesserungsvorschläge ist [GitHub Issues](https://github.com/FrnkMrz/OpenFireMapV2/issues) der richtige Ort.

## Was nicht in Issues gehört

- Cloudflare-Tunnel-Token, API-Schlüssel oder Passwörter
- private IP-Adressen, interne DNS-Namen und Serverpfade
- persönliche Zugangsdaten oder Log-Auszüge mit Geheimnissen
- personenbezogene Daten aus eigenen Testsystemen

## Datenschutz und externe Dienste

OpenFireMapV2 ist eine clientseitige Anwendung und betreibt kein Projekt-Backend zur Speicherung von Nutzerdaten. Die Anwendung nutzt je nach Einstellung `localStorage` und IndexedDB für Spracheinstellung, Cache-Dauer und zwischengespeicherte Kartendaten. Es werden keine Cookies und keine Tracking- oder Analyse-Tools verwendet. Für Hosting (GitHub Pages), Pipeline-Daten (Cloudflare), Kartendaten, Suche und Basiskarten werden externe Dienste kontaktiert; dabei gelten deren Datenschutz- und Nutzungsbedingungen. Neue externe Dienste müssen sowohl in der Content Security Policy als auch in der Datenschutzerklärung (`index.html`, deutsche und englische Fassung) ergänzt werden; `test/csp.test.js` prüft, dass alle Dienste aus `src/js/config.js` in der CSP stehen. Weitere Hinweise stehen in [Datenquellen](docs/DATENQUELLEN.md) und in der Anwendung selbst.

## Unterstützte Version

Unterstützt wird nur der aktuelle Stand des `main`-Branches, der auf https://openfiremap.org läuft. Ältere Versionen (Tags/Releases) erhalten keine eigenen Sicherheitskorrekturen.
