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
import urllib.parse
import urllib.error
import hashlib
from datetime import datetime, timezone, timedelta
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
FORCE_BUILD = os.getenv("FORCE_BUILD", "false").lower() in ("true", "1", "yes")
MAX_FALLBACK_AGE_HOURS = int(os.getenv("MAX_FALLBACK_AGE_HOURS", "72"))
CURL_MAX_TIME = int(os.getenv("CURL_MAX_TIME", "5400"))
# Mindestrate: Fällt die Übertragung CURL_SPEED_TIME Sekunden lang unter CURL_SPEED_LIMIT Bytes/s,
# bricht curl ab und der nächste Versuch setzt auf einer neuen Verbindung fort. Geofabrik verteilt
# Downloads auf mehrere Server, von denen einzelne zeitweise nur wenige hundert KB/s liefern.
CURL_SPEED_LIMIT = int(os.getenv("CURL_SPEED_LIMIT", str(1024 * 1024)))
CURL_SPEED_TIME = int(os.getenv("CURL_SPEED_TIME", "60"))
CURL_ATTEMPTS = int(os.getenv("CURL_ATTEMPTS", "6"))
CURL_RETRY_DELAY = int(os.getenv("CURL_RETRY_DELAY", "3"))

BUILD_FINGERPRINT_FILE = os.path.join(RAW_DIR, "build_fingerprint.json")

BUILD_WARNINGS = []

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
        "filter": ["r/boundary=administrative"],
        # tags-filter verknüpft Ausdrücke nur mit ODER. Die zweite Stufe schränkt auf
        # Gemeinde-Relationen ein (UND), passend zur Overpass-Abfrage im Frontend.
        # osmium tags-filter übernimmt referenzierte Mitglieds-Wege und -Knoten automatisch.
        "refine_filter": ["r/admin_level=8"],
        "keep_untagged": True,
        # Nur diese Tags exportieren: Grenzwege tragen oft Straßen-Tags, die das Frontend nicht braucht.
        "include_tags": ["boundary", "admin_level"],
        "geom_types": ["linestring"],
        "output": "boundaries.geojson",
        "description": "Gemeindegrenzen (über Gemeinde-Relationen admin_level=8)"
    }
]

# Tippecanoe Vektorkachel-Konfiguration
TIPPECANOE_CONFIG = {
    "maxzoom": 14,
    "options": [
        "--force",
        "-z", "14",
        "--generate-ids",
        "--no-feature-limit",
        "--no-tile-size-limit",
    ],
    "layers": [
        {"layer": "fire_stations", "file": "fire_stations.geojson", "minzoom": 12, "maxzoom": 14},
        {"layer": "hydrants", "file": "hydrants.geojson", "minzoom": 14, "maxzoom": 14},
        {"layer": "water_points", "file": "water_points.geojson", "minzoom": 14, "maxzoom": 14},
        {"layer": "defibrillators", "file": "defibrillators.geojson", "minzoom": 14, "maxzoom": 14},
        {"layer": "boundaries", "file": "boundaries.geojson", "minzoom": 12, "maxzoom": 14},
    ]
}


def log(msg):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] {msg}", flush=True)


def record_warning(msg):
    """Protokolliert eine Warnung und speichert sie für sync_status.json."""
    log(f"WARNUNG: {msg}")
    BUILD_WARNINGS.append(msg)


def save_build_warnings(raw_dir=None):
    """Schreibt gesammelte Warnungen nach raw/build_warnings.json."""
    target_dir = raw_dir or RAW_DIR
    warnings_file = os.path.join(target_dir, "build_warnings.json")
    try:
        with open(warnings_file, "w", encoding="utf-8") as f:
            json.dump(BUILD_WARNINGS, f, indent=2, ensure_ascii=False)
        log(f"Build-Warnungen geschrieben: {warnings_file} ({len(BUILD_WARNINGS)} Einträge)")
    except Exception as err:
        log(f"Hinweis: Konnte {warnings_file} nicht schreiben: {err}")


def validate_pbf_file(file_path, min_size_bytes=100 * 1024):
    """
    Prüft, ob eine heruntergeladene PBF-Datei vollständig und strukturell intakt ist:
    - Mindestgröße (standardmäßig 100 KB) gegen leere/abgebrochene HTTP-Responses
    - osmium fileinfo (falls osmium im System vorhanden ist)
    """
    if not os.path.exists(file_path):
        raise RuntimeError(f"Datei existiert nicht zur Validierung: {file_path}")

    actual_size = os.path.getsize(file_path)
    if actual_size < min_size_bytes:
        raise RuntimeError(
            f"Heruntergeladene PBF-Datei ist unvollständig oder zu klein ({actual_size} Bytes < {min_size_bytes} Bytes): {file_path}"
        )

    osmium_bin = shutil.which("osmium")
    if osmium_bin:
        res = subprocess.run(
            [osmium_bin, "fileinfo", "-F", "pbf", file_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        if res.returncode != 0:
            raise RuntimeError(
                f"osmium fileinfo Validierung fehlgeschlagen für {file_path}: {res.stderr.strip()}"
            )


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


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Verhindert automatische Weiterleitungen in urllib, damit HEAD-Anfragen nicht zu GET werden."""
    def http_error_301(self, req, fp, code, msg, headers):
        return fp

    def http_error_302(self, req, fp, code, msg, headers):
        return fp

    def http_error_303(self, req, fp, code, msg, headers):
        return fp

    def http_error_307(self, req, fp, code, msg, headers):
        return fp

    def http_error_308(self, req, fp, code, msg, headers):
        return fp


def check_remote_extract(url, max_redirects=5, timeout=15):
    """
    Prüft per HEAD-Request, ob und wann eine Datei auf dem Geofabrik-Server aktualisiert wurde.
    Folgt HTTP-Weiterleitungen (z. B. 302 von -latest.osm.pbf auf datierte Dateien) manuell strikt
    als HEAD, um zu verhindern, dass Standard-Redirect-Handler auf GET wechseln und Multi-Gigabyte-Dateien laden.
    Verwendet Last-Modified und Content-Length der finalen Datei.
    """
    current_url = url
    headers = {"User-Agent": "OpenFireMap-Pipeline-Builder/2.0"}
    opener = urllib.request.build_opener(_NoRedirectHandler)

    for _ in range(max_redirects + 1):
        try:
            req = urllib.request.Request(current_url, method="HEAD", headers=headers)
            with opener.open(req, timeout=timeout) as resp:
                status = getattr(resp, "status", getattr(resp, "code", None))
                if status in (301, 302, 303, 307, 308):
                    location = resp.headers.get("Location")
                    if not location:
                        log(f"Hinweis: Weiterleitung {status} ohne Location-Header für {current_url}")
                        return None
                    current_url = urllib.parse.urljoin(current_url, location)
                    continue
                elif status == 200:
                    last_modified = resp.headers.get("Last-Modified")
                    content_length = resp.headers.get("Content-Length")
                    return {
                        "last_modified": last_modified,
                        "content_length": int(content_length) if content_length else None,
                        "status": 200,
                        "url": current_url
                    }
                else:
                    log(f"Hinweis: Unerwarteter HTTP-Status {status} für {current_url}")
                    return None
        except urllib.error.HTTPError as e:
            if e.code == 404:
                log(f"Hinweis: Datei nicht vorhanden (HTTP 404): {current_url}")
            else:
                log(f"Hinweis: HTTP-Fehler {e.code} für {current_url}: {e.reason}")
            return None
        except Exception as e:
            log(f"Hinweis: HEAD-Anfrage für {current_url} nicht verfügbar ({e}).")
            return None

    log(f"Hinweis: Maximale Weiterleitungen ({max_redirects}) überschritten für {url}")
    return None


def get_dated_extract_candidates(url):
    """
    Leitet für eine -latest.osm.pbf URL die datierten Kandidaten ab:
    <basis>-YYMMDD.osm.pbf für heute, gestern, vorgestern (UTC).
    Gibt eine Liste von Tupeln zurück: [(candidate_url, date_str), ...]
    """
    suffix = "-latest.osm.pbf"
    if not url.endswith(suffix):
        return []
    base_url = url[:-len(suffix)]
    candidates = []
    now_utc = datetime.now(timezone.utc)
    for days_back in (0, 1, 2):
        d = now_utc - timedelta(days=days_back)
        date_str = d.strftime("%y%m%d")
        candidates.append((f"{base_url}-{date_str}.osm.pbf", date_str))
    return candidates


def iter_dated_extract_candidates(url, timeout=15):
    """
    Prüft datierte Kandidaten für eine -latest.osm.pbf URL per HEAD (heute, gestern, vorgestern UTC)
    und liefert nacheinander (candidate_url, remote_info) für jede Datei mit HTTP 200.
    Die HEAD-Prüfung erfolgt erst bei Bedarf, d. h. ein Kandidat wird nur geprüft, wenn der
    vorherige nicht verwendet werden konnte. Kurzer Timeout (standardmäßig 15 s je Kandidat),
    HTTP 404 ist erwartbar und kein Fehler.
    """
    for cand_url, _ in get_dated_extract_candidates(url):
        info = check_remote_extract(cand_url, timeout=timeout)
        if info and info.get("status") == 200:
            yield cand_url, info


def is_remote_newer(remote_info, target_path):
    """
    Prüft, ob eine gefundene Remote-Datei neuer als die lokale Datei ist.
    Vergleicht AUSSCHLIESSLICH Last-Modified (HEAD) gegen die lokale mtime
    (mit 5s Toleranz wie im Standard-Check). Niemals das Datum aus dem Dateinamen.
    Gibt (is_newer, remote_ts) zurück.
    """
    if not os.path.exists(target_path):
        return True, None

    local_mtime = os.path.getmtime(target_path)
    local_size = os.path.getsize(target_path)
    expected_size = remote_info.get("content_length")

    if not remote_info.get("last_modified"):
        log(f"Hinweis: Kein Last-Modified-Header in Remote-Info für {target_path} vorhanden.")
        return True, None

    try:
        remote_dt = parsedate_to_datetime(remote_info["last_modified"])
        remote_ts = remote_dt.timestamp()
    except Exception as ex:
        log(f"Hinweis beim Parsen von Last-Modified ({remote_info['last_modified']}): {ex}")
        return True, None

    size_matches = (expected_size is None or local_size == expected_size)
    if local_mtime >= (remote_ts - 5) and size_matches:
        return False, remote_ts
    return True, remote_ts


def run_cmd(cmd):
    log(f"Ausführen: {' '.join(cmd)}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        log(f"FEHLER: {res.stderr}")
        raise RuntimeError(f"Befehl fehlgeschlagen: {' '.join(cmd)}\n{res.stderr}")
    return res.stdout


def _remove_quietly(path):
    if os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass


def _prepare_resume(tmp_download, download_url, remote_info):
    """
    Erlaubt curl -C - nur, wenn der Teil-Download zur selben Quelle und zum selben Serverstand gehört
    (finale URL, Last-Modified, Content-Length). Sonst würde curl das Ende einer anderen Datei
    anhängen (z. B. neuer Tagesstand oder datierte Ausweichquelle), und osmium fileinfo ohne -e
    erkennt so eine zusammengesetzte Datei nicht.
    """
    marker_path = tmp_download + ".source.json"
    source = None
    if remote_info and remote_info.get("last_modified"):
        source = {
            "url": remote_info.get("url") or download_url,
            "last_modified": remote_info.get("last_modified"),
            "content_length": remote_info.get("content_length"),
        }

    if os.path.exists(tmp_download):
        saved = None
        try:
            with open(marker_path, "r", encoding="utf-8") as f:
                saved = json.load(f)
        except (OSError, ValueError):
            pass
        if source is not None and saved == source:
            log(f"Setze unterbrochenen Download fort ({os.path.getsize(tmp_download) / (1024 * 1024):.1f} MB vorhanden).")
        else:
            log("Verwerfe vorhandenen Teil-Download (andere Quelle oder neuer Serverstand).")
            _remove_quietly(tmp_download)

    _remove_quietly(marker_path)
    if source is not None:
        with open(marker_path, "w", encoding="utf-8") as f:
            json.dump(source, f)
    return marker_path


def _build_curl_cmd(download_url, tmp_download, remote_info):
    """
    curl-Befehl für einen Download-Versuch. Mit bekanntem Last-Modified wird If-Range gesendet:
    Der Server liefert den Rest (HTTP 206) nur, wenn sich die Datei seit der Prüfung nicht geändert
    hat; sonst antwortet er mit 200 und curl bricht mit Exit 33 ab, ohne etwas anzuhängen.
    """
    cmd = [
        "curl", "-sS", "-f", "-L", "-C", "-",
        "-R",  # Übernimmt den Last-Modified-Zeitstempel des Servers auf die lokale Datei
        "--max-redirs", "5",  # Verhindert Weiterleitungsschleifen (z. B. Geofabrik Fehler 47)
        "--connect-timeout", "30",
        "--speed-limit", str(CURL_SPEED_LIMIT),  # Zu langsame Verbindung abbrechen ...
        "--speed-time", str(CURL_SPEED_TIME),  # ... wenn sie so viele Sekunden darunter bleibt
        "--max-time", str(CURL_MAX_TIME),  # Konfigurierbar, Standard 5400s (90 Minuten) je Versuch
    ]
    if remote_info and remote_info.get("last_modified"):
        cmd.extend(["-H", f"If-Range: {remote_info['last_modified']}"])
    cmd.extend(["-o", tmp_download, download_url])
    return cmd


def _download_and_replace(download_url, target_path, status_label="fresh_download", remote_info=None):
    """Lädt einen PBF-Auszug per curl herunter, validiert ihn und ersetzt die Zieldatei atomar."""
    log(f"Starte Download mit curl: {download_url}")
    tmp_download = target_path + ".download"
    marker_path = _prepare_resume(tmp_download, download_url, remote_info)
    start_time = time.time()

    # Neuversuche als eigene curl-Aufrufe: curls eigenes --retry beginnt nach einem Abbruch wieder
    # bei Byte 0, nur ein neuer Aufruf mit -C - setzt am Ende der Teildatei fort (HTTP 206).
    # Scheitern alle Versuche, bleiben .download und Herkunftsmarker liegen, damit der nächste
    # Lauf fortsetzen kann (siehe _prepare_resume).
    for attempt in range(1, CURL_ATTEMPTS + 1):
        try:
            run_cmd(_build_curl_cmd(download_url, tmp_download, remote_info))
            break
        except RuntimeError as err:
            if "curl: (33)" in str(err):
                # If-Range passt nicht mehr: Der Server liefert inzwischen einen anderen Stand
                # (neuer Tagesstand oder ein Spiegel mit anderem Snapshot). curl hat nichts angehängt;
                # Teil-Download verwerfen und mit dem aktuellen Serverstand neu beginnen.
                log(f"Serverstand von {download_url} hat sich während des Downloads geändert. "
                    "Verwerfe Teil-Download und lade neu.")
                _remove_quietly(tmp_download)
                remote_info = check_remote_extract(download_url)
                marker_path = _prepare_resume(tmp_download, download_url, remote_info)
            if attempt == CURL_ATTEMPTS:
                raise
            have_mb = os.path.getsize(tmp_download) / (1024 * 1024) if os.path.exists(tmp_download) else 0.0
            reason = str(err).strip().splitlines()[-1] if str(err).strip() else "unbekannt"
            log(f"curl-Versuch {attempt}/{CURL_ATTEMPTS} abgebrochen ({reason}); {have_mb:.1f} MB vorhanden, "
                f"setze in {CURL_RETRY_DELAY}s auf neuer Verbindung fort...")
            time.sleep(CURL_RETRY_DELAY)

    try:
        validate_pbf_file(tmp_download)
        os.replace(tmp_download, target_path)
        duration = time.time() - start_time
        total_mb = os.path.getsize(target_path) / (1024 * 1024)
        log(f"Download abgeschlossen ({status_label}, Quelle: {download_url}): {total_mb:.1f} MB in {duration:.1f}s.")
        return target_path, duration, True, status_label
    except Exception:
        # PBF-Validierung fehlgeschlagen -> Datei ist korrupt oder unvollständig, hier löschen
        _remove_quietly(tmp_download)
        raise
    finally:
        _remove_quietly(marker_path)


def download_extract(url, target_path):
    """
    Lädt einen PBF-Auszug herunter mit mehrstufiger Ausfallsicherheit:
    1. Prüft vorab per HEAD-Request das Server-Änderungsdatum und die Dateigröße von -latest.
    2. Ist der Auszug aktuell, wird der Download übersprungen (cached_head_ok).
    3. Scheitert -latest (Weiterleitungsschleife, Timeout, Downloadfehler), wird automatisch
       nach datierten Tagesextrakten (heute, gestern, vorgestern UTC) als Ausweichquelle gesucht,
       bevor auf eine lokale Vorlagendatei zurückgegriffen wird.
    4. Ist die datierte Datei nicht neuer als lokal, gilt cached_head_ok.
    5. Ist sie neuer, wird sie geladen und als target_path (<land>-latest.osm.pbf) abgelegt
       (Status: downloaded_dated).
       Scheitert Download oder PBF-Validierung, wird der nächste datierte Kandidat versucht.
    6. Erst wenn alle datierten Kandidaten scheitern, greift der bestehende lokale Rückgriff
       (<= MAX_FALLBACK_AGE_HOURS) mit Status cached_head_failed bzw. fallback_after_error.
    Gibt (target_path, duration, was_downloaded, status) zurück.
    """
    log(f"Prüfe OSM-Auszug: {target_path}")
    remote_info = check_remote_extract(url)
    head_ok = (remote_info is not None and remote_info.get("status") == 200)

    # 1. Normalfall: HEAD auf -latest war erfolgreich
    if head_ok:
        if os.path.exists(target_path) and not FORCE_DOWNLOAD:
            local_size = os.path.getsize(target_path)
            local_size_mb = local_size / (1024 * 1024)
            local_mtime = os.path.getmtime(target_path)

            if remote_info.get("last_modified"):
                try:
                    remote_dt = parsedate_to_datetime(remote_info["last_modified"])
                    remote_ts = remote_dt.timestamp()
                    expected_size = remote_info.get("content_length")

                    size_matches = (expected_size is None or local_size == expected_size)
                    if local_mtime >= (remote_ts - 5) and size_matches:
                        log(f"Auszug ist aktuell (Server: {remote_info['last_modified']}, {local_size_mb:.1f} MB). Überspringe Download.")
                        return target_path, 0.0, False, "cached_head_ok"
                except Exception as ex:
                    log(f"Hinweis beim Timestamp-Vergleich ({target_path}): {ex}")

        # Download von -latest versuchen
        try:
            return _download_and_replace(url, target_path, status_label="fresh_download", remote_info=remote_info)
        except Exception as e:
            log(f"Download von {url} fehlgeschlagen ({e}). Prüfe datierte Ausweichquellen...")

    # 2. Ausweichquelle: Datierte Tagesextrakte prüfen (wenn HEAD fehlschlug oder Download von -latest fehlschlug).
    #    Alle erreichbaren Kandidaten werden der Reihe nach versucht (heute, gestern, vorgestern),
    #    bis ein Download inkl. PBF-Validierung gelingt.
    attempted_dated_download = False
    for cand_url, cand_info in iter_dated_extract_candidates(url, timeout=15):
        log(f"Gefundene datierte Ausweichquelle: {cand_url} (HTTP 200, Last-Modified: {cand_info.get('last_modified')})")

        is_cand_newer, _ = is_remote_newer(cand_info, target_path)
        if not is_cand_newer and not FORCE_DOWNLOAD:
            if attempted_dated_download:
                # Ein neuerer Kandidat ist gescheitert; ein älterer Stand bringt gegenüber lokal nichts.
                log(f"Überspringe datierte Ausweichquelle {cand_url} (nicht neuer als lokale Datei).")
                continue
            local_size = os.path.getsize(target_path)
            local_size_mb = local_size / (1024 * 1024)
            log(f"Auszug ist aktuell (Server-Ausweichquelle: {cand_url}, {cand_info.get('last_modified')}, {local_size_mb:.1f} MB). Überspringe Download.")
            return target_path, 0.0, False, "cached_head_ok"

        attempted_dated_download = True
        try:
            return _download_and_replace(cand_url, target_path, status_label="downloaded_dated", remote_info=cand_info)
        except Exception as e:
            log(f"Download der datierten Ausweichquelle {cand_url} fehlgeschlagen ({e}). Versuche nächsten Kandidaten...")

    # 3. Lokaler Rückgriff (sofern <= MAX_FALLBACK_AGE_HOURS)
    if os.path.exists(target_path):
        local_mtime = os.path.getmtime(target_path)
        local_size = os.path.getsize(target_path)
        local_size_mb = local_size / (1024 * 1024)
        local_age_hours = (time.time() - local_mtime) / 3600

        if local_age_hours <= MAX_FALLBACK_AGE_HOURS:
            if head_ok or attempted_dated_download:
                status_key = "fallback_after_error"
                warn_msg = (
                    f"Download von {url} (inkl. datierter Ausweichquellen) fehlgeschlagen. "
                    f"Verwende vorhandene lokale Datei {os.path.basename(target_path)} als Fallback "
                    f"(Alter: {local_age_hours:.1f}h, {local_size_mb:.1f} MB)."
                )
            else:
                status_key = "cached_head_failed"
                warn_msg = (
                    f"HEAD-Prüfung für {url} und datierte Ausweichquellen nicht verfügbar. "
                    f"Verwende vorhandene lokale Datei {os.path.basename(target_path)} "
                    f"(Alter: {local_age_hours:.1f}h, {local_size_mb:.1f} MB)."
                )
            record_warning(warn_msg)
            return target_path, 0.0, False, status_key
        else:
            err_msg = (
                f"Download von {url} fehlgeschlagen und vorhandene lokale Datei "
                f"{os.path.basename(target_path)} ist zu alt ({local_age_hours:.1f}h > {MAX_FALLBACK_AGE_HOURS}h)."
            )
            log(f"FEHLER: {err_msg}")
            raise RuntimeError(err_msg)
    else:
        err_msg = f"Download von {url} fehlgeschlagen und keine lokale Datei vorhanden."
        log(f"FEHLER: {err_msg}")
        raise RuntimeError(err_msg)


def prefilter_feature(item, pbf_path, out_pbf):
    """
    Filtert einen Länderauszug auf ein Feature. Mit refine_filter folgt eine zweite
    tags-filter-Stufe, damit beide Bedingungen gelten (tags-filter selbst kennt nur ODER).
    """
    if not item.get("refine_filter"):
        run_cmd(["osmium", "tags-filter", pbf_path, *item["filter"], "-o", out_pbf, "--overwrite"])
        return

    stage_pbf = f"{out_pbf}.stage1.pbf"
    try:
        run_cmd(["osmium", "tags-filter", pbf_path, *item["filter"], "-o", stage_pbf, "--overwrite"])
        run_cmd(["osmium", "tags-filter", stage_pbf, *item["refine_filter"], "-o", out_pbf, "--overwrite"])
    finally:
        if os.path.exists(stage_pbf):
            os.remove(stage_pbf)


def prefilter_country(pbf_path, cid, work_dir, features=None):
    """
    Filtert einen Länderauszug in EINEM tags-filter-Durchlauf auf die Filter aller Features und teilt
    die kleine Zwischendatei danach je Feature auf (prefilter_feature). Die große Länderdatei wird so
    nur einmal gelesen statt einmal je Feature. Das Ergebnis je Feature ist identisch: Die Zwischendatei
    enthält alle Treffer samt der referenzierten Knoten, Wege und Relationsmitglieder.
    """
    features = features if features is not None else FEATURE_CONFIGS
    combined_pbf = os.path.join(work_dir, f"{cid}__all_features.pbf")
    all_filters = list(dict.fromkeys(expr for item in features for expr in item["filter"]))
    try:
        run_cmd(["osmium", "tags-filter", pbf_path, *all_filters, "-o", combined_pbf, "--overwrite"])
        log(f"Gemeinsame Vorfilterung: {os.path.getsize(combined_pbf) / (1024 * 1024):.1f} MB Zwischendatei.")
        for item in features:
            prefilter_feature(item, combined_pbf, os.path.join(work_dir, f"{cid}_{item['name']}.pbf"))
    finally:
        _remove_quietly(combined_pbf)


def build_export_cmd(item, source_pbf, output_file, work_dir):
    """
    Baut den osmium-export-Befehl für ein Feature. Mit include_tags wird eine
    Export-Konfiguration geschrieben, die nur die genannten Tags übernimmt.
    Mit keep_untagged werden auch Mitglieds-Wege ohne eigene Tags exportiert.
    """
    cmd = ["osmium", "export", source_pbf, "--add-unique-id=type_id", "-o", output_file, "--overwrite"]
    if item.get("keep_untagged"):
        cmd.append("--keep-untagged")
    if item.get("geom_types"):
        cmd.extend(["--geometry-types", ",".join(item["geom_types"])])
    if item.get("include_tags"):
        config_path = os.path.join(work_dir, f"export_config_{item['name']}.json")
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump({"include_tags": item["include_tags"]}, f)
        cmd.extend(["-c", config_path])
    return cmd


def export_feature_geojson(item, existing_parts, output_file, work_dir):
    """
    Führt die gefilterten Länder-PBFs eines Features zusammen und exportiert sie als GeoJSON.
    Scheitert der Export an doppelten Objekt-IDs in der zusammengeführten PBF, wird pro Land
    exportiert und anschließend nach ID dedupliziert. Beide Pfade nutzen build_export_cmd.
    """
    fname = item["name"]
    merged_pbf = None
    if len(existing_parts) > 1:
        merged_pbf = os.path.join(work_dir, f"merged_{fname}.pbf")
        log(f"Führe {len(existing_parts)} Auszüge für {item['description']} zusammen...")
        run_cmd(["osmium", "merge", *existing_parts, "-o", merged_pbf, "--overwrite"])
        source_pbf = merged_pbf
    else:
        source_pbf = existing_parts[0]

    log(f"Exportiere GeoJSON: {item['output']}...")
    try:
        run_cmd(build_export_cmd(item, source_pbf, output_file, work_dir))
    except RuntimeError as ex:
        err_str = str(ex)
        if not (("twice in input" in err_str or "Duplicate" in err_str) and len(existing_parts) > 1):
            raise
        first_line = err_str.strip().splitlines()[-1]
        log(f"Hinweis: Doppelte Objekt-IDs in zusammengeführter PBF ({first_line}).")
        log(f"Wechsle auf segmentierten Export pro Land mit anschließender ID-Deduplizierung für {fname}...")
        part_geojsons = []
        for idx, part_pbf in enumerate(existing_parts):
            part_json = os.path.join(work_dir, f"{fname}_part_{idx}.geojson")
            run_cmd(build_export_cmd(item, part_pbf, part_json, work_dir))
            part_geojsons.append(part_json)

        merge_geojson_files(part_geojsons, output_file)
        for pj in part_geojsons:
            _remove_quietly(pj)
    finally:
        # Zusammengeführte PBF sofort entfernen (Speicherentlastung)
        if merged_pbf:
            _remove_quietly(merged_pbf)


def compute_builder_hash(targets=None, script_content=None):
    """
    Berechnet einen stabilen SHA-256-Fingerprint über den Builder-Code und
    alle für das Ergebnis relevanten Konfigurationsparameter.
    Enthält bewusst keine Zeitstempel oder Pfade, um über Umgebungen hinweg deterministisch zu sein.
    """
    hasher = hashlib.sha256()

    # 1. Builder-Skriptinhalt
    if script_content is not None:
        hasher.update(script_content)
    else:
        script_path = os.path.abspath(__file__)
        try:
            with open(script_path, "rb") as f:
                hasher.update(f.read())
        except Exception:
            pass

    # 2. Relevante Build-Parameter
    config_repr = {
        "region": PIPELINE_REGION,
        "osm_extract_url": OSM_EXTRACT_URL,
        "targets": [
            {"id": c["id"], "url": c.get("url", "")}
            for c in (targets or [])
        ],
        "tippecanoe": TIPPECANOE_CONFIG,
        "feature_configs": [
            {
                "name": it.get("name"),
                "filter": it.get("filter"),
                "geom_types": it.get("geom_types"),
                "output": it.get("output"),
                "refine_filter": it.get("refine_filter"),
                "include_tags": it.get("include_tags"),
            }
            for it in FEATURE_CONFIGS
        ]
    }
    hasher.update(json.dumps(config_repr, sort_keys=True).encode("utf-8"))
    return hasher.hexdigest()


def compute_extract_fingerprints(targets, raw_dir=None):
    """
    Ermittelt den Extrakt-Fingerprint { id, size_bytes, mtime } pro Land.
    Die mtime entspricht dank curl -R dem Last-Modified von Geofabrik.
    """
    target_raw_dir = raw_dir or RAW_DIR
    extracts = []
    for t in targets:
        pbf_path = os.path.join(target_raw_dir, t["filename"])
        size_bytes = os.path.getsize(pbf_path) if os.path.exists(pbf_path) else 0
        mtime = int(os.path.getmtime(pbf_path)) if os.path.exists(pbf_path) else 0
        extracts.append({
            "id": t["id"],
            "size_bytes": size_bytes,
            "mtime": mtime
        })
    return extracts


def load_build_fingerprint(raw_dir=None):
    """Lädt den zuletzt gespeicherten Build-Fingerprint aus raw/build_fingerprint.json."""
    target_raw_dir = raw_dir or RAW_DIR
    fp_file = os.path.join(target_raw_dir, "build_fingerprint.json")
    if not os.path.exists(fp_file):
        return None
    try:
        with open(fp_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return None
            if "builder_hash" not in data or "extracts" not in data:
                return None
            return data
    except Exception as e:
        log(f"Hinweis: Vorhandener Build-Fingerprint unlesbar/beschädigt ({e}).")
        return None


def save_build_fingerprint(data, raw_dir=None):
    """Schreibt den Build-Fingerprint atomar nach raw/build_fingerprint.json."""
    target_raw_dir = raw_dir or RAW_DIR
    fp_file = os.path.join(target_raw_dir, "build_fingerprint.json")
    tmp_file = f"{fp_file}.tmp.{os.getpid()}"
    try:
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_file, fp_file)
        log(f"Build-Fingerprint gespeichert: {fp_file}")
    except Exception as e:
        log(f"WARNUNG: Build-Fingerprint konnte nicht gespeichert werden: {e}")
        if os.path.exists(tmp_file):
            try:
                os.remove(tmp_file)
            except Exception:
                pass


def check_fingerprint_changes(current_builder_hash, current_extract_fps, saved_fp, extracts_meta=None, force_build=None):
    """
    Prüft, ob ein Neubau erforderlich ist.
    Gibt (has_changed: bool, reasons: list[str], country_status: dict) zurück.
    """
    reasons = []
    country_status = {}
    is_forced = FORCE_BUILD if force_build is None else force_build

    if is_forced:
        reasons.append("Erzwungener Build (FORCE_BUILD=true)")

    if saved_fp is None:
        reasons.append("Kein gültiger Build-Fingerprint vorhanden (erster Lauf oder beschädigt)")
        for curr in current_extract_fps:
            cid = curr["id"]
            meta_status = (extracts_meta or {}).get(cid, {}).get("status", "unbekannt")
            country_status[cid] = f"initial ({meta_status})"
        return True, reasons, country_status

    if saved_fp.get("builder_hash") != current_builder_hash:
        reasons.append("Builder-Code oder Konfigurationsparameter geändert")

    saved_extracts = {e["id"]: e for e in saved_fp.get("extracts", []) if "id" in e}
    for curr in current_extract_fps:
        cid = curr["id"]
        meta_status = (extracts_meta or {}).get(cid, {}).get("status", "unverändert")
        if cid not in saved_extracts:
            reasons.append(f"Neuer Extrakt hinzugefügt: {cid}")
            country_status[cid] = f"neu ({meta_status})"
        else:
            prev = saved_extracts[cid]
            if prev.get("size_bytes") != curr.get("size_bytes") or prev.get("mtime") != curr.get("mtime"):
                reasons.append(f"Extrakt {cid} geändert (Größe oder Last-Modified abweichend)")
                country_status[cid] = f"geändert ({meta_status})"
            else:
                country_status[cid] = f"unverändert ({meta_status})"

    for prev_id in saved_extracts:
        if not any(curr["id"] == prev_id for curr in current_extract_fps):
            reasons.append(f"Extrakt entfernt: {prev_id}")

    has_changed = len(reasons) > 0
    return has_changed, reasons, country_status


def count_geojson_features(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return len(data.get("features", []))
    except Exception as e:
        log(f"Warnung beim Zählen der Features in {file_path}: {e}")
        return -1


def merge_geojson_files(part_files, output_file):
    """
    Führt mehrere GeoJSON FeatureCollections zusammen und dedupliziert Features anhand ihrer 'id'.
    Verwendet Streaming, um den Speicherbedarf gering zu halten.
    """
    seen_ids = set()
    first = True
    with open(output_file, "w", encoding="utf-8") as out_f:
        out_f.write('{"type":"FeatureCollection","features":[\n')
        for pf in part_files:
            if not os.path.exists(pf):
                continue
            with open(pf, "r", encoding="utf-8") as in_f:
                data = json.load(in_f)
                for feat in data.get("features", []):
                    feat_id = feat.get("id") or feat.get("properties", {}).get("@id")
                    if feat_id:
                        if feat_id in seen_ids:
                            continue
                        seen_ids.add(feat_id)
                    if not first:
                        out_f.write(",\n")
                    first = False
                    json.dump(feat, out_f, ensure_ascii=False)
        out_f.write("\n]}\n")


def process_features(mode, targets, download_duration=0, raw_sizes=None, extracts_meta=None):
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

            prefilter_country(pbf_path, cid, work_dir)

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
            export_feature_geojson(item, existing_parts, output_file, work_dir)

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

        # -------------------------------------------------------------
        # Schritt 3: PMTiles Vektor-Kacheln mit tippecanoe erzeugen
        # -------------------------------------------------------------
        pmtiles_output = os.path.join(PUBLISH_DIR, "openfiremap.pmtiles")
        log("=== Phase 3: Erstelle PMTiles Vektor-Kacheln mit tippecanoe ===")
        t_pmtiles = time.time()

        layer_args = []
        for l in TIPPECANOE_CONFIG["layers"]:
            layer_args.extend([
                "-L", json.dumps({
                    "file": os.path.join(PUBLISH_DIR, l["file"]),
                    "layer": l["layer"],
                    "minzoom": l["minzoom"],
                    "maxzoom": l["maxzoom"],
                })
            ])

        cmd = [
            "tippecanoe",
            "-o", pmtiles_output,
            *TIPPECANOE_CONFIG["options"],
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

    # Auszüge-Metadaten für Transparenz aufbereiten
    if extracts_meta is None:
        extracts_meta = {}
        for c in targets:
            c_pbf = os.path.join(RAW_DIR, c["filename"])
            if os.path.exists(c_pbf):
                c_mtime = os.path.getmtime(c_pbf)
                c_age = round((time.time() - c_mtime) / 3600, 1)
                extracts_meta[c["id"]] = {
                    "name": c["name"],
                    "filename": c["filename"],
                    "size_bytes": os.path.getsize(c_pbf),
                    "size_mb": round(os.path.getsize(c_pbf) / (1024 * 1024), 2),
                    "mtime": datetime.fromtimestamp(c_mtime, timezone.utc).isoformat(),
                    "age_hours": c_age,
                    "status": "cached_head_ok"
                }

    oldest_extract_age_hours = round(
        max((e.get("age_hours", 0.0) for e in extracts_meta.values()), default=0.0),
        1
    )

    # Öffentliche metadata.json
    country_names = [c["name"] for c in targets]
    metadata = {
        "status": "ok",
        "region": mode,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary_text,
        "countries": country_names,
        "extracts_oldest_age_hours": oldest_extract_age_hours,
        "extracts": extracts_meta,
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
    extracts_meta = {}

    for target in targets:
        local_pbf = os.path.join(RAW_DIR, target["filename"])
        _, dl_duration, was_dl, status = download_extract(target["url"], local_pbf)
        download_times.append(dl_duration)
        if os.path.exists(local_pbf):
            pbf_size_b = os.path.getsize(local_pbf)
            pbf_mtime = os.path.getmtime(local_pbf)
            raw_sizes[target["id"]] = pbf_size_b / (1024 * 1024)
            pbf_age_h = round((time.time() - pbf_mtime) / 3600, 1)
            extracts_meta[target["id"]] = {
                "name": target["name"],
                "filename": target["filename"],
                "size_bytes": pbf_size_b,
                "size_mb": round(pbf_size_b / (1024 * 1024), 2),
                "mtime": datetime.fromtimestamp(pbf_mtime, timezone.utc).isoformat(),
                "age_hours": pbf_age_h,
                "status": status
            }
        else:
            raw_sizes[target["id"]] = 0.0
            extracts_meta[target["id"]] = {
                "name": target["name"],
                "filename": target["filename"],
                "size_bytes": 0,
                "size_mb": 0.0,
                "mtime": "",
                "age_hours": 0.0,
                "status": status
            }

    total_download_duration = sum(download_times)

    # 2. Fingerprints prüfen (Skip if unchanged)
    current_builder_hash = compute_builder_hash(targets)
    current_extract_fps = compute_extract_fingerprints(targets)
    saved_fp = load_build_fingerprint()
    has_changed, reasons, country_status = check_fingerprint_changes(
        current_builder_hash, current_extract_fps, saved_fp, extracts_meta=extracts_meta
    )

    if not has_changed:
        last_gen = saved_fp.get("generated_at", "unbekannt") if saved_fp else "unbekannt"
        status_parts = [f"{cid}: {st}" for cid, st in country_status.items()]
        status_str = ", ".join(status_parts) if status_parts else "alle unverändert"
        log(f"Keine Änderungen seit Build {last_gen} – Build übersprungen ({status_str})")
        save_build_warnings()

        # Fix B: Wenn Quelle für mindestens ein Land nicht prüfbar/fehlerhaft war (Exit 11)
        stale_statuses = {"cached_head_failed", "fallback_after_error"}
        stale_countries = [
            cid for cid, meta in extracts_meta.items()
            if meta.get("status") in stale_statuses
        ]
        if stale_countries:
            log(f"Hinweis: Quelle für folgende Länder veraltet oder nicht prüfbar: {', '.join(stale_countries)} (Exit 11)")
            sys.exit(11)

        sys.exit(10)

    log(f"=== Änderungen erkannt ({len(reasons)} Gründe) – starte Build ===")
    for reason in reasons:
        log(f"  * {reason}")

    # 3. Features filtern, mergen und PMTiles bauen
    try:
        metadata, system_info = process_features(
            mode=mode,
            targets=targets,
            download_duration=total_download_duration,
            raw_sizes=raw_sizes,
            extracts_meta=extracts_meta
        )
        save_build_fingerprint({
            "builder_hash": current_builder_hash,
            "generated_at": metadata.get("generated_at"),
            "extracts": current_extract_fps
        })
        save_build_warnings()
        print("\n" + "=" * 60)
        print(f" Region: {metadata['region'].upper()} ({', '.join(metadata['countries'])})")
        print(f" Status: {metadata['summary']}")
        print(f" PMTiles: {metadata['pmtiles']['size_mb']} MB in {metadata['pmtiles']['duration_sec']}s")
        if system_info:
            print(f" Freier Speicher: {system_info['disk_free_gb']} GB ({system_info['disk_used_percent']}% belegt)")
        print(f" Dauer: {metadata['timings']['total_sec']}s (Download: {metadata['timings']['download_sec']}s, Bau: {metadata['timings']['extraction_sec']}s)")
        print("=" * 60 + "\n")
    except Exception as e:
        save_build_warnings()
        log(f"ABBRUCH MIT FEHLER: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
