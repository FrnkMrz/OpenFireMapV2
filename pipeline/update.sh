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

# FORCE_DOWNLOAD=true erzwingt den erneuten Download des aktuellen PBF von Geofabrik
FORCE_DOWNLOAD=true docker compose run --rm builder >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Daten-Update erfolgreich abgeschlossen." >> "$LOG_FILE"
echo "========================================================" >> "$LOG_FILE"
