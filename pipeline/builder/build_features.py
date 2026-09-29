#!/usr/bin/env python3
"""
OpenFireMap DACH Data Pipeline - Feature Builder (DACHLiLu & Single-Region)
Extrahiert feuerwehrrelevante OSM-Objekte aus PBF-Auszügen nach dem
hocheffizienten „Filter-then-Merge“-Verfahren und generiert kompakte
PMTiles-Vektorkacheln sowie GeoJSON-Dateien.
"""

import os
import sys
import time
import json
import shutil
import subprocess
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

# Konfiguration über Umgebungsvariablen
def _default_base_dir():
    if os.path.isdir("/data") and os.access("/data", os.W_OK):
        return "/data"
    # Fallback für lokale Tests außerhalb des Docker-Containers
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

BASE_DATA_DIR = _default_base_dir()
RAW_DIR = os.getenv("DATA_RAW_DIR", os.path.join(BASE_DATA_DIR, "raw"))
PUBLISH_DIR = os.getenv("DATA_PUBLISH_DIR", os.path.join(BASE_DATA_DIR, "publish"))
TMP_DIR = os.path.join(RAW_DIR, "tmp")

# Modus-Steuerung:
# Standard: DACHLiLu (Deutschland, Österreich, Schweiz, Luxemburg, Liechtenstein)
# Falls OSM_EXTRACT_URL mit einer konkreten .osm.pbf-URL angegeben ist,
# wechselt der Builder abwärtskompatibel in den Einzel-Auszug-Modus.
PIPELINE_REGION = os.getenv("PIPELINE_REGION", "dachlilu").lower()
OSM_EXTRACT_URL = os.getenv("OSM_EXTRACT_URL", "").strip()
FORCE_DOWNLOAD = os.getenv("FORCE_DOWNLOAD", "false").lower() in ("true", "1", "yes")

# DACHLiLu Länder-Auszüge von Geofabrik
DACHLILU_COUNTRIES = [
    {
        "id": "germany",
        "name": "Deutschland",
        "url": "https://download.geofabrik.de/europe/germany-latest.osm.pbf",
        "filename": "germany-latest.osm.pbf"
    },
    {
        "id": "austria",
        "name": "Österreich",
        "url": "https://download.geofabrik.de/europe/austria-latest.osm.pbf",
        "filename": "austria-latest.osm.pbf"
    },
    {
        "id": "switzerland",
        "name": "Schweiz",
        "url": "https://download.geofabrik.de/europe/switzerland-latest.osm.pbf",
        "filename": "switzerland-latest.osm.pbf"
    },
    {
        "id": "luxembourg",
        "name": "Luxemburg",
        "url": "https://download.geofabrik.de/europe/luxembourg-latest.osm.pbf",
        "filename": "luxembourg-latest.osm.pbf"
    },
    {
        "id": "liechtenstein",
        "name": "Liechtenstein",
        "url": "https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf",
        "filename": "liechtenstein-latest.osm.pbf"
    }
]

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


def get_temp_working_dir():
    """
    Wählt bevorzugt /dev/shm (RAM-Disk), sofern verfügbar und mit ausreichend freiem Speicher (mind. 500 MB).
    Andernfalls Fallback auf TMP_DIR auf der NVMe-Festplatte.
    """
    shm_path = "/dev/shm/openfiremap_tmp"
    try:
        if os.path.exists("/dev/shm"):
            _, _, free_b = shutil.disk_usage("/dev/shm")
            if free_b > 500 * 1024 * 1024:
                os.makedirs(shm_path, exist_ok=True)
                log(f"Verwende RAM-Disk (/dev/shm): {round(free_b / (1024 * 1024))} MB frei.")
                return shm_path, True
    except Exception as e:
        log(f"Hinweis zu /dev/shm: {e}")

    os.makedirs(TMP_DIR, exist_ok=True)
    log(f"Verwende temporäres Verzeichnis auf Festplatte: {TMP_DIR}")
    return TMP_DIR, False


def cleanup_directory(directory, pattern_prefix=None):
    """Bereinigt temporäre Zwischendateien."""
    if not os.path.exists(directory):
        return
    for item in os.listdir(directory):
        if pattern_prefix and not item.startswith(pattern_prefix):
            continue
        item_path = os.path.join(directory, item)
        try:
            if os.path.isfile(item_path) or os.path.islink(item_path):
                os.remove(item_path)
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)
        except Exception as e:
            log(f"Hinweis beim Bereinigen von {item_path}: {e}")


def resolve_targets():
    """
    Ermittelt die Liste der zu verarbeitenden PBF-Auszüge:
    Entweder Einzel-Auszug (wenn OSM_EXTRACT_URL auf eine .osm.pbf verweist)
    oder DACHLiLu (Standard mit allen 5 Ländern).
    """
    if OSM_EXTRACT_URL and OSM_EXTRACT_URL.endswith(".osm.pbf"):
        filename = os.path.basename(OSM_EXTRACT_URL)
        target_id = filename.replace("-latest.osm.pbf", "").replace(".osm.pbf", "")
        log(f"Modus: Einzel-Auszug ({filename})")
        return "single", [{
            "id": target_id,
            "name": filename,
            "url": OSM_EXTRACT_URL,
            "filename": filename
        }]

    log("Modus: DACHLiLu (Deutschland, Österreich, Schweiz, Luxemburg, Liechtenstein)")
    return "dachlilu", DACHLILU_COUNTRIES


def check_remote_extract(url):
    """
    Prüft per HEAD-Request, ob und wann eine Datei auf dem Geofabrik-Server aktualisiert wurde.
    Nutzt urllib.request aus der Standardbibliothek.
    """
    try:
        req = urllib.request.Request(
            url,
            method="HEAD",
            headers={"User-Agent": "OpenFireMap-Pipeline-Builder/2.0"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                last_modified = resp.headers.get("Last-Modified")
                content_length = resp.headers.get("Content-Length")
                return {
                    "last_modified": last_modified,
                    "content_length": int(content_length) if content_length else None,
                    "status": 200
                }
    except Exception as e:
        log(f"Hinweis: HEAD-Anfrage für {url} nicht verfügbar ({e}).")
    return None


def download_extract(url, target_path):
    """
    Lädt einen PBF-Auszug herunter. Prüft vorab per HEAD-Request das Server-Änderungsdatum
    sowie die Dateigröße, um unnötige Downloads unveränderter Auszüge zu vermeiden.
    """
    log(f"Prüfe OSM-Auszug: {target_path}")
    remote_info = check_remote_extract(url)

    if os.path.exists(target_path) and not FORCE_DOWNLOAD:
        local_size = os.path.getsize(target_path)
        local_size_mb = local_size / (1024 * 1024)

        if remote_info and remote_info.get("last_modified"):
            try:
                remote_dt = parsedate_to_datetime(remote_info["last_modified"])
                remote_ts = remote_dt.timestamp()
                local_mtime = os.path.getmtime(target_path)
                expected_size = remote_info.get("content_length")

                size_matches = (expected_size is None or local_size == expected_size)
                if local_mtime >= (remote_ts - 5) and size_matches:
                    log(f"Auszug ist aktuell (Server: {remote_info['last_modified']}, {local_size_mb:.1f} MB). Überspringe Download.")
                    return target_path, 0.0, False
            except Exception as ex:
                log(f"Hinweis beim Timestamp-Vergleich ({target_path}): {ex}")
        else:
            log(f"Auszug bereits vorhanden ({local_size_mb:.1f} MB). Überspringe Download.")
            return target_path, 0.0, False

    log(f"Starte Download mit curl: {url}")
    tmp_download = target_path + ".download"
    start_time = time.time()

    curl_cmd = [
        "curl", "-f", "-L", "-C", "-",
        "-R",  # Übernimmt den Last-Modified-Zeitstempel des Servers auf die lokale Datei
        "--retry", "5",
        "--retry-delay", "3",
        "--connect-timeout", "30",
        "--max-time", "1800",  # Bis zu 30 Minuten für große Extrakte (z. B. Deutschland 4,6 GB)
        "-o", tmp_download,
        url
    ]
    run_cmd(curl_cmd)

    shutil.move(tmp_download, target_path)
    duration = time.time() - start_time
    total_mb = os.path.getsize(target_path) / (1024 * 1024)
    log(f"Download abgeschlossen: {total_mb:.1f} MB in {duration:.1f}s.")
    return target_path, duration, True


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


def process_features(mode, targets, download_duration=0, raw_sizes=None):
    """
    Verarbeitet alle Ziel-Auszüge nach dem „Filter-then-Merge“-Verfahren:
    1. Jedes Land wird einzeln in temporäre PBF-Dateien je Feature vorgefiltert (geringe Größe im RAM).
    2. Die Länder-PBFs je Feature werden zusammengeführt (osmium merge).
    3. Export nach GeoJSON und Erzeugung der PMTiles-Vektorkacheln.
    """
    stats = {}
    total_start = time.time()
    work_dir, is_shm = get_temp_working_dir()

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

    try:
        # -------------------------------------------------------------
        # Schritt 1: Vorfilterung pro Land & Feature (Filter-then-Merge)
        # -------------------------------------------------------------
        log("=== Phase 1: Vorfilterung pro Land (Filter-then-Merge) ===")
        for country in targets:
            cid = country["id"]
            cname = country["name"]
            pbf_path = os.path.join(RAW_DIR, country["filename"])

            if not os.path.exists(pbf_path):
                raise FileNotFoundError(f"PBF-Auszug für {cname} nicht gefunden: {pbf_path}")

            c_size_mb = os.path.getsize(pbf_path) / (1024 * 1024)
            log(f"--- Vorfilterung {cname} ({cid}, {c_size_mb:.1f} MB) ---")
            t_country = time.time()

            for item in FEATURE_CONFIGS:
                fname = item["name"]
                out_part_pbf = os.path.join(work_dir, f"{cid}_{fname}.pbf")
                filter_args = item["filter"]
                run_cmd(["osmium", "tags-filter", pbf_path, *filter_args, "-o", out_part_pbf, "--overwrite"])

            log(f"Land {cname} erfolgreich vorgefiltert in {time.time() - t_country:.1f}s.")

        # -------------------------------------------------------------
        # Schritt 2: Merge & GeoJSON-Export pro Feature
        # -------------------------------------------------------------
        log("=== Phase 2: Zusammenführung & GeoJSON-Export pro Feature ===")
        for item in FEATURE_CONFIGS:
            fname = item["name"]
            output_file = os.path.join(PUBLISH_DIR, item["output"])
            parts = [os.path.join(work_dir, f"{c['id']}_{fname}.pbf") for c in targets]
            existing_parts = [p for p in parts if os.path.exists(p)]

            if not existing_parts:
                raise RuntimeError(f"Keine gefilterten Auszüge für {fname} gefunden!")

            t_feature = time.time()
            if len(existing_parts) > 1:
                merged_pbf = os.path.join(work_dir, f"merged_{fname}.pbf")
                log(f"Führe {len(existing_parts)} Auszüge für {item['description']} zusammen...")
                run_cmd(["osmium", "merge", *existing_parts, "-o", merged_pbf, "--overwrite"])
                source_pbf = merged_pbf
            else:
                source_pbf = existing_parts[0]

            log(f"Exportiere GeoJSON: {item['output']}...")
            export_cmd = ["osmium", "export", source_pbf, "--add-unique-id=type_id", "-o", output_file, "--overwrite"]
            if item.get("geom_types"):
                export_cmd.extend(["--geometry-types", ",".join(item["geom_types"])])
            run_cmd(export_cmd)

            count = count_geojson_features(output_file)
            file_size_kb = os.path.getsize(output_file) / 1024
            duration = time.time() - t_feature

            prev_count = old_counts.get(fname, count)
            diff = count - prev_count
            diff_str = f"+{diff}" if diff > 0 else f"{diff}" if diff < 0 else "±0"

            log(f"Erfolgreich: {count} Objekte ({diff_str}) ({file_size_kb:.1f} KB in {duration:.1f}s)")

            stats[fname] = {
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

            # Bereinige Zwischendateien für dieses Feature sofort zur Speicherentlastung
            for p in existing_parts:
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except Exception:
                        pass
            if len(existing_parts) > 1 and os.path.exists(source_pbf):
                try:
                    os.remove(source_pbf)
                except Exception:
                    pass

        # -------------------------------------------------------------
        # Schritt 3: PMTiles Vektor-Kacheln mit tippecanoe erzeugen
        # -------------------------------------------------------------
        pmtiles_output = os.path.join(PUBLISH_DIR, "openfiremap.pmtiles")
        log("=== Phase 3: Erstelle PMTiles Vektor-Kacheln mit tippecanoe ===")
        t_pmtiles = time.time()

        layer_args = [
            "-L", json.dumps({"file": os.path.join(PUBLISH_DIR, "fire_stations.geojson"), "layer": "fire_stations", "minzoom": 12, "maxzoom": 14}),
            "-L", json.dumps({"file": os.path.join(PUBLISH_DIR, "hydrants.geojson"), "layer": "hydrants", "minzoom": 14, "maxzoom": 14}),
            "-L", json.dumps({"file": os.path.join(PUBLISH_DIR, "water_points.geojson"), "layer": "water_points", "minzoom": 14, "maxzoom": 14}),
            "-L", json.dumps({"file": os.path.join(PUBLISH_DIR, "defibrillators.geojson"), "layer": "defibrillators", "minzoom": 14, "maxzoom": 14}),
            "-L", json.dumps({"file": os.path.join(PUBLISH_DIR, "boundaries.geojson"), "layer": "boundaries", "minzoom": 12, "maxzoom": 14}),
        ]

        cmd = [
            "tippecanoe",
            "-o", pmtiles_output,
            "--force",
            "-z", "14",
            "--generate-ids",
            "--no-feature-limit",
            "--no-tile-size-limit",
            *layer_args
        ]
        run_cmd(cmd)

        pmtiles_duration = round(time.time() - t_pmtiles, 2)
        pmtiles_size_bytes = os.path.getsize(pmtiles_output)
        pmtiles_mb = round(pmtiles_size_bytes / (1024 * 1024), 2)  # Historisch size_mb, Wert in MiB (1024^2 Bytes)
        log(f"PMTiles erfolgreich erstellt: {pmtiles_mb} MB ({pmtiles_size_bytes} Bytes) in {pmtiles_duration}s -> {pmtiles_output}")

    finally:
        # Arbeitsverzeichnis nach dem Durchlauf immer sauber aufräumen
        cleanup_directory(work_dir)
        if is_shm and os.path.exists(work_dir):
            try:
                shutil.rmtree(work_dir)
            except Exception:
                pass

    # -------------------------------------------------------------
    # Schritt 4: Speicherplatz, Metadaten und Systemstatistiken
    # -------------------------------------------------------------
    total_b, used_b, free_b = shutil.disk_usage(PUBLISH_DIR)
    total_raw_mb = round(sum(raw_sizes.values()), 1) if raw_sizes else 0
    total_duration = round(time.time() - total_start + download_duration, 2)
    process_duration = round(time.time() - total_start, 2)

    # Zusammenfassungszeile für Monitoring und Home Assistant
    summary_parts = [
        f"{stats.get('hydrants', {}).get('count', 0)} Hydranten ({stats.get('hydrants', {}).get('diff_text', '±0')})",
        f"{stats.get('fire_stations', {}).get('count', 0)} Wachen ({stats.get('fire_stations', {}).get('diff_text', '±0')})",
        f"{stats.get('water_points', {}).get('count', 0)} Wasserstellen ({stats.get('water_points', {}).get('diff_text', '±0')})",
        f"{stats.get('defibrillators', {}).get('count', 0)} Defis ({stats.get('defibrillators', {}).get('diff_text', '±0')})",
        f"{stats.get('boundaries', {}).get('count', 0)} Grenzen ({stats.get('boundaries', {}).get('diff_text', '±0')})"
    ]
    summary_text = ", ".join(summary_parts)

    system_info = {
        "disk_total_gb": round(total_b / (1024 ** 3), 1),
        "disk_used_gb": round(used_b / (1024 ** 3), 1),
        "disk_free_gb": round(free_b / (1024 ** 3), 1),
        "disk_used_percent": round((used_b / total_b) * 100, 1)
    }

    # Interne Systemstatistiken separat sichern (nicht im öffentlichen Web-Ordner)
    internal_meta_file = os.path.join(RAW_DIR, "system_stats.json")
    try:
        with open(internal_meta_file, "w", encoding="utf-8") as f:
            json.dump({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "system": system_info
            }, f, indent=2)
        log(f"Interne System-Statistik geschrieben: {internal_meta_file}")
    except Exception as err:
        log(f"Hinweis: Konnte interne system_stats.json nicht schreiben: {err}")

    # Öffentliche metadata.json
    country_names = [c["name"] for c in targets]
    metadata = {
        "status": "ok",
        "region": mode,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary_text,
        "countries": country_names,
        "source_extract": f"{mode} ({', '.join(country_names)})" if mode != "single" else targets[0]["filename"],
        "source_extract_size_mb": total_raw_mb,
        "source_url": "https://download.geofabrik.de/europe/" if mode != "single" else targets[0]["url"],
        "pmtiles": {
            "file": "openfiremap.pmtiles",
            "size_mb": pmtiles_mb,  # Angabe in MiB (1024^2 Bytes)
            "size_bytes": pmtiles_size_bytes,
            "duration_sec": pmtiles_duration,
            "minzoom": 12,
            "maxzoom": 14
        },
        "timings": {
            "download_sec": round(download_duration, 2),
            "extraction_sec": process_duration,
            "total_sec": total_duration
        },
        "features": stats
    }

    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    log(f"Metadata geschrieben: {meta_file}")
    log(f"=== Build für Region '{mode}' ({len(targets)} Länder) erfolgreich abgeschlossen! ===")
    return metadata, system_info


def main():
    ensure_dirs()
    mode, targets = resolve_targets()

    # 1. Downloads & Aktualitätsprüfungen durchführen
    log(f"=== Starte Datenabruf für {len(targets)} Auszüge ({mode}) ===")
    total_dl_start = time.time()
    raw_sizes = {}
    download_times = []

    for target in targets:
        local_pbf = os.path.join(RAW_DIR, target["filename"])
        _, dl_duration, was_dl = download_extract(target["url"], local_pbf)
        download_times.append(dl_duration)
        if os.path.exists(local_pbf):
            raw_sizes[target["id"]] = os.path.getsize(local_pbf) / (1024 * 1024)

    total_download_duration = sum(download_times)

    # 2. Features filtern, mergen und PMTiles bauen
    try:
        metadata, system_info = process_features(
            mode=mode,
            targets=targets,
            download_duration=total_download_duration,
            raw_sizes=raw_sizes
        )
        print("\n" + "=" * 60)
        print(f" Region: {metadata['region'].upper()} ({', '.join(metadata['countries'])})")
        print(f" Status: {metadata['summary']}")
        print(f" PMTiles: {metadata['pmtiles']['size_mb']} MB in {metadata['pmtiles']['duration_sec']}s")
        if system_info:
            print(f" Freier Speicher: {system_info['disk_free_gb']} GB ({system_info['disk_used_percent']}% belegt)")
        print(f" Dauer: {metadata['timings']['total_sec']}s (Download: {metadata['timings']['download_sec']}s, Bau: {metadata['timings']['extraction_sec']}s)")
        print("=" * 60 + "\n")
    except Exception as e:
        log(f"ABBRUCH MIT FEHLER: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
