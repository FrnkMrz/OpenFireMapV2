#!/usr/bin/env python3
"""
OpenFireMap DACH Data Pipeline - Feature Builder
Extrahiert feuerwehrrelevante OSM-Objekte aus PBF-Auszügen und generiert GeoJSON-Dateien.
"""

import os
import sys
import time
import json
import shutil
import subprocess
from datetime import datetime, timezone
import requests

# Konfiguration über Umgebungsvariablen
RAW_DIR = os.getenv("DATA_RAW_DIR", "/data/raw")
PUBLISH_DIR = os.getenv("DATA_PUBLISH_DIR", "/data/publish")
TMP_DIR = os.path.join(RAW_DIR, "tmp")

# Standard-Auszug: Mittelfranken (~70 MB, ideal für den Start auf VM 102)
EXTRACT_URL = os.getenv(
    "OSM_EXTRACT_URL",
    "https://download.geofabrik.de/europe/germany/bayern/mittelfranken-latest.osm.pbf"
)
FORCE_DOWNLOAD = os.getenv("FORCE_DOWNLOAD", "false").lower() in ("true", "1", "yes")

FEATURE_CONFIGS = [
    {
        "name": "hydrants",
        "filter": ["nwr/emergency=fire_hydrant"],
        "geom_types": ["point"],
        "output": "hydrants.geojson",
        "description": "Hydranten (Über-/Unterflur, WSH, etc.)"
    },
    {
        "name": "fire_stations",
        "filter": ["nwr/amenity=fire_station", "nwr/building=fire_station"],
        "geom_types": ["point", "polygon"],
        "output": "fire_stations.geojson",
        "description": "Feuerwachen und Feuerwehrgerätehäuser"
    },
    {
        "name": "water_points",
        "filter": ["nwr/emergency=water_tank,suction_point,fire_water_pond,cistern"],
        "geom_types": ["point", "polygon"],
        "output": "water_points.geojson",
        "description": "Löschwasserentnahmestellen und Zisternen"
    },
    {
        "name": "defibrillators",
        "filter": ["n/emergency=defibrillator"],
        "geom_types": ["point"],
        "output": "defibrillators.geojson",
        "description": "Defibrillatoren (AED)"
    },
    {
        "name": "boundaries",
        "filter": ["w/boundary=administrative"],
        "geom_types": ["linestring"],
        "output": "boundaries.geojson",
        "description": "Gemeindegrenzen und Verwaltungsgrenzen"
    }
]


def log(msg):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] {msg}", flush=True)


def ensure_dirs():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(PUBLISH_DIR, exist_ok=True)
    os.makedirs(TMP_DIR, exist_ok=True)


def download_extract(url, target_path):
    log(f"Prüfe OSM-Auszug: {target_path}")
    if os.path.exists(target_path) and not FORCE_DOWNLOAD:
        file_size_mb = os.path.getsize(target_path) / (1024 * 1024)
        log(f"Auszug bereits vorhanden ({file_size_mb:.1f} MB). Überspringe Download.")
        return target_path

    log(f"Starte Download mit curl: {url}")
    tmp_download = target_path + ".download"
    start_time = time.time()

    curl_cmd = [
        "curl", "-f", "-L", "-C", "-",
        "--retry", "5",
        "--retry-delay", "3",
        "--connect-timeout", "30",
        "--max-time", "600",
        "-o", tmp_download,
        url
    ]
    run_cmd(curl_cmd)

    shutil.move(tmp_download, target_path)
    duration = time.time() - start_time
    total_mb = os.path.getsize(target_path) / (1024 * 1024)
    log(f"Download abgeschlossen: {total_mb:.1f} MB in {duration:.1f}s.")
    return target_path


def run_cmd(cmd):
    log(f"Ausführen: {' '.join(cmd)}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        log(f"FEHLER: {res.stderr}")
        raise RuntimeError(f"Befehl fehlgeschlagen: {' '.join(cmd)}\n{res.stderr}")
    return res.stdout


def count_geojson_features(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return len(data.get("features", []))
    except Exception as e:
        log(f"Warnung beim Zählen der Features in {file_path}: {e}")
        return -1


def process_features(input_pbf, download_duration=0):
    stats = {}
    total_start = time.time()

    # Vorherige Metadaten laden für Diff-Berechnung
    meta_file = os.path.join(PUBLISH_DIR, "metadata.json")
    old_counts = {}
    if os.path.exists(meta_file):
        try:
            with open(meta_file, "r", encoding="utf-8") as f:
                old_meta = json.load(f)
                for k, v in old_meta.get("features", {}).items():
                    old_counts[k] = v.get("count", 0)
        except Exception:
            pass

    for item in FEATURE_CONFIGS:
        name = item["name"]
        filter_args = item["filter"]
        output_file = os.path.join(PUBLISH_DIR, item["output"])
        tmp_pbf = os.path.join(TMP_DIR, f"{name}.pbf")

        log(f"--- Verarbeite {item['description']} ({name}) ---")
        t0 = time.time()

        run_cmd(["osmium", "tags-filter", input_pbf, *filter_args, "-o", tmp_pbf, "--overwrite"])

        export_cmd = ["osmium", "export", tmp_pbf, "--add-unique-id=type_id", "-o", output_file, "--overwrite"]
        if item.get("geom_types"):
            export_cmd.extend(["--geometry-types", ",".join(item["geom_types"])])
        run_cmd(export_cmd)

        count = count_geojson_features(output_file)
        file_size_kb = os.path.getsize(output_file) / 1024
        duration = time.time() - t0

        prev_count = old_counts.get(name, count)
        diff = count - prev_count
        diff_str = f"+{diff}" if diff > 0 else f"{diff}" if diff < 0 else "±0"

        log(f"Erfolgreich: {count} Objekte ({diff_str}) ({file_size_kb:.1f} KB in {duration:.1f}s)")

        stats[name] = {
            "count": count,
            "diff": diff,
            "diff_text": diff_str,
            "previous_count": prev_count,
            "file": item["output"],
            "size_bytes": os.path.getsize(output_file),
            "size_kb": round(file_size_kb, 1),
            "duration_sec": round(duration, 2),
            "description": item["description"]
        }

        if os.path.exists(tmp_pbf):
            os.remove(tmp_pbf)

    # PMTiles Vektor-Kacheln mit tippecanoe erzeugen
    pmtiles_output = os.path.join(PUBLISH_DIR, "openfiremap.pmtiles")
    log("--- Erstelle PMTiles Vektor-Kacheln mit tippecanoe ---")
    t_pmtiles = time.time()

    layer_args = [
        "-L", json.dumps({"file": os.path.join(PUBLISH_DIR, "fire_stations.geojson"), "layer": "fire_stations", "minzoom": 12, "maxzoom": 16}),
        "-L", json.dumps({"file": os.path.join(PUBLISH_DIR, "hydrants.geojson"), "layer": "hydrants", "minzoom": 15, "maxzoom": 16}),
        "-L", json.dumps({"file": os.path.join(PUBLISH_DIR, "water_points.geojson"), "layer": "water_points", "minzoom": 15, "maxzoom": 16}),
        "-L", json.dumps({"file": os.path.join(PUBLISH_DIR, "defibrillators.geojson"), "layer": "defibrillators", "minzoom": 15, "maxzoom": 16}),
        "-L", json.dumps({"file": os.path.join(PUBLISH_DIR, "boundaries.geojson"), "layer": "boundaries", "minzoom": 12, "maxzoom": 16}),
    ]

    cmd = [
        "tippecanoe",
        "-o", pmtiles_output,
        "--force",
        "-z", "16",
        "--generate-ids",
        "--no-feature-limit",
        "--no-tile-size-limit",
        *layer_args
    ]
    run_cmd(cmd)

    pmtiles_duration = round(time.time() - t_pmtiles, 2)
    pmtiles_mb = round(os.path.getsize(pmtiles_output) / (1024 * 1024), 2)
    log(f"PMTiles erfolgreich erstellt: {pmtiles_mb} MB in {pmtiles_duration}s -> {pmtiles_output}")

    # Speicherplatz auf /srv/docker/data/openfiremap ermitteln
    total_b, used_b, free_b = shutil.disk_usage(PUBLISH_DIR)
    extract_mb = round(os.path.getsize(input_pbf) / (1024 * 1024), 1) if os.path.exists(input_pbf) else 0

    total_duration = round(time.time() - total_start + download_duration, 2)
    process_duration = round(time.time() - total_start, 2)

    # Menschenlesbare Zusammenfassungszeile für Home Assistant
    summary_parts = [
        f"{stats.get('hydrants', {}).get('count', 0)} Hydranten ({stats.get('hydrants', {}).get('diff_text', '±0')})",
        f"{stats.get('fire_stations', {}).get('count', 0)} Wachen ({stats.get('fire_stations', {}).get('diff_text', '±0')})",
        f"{stats.get('water_points', {}).get('count', 0)} Wasserstellen ({stats.get('water_points', {}).get('diff_text', '±0')})",
        f"{stats.get('defibrillators', {}).get('count', 0)} Defis ({stats.get('defibrillators', {}).get('diff_text', '±0')})",
        f"{stats.get('boundaries', {}).get('count', 0)} Grenzen ({stats.get('boundaries', {}).get('diff_text', '±0')})"
    ]
    summary_text = ", ".join(summary_parts)

    metadata = {
        "status": "ok",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary_text,
        "source_extract": os.path.basename(EXTRACT_URL),
        "source_extract_size_mb": extract_mb,
        "source_url": EXTRACT_URL,
        "pmtiles": {
            "file": "openfiremap.pmtiles",
            "size_mb": pmtiles_mb,
            "duration_sec": pmtiles_duration,
            "minzoom": 12,
            "maxzoom": 16
        },
        "timings": {
            "download_sec": round(download_duration, 2),
            "extraction_sec": process_duration,
            "total_sec": total_duration
        },
        "system": {
            "disk_total_gb": round(total_b / (1024 ** 3), 1),
            "disk_used_gb": round(used_b / (1024 ** 3), 1),
            "disk_free_gb": round(free_b / (1024 ** 3), 1),
            "disk_used_percent": round((used_b / total_b) * 100, 1)
        },
        "features": stats
    }

    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    log(f"Metadata geschrieben: {meta_file}")
    log("=== Alle Datensätze & Vektor-Kacheln erfolgreich erstellt! ===")
    return metadata


def main():
    ensure_dirs()
    filename = os.path.basename(EXTRACT_URL)
    local_pbf = os.path.join(RAW_DIR, filename)

    try:
        t_dl_start = time.time()
        download_extract(EXTRACT_URL, local_pbf)
        dl_duration = time.time() - t_dl_start

        metadata = process_features(local_pbf, download_duration=dl_duration)
        print("\n" + "=" * 50)
        print(f" Status: {metadata['summary']}")
        print(f" Freier Speicher: {metadata['system']['disk_free_gb']} GB ({metadata['system']['disk_used_percent']}% belegt)")
        print(f" Dauer: {metadata['timings']['total_sec']}s (Download: {metadata['timings']['download_sec']}s, Filter: {metadata['timings']['extraction_sec']}s)")
        print("=" * 50 + "\n")
    except Exception as e:
        log(f"ABBRUCH MIT FEHLER: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
