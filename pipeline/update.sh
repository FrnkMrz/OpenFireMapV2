#!/usr/bin/env bash
# ==============================================================================
# OpenFireMap DACH Data Pipeline - Automatisches Update-Skript
# ==============================================================================

set -euo pipefail

PROJECT_DIR="/srv/docker/projects/openfiremap-pipeline"
DATA_DIR="/srv/docker/data/openfiremap"
PUBLISH_DIR="${DATA_DIR}/publish"
RAW_DIR="${DATA_DIR}/raw"
LOG_FILE="${DATA_DIR}/update.log"
SYNC_STATUS_FILE="${RAW_DIR}/sync_status.json"
PUBLIC_BASE_URL="https://pipeline.openfiremap.org"
CF_CACHE_LIMIT_BYTES=536870912 # 512 MiB

mkdir -p "$DATA_DIR" "$PUBLISH_DIR" "$RAW_DIR"

# Hilfsfunktion zum sicheren Schreiben von sync_status.json
write_sync_status() {
  local checked_at="$1"
  local local_gen="$2"
  local public_gen="$3"
  local in_sync="$4"
  local local_bytes="$5"
  local public_bytes="$6"
  local over_limit="$7"
  local upload_ok="$8"
  local last_err="$9"

  local j_checked_at="null"
  [ -n "$checked_at" ] && j_checked_at="\"$checked_at\""
  local j_local_gen="null"
  [ -n "$local_gen" ] && j_local_gen="\"$local_gen\""
  local j_public_gen="null"
  [ -n "$public_gen" ] && j_public_gen="\"$public_gen\""
  local j_local_bytes="null"
  [[ "$local_bytes" =~ ^[0-9]+$ ]] && j_local_bytes="$local_bytes"
  local j_public_bytes="null"
  [[ "$public_bytes" =~ ^[0-9]+$ ]] && j_public_bytes="$public_bytes"
  local j_last_err="null"
  if [ -n "$last_err" ]; then
    local clean_err
    clean_err=$(echo "$last_err" | sed 's/"/\\"/g' | tr '\n' ' ')
    j_last_err="\"$clean_err\""
  fi

  cat <<EOF > "${SYNC_STATUS_FILE}"
{
  "checked_at": ${j_checked_at},
  "local_generated_at": ${j_local_gen},
  "public_generated_at": ${j_public_gen},
  "in_sync": ${in_sync},
  "local_pmtiles_bytes": ${j_local_bytes},
  "public_pmtiles_bytes": ${j_public_bytes},
  "cf_cache_limit_bytes": ${CF_CACHE_LIMIT_BYTES},
  "pmtiles_over_cf_cache_limit": ${over_limit},
  "upload_ok": ${upload_ok},
  "last_error": ${j_last_err}
}
EOF
}

# Lokale Kenndaten auslesen
get_local_gen() {
  if [ -f "${PUBLISH_DIR}/metadata.json" ]; then
    grep -o '"generated_at": *"[^"]*"' "${PUBLISH_DIR}/metadata.json" | head -n1 | cut -d'"' -f4 || echo ""
  else
    echo ""
  fi
}

get_local_bytes() {
  local pmtiles_file="${PUBLISH_DIR}/openfiremap.pmtiles"
  if [ -f "$pmtiles_file" ]; then
    stat -c%s "$pmtiles_file" 2>/dev/null || stat -f%z "$pmtiles_file" 2>/dev/null || wc -c < "$pmtiles_file" | tr -d ' '
  else
    echo "0"
  fi
}

echo "========================================================" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starte geplantes Daten-Update..." >> "$LOG_FILE"

cd "$PROJECT_DIR"

# Initialisiere sync_status vor dem Build (mit bisherigem Stand, falls vorhanden)
INIT_CHECKED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
INIT_LOCAL_GEN=$(get_local_gen)
INIT_LOCAL_BYTES=$(get_local_bytes)
INIT_OVER_LIMIT=false
if [ "$INIT_LOCAL_BYTES" -gt "$CF_CACHE_LIMIT_BYTES" ]; then
  INIT_OVER_LIMIT=true
fi
write_sync_status "$INIT_CHECKED_AT" "$INIT_LOCAL_GEN" "" "false" "$INIT_LOCAL_BYTES" "" "$INIT_OVER_LIMIT" "false" "Update-Lauf gestartet..."

# Führe Datenbuild aus (nutzt intelligenten HEAD-Check zur Vermeidung unnötiger Downloads)
if ! FORCE_DOWNLOAD=${FORCE_DOWNLOAD:-false} docker compose run --rm builder >> "$LOG_FILE" 2>&1; then
  BUILD_ERR="FEHLER: Daten-Build (builder) fehlgeschlagen!"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ${BUILD_ERR}" >> "$LOG_FILE"
  write_sync_status "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$INIT_LOCAL_GEN" "" "false" "$INIT_LOCAL_BYTES" "" "$INIT_OVER_LIMIT" "false" "$BUILD_ERR"
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Daten-Build erfolgreich abgeschlossen." >> "$LOG_FILE"

# Aktualisiere lokale Kenndaten nach dem Build
LOCAL_GEN=$(get_local_gen)
LOCAL_BYTES=$(get_local_bytes)
OVER_LIMIT=false
if [ "$LOCAL_BYTES" -gt "$CF_CACHE_LIMIT_BYTES" ]; then
  OVER_LIMIT=true
fi

# Optionaler R2-Upload (falls rclone installiert und Remote 'r2:' eingerichtet ist)
R2_ENABLED=false
SYNC_SUCCESS=true
LAST_ERROR=""

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
    LAST_ERROR="PMTiles-Upload nach R2 fehlgeschlagen"
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
      LAST_ERROR="GeoJSON-Upload nach R2 fehlgeschlagen"
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
      LAST_ERROR="metadata.json Upload nach R2 fehlgeschlagen"
    fi
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNUNG: metadata.json wird NICHT hochgeladen, da vorherige Upload-Schritte fehlschlugen." >> "$LOG_FILE"
  fi

  if [ "$SYNC_SUCCESS" = "true" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cloudflare R2 Sync erfolgreich abgeschlossen." >> "$LOG_FILE"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cloudflare R2 Sync mit Fehlern abgebrochen." >> "$LOG_FILE"
    write_sync_status "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$LOCAL_GEN" "" "false" "$LOCAL_BYTES" "" "$OVER_LIMIT" "false" "$LAST_ERROR"
    exit 1
  fi
fi

# ==============================================================================
# Upload-Verifikation gegen öffentlichen R2-Endpunkt
# ==============================================================================
IN_SYNC=false
PUBLIC_GEN=""
PUBLIC_BYTES=0
CHECKED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ "$R2_ENABLED" = "true" ] && [ "$SYNC_SUCCESS" = "true" ]; then
  VERIFY_ATTEMPT=1
  MAX_ATTEMPTS=3

  while [ $VERIFY_ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Verifiziere öffentlichen Stand gegen ${PUBLIC_BASE_URL} (Versuch ${VERIFY_ATTEMPT}/${MAX_ATTEMPTS})..." >> "$LOG_FILE"
    CB_TS=$(date +%s%N 2>/dev/null || date +%s)

    # 1. Öffentliche metadata.json prüfen
    META_RESP=$(curl -s -f -m 15 "${PUBLIC_BASE_URL}/metadata.json?cb=${CB_TS}" 2>/dev/null || echo "")
    if [ -n "$META_RESP" ]; then
      PUBLIC_GEN=$(echo "$META_RESP" | grep -o '"generated_at": *"[^"]*"' | head -n1 | cut -d'"' -f4 || echo "")
    fi

    # 2. PMTiles Gesamtgröße via Range-Request (Content-Range) ermitteln
    HEADER_RESP=$(curl -s -I -m 15 -H "Range: bytes=0-0" "${PUBLIC_BASE_URL}/openfiremap.pmtiles?cb=${CB_TS}" 2>/dev/null || echo "")
    CR_LINE=$(echo "$HEADER_RESP" | tr -d '\r' | grep -i '^content-range:' || echo "")
    if [ -n "$CR_LINE" ]; then
      PUBLIC_BYTES=$(echo "$CR_LINE" | sed -E 's#^.*bytes 0-0/([0-9]+).*#\1#' | tr -d ' ' || echo "0")
    fi

    if [ "$PUBLIC_GEN" = "$LOCAL_GEN" ] && [ "$PUBLIC_BYTES" = "$LOCAL_BYTES" ] && [ "$LOCAL_BYTES" -gt 0 ]; then
      IN_SYNC=true
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Upload-Verifikation erfolgreich: generated_at=${PUBLIC_GEN}, Größe=${PUBLIC_BYTES} Bytes." >> "$LOG_FILE"
      break
    fi

    if [ $VERIFY_ATTEMPT -lt $MAX_ATTEMPTS ]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Noch nicht synchron (Lokal: gen=${LOCAL_GEN}, bytes=${LOCAL_BYTES} | Öffentlich: gen=${PUBLIC_GEN}, bytes=${PUBLIC_BYTES}). Warte 20s..." >> "$LOG_FILE"
      sleep 20
    fi
    VERIFY_ATTEMPT=$((VERIFY_ATTEMPT + 1))
  done

  CHECKED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  if [ "$IN_SYNC" = "true" ]; then
    write_sync_status "$CHECKED_AT" "$LOCAL_GEN" "$PUBLIC_GEN" "true" "$LOCAL_BYTES" "$PUBLIC_BYTES" "$OVER_LIMIT" "true" ""
  else
    LAST_ERROR="Öffentlicher R2-Stand weicht nach ${MAX_ATTEMPTS} Prüfversuchen von lokalen Daten ab (lokal: gen=${LOCAL_GEN}, bytes=${LOCAL_BYTES} | öffentlich: gen=${PUBLIC_GEN}, bytes=${PUBLIC_BYTES})"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNUNG: ${LAST_ERROR}" >> "$LOG_FILE"
    write_sync_status "$CHECKED_AT" "$LOCAL_GEN" "$PUBLIC_GEN" "false" "$LOCAL_BYTES" "$PUBLIC_BYTES" "$OVER_LIMIT" "true" "$LAST_ERROR"
    exit 2
  fi
else
  # Wenn R2 nicht aktiviert war, lokalen Stand als nicht synchronisiert vermerken
  write_sync_status "$CHECKED_AT" "$LOCAL_GEN" "" "false" "$LOCAL_BYTES" "" "$OVER_LIMIT" "true" "R2 Upload deaktiviert (kein Remote)"
fi

# Optionaler Cloudflare Cache-Purge für pmtiles und metadata.json (nur bei erfolgreichem Sync)
if [ "$SYNC_SUCCESS" = "true" ] && [ "$IN_SYNC" = "true" ]; then
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
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cloudflare Cache-Purge übersprungen (kein erfolgreicher Sync)." >> "$LOG_FILE"
fi

echo "========================================================" >> "$LOG_FILE"
