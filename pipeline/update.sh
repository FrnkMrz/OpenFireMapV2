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
R2_ENABLED=false
SYNC_SUCCESS=true

if command -v rclone &> /dev/null && rclone listremotes 2>/dev/null | grep -q "^r2:"; then
  R2_ENABLED=true
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Synchronisiere Datenbestand nach Cloudflare R2 (openfiremap-pipeline)..." >> "$LOG_FILE"

  # Schritt 1: Zuerst PMTiles-Archiv hochladen (Cache-Control: 86400s / 24h)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [1/3] Übertrage PMTiles-Archive..." >> "$LOG_FILE"
  if ! rclone copy "${DATA_DIR}/publish/" r2:openfiremap-pipeline/ \
      --include "*.pmtiles" \
      --header-upload "Cache-Control: public, max-age=86400" \
      --fast-list >> "$LOG_FILE" 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] FEHLER: PMTiles-Upload nach R2 fehlgeschlagen!" >> "$LOG_FILE"
    SYNC_SUCCESS=false
  fi

  # Schritt 2: GeoJSON-Dateien hochladen (Cache-Control: 3600s / 1h)
  if [ "$SYNC_SUCCESS" = "true" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [2/3] Übertrage GeoJSON-Dateien..." >> "$LOG_FILE"
    if ! rclone copy "${DATA_DIR}/publish/" r2:openfiremap-pipeline/ \
        --include "*.geojson" \
        --header-upload "Cache-Control: public, max-age=3600" \
        --fast-list >> "$LOG_FILE" 2>&1; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] FEHLER: GeoJSON-Upload nach R2 fehlgeschlagen!" >> "$LOG_FILE"
      SYNC_SUCCESS=false
    fi
  fi

  # Schritt 3: ZULETZT metadata.json hochladen (nur wenn alle Daten zuvor fehlerfrei übertragen wurden)
  if [ "$SYNC_SUCCESS" = "true" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [3/3] Übertrage metadata.json (Versionsmarkierung, max-age=0)..." >> "$LOG_FILE"
    if ! rclone copy "${DATA_DIR}/publish/" r2:openfiremap-pipeline/ \
        --include "metadata.json" \
        --header-upload "Cache-Control: no-cache, no-store, must-revalidate, max-age=0" \
        --fast-list >> "$LOG_FILE" 2>&1; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] FEHLER: metadata.json Upload nach R2 fehlgeschlagen!" >> "$LOG_FILE"
      SYNC_SUCCESS=false
    fi
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNUNG: metadata.json wird NICHT hochgeladen, da vorherige Upload-Schritte fehlschlugen." >> "$LOG_FILE"
  fi

  if [ "$SYNC_SUCCESS" = "true" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cloudflare R2 Sync erfolgreich abgeschlossen." >> "$LOG_FILE"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cloudflare R2 Sync mit Fehlern abgebrochen." >> "$LOG_FILE"
  fi
fi

# Optionaler Cloudflare Cache-Purge für pmtiles und metadata.json (nur bei erfolgreichem Sync)
if [ "$SYNC_SUCCESS" = "true" ]; then
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
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cloudflare Cache-Purge übersprungen, da R2-Upload fehlschlug." >> "$LOG_FILE"
fi

if [ "$SYNC_SUCCESS" != "true" ]; then
  exit 1
fi

echo "========================================================" >> "$LOG_FILE"

