#!/usr/bin/env bash
# ==============================================================================
# Erstellt ein eigenständiges Git-Repository für die OpenFireMap DACH Data Pipeline
# und pusht es zu GitHub unter FrnkMrz/openfiremap-dach-pipeline
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)/../openfiremap-dach-pipeline"
REPO_NAME="openfiremap-dach-pipeline"
GITHUB_USER="FrnkMrz"

echo "================================================================="
echo "📦 Erstelle eigenständiges Repository: ${TARGET_DIR}"
echo "================================================================="

mkdir -p "$TARGET_DIR"

# Dateien synchronisieren (ohne temporäre Daten, Caches, Secrets oder Git-Metadaten)
rsync -av --delete \
    --exclude=".git" \
    --exclude=".DS_Store" \
    --exclude="__pycache__" \
    --exclude="*.pyc" \
    --exclude="data" \
    --exclude="raw" \
    --exclude="publish" \
    --exclude="*.log" \
    --exclude="*.pbf*" \
    --exclude=".env" \
    --exclude="*cache*" \
    "${SCRIPT_DIR}/" "${TARGET_DIR}/"

cd "$TARGET_DIR"

# Git Repository initialisieren
if [ ! -d ".git" ]; then
    echo "🌱 Initialisiere Git Repository..."
    git init -b main
fi

git add .
git commit -m "Initial commit: OpenFireMap DACH Data Pipeline (Docker/Proxmox)" || echo "Keine Änderungen zum Committen."

# Remote setzen
REMOTE_URL="git@github.com:${GITHUB_USER}/${REPO_NAME}.git"
if git remote | grep -q "origin"; then
    git remote set-url origin "$REMOTE_URL"
else
    git remote add origin "$REMOTE_URL"
fi

echo ""
echo "================================================================="
echo "✅ Lokales Repository fertig vorbereitet unter:"
echo "   ${TARGET_DIR}"
echo ""
echo "Nächster Schritt:"
echo "1. Erstelle das leere Repository auf GitHub:"
echo "   👉 https://github.com/new (Name: ${REPO_NAME})"
echo ""
echo "2. Danach im Terminal folgenden Befehl ausführen:"
echo "   cd \"${TARGET_DIR}\" && git push -u origin main"
echo "================================================================="
