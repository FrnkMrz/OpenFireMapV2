#!/usr/bin/env bash
# ==============================================================================
# OpenFireMap DACH Data Pipeline - Automatisches Update-Skript
# ==============================================================================

set -euo pipefail

PROJECT_DIR="/srv/docker/projects/openfiremap-pipeline"
DATA_DIR="/srv/docker/data/openfiremap"
LOG_FILE="${DATA_DIR}/update.log"

mkdir -p "$DATA_DIR"

echo "========================================================" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starte geplantes Daten-Update..." >> "$LOG_FILE"

cd "$PROJECT_DIR"

# Führe Datenbuild aus (nutzt intelligenten HEAD-Check zur Vermeidung unnötiger Downloads)
FORCE_DOWNLOAD=${FORCE_DOWNLOAD:-false} docker compose run --rm builder >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Daten-Build erfolgreich abgeschlossen." >> "$LOG_FILE"

# Optionaler R2-Upload (falls rclone installiert und Remote 'r2:' eingerichtet ist)
if command -v rclone &> /dev/null && rclone listremotes 2>/dev/null | grep -q "^r2:"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Synchronisiere Datenbestand nach Cloudflare R2 (openfiremap-pipeline)..." >> "$LOG_FILE"
  rclone sync "${DATA_DIR}/publish/" r2:openfiremap-pipeline/ --fast-list >> "$LOG_FILE" 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cloudflare R2 Sync erfolgreich abgeschlossen." >> "$LOG_FILE"
fi

# Optionaler Cloudflare Cache-Purge für pmtiles und metadata.json
if [ -f "${PROJECT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "${PROJECT_DIR}/.env"
  set +a
fi

if [ -n "${CF_ZONE_ID:-}" ] && [ -n "${CF_API_TOKEN:-}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Purge Cloudflare Edge Cache für pmtiles und metadata.json..." >> "$LOG_FILE"
  PURGE_RESP=$(curl -s -w "\n%{http_code}" -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"files":["https://pipeline.openfiremap.org/openfiremap.pmtiles","https://pipeline.openfiremap.org/metadata.json"]}' 2>&1 || true)
  HTTP_CODE=$(echo "$PURGE_RESP" | tail -n1)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cloudflare Cache erfolgreich bereinigt (HTTP 200)." >> "$LOG_FILE"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNUNG: Cloudflare Cache-Purge fehlgeschlagen (HTTP ${HTTP_CODE}): ${PURGE_RESP}" >> "$LOG_FILE"
  fi
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] HINWEIS: CF_ZONE_ID oder CF_API_TOKEN nicht gesetzt. Cloudflare Cache-Purge übersprungen." >> "$LOG_FILE"
fi

echo "========================================================" >> "$LOG_FILE"

