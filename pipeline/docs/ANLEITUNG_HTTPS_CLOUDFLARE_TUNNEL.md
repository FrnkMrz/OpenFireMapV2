# 🔒 Schritt-für-Schritt-Anleitung: HTTPS & Cloudflare Tunnel für OpenFireMap

Stand: 26. September 2026  
Projekt: OpenFireMap DACH Data Pipeline (VM 102)

Diese Anleitung beschreibt den exakten Ablauf zur Aktivierung von vollwertigem HTTPS für die lokale Pipeline auf VM 102 (`docker-lab-KW3`), ohne bestehende Dienste (GitHub Pages) zu unterbrechen oder Ports im Heimnetz zu öffnen.

---

## Übersicht der Phasen

| Phase | Zuständigkeit | Dauer | Was passiert? |
|---|---|---|---|
| **Phase 1: Cloudflare einrichten** | Du | ~5 Min. | Kostenlosen Account anlegen, Domain hinzufügen, DNS-Records prüfen. |
| **Phase 2: Nameserver umstellen** | Du | ~3 Min. | Bei United-Domains die 2 Cloudflare-Nameserver eintragen. |
| **Phase 3: Tunnel im Dashboard anlegen** | Du | ~3 Min. | Tunnel erstellen, Hostname `pipeline.openfiremap.org` vergeben, Token kopieren. |
| **Phase 4: Docker-Container auf VM 102 starten** | Assistent | ~2 Min. | `cloudflared` in `docker-compose.yml` einbinden und starten. |
| **Phase 5: Frontend umstellen & verifizieren** | Assistent | ~3 Min. | `config.js` auf `https://pipeline...` umstellen, testen, bauen und pushen. |

---

## Phase 1: Cloudflare Account & Domain hinzufügen (Du)

### 1.1 Kostenlosen Account erstellen
1. Öffne [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Registriere dich mit deiner E-Mail-Adresse und einem Passwort (Bestätigungs-Mail anklicken).

### 1.2 Domain hinzufügen
1. Klicke im Dashboard oben rechts auf **„Add a domain“** (oder *„Website hinzufügen“*).
2. Gib exakt ein: `openfiremap.org`.
3. Scrolle nach unten und wähle den Tarif **„Free“** (€0) aus ➔ auf **„Continue“** klicken.

### 1.3 DNS-Records überprüfen
Cloudflare scannt nun automatisch deine bestehenden Einträge bei United-Domains:
1. Prüfe, ob die 4 A-Records von GitHub Pages gelistet sind:
   - `openfiremap.org` ➔ `185.199.108.153`
   - `openfiremap.org` ➔ `185.199.109.153`
   - `openfiremap.org` ➔ `185.199.110.153`
   - `openfiremap.org` ➔ `185.199.111.153`
2. **Wichtig:** Klicke bei diesen 4 Einträgen auf die Wolke, sodass sie **grau („DNS only“)** ist. *(Das stellt sicher, dass GitHub Pages sein SSL-Zertifikat 1:1 direkt verwaltet).*
3. Klicke auf **„Continue“**.

### 1.4 Nameserver notieren
Cloudflare zeigt dir nun zwei Nameserver an, z. B.:
* `xxxx.ns.cloudflare.com`
* `yyyy.ns.cloudflare.com`

---

## Phase 2: Nameserver bei United-Domains umstellen (Du)

### 2.1 Eintragen bei United-Domains
1. Melde dich bei [united-domains.de](https://www.united-domains.de) an.
2. Gehe zu **„Meine Domains“** ➔ Klicke bei `openfiremap.org` auf **„Config“** (Zahnrad / DNS).
3. Wähle den Reiter **„Nameserver“**.
4. Wähle die Option **„Eigene Nameserver eintragen“**.
5. Trage in Feld 1 und 2 die beiden Cloudflare-Namen aus Phase 1 ein (Felder 3 & 4 bleiben leer).
6. Klicke auf **„Speichern“**.

### 2.2 Bestätigung bei Cloudflare
1. Gehe zurück zum Cloudflare-Tab.
2. Klicke auf **„Check nameservers now“**.

### 🔍 Überprüfung Phase 2:
Sobald die Umstellung greift (nach 5–20 Minuten), prüfen wir im Terminal:
```bash
# 1. Prüfen, ob Cloudflare-Nameserver antworten:
dig +short NS openfiremap.org
# Soll-Ergebnis: Die beiden Cloudflare-Nameserver

# 2. Prüfen, ob GitHub Pages unterbrechungsfrei erreichbar ist:
curl -I https://openfiremap.org
# Soll-Ergebnis: HTTP/2 200 OK (GitHub Pages)
```

---

## Phase 3: Cloudflare Tunnel erstellen (Du)

### 3.1 Zero Trust Menü öffnen
1. Klicke im Cloudflare Dashboard links auf **„Zero Trust“**.
2. Wähle im linken Menü **Networks** ➔ **Tunnels**.
3. Klicke auf **„Add a tunnel“**.

### 3.2 Tunnel konfigurieren
1. Wähle **„Cloudflared“** und klicke auf **„Next“**.
2. **Tunnel Name:** `ofm-pipeline` eingeben ➔ **„Save tunnel“**.
3. Bei **„Choose your environment“** klicke auf **Docker**.
4. Cloudflare zeigt einen Docker-Befehl mit einem langen Token an:
   ```bash
   docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token eyJh...
   ```
5. **Kopiere nur den Token-Wert** (den langen String nach `--token eyJh...`). Den gibst du mir im Chat!
6. Klicke unten rechts auf **„Next“**.

### 3.3 Public Hostname zuweisen
1. Trage unter **Public Hostname** folgendes ein:
   * **Subdomain:** `pipeline`
   * **Domain:** `openfiremap.org`
   * **Path:** *(leer lassen)*
2. Unter **Service**:
   * **Type:** `HTTP`
   * **URL:** `openfiremap-web:80` (oder `192.168.178.152:8080`)
3. Klicke auf **„Save tunnel“**.

---

## Phase 4: Container auf VM 102 aktivieren (Assistent)

Sobald du mir den Token aus Schritt 3.2 gibst, übernehme ich:

1. Ich binde den `cloudflared`-Dienst in `/srv/docker/projects/openfiremap-pipeline/docker-compose.yml` ein:
   ```yaml
     tunnel:
       image: cloudflare/cloudflared:latest
       container_name: openfiremap-tunnel
       restart: unless-stopped
       command: tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```
2. Ich starte den Dienst auf VM 102:
   ```bash
   docker compose up -d tunnel
   ```

### 🔍 Überprüfung Phase 4:
```bash
# 1. Container-Status auf VM 102 prüfen:
docker ps
# Soll-Ergebnis: openfiremap-tunnel läuft (Up)

# 2. Direkter HTTPS-Aufruf von außen:
curl -I https://pipeline.openfiremap.org/healthz
# Soll-Ergebnis: HTTP/2 200 OK

# 3. Range-Request Test auf PMTiles:
curl -I -H "Range: bytes=0-100" https://pipeline.openfiremap.org/openfiremap.pmtiles
# Soll-Ergebnis: HTTP/2 206 Partial Content
```

---

## Phase 5: OpenFireMap auf HTTPS umstellen & Deployen (Assistent)

1. **Konfiguration anpassen (`src/js/config.js`):**
   ```javascript
   pipeline: {
     enabled: true,
     url: "https://pipeline.openfiremap.org", // <--- HTTPS statt HTTP-LAN-IP
     usePmtiles: true,
     ...
   ```
2. **CSP (Content-Security-Policy) aktualisieren (`index.html`):**
   `https://pipeline.openfiremap.org` in `connect-src` eintragen.
3. **Automatisierte Tests:**
   * `npm run test:ci` (Vitest)
   * `npx playwright test` (Playwright)
4. **Produktions-Build & Push:**
   * `npm run build`
   * `git commit` & `git push origin main`

### 🔍 Überprüfung Phase 5:
* Aufruf von `https://openfiremap.org` im Browser (Desktop & Mobilfunk):
  - Kein Mixed-Content-Fehler mehr in der Konsole.
  - Vektorkacheln laden in 20–30 ms über `https://pipeline.openfiremap.org/openfiremap.pmtiles`.
  - Vollständige Anzeige aller 38.157 Hydranten und 1.538 Gemeindegrenzen.
