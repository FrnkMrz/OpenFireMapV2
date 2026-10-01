#!/usr/bin/env bash
# ==============================================================================
# OpenFireMap DACH Data Pipeline - Automatisches Update-Skript
# ==============================================================================

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/srv/docker/projects/openfiremap-pipeline}"
DATA_DIR="${DATA_DIR:-/srv/docker/data/openfiremap}"
PUBLISH_DIR="${PUBLISH_DIR:-${DATA_DIR}/publish}"
RAW_DIR="${RAW_DIR:-${DATA_DIR}/raw}"
LOG_FILE="${LOG_FILE:-${DATA_DIR}/update.log}"
LOCK_FILE="${LOCK_FILE:-${DATA_DIR}/update.lock}"
SYNC_STATUS_FILE="${SYNC_STATUS_FILE:-${RAW_DIR}/sync_status.json}"
BUILD_WARNINGS_FILE="${BUILD_WARNINGS_FILE:-${RAW_DIR}/build_warnings.json}"
BUILD_FINGERPRINT_FILE="${BUILD_FINGERPRINT_FILE:-${RAW_DIR}/build_fingerprint.json}"
PUBLISHED_FINGERPRINT_FILE="${PUBLISHED_FINGERPRINT_FILE:-${RAW_DIR}/published_fingerprint.json}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://pipeline.openfiremap.org}"
CF_CACHE_LIMIT_BYTES="${CF_CACHE_LIMIT_BYTES:-536870912}" # 512 MiB

mkdir -p "$DATA_DIR" "$PUBLISH_DIR" "$RAW_DIR"

# Verriegelung: flock verhindert parallele Ausführung von Cronjob und manuellem Start
exec 9>"$LOCK_FILE"
if command -v flock >/dev/null 2>&1; then
  if ! flock -n 9; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] FEHLER: Ein anderer update.sh-Lauf ist bereits aktiv (Lockfile: ${LOCK_FILE}). Breche ab." >> "$LOG_FILE"
    echo "FEHLER: Ein anderer update.sh-Lauf ist bereits aktiv (Lock: ${LOCK_FILE})." >&2
    exit 3
  fi
fi

# Vor dem Lauf: Veraltete Warnungen aus vorherigen Läufen löschen
rm -f "${BUILD_WARNINGS_FILE}"

# Hilfsfunktion zum sicheren Schreiben von sync_status.json
write_sync_status() {
  local checked_at="$1"
  local result="$2"
  local last_build_gen="$3"
  local local_gen="$4"
  local public_gen="$5"
  local in_sync="$6"
  local local_bytes="$7"
  local public_bytes="$8"
  local over_limit="$9"
  local upload_ok="${10}"
  local last_err="${11}"

  local j_checked_at="null"
  [ -n "$checked_at" ] && j_checked_at="\"$checked_at\""
  local j_result="null"
  [ -n "$result" ] && j_result="\"$result\""
  local j_last_build_gen="null"
  [ -n "$last_build_gen" ] && j_last_build_gen="\"$last_build_gen\""
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

  local j_build_warnings="[]"
  if [ -f "${BUILD_WARNINGS_FILE}" ]; then
    local content
    content=$(cat "${BUILD_WARNINGS_FILE}" 2>/dev/null || echo "")
    if [[ "$content" =~ ^\[.*\]$ ]]; then
      j_build_warnings="$content"
    fi
  fi

  local tmp_status="${SYNC_STATUS_FILE}.tmp.$$"
  cat <<EOF > "${tmp_status}"
{
  "checked_at": ${j_checked_at},
  "result": ${j_result},
  "last_build_generated_at": ${j_last_build_gen},
  "local_generated_at": ${j_local_gen},
  "public_generated_at": ${j_public_gen},
  "in_sync": ${in_sync},
  "local_pmtiles_bytes": ${j_local_bytes},
  "public_pmtiles_bytes": ${j_public_bytes},
  "cf_cache_limit_bytes": ${CF_CACHE_LIMIT_BYTES},
  "pmtiles_over_cf_cache_limit": ${over_limit},
  "upload_ok": ${upload_ok},
  "build_warnings": ${j_build_warnings},
  "last_error": ${j_last_err}
}
EOF
  # Bewusst KEIN mv: nginx bindet sync_status.json als Einzeldatei in den Container ein.
  # Ein mv erzeugt einen neuen Inode, den der Container nicht sieht (veralteter /internal/-Status).
  # Daher Inhalt in die bestehende Datei kopieren (gleicher Inode) und Temp-Datei entfernen.
  cat "${tmp_status}" > "${SYNC_STATUS_FILE}"
  rm -f "${tmp_status}"
}

# Lokale Kenndaten auslesen
get_local_gen() {
  if [ -f "${PUBLISH_DIR}/metadata.json" ]; then
    grep -o '"generated_at": *"[^"]*"' "${PUBLISH_DIR}/metadata.json" | head -n1 | cut -d'"' -f4 || echo ""
  else
    echo ""
  fi
}

get_build_gen() {
  if [ -f "${BUILD_FINGERPRINT_FILE}" ]; then
    grep -o '"generated_at": *"[^"]*"' "${BUILD_FINGERPRINT_FILE}" | head -n1 | cut -d'"' -f4 || echo ""
  else
    echo ""
  fi
}

fingerprints_match() {
  if [ ! -f "${BUILD_FINGERPRINT_FILE}" ] || [ ! -f "${PUBLISHED_FINGERPRINT_FILE}" ]; then
    return 1
  fi
  cmp -s "${BUILD_FINGERPRINT_FILE}" "${PUBLISHED_FINGERPRINT_FILE}"
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
INIT_BUILD_GEN=$(get_build_gen)
INIT_LOCAL_GEN=$(get_local_gen)
INIT_LOCAL_BYTES=$(get_local_bytes)
INIT_OVER_LIMIT=false
if [ "$INIT_LOCAL_BYTES" -gt "$CF_CACHE_LIMIT_BYTES" ]; then
  INIT_OVER_LIMIT=true
fi
write_sync_status "$INIT_CHECKED_AT" "" "$INIT_BUILD_GEN" "$INIT_LOCAL_GEN" "" "false" "$INIT_LOCAL_BYTES" "" "$INIT_OVER_LIMIT" "false" "Update-Lauf gestartet..."

# Führe Datenbuild aus (nutzt intelligenten HEAD-Check zur Vermeidung unnötiger Downloads)
BUILDER_EXIT=0
FORCE_DOWNLOAD=${FORCE_DOWNLOAD:-false} FORCE_BUILD=${FORCE_BUILD:-false} docker compose run --rm builder >> "$LOG_FILE" 2>&1 || BUILDER_EXIT=$?

if [ "$BUILDER_EXIT" -ne 0 ] && [ "$BUILDER_EXIT" -ne 10 ] && [ "$BUILDER_EXIT" -ne 11 ]; then
  BUILD_ERR="FEHLER: Daten-Build (builder) fehlgeschlagen (Exit-Code ${BUILDER_EXIT})!"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ${BUILD_ERR}" >> "$LOG_FILE"
  write_sync_status "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "failed" "$INIT_BUILD_GEN" "$INIT_LOCAL_GEN" "" "false" "$INIT_LOCAL_BYTES" "" "$INIT_OVER_LIMIT" "false" "$BUILD_ERR"
  exit 1
fi

# Lokale Kenndaten nach dem Builder-Lauf
LOCAL_GEN=$(get_local_gen)
LAST_BUILD_GEN=$(get_build_gen)
[ -z "$LAST_BUILD_GEN" ] && LAST_BUILD_GEN="$LOCAL_GEN"
LOCAL_BYTES=$(get_local_bytes)
OVER_LIMIT=false
if [ "$LOCAL_BYTES" -gt "$CF_CACHE_LIMIT_BYTES" ]; then
  OVER_LIMIT=true
fi

# R2 Verfügbarkeit prüfen
R2_ENABLED=false
if command -v rclone &> /dev/null && rclone listremotes 2>/dev/null | grep -q "^r2:"; then
  R2_ENABLED=true
fi

# Öffentlichen Stand (metadata.json) abfragen
PUBLIC_GEN_PRE=""
if [ "$R2_ENABLED" = "true" ]; then
  CB_TS=$(date +%s%N 2>/dev/null || date +%s)
  META_RESP=$(curl -s -f -m 15 "${PUBLIC_BASE_URL}/metadata.json?cb=${CB_TS}" 2>/dev/null || echo "")
  if [ -n "$META_RESP" ]; then
    PUBLIC_GEN_PRE=$(echo "$META_RESP" | grep -o '"generated_at": *"[^"]*"' | head -n1 | cut -d'"' -f4 || echo "")
  fi
fi

# Bestimme Ergebnis und Upload-Bedarf
BUILD_RESULT=""
DO_UPLOAD=false

if [ "$BUILDER_EXIT" -eq 10 ] || [ "$BUILDER_EXIT" -eq 11 ]; then
  if fingerprints_match && [ -n "$LOCAL_GEN" ] && [ "$PUBLIC_GEN_PRE" = "$LOCAL_GEN" ]; then
    if [ "$BUILDER_EXIT" -eq 11 ]; then
      BUILD_RESULT="skipped_stale_source"
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Keine Änderungen, aber Quelle für mindestens ein Land veraltet oder nicht erreichbar (Exit-Code 11). Überspringe Upload." >> "$LOG_FILE"
    else
      BUILD_RESULT="skipped_no_changes"
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Keine Änderungen und Datenbestand bereits veröffentlicht (generated_at=${LOCAL_GEN}). Überspringe Upload." >> "$LOG_FILE"
    fi
    DO_UPLOAD=false
  else
    BUILD_RESULT="upload_only"
    DO_UPLOAD=true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Keine Änderungen beim Build, aber lokaler Stand noch nicht auf R2 veröffentlicht (öffentlich: '${PUBLIC_GEN_PRE}', lokal: '${LOCAL_GEN}'). Starte Upload..." >> "$LOG_FILE"
  fi
else
  BUILD_RESULT="built"
  DO_UPLOAD=true
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Daten-Build erfolgreich abgeschlossen." >> "$LOG_FILE"
fi

SYNC_SUCCESS=true
LAST_ERROR=""

if [ "$R2_ENABLED" = "true" ] && [ "$DO_UPLOAD" = "true" ]; then
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
    write_sync_status "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$BUILD_RESULT" "$LAST_BUILD_GEN" "$LOCAL_GEN" "" "false" "$LOCAL_BYTES" "" "$OVER_LIMIT" "false" "$LAST_ERROR"
    exit 1
  fi
fi

# ==============================================================================
# Upload-Verifikation gegen öffentlichen R2-Endpunkt (läuft auch bei skipped als Heartbeat)
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
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Noch nicht synchron (Lokal: gen=${LOCAL_GEN}, bytes=${LOCAL_BYTES} | Öffentlich: gen=${PUBLIC_GEN}, bytes=${PUBLIC_BYTES}). Warte ${VERIFY_SLEEP_SEC:-20}s..." >> "$LOG_FILE"
      sleep "${VERIFY_SLEEP_SEC:-20}"
    fi
    VERIFY_ATTEMPT=$((VERIFY_ATTEMPT + 1))
  done

  CHECKED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  if [ "$IN_SYNC" = "true" ]; then
    # Bei erfolgreichem Build oder Nach-Upload: Fingerprint als veröffentlicht sichern
    if [ "$BUILD_RESULT" = "built" ] || [ "$BUILD_RESULT" = "upload_only" ]; then
      if [ -f "${BUILD_FINGERPRINT_FILE}" ]; then
        TMP_PUB="${PUBLISHED_FINGERPRINT_FILE}.tmp.$$"
        cp "${BUILD_FINGERPRINT_FILE}" "${TMP_PUB}"
        mv -f "${TMP_PUB}" "${PUBLISHED_FINGERPRINT_FILE}"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Published-Fingerprint erfolgreich aktualisiert." >> "$LOG_FILE"
      fi
    fi
    write_sync_status "$CHECKED_AT" "$BUILD_RESULT" "$LAST_BUILD_GEN" "$LOCAL_GEN" "$PUBLIC_GEN" "true" "$LOCAL_BYTES" "$PUBLIC_BYTES" "$OVER_LIMIT" "true" ""
  else
    LAST_ERROR="Öffentlicher R2-Stand weicht nach ${MAX_ATTEMPTS} Prüfversuchen von lokalen Daten ab (lokal: gen=${LOCAL_GEN}, bytes=${LOCAL_BYTES} | öffentlich: gen=${PUBLIC_GEN}, bytes=${PUBLIC_BYTES})"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNUNG: ${LAST_ERROR}" >> "$LOG_FILE"
    write_sync_status "$CHECKED_AT" "$BUILD_RESULT" "$LAST_BUILD_GEN" "$LOCAL_GEN" "$PUBLIC_GEN" "false" "$LOCAL_BYTES" "$PUBLIC_BYTES" "$OVER_LIMIT" "true" "$LAST_ERROR"
    exit 2
  fi
else
  # Wenn R2 nicht aktiviert war, lokalen Stand als nicht synchronisiert vermerken
  write_sync_status "$CHECKED_AT" "$BUILD_RESULT" "$LAST_BUILD_GEN" "$LOCAL_GEN" "" "false" "$LOCAL_BYTES" "" "$OVER_LIMIT" "true" "R2 Upload deaktiviert (kein Remote)"
fi

# Optionaler Cloudflare Cache-Purge für pmtiles und metadata.json (nur bei echtem Upload)
if [ "$DO_UPLOAD" = "true" ] && [ "$SYNC_SUCCESS" = "true" ] && [ "$IN_SYNC" = "true" ]; then
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
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cloudflare Cache-Purge übersprungen (kein Upload oder nicht synchron)." >> "$LOG_FILE"
fi

echo "========================================================" >> "$LOG_FILE"
