#!/usr/bin/env bash
# ==============================================================================
# Test-Skript für update.sh: Skip if unchanged, upload_only, built und failed
# Läuft ohne Docker und ohne echtes Netzwerk in isolierten Temp-Verzeichnissen.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATE_SH="${SCRIPT_DIR}/../update.sh"

FAILED_TESTS=0

run_test() {
  local test_name="$1"
  local builder_exit="$2"
  local setup_published_fp="$3"
  local public_gen_matches="$4"
  local expected_result="$5"
  local expected_rclone_calls="$6"
  local expected_exit="$7"

  echo "=== Test: ${test_name} ==="

  local tmpdir
  tmpdir=$(mktemp -d)
  local data_dir="${tmpdir}/data"
  local project_dir="${tmpdir}/project"
  local bin_dir="${tmpdir}/bin"

  mkdir -p "${data_dir}/raw" "${data_dir}/publish" "${project_dir}" "${bin_dir}"

  local rclone_call_file="${tmpdir}/rclone_calls.txt"
  echo "0" > "${rclone_call_file}"

  # 1. Mock für docker compose
  cat <<'EOF' > "${bin_dir}/docker"
#!/usr/bin/env bash
if [ "$1" = "compose" ] && [ "$2" = "run" ]; then
  exit ${MOCK_BUILDER_EXIT:-0}
fi
exit 0
EOF
  chmod +x "${bin_dir}/docker"

  # 2. Mock für rclone
  cat <<EOF > "${bin_dir}/rclone"
#!/usr/bin/env bash
if [ "\$1" = "listremotes" ]; then
  echo "r2:"
  exit 0
fi
if [ "\$1" = "copy" ]; then
  count=\$(cat "${rclone_call_file}")
  echo "\$((count + 1))" > "${rclone_call_file}"
  exit 0
fi
exit 0
EOF
  chmod +x "${bin_dir}/rclone"

  # 3. Mock für curl
  cat <<EOF > "${bin_dir}/curl"
#!/usr/bin/env bash
# Range-Request für pmtiles
if [[ "\$*" == *"openfiremap.pmtiles"* ]]; then
  echo "HTTP/1.1 206 Partial Content"
  size=0
  if [ -f "${data_dir}/publish/openfiremap.pmtiles" ]; then
    size=\$(wc -c < "${data_dir}/publish/openfiremap.pmtiles" | tr -d ' ')
  fi
  echo "Content-Range: bytes 0-0/\$size"
  exit 0
fi

# metadata.json
if [[ "\$*" == *"metadata.json"* ]]; then
  calls=\$(cat "${rclone_call_file}" 2>/dev/null || echo "0")
  if [ "\${MOCK_PUBLIC_GEN_MATCHES:-true}" = "true" ] || [ "\$calls" -ge 3 ]; then
    echo '{"generated_at":"2026-09-30T06:00:00Z"}'
  else
    echo '{"generated_at":"2026-09-29T18:00:00Z"}'
  fi
  exit 0
fi
exit 0
EOF
  chmod +x "${bin_dir}/curl"

  # 4. Mock für flock (falls nicht vorhanden)
  if ! command -v flock >/dev/null 2>&1; then
    cat <<'EOF' > "${bin_dir}/flock"
#!/usr/bin/env bash
exit 0
EOF
    chmod +x "${bin_dir}/flock"
  fi

  # 5. Testdaten vorbereiten
  local test_gen="2026-09-30T06:00:00Z"
  cat <<EOF > "${data_dir}/publish/metadata.json"
{
  "version": "v0.8.2",
  "generated_at": "${test_gen}"
}
EOF
  echo "dummy_pmtiles_bytes" > "${data_dir}/publish/openfiremap.pmtiles"

  local fp_content='{"generated_at":"'${test_gen}'","builder_hash":"testhash123","extracts":{}}'
  echo "$fp_content" > "${data_dir}/raw/build_fingerprint.json"

  if [ "$setup_published_fp" = "same" ]; then
    echo "$fp_content" > "${data_dir}/raw/published_fingerprint.json"
  elif [ "$setup_published_fp" = "different" ]; then
    echo '{"generated_at":"2026-09-29T18:00:00Z","builder_hash":"oldhash","extracts":{}}' > "${data_dir}/raw/published_fingerprint.json"
  fi

  # 6. Ausführung von update.sh
  local env_args=(
    "DATA_DIR=${data_dir}"
    "PROJECT_DIR=${project_dir}"
    "PATH=${bin_dir}:${PATH}"
    "MOCK_BUILDER_EXIT=${builder_exit}"
    "MOCK_PUBLIC_GEN_MATCHES=${public_gen_matches}"
    "VERIFY_SLEEP_SEC=0"
  )

  local actual_exit=0
  env "${env_args[@]}" bash "${UPDATE_SH}" > "${tmpdir}/output.log" 2>&1 || actual_exit=$?

  # 7. Prüfungen
  if [ "$actual_exit" -ne "$expected_exit" ]; then
    echo "❌ FEHLER: Exit-Code war ${actual_exit}, erwartet ${expected_exit}"
    cat "${data_dir}/update.log" 2>/dev/null || cat "${tmpdir}/output.log"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    rm -rf "${tmpdir}"
    return
  fi

  local actual_rclone_calls
  actual_rclone_calls=$(cat "${rclone_call_file}")
  if [ "$actual_rclone_calls" -ne "$expected_rclone_calls" ]; then
    echo "❌ FEHLER: rclone-Aufrufe waren ${actual_rclone_calls}, erwartet ${expected_rclone_calls}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    rm -rf "${tmpdir}"
    return
  fi

  local sync_status="${data_dir}/raw/sync_status.json"
  if [ ! -f "$sync_status" ]; then
    echo "❌ FEHLER: sync_status.json wurde nicht erzeugt!"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    rm -rf "${tmpdir}"
    return
  fi

  local actual_result
  actual_result=$(grep -o '"result": *"[^"]*"' "$sync_status" | head -n1 | cut -d'"' -f4 || echo "")
  if [ "$actual_result" != "$expected_result" ]; then
    echo "❌ FEHLER: result in sync_status.json war '${actual_result}', erwartet '${expected_result}'"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    rm -rf "${tmpdir}"
    return
  fi

  if [ "$expected_result" = "upload_only" ] || [ "$expected_result" = "built" ]; then
    if [ ! -f "${data_dir}/raw/published_fingerprint.json" ]; then
      echo "❌ FEHLER: published_fingerprint.json fehlt nach erfolgreichem Upload!"
      FAILED_TESTS=$((FAILED_TESTS + 1))
      rm -rf "${tmpdir}"
      return
    fi
  fi

  echo "✅ Bestanden (${actual_result}, ${actual_rclone_calls} rclone-Aufrufe, exit ${actual_exit})"
  rm -rf "${tmpdir}"
}

echo "Starte Tests für update.sh..."

# Test 1: Builder Exit 10 + Fingerprints gleich + öffentlich == lokal -> skipped_no_changes, 0 rclone calls, exit 0
run_test "Exit 10 + synchron -> skipped_no_changes (0 rclone calls)" 10 "same" "true" "skipped_no_changes" 0 0

# Test 2: Builder Exit 10 + noch nicht veröffentlicht (kein published_fp) -> upload_only, 3 rclone calls, exit 0
run_test "Exit 10 + noch nicht veröffentlicht -> upload_only (3 rclone calls)" 10 "none" "false" "upload_only" 3 0

# Test 3: Builder Exit 0 -> built, 3 rclone calls, exit 0
run_test "Exit 0 -> built (3 rclone calls)" 0 "none" "true" "built" 3 0

# Test 4: Builder Exit 1 -> failed, 0 rclone calls, exit 1
run_test "Exit 1 -> failed (0 rclone calls)" 1 "same" "true" "failed" 0 1

# Test 5: Builder Exit 11 + synchron -> skipped_stale_source (0 rclone calls)
run_test "Exit 11 + synchron -> skipped_stale_source (0 rclone calls)" 11 "same" "true" "skipped_stale_source" 0 0

echo ""
if [ "$FAILED_TESTS" -eq 0 ]; then
  echo "🎉 Alle update.sh-Tests erfolgreich bestanden!"
  exit 0
else
  echo "❌ ${FAILED_TESTS} Test(s) fehlgeschlagen!"
  exit 1
fi
