#!/usr/bin/env bash
# ==============================================================================
# OpenFireMap DACH Data Pipeline - 1-Klick Setup für VM 102 (docker-lab-KW3)
# ==============================================================================
# Dieses Skript richtet die Pipeline auf VM 102 ein. Es muss aus dem geklonten
# Git-Repository heraus ausgeführt werden:
#   cd /pfad/zu/OpenFireMapV2 && bash pipeline/setup-vm102.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/srv/docker/projects/openfiremap-pipeline"
DATA_DIR="/srv/docker/data/openfiremap"

echo "================================================================="
echo "🚀 Starte OpenFireMap Pipeline Setup auf $(hostname) ($USER)"
echo "================================================================="

# Prüfe, ob das Skript aus dem Git-Repository heraus gestartet wurde
if [ ! -f "${SCRIPT_DIR}/docker-compose.yml" ] || \
   [ ! -f "${SCRIPT_DIR}/nginx/default.conf" ] || \
   [ ! -f "${SCRIPT_DIR}/builder/Dockerfile" ] || \
   [ ! -f "${SCRIPT_DIR}/builder/build_features.py" ]; then
  echo "" >&2
  echo "❌ FEHLER: Dieses Skript muss aus dem OpenFireMap-Git-Repository heraus gestartet werden." >&2
  echo "   Erforderliche Pipeline-Quelldateien wurden unter '${SCRIPT_DIR}' nicht gefunden." >&2
  echo "" >&2
  echo "   Vorgehensweise auf VM 102:" >&2
  echo "     1. git clone https://github.com/FrnkMrz/OpenFireMapV2.git" >&2
  echo "     2. cd OpenFireMapV2" >&2
  echo "     3. bash pipeline/setup-vm102.sh" >&2
  echo "" >&2
  exit 1
fi

# 1. Verzeichnisstruktur anlegen
echo "📁 [1/5] Erstelle Verzeichnisse unter /srv/docker/..."
sudo mkdir -p "${PROJECT_DIR}/nginx"
sudo mkdir -p "${PROJECT_DIR}/builder"
sudo mkdir -p "${DATA_DIR}/raw"
sudo mkdir -p "${DATA_DIR}/publish"
# Vorab-Initialisierung der internen Statusdateien, damit Docker keine Verzeichnisse anlegt
sudo touch "${DATA_DIR}/raw/system_stats.json" "${DATA_DIR}/raw/sync_status.json"

# Berechtigungen für aktuellen User setzen
sudo chown -R "$USER":"$USER" "$PROJECT_DIR" "$DATA_DIR"

# 2. Dateien aus dem Repository kopieren
echo "📝 [2/5] Kopiere Projekt- und Konfigurationsdateien aus dem Repository..."

if [ "$SCRIPT_DIR" != "$PROJECT_DIR" ]; then
  cp -p "${SCRIPT_DIR}/nginx/default.conf" "${PROJECT_DIR}/nginx/default.conf"
  cp -p "${SCRIPT_DIR}/builder/Dockerfile" "${PROJECT_DIR}/builder/Dockerfile"
  cp -p "${SCRIPT_DIR}/builder/build_features.py" "${PROJECT_DIR}/builder/build_features.py"
  cp -p "${SCRIPT_DIR}/docker-compose.yml" "${PROJECT_DIR}/docker-compose.yml"
  if [ -f "${SCRIPT_DIR}/update.sh" ]; then
    cp -p "${SCRIPT_DIR}/update.sh" "${PROJECT_DIR}/update.sh"
    chmod +x "${PROJECT_DIR}/update.sh"
  fi
else
  echo "   (Dateien befinden sich bereits im Zielverzeichnis ${PROJECT_DIR})"
fi

chmod +x "${PROJECT_DIR}/builder/build_features.py"

# 3. Docker Image bauen
echo "🔨 [3/5] Baue Builder-Image..."
cd "$PROJECT_DIR"
docker compose build builder

# 4. Ersten Daten-Build ausführen
echo "⚡ [4/5] Führe Datenextraktion aus (DACHLiLu / konfigurierte Region)..."
docker compose run --rm builder

# 5. Web-Server & Tunnel starten
echo "🌐 [5/5] Starte Nginx Webserver..."
cd "$PROJECT_DIR"
docker compose up -d web

# Tunnel prüfen und starten falls TUNNEL_TOKEN vorhanden
HAS_TUNNEL_TOKEN=false
if [ -f "${PROJECT_DIR}/.env" ] && grep -E -q '^TUNNEL_TOKEN=[^[:space:]]+' "${PROJECT_DIR}/.env"; then
  HAS_TUNNEL_TOKEN=true
elif [ -n "${TUNNEL_TOKEN:-}" ]; then
  HAS_TUNNEL_TOKEN=true
fi

if [ "$HAS_TUNNEL_TOKEN" = true ]; then
  echo "🔒 Starte Cloudflare Tunnel..."
  docker compose up -d tunnel
else
  echo ""
  echo "⚠️  HINWEIS: Kein TUNNEL_TOKEN in ${PROJECT_DIR}/.env gefunden."
  echo "   Der Cloudflare-Tunnel wurde übersprungen. Die Pipeline ist lokal auf Port 8080 erreichbar."
  echo "   Um den öffentlichen Tunnel zu aktivieren:"
  echo "     1. echo 'TUNNEL_TOKEN=<dein-token>' >> ${PROJECT_DIR}/.env"
  echo "     2. chmod 600 ${PROJECT_DIR}/.env"
  echo "     3. cd ${PROJECT_DIR} && docker compose up -d tunnel"
  echo ""
fi

echo ""
echo "================================================================="
echo "✅ OpenFireMap Pipeline erfolgreich eingerichtet & gestartet!"
echo "================================================================="
echo "Öffentliche HTTPS-Endpunkte (Cloudflare Tunnel):"
echo " * Status & Metadaten: https://pipeline.openfiremap.org/metadata.json"
echo " * PMTiles Kacheln:   https://pipeline.openfiremap.org/openfiremap.pmtiles"
echo " * Healthcheck:        https://pipeline.openfiremap.org/metadata.json"
echo ""
echo "Lokale Test-URLs im Heimnetz (Port 8080):"
echo " * Status & Metadaten: http://<PIPELINE_LAN_IP>:8080/metadata.json"
echo " * PMTiles Kacheln:   http://<PIPELINE_LAN_IP>:8080/openfiremap.pmtiles"
echo " * Hydranten GeoJSON: http://<PIPELINE_LAN_IP>:8080/hydrants.geojson"
echo " * Feuerwachen:       http://<PIPELINE_LAN_IP>:8080/fire_stations.geojson"
echo " * Löschwasserstellen:http://<PIPELINE_LAN_IP>:8080/water_points.geojson"
echo " * Defibrillatoren:   http://<PIPELINE_LAN_IP>:8080/defibrillators.geojson"
echo " * Internes System:   http://<PIPELINE_LAN_IP>:8080/internal/system_stats.json"
echo " * Interner Sync:     http://<PIPELINE_LAN_IP>:8080/internal/sync_status.json"
echo "================================================================="
