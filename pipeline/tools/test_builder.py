#!/usr/bin/env python3
"""
Unit-Tests für den Feature-Builder (DACHLiLu & Single-Region)
Einschließlich Resilienz, Download-Fallbacks und Metadaten-Bereinigung.
"""

import os
import sys
import time
import json
import shutil
import subprocess
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

# Füge builder-Verzeichnis zum Suchpfad hinzu
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "builder")))
import build_features


class TestBuildFeatures(unittest.TestCase):
    def setUp(self):
        build_features.BUILD_WARNINGS.clear()
        self.test_dir = tempfile.TemporaryDirectory()
        self.orig_base = build_features.BASE_DATA_DIR
        self.orig_raw = build_features.RAW_DIR
        self.orig_publish = build_features.PUBLISH_DIR
        self.orig_tmp = build_features.TMP_DIR

        build_features.BASE_DATA_DIR = self.test_dir.name
        build_features.RAW_DIR = os.path.join(self.test_dir.name, "raw")
        build_features.PUBLISH_DIR = os.path.join(self.test_dir.name, "publish")
        build_features.TMP_DIR = os.path.join(self.test_dir.name, "raw", "tmp")

    def tearDown(self):
        build_features.BASE_DATA_DIR = self.orig_base
        build_features.RAW_DIR = self.orig_raw
        build_features.PUBLISH_DIR = self.orig_publish
        build_features.TMP_DIR = self.orig_tmp
        self.test_dir.cleanup()

    def test_feature_configs_complete(self):
        """Prüft, ob alle 5 Ebenen konfiguriert sind."""
        names = [f["name"] for f in build_features.FEATURE_CONFIGS]
        self.assertEqual(len(names), 5)
        self.assertIn("hydrants", names)
        self.assertIn("fire_stations", names)
        self.assertIn("water_points", names)
        self.assertIn("defibrillators", names)
        self.assertIn("boundaries", names)

    def test_boundaries_match_overpass_filter(self):
        """Grenzen: nur admin_level=8 über Relationen (wie Overpass) und nur die benötigten Tags."""
        item = next(f for f in build_features.FEATURE_CONFIGS if f["name"] == "boundaries")
        self.assertEqual(item["filter"], ["r/boundary=administrative"])
        self.assertEqual(item["refine_filter"], ["r/admin_level=8"])
        self.assertEqual(item["include_tags"], ["boundary", "admin_level"])
        self.assertTrue(item.get("keep_untagged"))

    def test_prefilter_feature_runs_refine_stage(self):
        """Mit refine_filter laufen zwei tags-filter-Stufen, die Zwischendatei wird entfernt."""
        item = {"name": "boundaries", "filter": ["r/boundary=administrative"], "refine_filter": ["r/admin_level=8"]}
        out_pbf = os.path.join(self.test_dir.name, "de_boundaries.pbf")
        calls = []

        def fake_run_cmd(cmd):
            calls.append(cmd)
            with open(cmd[cmd.index("-o") + 1], "w") as f:
                f.write("x")

        with patch("build_features.run_cmd", side_effect=fake_run_cmd):
            build_features.prefilter_feature(item, "in.pbf", out_pbf)

        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0][2:4], ["in.pbf", "r/boundary=administrative"])
        self.assertEqual(calls[1][2:4], [f"{out_pbf}.stage1.pbf", "r/admin_level=8"])
        self.assertEqual(calls[1][calls[1].index("-o") + 1], out_pbf)
        self.assertFalse(os.path.exists(f"{out_pbf}.stage1.pbf"))

    def test_prefilter_feature_single_stage(self):
        """Ohne refine_filter bleibt es bei einem tags-filter-Aufruf."""
        item = {"name": "hydrants", "filter": ["nwr/emergency=fire_hydrant"]}
        with patch("build_features.run_cmd") as mock_run:
            build_features.prefilter_feature(item, "in.pbf", "out.pbf")
        mock_run.assert_called_once_with(
            ["osmium", "tags-filter", "in.pbf", "nwr/emergency=fire_hydrant", "-o", "out.pbf", "--overwrite"])

    def test_build_export_cmd_include_tags(self):
        """include_tags erzeugt eine Export-Konfiguration, keep_untagged setzt das Flag."""
        boundaries = next(f for f in build_features.FEATURE_CONFIGS if f["name"] == "boundaries")
        cmd = build_features.build_export_cmd(boundaries, "src.pbf", "out.geojson", self.test_dir.name)
        config_path = cmd[cmd.index("-c") + 1]
        with open(config_path, encoding="utf-8") as f:
            self.assertEqual(json.load(f), {"include_tags": ["boundary", "admin_level"]})
        self.assertIn("linestring", cmd)
        self.assertIn("--keep-untagged", cmd)

        hydrants = next(f for f in build_features.FEATURE_CONFIGS if f["name"] == "hydrants")
        h_cmd = build_features.build_export_cmd(hydrants, "src.pbf", "out.geojson", self.test_dir.name)
        self.assertNotIn("-c", h_cmd)
        self.assertNotIn("--keep-untagged", h_cmd)

    def test_segmented_export_uses_build_export_cmd_options(self):
        """Der segmentierte Exportpfad nutzt build_export_cmd mit denselben Optionen (--keep-untagged, -c)."""
        boundaries = next(f for f in build_features.FEATURE_CONFIGS if f["name"] == "boundaries")
        calls = []

        def fake_run_cmd(cmd):
            calls.append(cmd)
            # Schreibe Fake-GeoJSON bei Ausführung
            if "-o" in cmd:
                out_path = cmd[cmd.index("-o") + 1]
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump({"type": "FeatureCollection", "features": []}, f)
            if "merged_boundaries.pbf" in cmd:
                raise RuntimeError("osmium export: ID appears twice in input")

        work_dir = self.test_dir.name
        existing_parts = [
            os.path.join(work_dir, "de_boundaries.pbf"),
            os.path.join(work_dir, "at_boundaries.pbf")
        ]
        for p in existing_parts:
            with open(p, "wb") as f:
                f.write(b"part")

        # Ausführung des Export-Blocks inkl. Segmentierungs-Fallback
        output_file = os.path.join(self.test_dir.name, "boundaries.geojson")
        with patch("build_features.run_cmd", side_effect=fake_run_cmd):
            try:
                build_features.run_cmd(build_features.build_export_cmd(boundaries, "merged_boundaries.pbf", output_file, work_dir))
            except RuntimeError as ex:
                if ("twice in input" in str(ex) or "Duplicate" in str(ex)) and len(existing_parts) > 1:
                    part_geojsons = []
                    for idx, part_pbf in enumerate(existing_parts):
                        part_json = os.path.join(work_dir, f"boundaries_part_{idx}.geojson")
                        build_features.run_cmd(build_features.build_export_cmd(boundaries, part_pbf, part_json, work_dir))
                        part_geojsons.append(part_json)
                    build_features.merge_geojson_files(part_geojsons, output_file)

        part_calls = [c for c in calls if "boundaries_part_" in " ".join(c)]
        self.assertEqual(len(part_calls), 2)
        for c in part_calls:
            self.assertIn("--keep-untagged", c)
            self.assertIn("-c", c)
            self.assertIn("--geometry-types", c)
            self.assertIn("linestring", c)

    @unittest.skipUnless(shutil.which("osmium"), "osmium nicht installiert")
    def test_boundaries_osmium_end_to_end(self):
        """Echter osmium-Lauf: Gemeindegrenzen über admin_level=8-Relationen, Mitgliedswege inkl. untagged & höhere admin_level."""
        osm_xml = """<?xml version='1.0' encoding='UTF-8'?>
<osm version="0.6" generator="test">
 <node id="1" version="1" lat="49.0" lon="11.0"/><node id="2" version="1" lat="49.1" lon="11.1"/>
 <node id="3" version="1" lat="49.2" lon="11.2"/><node id="4" version="1" lat="49.3" lon="11.3"/>
 <way id="10" version="1"><nd ref="1"/><nd ref="2"/><tag k="boundary" v="administrative"/><tag k="admin_level" v="8"/><tag k="highway" v="residential"/></way>
 <way id="11" version="1"><nd ref="2"/><nd ref="3"/><tag k="boundary" v="administrative"/><tag k="admin_level" v="9"/></way>
 <way id="12" version="1"><nd ref="3"/><nd ref="4"/><tag k="boundary" v="administrative"/><tag k="admin_level" v="6"/></way>
 <way id="13" version="1"><nd ref="1"/><nd ref="4"/></way>
 <relation id="100" version="1">
  <member type="way" ref="10" role="outer"/>
  <member type="way" ref="12" role="outer"/>
  <member type="way" ref="13" role="outer"/>
  <tag k="boundary" v="administrative"/>
  <tag k="admin_level" v="8"/>
 </relation>
 <relation id="200" version="1">
  <member type="way" ref="11" role="outer"/>
  <tag k="boundary" v="administrative"/>
  <tag k="admin_level" v="9"/>
 </relation>
</osm>"""
        src = os.path.join(self.test_dir.name, "in.osm")
        with open(src, "w", encoding="utf-8") as f:
            f.write(osm_xml)
        item = next(f for f in build_features.FEATURE_CONFIGS if f["name"] == "boundaries")
        part_pbf = os.path.join(self.test_dir.name, "part.pbf")
        out_geojson = os.path.join(self.test_dir.name, "boundaries.geojson")

        build_features.prefilter_feature(item, src, part_pbf)
        build_features.run_cmd(build_features.build_export_cmd(item, part_pbf, out_geojson, self.test_dir.name))

        with open(out_geojson, encoding="utf-8") as f:
            features = json.load(f)["features"]
        self.assertEqual(sorted([feat["id"] for feat in features]), ["w10", "w12", "w13"])
        w10 = next(f for f in features if f["id"] == "w10")
        w12 = next(f for f in features if f["id"] == "w12")
        w13 = next(f for f in features if f["id"] == "w13")
        self.assertEqual(w10["properties"], {"boundary": "administrative", "admin_level": "8"})
        self.assertEqual(w12["properties"], {"boundary": "administrative", "admin_level": "6"})
        self.assertEqual(w13["properties"], {})

    def test_dachlilu_countries_list(self):
        """Prüft die 5 DACHLiLu-Länder und URLs."""
        cids = [c["id"] for c in build_features.DACHLILU_COUNTRIES]
        self.assertEqual(len(cids), 5)
        self.assertEqual(set(cids), {"germany", "austria", "switzerland", "luxembourg", "liechtenstein"})
        for country in build_features.DACHLILU_COUNTRIES:
            self.assertTrue(country["url"].startswith("https://download.geofabrik.de/europe/"))
            self.assertTrue(country["filename"].endswith(".osm.pbf"))

    def test_resolve_targets_default(self):
        """Standardmodus ohne gesetzte Variable muss DACHLiLu sein."""
        orig_url = build_features.OSM_EXTRACT_URL
        try:
            build_features.OSM_EXTRACT_URL = ""
            mode, targets = build_features.resolve_targets()
            self.assertEqual(mode, "dachlilu")
            self.assertEqual(len(targets), 5)
        finally:
            build_features.OSM_EXTRACT_URL = orig_url

    def test_resolve_targets_single_override(self):
        """Wenn eine PBF-URL angegeben ist, greift der Einzelmodus."""
        orig_url = build_features.OSM_EXTRACT_URL
        try:
            build_features.OSM_EXTRACT_URL = "https://download.geofabrik.de/europe/germany/bayern-latest.osm.pbf"
            mode, targets = build_features.resolve_targets()
            self.assertEqual(mode, "single")
            self.assertEqual(len(targets), 1)
            self.assertEqual(targets[0]["filename"], "bayern-latest.osm.pbf")
        finally:
            build_features.OSM_EXTRACT_URL = orig_url

    def test_temp_working_dir(self):
        """Prüft, ob ein valides Arbeitsverzeichnis ermittelt wird."""
        wdir, is_shm = build_features.get_temp_working_dir()
        self.assertTrue(isinstance(wdir, str))
        self.assertTrue(isinstance(is_shm, bool))

    def test_download_fallback_when_local_file_exists(self):
        """Download-Fehler bei existierender lokaler Datei -> Fallback greift, Status fallback_after_error."""
        with tempfile.TemporaryDirectory() as tmpdir:
            local_pbf = os.path.join(tmpdir, "liechtenstein-latest.osm.pbf")
            # Erstelle lokale Dummy-Datei (vor 2 Stunden erstellt)
            with open(local_pbf, "wb") as f:
                f.write(b"x" * (120 * 1024))
            mtime = time.time() - 7200
            os.utime(local_pbf, (mtime, mtime))

            # Simuliere HEAD-Erfolg mit neuerem Stand auf dem Server, aber Download schlägt fehl
            remote_info = {"status": 200, "last_modified": "Wed, 30 Sep 2026 05:00:00 GMT", "content_length": 500000}
            with patch("build_features.check_remote_extract", return_value=remote_info), \
                 patch("build_features.run_cmd", side_effect=RuntimeError("curl: (47) Maximum (50) redirects followed")):
                path, duration, was_dl, status = build_features.download_extract(
                    "https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf",
                    local_pbf
                )
                self.assertEqual(path, local_pbf)
                self.assertEqual(duration, 0.0)
                self.assertFalse(was_dl)
                self.assertEqual(status, "fallback_after_error")
                self.assertEqual(len(build_features.BUILD_WARNINGS), 1)
                self.assertIn("Fallback", build_features.BUILD_WARNINGS[0])
                # Sicherstellen, dass keine .download-Datei übrig bleibt
                self.assertFalse(os.path.exists(local_pbf + ".download"))

    def test_download_failure_without_local_file_raises(self):
        """Download-Fehler ohne lokale Datei -> schlägt fehl (Exception)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            local_pbf = os.path.join(tmpdir, "nonexistent.osm.pbf")
            with patch("build_features.check_remote_extract", return_value=None), \
                 patch("build_features.run_cmd", side_effect=RuntimeError("curl: (6) Could not resolve host")):
                with self.assertRaises(RuntimeError) as ctx:
                    build_features.download_extract("https://example.com/fake.osm.pbf", local_pbf)
                self.assertIn("keine lokale Datei vorhanden", str(ctx.exception))

    def test_download_failure_with_stale_local_file_raises(self):
        """Download-Fehler bei veralteter lokaler Datei (> 72 h) -> schlägt fehl."""
        with tempfile.TemporaryDirectory() as tmpdir:
            local_pbf = os.path.join(tmpdir, "old-latest.osm.pbf")
            with open(local_pbf, "wb") as f:
                f.write(b"x" * (120 * 1024))
            # 80 Stunden alt setzen
            mtime = time.time() - (80 * 3600)
            os.utime(local_pbf, (mtime, mtime))

            with patch("build_features.check_remote_extract", return_value=None), \
                 patch("build_features.run_cmd", side_effect=RuntimeError("curl: (28) Connection timeout")):
                with self.assertRaises(RuntimeError) as ctx:
                    build_features.download_extract("https://example.com/old-latest.osm.pbf", local_pbf)
                self.assertIn("zu alt", str(ctx.exception))

    def test_cached_head_failed_when_head_unreachable(self):
        """HEAD-Prüfung schlägt fehl (Timeout/Fehler), lokale Datei existiert -> cached_head_failed."""
        with tempfile.TemporaryDirectory() as tmpdir:
            local_pbf = os.path.join(tmpdir, "germany-latest.osm.pbf")
            with open(local_pbf, "wb") as f:
                f.write(b"x" * (150 * 1024))
            mtime = time.time() - 3600
            os.utime(local_pbf, (mtime, mtime))

            # HEAD gibt None zurück (Timeout)
            with patch("build_features.check_remote_extract", return_value=None):
                path, duration, was_dl, status = build_features.download_extract(
                    "https://download.geofabrik.de/europe/germany-latest.osm.pbf",
                    local_pbf
                )
                self.assertEqual(path, local_pbf)
                self.assertEqual(status, "cached_head_failed")
                self.assertFalse(was_dl)
                self.assertEqual(len(build_features.BUILD_WARNINGS), 1)
                self.assertIn("HEAD-Prüfung für", build_features.BUILD_WARNINGS[0])

    def test_dated_fallback_today_available(self):
        """-latest mit Schleife + datierte Datei von heute vorhanden -> downloaded_dated."""
        with tempfile.TemporaryDirectory() as tmpdir:
            local_pbf = os.path.join(tmpdir, "liechtenstein-latest.osm.pbf")
            with open(local_pbf, "wb") as f:
                f.write(b"x" * (120 * 1024))
            mtime = time.time() - (48 * 3600)  # 2 Tage alt
            os.utime(local_pbf, (mtime, mtime))

            now_utc = datetime.now(timezone.utc)
            today_str = now_utc.strftime("%y%m%d")
            today_cand = f"https://download.geofabrik.de/europe/liechtenstein-{today_str}.osm.pbf"

            def mock_check_remote(check_url, **kwargs):
                if check_url.endswith("-latest.osm.pbf"):
                    return None  # Weiterleitungsschleife
                if check_url == today_cand:
                    return {
                        "status": 200,
                        "last_modified": "Thu, 01 Oct 2026 06:00:00 GMT",
                        "content_length": 3500000,
                        "url": check_url
                    }
                return None

            def fake_run_cmd(cmd):
                for arg in cmd:
                    if arg.endswith(".download"):
                        with open(arg, "wb") as f:
                            f.write(b"y" * (150 * 1024))
                return ""

            with patch("build_features.check_remote_extract", side_effect=mock_check_remote), \
                 patch("build_features.run_cmd", side_effect=fake_run_cmd), \
                 patch("shutil.which", return_value=None):
                path, duration, was_dl, status = build_features.download_extract(
                    "https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf",
                    local_pbf
                )
                self.assertEqual(path, local_pbf)
                self.assertTrue(was_dl)
                self.assertEqual(status, "downloaded_dated")
                self.assertFalse(os.path.exists(local_pbf + ".download"))

    def test_dated_fallback_only_yesterday_available(self):
        """-latest mit Schleife + datierte Datei nur von gestern -> diese wird verwendet, falls neuer als lokal."""
        with tempfile.TemporaryDirectory() as tmpdir:
            local_pbf = os.path.join(tmpdir, "liechtenstein-latest.osm.pbf")
            with open(local_pbf, "wb") as f:
                f.write(b"x" * (120 * 1024))
            mtime = time.time() - (48 * 3600)  # 2 Tage alt
            os.utime(local_pbf, (mtime, mtime))

            now_utc = datetime.now(timezone.utc)
            yest_utc = now_utc - timedelta(days=1)
            yest_str = yest_utc.strftime("%y%m%d")
            yest_cand = f"https://download.geofabrik.de/europe/liechtenstein-{yest_str}.osm.pbf"

            def mock_check_remote(check_url, **kwargs):
                if check_url.endswith("-latest.osm.pbf"):
                    return None  # Schleife
                if check_url == yest_cand:
                    return {
                        "status": 200,
                        "last_modified": "Thu, 01 Oct 2026 01:22:00 GMT",
                        "content_length": 3450000,
                        "url": check_url
                    }
                return None

            def fake_run_cmd(cmd):
                for arg in cmd:
                    if arg.endswith(".download"):
                        with open(arg, "wb") as f:
                            f.write(b"z" * (150 * 1024))
                return ""

            with patch("build_features.check_remote_extract", side_effect=mock_check_remote), \
                 patch("build_features.run_cmd", side_effect=fake_run_cmd), \
                 patch("shutil.which", return_value=None):
                path, duration, was_dl, status = build_features.download_extract(
                    "https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf",
                    local_pbf
                )
                self.assertEqual(path, local_pbf)
                self.assertTrue(was_dl)
                self.assertEqual(status, "downloaded_dated")

    def test_dated_fallback_older_local_mtime_vs_newer_server_last_modified(self):
        """
        Prüft den konkreten Vorfall: Lokale Datei mtime 30.09. 02:26 UTC,
        Kandidat -260930 mit Last-Modified 01.10. 01:22 GMT -> muss als NEUER erkannt und geladen werden.
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            local_pbf = os.path.join(tmpdir, "germany-latest.osm.pbf")
            with open(local_pbf, "wb") as f:
                f.write(b"x" * (120 * 1024))
            local_dt = datetime(2026, 9, 30, 2, 26, 59, tzinfo=timezone.utc)
            os.utime(local_pbf, (local_dt.timestamp(), local_dt.timestamp()))

            def mock_check_remote(check_url, **kwargs):
                if check_url.endswith("-latest.osm.pbf"):
                    return None  # Weiterleitungsschleife
                if "260930" in check_url:
                    return {
                        "status": 200,
                        "last_modified": "Thu, 01 Oct 2026 01:22:09 GMT",
                        "content_length": 4800000000,
                        "url": check_url
                    }
                return None

            def fake_run_cmd(cmd):
                for arg in cmd:
                    if arg.endswith(".download"):
                        with open(arg, "wb") as f:
                            f.write(b"g" * (150 * 1024))
                return ""

            with patch("build_features.check_remote_extract", side_effect=mock_check_remote), \
                 patch("build_features.run_cmd", side_effect=fake_run_cmd), \
                 patch("shutil.which", return_value=None):
                path, duration, was_dl, status = build_features.download_extract(
                    "https://download.geofabrik.de/europe/germany-latest.osm.pbf",
                    local_pbf
                )
                self.assertEqual(path, local_pbf)
                self.assertTrue(was_dl)
                self.assertEqual(status, "downloaded_dated")

    def test_dated_fallback_after_latest_download_failure(self):
        """HEAD auf -latest liefert 200, aber curl auf -latest schlägt fehl (z. B. Timeout 28 oder Abbruch) -> Ausweichquelle greift."""
        with tempfile.TemporaryDirectory() as tmpdir:
            local_pbf = os.path.join(tmpdir, "switzerland-latest.osm.pbf")
            with open(local_pbf, "wb") as f:
                f.write(b"x" * (120 * 1024))
            mtime = time.time() - (48 * 3600)
            os.utime(local_pbf, (mtime, mtime))

            latest_url = "https://download.geofabrik.de/europe/switzerland-latest.osm.pbf"

            def mock_check_remote(check_url, **kwargs):
                if check_url == latest_url:
                    return {
                        "status": 200,
                        "last_modified": "Thu, 01 Oct 2026 04:00:00 GMT",
                        "content_length": 550000000,
                        "url": check_url
                    }
                if "260930" in check_url:
                    return {
                        "status": 200,
                        "last_modified": "Thu, 01 Oct 2026 04:00:00 GMT",
                        "content_length": 550000000,
                        "url": check_url
                    }
                return None

            def fake_run_cmd(cmd):
                # Download von -latest schlägt fehl (z. B. Timeout curl 28)
                if latest_url in cmd:
                    raise RuntimeError("curl: (28) Operation timed out")
                # Download der datierten Ausweichquelle gelingt
                for arg in cmd:
                    if arg.endswith(".download"):
                        with open(arg, "wb") as f:
                            f.write(b"s" * (150 * 1024))
                return ""

            with patch("build_features.check_remote_extract", side_effect=mock_check_remote), \
                 patch("build_features.run_cmd", side_effect=fake_run_cmd), \
                 patch("shutil.which", return_value=None):
                path, duration, was_dl, status = build_features.download_extract(latest_url, local_pbf)
                self.assertEqual(path, local_pbf)
                self.assertTrue(was_dl)
                self.assertEqual(status, "downloaded_dated")

    def test_dated_fallback_none_available_falls_back_to_local(self):
        """-latest mit Schleife + keine datierte Datei -> lokaler Rückgriff wie bisher."""
        with tempfile.TemporaryDirectory() as tmpdir:
            local_pbf = os.path.join(tmpdir, "liechtenstein-latest.osm.pbf")
            with open(local_pbf, "wb") as f:
                f.write(b"x" * (120 * 1024))
            mtime = time.time() - 3600  # 1 Stunde alt
            os.utime(local_pbf, (mtime, mtime))

            # Alle Checks liefern None
            with patch("build_features.check_remote_extract", return_value=None):
                path, duration, was_dl, status = build_features.download_extract(
                    "https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf",
                    local_pbf
                )
                self.assertEqual(path, local_pbf)
                self.assertFalse(was_dl)
                self.assertEqual(status, "cached_head_failed")
                self.assertEqual(len(build_features.BUILD_WARNINGS), 1)

    def test_normal_case_latest_ok_unchanged(self):
        """Normalfall -latest OK -> unverändertes Verhalten (cached_head_ok bzw. fresh_download)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            local_pbf = os.path.join(tmpdir, "austria-latest.osm.pbf")
            with open(local_pbf, "wb") as f:
                f.write(b"x" * (120 * 1024))
            now = time.time()
            os.utime(local_pbf, (now, now))

            # 1. Datei ist aktuell -> cached_head_ok
            remote_info = {
                "status": 200,
                "last_modified": datetime.fromtimestamp(now, timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT"),
                "content_length": 120 * 1024,
                "url": "https://download.geofabrik.de/europe/austria-latest.osm.pbf"
            }
            with patch("build_features.check_remote_extract", return_value=remote_info):
                path, duration, was_dl, status = build_features.download_extract(
                    "https://download.geofabrik.de/europe/austria-latest.osm.pbf",
                    local_pbf
                )
                self.assertEqual(status, "cached_head_ok")
                self.assertFalse(was_dl)

            # 2. Server-Datei ist neuer -> fresh_download
            remote_info_newer = {
                "status": 200,
                "last_modified": datetime.fromtimestamp(now + 3600, timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT"),
                "content_length": 130 * 1024,
                "url": "https://download.geofabrik.de/europe/austria-latest.osm.pbf"
            }
            def fake_run_cmd(cmd):
                for arg in cmd:
                    if arg.endswith(".download"):
                        with open(arg, "wb") as f:
                            f.write(b"n" * (130 * 1024))
                return ""

            with patch("build_features.check_remote_extract", return_value=remote_info_newer), \
                 patch("build_features.run_cmd", side_effect=fake_run_cmd), \
                 patch("shutil.which", return_value=None):
                path, duration, was_dl, status = build_features.download_extract(
                    "https://download.geofabrik.de/europe/austria-latest.osm.pbf",
                    local_pbf
                )
                self.assertEqual(status, "fresh_download")
                self.assertTrue(was_dl)

    def test_main_exit_codes_10_and_11(self):
        """Keine Änderungen + cached_head_failed -> Exit 11; ohne Rückgriff -> Exit 10."""
        # 1. Fall: Keine Änderungen, aber Status cached_head_failed -> Exit 11
        with tempfile.TemporaryDirectory() as tmpdir:
            targets = [{"id": "germany", "name": "Deutschland", "filename": "germany-latest.osm.pbf", "url": "https://example.com/de.pbf"}]
            with patch("build_features.resolve_targets", return_value=("single", targets)), \
                 patch("build_features.download_extract", return_value=("/path/to/pbf", 0.0, False, "cached_head_failed")), \
                 patch("build_features.check_fingerprint_changes", return_value=(False, [], {"germany": "unverändert (cached_head_failed)"})), \
                 patch("build_features.save_build_warnings"):
                with self.assertRaises(SystemExit) as cm:
                    build_features.main()
                self.assertEqual(cm.exception.code, 11)

        # 2. Fall: Keine Änderungen und sauberer Status cached_head_ok -> Exit 10
        with tempfile.TemporaryDirectory() as tmpdir:
            targets = [{"id": "germany", "name": "Deutschland", "filename": "germany-latest.osm.pbf", "url": "https://example.com/de.pbf"}]
            with patch("build_features.resolve_targets", return_value=("single", targets)), \
                 patch("build_features.download_extract", return_value=("/path/to/pbf", 0.0, False, "cached_head_ok")), \
                 patch("build_features.check_fingerprint_changes", return_value=(False, [], {"germany": "unverändert (cached_head_ok)"})), \
                 patch("build_features.save_build_warnings"):
                with self.assertRaises(SystemExit) as cm:
                    build_features.main()
                self.assertEqual(cm.exception.code, 10)

    def test_extracts_metadata_no_internal_paths_or_ips(self):
        """extracts-Metadaten enthalten relative Dateinamen, Alter und keine absoluten Pfade oder internen IPs."""
        targets = [
            {"id": "germany", "name": "Deutschland", "filename": "germany-latest.osm.pbf", "url": "https://example.com/de.pbf"},
            {"id": "austria", "name": "Österreich", "filename": "austria-latest.osm.pbf", "url": "https://example.com/at.pbf"}
        ]
        extracts_meta = {
            "germany": {
                "name": "Deutschland",
                "filename": "germany-latest.osm.pbf",
                "size_bytes": 1000000,
                "size_mb": 0.95,
                "mtime": "2026-09-30T02:00:00Z",
                "age_hours": 4.5,
                "status": "fresh_download"
            },
            "austria": {
                "name": "Österreich",
                "filename": "austria-latest.osm.pbf",
                "size_bytes": 500000,
                "size_mb": 0.48,
                "mtime": "2026-09-29T22:00:00Z",
                "age_hours": 8.5,
                "status": "cached_head_ok"
            }
        }

        with tempfile.TemporaryDirectory() as publish_dir:
            def fake_run_cmd(cmd):
                if "-o" in cmd:
                    out_idx = cmd.index("-o") + 1
                    if out_idx < len(cmd):
                        os.makedirs(os.path.dirname(cmd[out_idx]), exist_ok=True)
                        with open(cmd[out_idx], "wb") as f:
                            f.write(b"dummy_output")
                return ""

            with patch.object(build_features, "PUBLISH_DIR", publish_dir), \
                 patch.object(build_features, "RAW_DIR", publish_dir), \
                 patch("build_features.run_cmd", side_effect=fake_run_cmd), \
                 patch("build_features.count_geojson_features", return_value=10):
                # Dummy PBF files in RAW_DIR
                for t in targets:
                    with open(os.path.join(publish_dir, t["filename"]), "wb") as f:
                        f.write(b"dummy")

                # Dummy geojson files
                for f_cfg in build_features.FEATURE_CONFIGS:
                    out = os.path.join(publish_dir, f_cfg["output"])
                    with open(out, "w") as f:
                        json.dump({"type": "FeatureCollection", "features": []}, f)
                # Dummy pmtiles
                pmtiles_path = os.path.join(publish_dir, "openfiremap.pmtiles")
                with open(pmtiles_path, "wb") as f:
                    f.write(b"PMTilesFakeContent" * 100)

                metadata, _ = build_features.process_features(
                    mode="dachlilu",
                    targets=targets,
                    download_duration=12.5,
                    raw_sizes={"germany": 1.0, "austria": 0.5},
                    extracts_meta=extracts_meta
                )

                self.assertIn("extracts", metadata)
                self.assertIn("extracts_oldest_age_hours", metadata)
                self.assertEqual(metadata["extracts_oldest_age_hours"], 8.5)

                # Prüfe auf Sicherheit: Keine internen Pfade oder IPs
                meta_str = json.dumps(metadata)
                self.assertNotIn("/srv/", meta_str)
                self.assertNotIn("/data/", meta_str)
                self.assertNotIn("192.168.", meta_str)
                self.assertNotIn("10.", meta_str)

                for ext_id, ext_info in metadata["extracts"].items():
                    self.assertNotIn("/", ext_info["filename"])
                    self.assertNotIn("\\", ext_info["filename"])
                    self.assertIn(ext_info["status"], ["fresh_download", "downloaded_dated", "cached_head_ok", "cached_head_failed", "fallback_after_error"])

    def test_validate_pbf_file(self):
        """PBF-Validierung: Dateien < 100 KB müssen fehlschlagen."""
        with tempfile.TemporaryDirectory() as tmpdir:
            small_file = os.path.join(tmpdir, "truncated.pbf")
            with open(small_file, "wb") as f:
                f.write(b"x" * 500)
            with self.assertRaises(RuntimeError) as ctx:
                build_features.validate_pbf_file(small_file)
            self.assertIn("zu klein", str(ctx.exception))

            valid_size_file = os.path.join(tmpdir, "valid_size.pbf")
            with open(valid_size_file, "wb") as f:
                f.write(b"x" * (105 * 1024))
            # Mit gemocktem osmium: sicherstellen, dass '-F pbf' übergeben wird
            with patch("shutil.which", return_value="/usr/bin/osmium"), \
                 patch("subprocess.run") as mock_run:
                mock_run.return_value = MagicMock(returncode=0)
                build_features.validate_pbf_file(valid_size_file)
                mock_run.assert_called_once_with(
                    ["/usr/bin/osmium", "fileinfo", "-F", "pbf", valid_size_file],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )

    def test_check_remote_extract_follows_redirects_strictly_as_head(self):
        """302-Weiterleitung muss manuell per HEAD verfolgt werden (kein GET-Download)."""
        methods_called = []

        class MockResponse:
            def __init__(self, status, headers):
                self.status = status
                self.code = status
                self.headers = headers

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

        class MockOpener:
            def open(self, req, timeout=15):
                methods_called.append((req.get_method(), req.full_url))
                if len(methods_called) == 1:
                    return MockResponse(302, {"Location": "/europe/liechtenstein-260930.osm.pbf"})
                return MockResponse(200, {
                    "Last-Modified": "Wed, 30 Sep 2026 05:00:00 GMT",
                    "Content-Length": "456789"
                })

        with patch("urllib.request.build_opener", return_value=MockOpener()):
            info = build_features.check_remote_extract("https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf")
            self.assertIsNotNone(info)
            self.assertEqual(info["status"], 200)
            self.assertEqual(info["content_length"], 456789)
            self.assertEqual(info["last_modified"], "Wed, 30 Sep 2026 05:00:00 GMT")
            self.assertEqual(info["url"], "https://download.geofabrik.de/europe/liechtenstein-260930.osm.pbf")
            self.assertEqual(len(methods_called), 2)
            # Beide Aufrufe müssen strikt HEAD sein
            self.assertEqual(methods_called[0][0], "HEAD")
            self.assertEqual(methods_called[1][0], "HEAD")

    def test_check_remote_extract_redirect_loop_returns_none(self):
        """Weiterleitungsschleife (> 5 Sprünge) wird nach max_redirects abgebrochen und gibt None zurück."""
        class MockResponse:
            def __init__(self, status, headers):
                self.status = status
                self.code = status
                self.headers = headers

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                pass

        class MockOpener:
            def open(self, req, timeout=15):
                return MockResponse(302, {"Location": "https://download.geofabrik.de/europe/loop.osm.pbf"})

        with patch("urllib.request.build_opener", return_value=MockOpener()):
            info = build_features.check_remote_extract("https://download.geofabrik.de/europe/loop.osm.pbf", max_redirects=5)
            self.assertIsNone(info)


class TestUpdateScript(unittest.TestCase):
    def setUp(self):
        import shutil
        self.tmp_bin_dir = tempfile.TemporaryDirectory()
        if not shutil.which("flock"):
            flock_shim = os.path.join(self.tmp_bin_dir.name, "flock")
            with open(flock_shim, "w") as f:
                f.write(
                    "#!/usr/bin/env python3\n"
                    "import sys, fcntl\n"
                    "if len(sys.argv) >= 3 and sys.argv[1] == '-n':\n"
                    "    fd = int(sys.argv[2])\n"
                    "    try:\n"
                    "        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)\n"
                    "        sys.exit(0)\n"
                    "    except (IOError, OSError):\n"
                    "        sys.exit(1)\n"
                    "sys.exit(0)\n"
                )
            os.chmod(flock_shim, 0o755)

    def tearDown(self):
        self.tmp_bin_dir.cleanup()

    def test_flock_concurrency_exit_3(self):
        """update.sh bricht mit Exit-Code 3 ab, wenn ein anderer Prozess bereits das Lockfile hält."""
        import subprocess
        import fcntl

        with tempfile.TemporaryDirectory() as tmpdir:
            lock_file = os.path.join(tmpdir, "update.lock")
            with open(lock_file, "w") as lf:
                fcntl.flock(lf.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                env = os.environ.copy()
                env["DATA_DIR"] = tmpdir
                env["PROJECT_DIR"] = tmpdir
                env["PATH"] = f"{self.tmp_bin_dir.name}:{os.environ.get('PATH', '')}"
                script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "update.sh"))
                res = subprocess.run(["bash", script_path], env=env, capture_output=True, text=True)
                self.assertEqual(res.returncode, 3)
                self.assertIn("bereits aktiv", res.stderr)

    def test_stale_build_warnings_cleared_on_start(self):
        """update.sh löscht veraltete build_warnings.json direkt nach dem Erwerb des Locks vor dem Build."""
        import subprocess

        with tempfile.TemporaryDirectory() as tmpdir:
            raw_dir = os.path.join(tmpdir, "raw")
            os.makedirs(raw_dir, exist_ok=True)
            warnings_file = os.path.join(raw_dir, "build_warnings.json")
            with open(warnings_file, "w") as f:
                f.write('["stale_warning_from_yesterday"]')

            env = os.environ.copy()
            env["DATA_DIR"] = tmpdir
            env["PROJECT_DIR"] = tmpdir
            env["PATH"] = f"{self.tmp_bin_dir.name}:{os.environ.get('PATH', '')}"
            script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "update.sh"))

            # Führe update.sh aus. Da Docker in tmpdir nicht läuft, bricht es erst beim docker compose Befehl ab.
            # Bereinigung und Initialisierung von sync_status.json finden davor statt.
            subprocess.run(["bash", script_path], env=env, capture_output=True, text=True)

            self.assertFalse(os.path.exists(warnings_file), "Veraltete build_warnings.json muss gelöscht worden sein")
            sync_status_file = os.path.join(raw_dir, "sync_status.json")
            self.assertTrue(os.path.exists(sync_status_file))
            with open(sync_status_file, "r") as sf:
                data = json.load(sf)
                self.assertEqual(data.get("build_warnings"), [], "build_warnings in sync_status.json muss initial leer sein")


class TestBuildFingerprints(unittest.TestCase):
    """
    Testet die Fingerprint- und Skip-Logik von build_features.py (Teil 5 des Auftrags):
    1. Kein Fingerprint vorhanden -> Build
    2. Alles gleich -> Exit 10 / has_changed=False, publish/ unverändert
    3. Ein Land mit neuer mtime/Größe -> Build, nennt das Land
    4. Builder-Datei oder tippecanoe-Argumente geändert -> Build
    5. FORCE_BUILD=true bei gleichem Stand -> Build
    6. Teilweiser Rückfall (ein Land Download-Fehler, andere neu) -> Build
    7. Alle Länder cached_head_failed/fallback_after_error, sonst gleich -> Exit 10 (has_changed=False)
    8. Fingerprint-Datei kaputt -> Build
    """
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.raw_dir = os.path.join(self.tmp.name, "raw")
        self.publish_dir = os.path.join(self.tmp.name, "publish")
        os.makedirs(self.raw_dir, exist_ok=True)
        os.makedirs(self.publish_dir, exist_ok=True)

        self.targets = [
            {"id": "germany", "name": "Deutschland", "filename": "germany-latest.osm.pbf", "url": "https://example.com/de.pbf"},
            {"id": "austria", "name": "Österreich", "filename": "austria-latest.osm.pbf", "url": "https://example.com/at.pbf"},
        ]

        # Dummy PBF-Dateien anlegen
        for t in self.targets:
            pbf = os.path.join(self.raw_dir, t["filename"])
            with open(pbf, "wb") as f:
                f.write(b"osm_dummy_data_" + t["id"].encode())
            mtime = 1700000000
            os.utime(pbf, (mtime, mtime))

        self.builder_hash = build_features.compute_builder_hash(self.targets)
        self.extract_fps = build_features.compute_extract_fingerprints(self.targets, raw_dir=self.raw_dir)

    def tearDown(self):
        self.tmp.cleanup()

    def test_1_no_fingerprint_triggers_build(self):
        """1. Kein Fingerprint vorhanden -> Build."""
        saved_fp = build_features.load_build_fingerprint(raw_dir=self.raw_dir)
        self.assertIsNone(saved_fp)

        has_changed, reasons, country_status = build_features.check_fingerprint_changes(
            self.builder_hash, self.extract_fps, saved_fp
        )
        self.assertTrue(has_changed)
        self.assertTrue(any("Kein gültiger Build-Fingerprint" in r for r in reasons))

    def test_2_identical_fingerprints_skip_build(self):
        """2. Alles gleich -> kein Build (Exit 10), publish/ bleibt unangetastet."""
        marker_file = os.path.join(self.publish_dir, "marker.txt")
        with open(marker_file, "w") as f:
            f.write("existing_build")

        fp_data = {
            "builder_hash": self.builder_hash,
            "generated_at": "2026-09-30T06:00:00Z",
            "extracts": self.extract_fps
        }
        build_features.save_build_fingerprint(fp_data, raw_dir=self.raw_dir)

        saved_fp = build_features.load_build_fingerprint(raw_dir=self.raw_dir)
        self.assertIsNotNone(saved_fp)

        has_changed, reasons, country_status = build_features.check_fingerprint_changes(
            self.builder_hash, self.extract_fps, saved_fp
        )
        self.assertFalse(has_changed)
        self.assertEqual(len(reasons), 0)
        self.assertIn("unverändert", country_status["germany"])
        self.assertIn("unverändert", country_status["austria"])

        # publish/ Verzeichnis unangetastet
        self.assertTrue(os.path.exists(marker_file))
        with open(marker_file, "r") as f:
            self.assertEqual(f.read(), "existing_build")

    def test_3_extract_changed_triggers_build_and_names_country(self):
        """3. Ein Land mit neuer mtime/Größe -> Build, Log nennt das Land."""
        fp_data = {
            "builder_hash": self.builder_hash,
            "generated_at": "2026-09-30T06:00:00Z",
            "extracts": self.extract_fps
        }
        build_features.save_build_fingerprint(fp_data, raw_dir=self.raw_dir)
        saved_fp = build_features.load_build_fingerprint(raw_dir=self.raw_dir)

        # Ändere mtime von Deutschland
        de_pbf = os.path.join(self.raw_dir, "germany-latest.osm.pbf")
        os.utime(de_pbf, (1700050000, 1700050000))

        new_extract_fps = build_features.compute_extract_fingerprints(self.targets, raw_dir=self.raw_dir)
        has_changed, reasons, country_status = build_features.check_fingerprint_changes(
            self.builder_hash, new_extract_fps, saved_fp
        )
        self.assertTrue(has_changed)
        self.assertTrue(any("germany" in r for r in reasons))
        self.assertTrue(country_status["germany"].startswith("geändert"))
        self.assertTrue(country_status["austria"].startswith("unverändert"))

    def test_4_builder_change_or_tippecanoe_triggers_build(self):
        """4. Builder-Datei oder tippecanoe-Argumente geändert -> Build."""
        fp_data = {
            "builder_hash": self.builder_hash,
            "generated_at": "2026-09-30T06:00:00Z",
            "extracts": self.extract_fps
        }
        build_features.save_build_fingerprint(fp_data, raw_dir=self.raw_dir)
        saved_fp = build_features.load_build_fingerprint(raw_dir=self.raw_dir)

        # 4a: Builder Skriptinhalt geändert
        mod_hash = build_features.compute_builder_hash(self.targets, script_content=b"# modified python code")
        self.assertNotEqual(mod_hash, self.builder_hash)
        has_changed, reasons, _ = build_features.check_fingerprint_changes(
            mod_hash, self.extract_fps, saved_fp
        )
        self.assertTrue(has_changed)
        self.assertTrue(any("Builder-Code" in r for r in reasons))

        # 4b: Tippecanoe-Konfiguration geändert
        with patch.dict(build_features.TIPPECANOE_CONFIG, {"maxzoom": 15}):
            tc_hash = build_features.compute_builder_hash(self.targets)
            self.assertNotEqual(tc_hash, self.builder_hash)
            has_changed, reasons, _ = build_features.check_fingerprint_changes(
                tc_hash, self.extract_fps, saved_fp
            )
            self.assertTrue(has_changed)
            self.assertTrue(any("Builder-Code" in r for r in reasons))

    def test_5_force_build_triggers_build(self):
        """5. FORCE_BUILD=true bei gleichem Stand -> Build."""
        fp_data = {
            "builder_hash": self.builder_hash,
            "generated_at": "2026-09-30T06:00:00Z",
            "extracts": self.extract_fps
        }
        build_features.save_build_fingerprint(fp_data, raw_dir=self.raw_dir)
        saved_fp = build_features.load_build_fingerprint(raw_dir=self.raw_dir)

        has_changed, reasons, _ = build_features.check_fingerprint_changes(
            self.builder_hash, self.extract_fps, saved_fp, force_build=True
        )
        self.assertTrue(has_changed)
        self.assertTrue(any("FORCE_BUILD=true" in r for r in reasons))

    def test_6_partial_fallback_triggers_build(self):
        """6. Teilweiser Rückfall (ein Land Download-Fehler, andere neu) -> Build."""
        fp_data = {
            "builder_hash": self.builder_hash,
            "generated_at": "2026-09-30T06:00:00Z",
            "extracts": self.extract_fps
        }
        build_features.save_build_fingerprint(fp_data, raw_dir=self.raw_dir)
        saved_fp = build_features.load_build_fingerprint(raw_dir=self.raw_dir)

        # Deutschland neu heruntergeladen (neue mtime)
        de_pbf = os.path.join(self.raw_dir, "germany-latest.osm.pbf")
        os.utime(de_pbf, (1700099999, 1700099999))
        new_extract_fps = build_features.compute_extract_fingerprints(self.targets, raw_dir=self.raw_dir)

        # Österreich hatte Download-Fehler und greift auf Fallback zurück
        extracts_meta = {
            "germany": {"status": "downloaded"},
            "austria": {"status": "fallback_after_error"}
        }

        has_changed, reasons, country_status = build_features.check_fingerprint_changes(
            self.builder_hash, new_extract_fps, saved_fp, extracts_meta=extracts_meta
        )
        self.assertTrue(has_changed)
        self.assertTrue(any("germany" in r for r in reasons))
        self.assertEqual(country_status["germany"], "geändert (downloaded)")
        self.assertEqual(country_status["austria"], "unverändert (fallback_after_error)")

    def test_7_all_countries_fallback_or_cached_skips_build(self):
        """7. Alle Länder cached_head_failed/fallback_after_error, sonst gleich -> Exit 10 (Skip)."""
        fp_data = {
            "builder_hash": self.builder_hash,
            "generated_at": "2026-09-30T06:00:00Z",
            "extracts": self.extract_fps
        }
        build_features.save_build_fingerprint(fp_data, raw_dir=self.raw_dir)
        saved_fp = build_features.load_build_fingerprint(raw_dir=self.raw_dir)

        extracts_meta = {
            "germany": {"status": "cached_head_failed"},
            "austria": {"status": "fallback_after_error"}
        }

        has_changed, reasons, country_status = build_features.check_fingerprint_changes(
            self.builder_hash, self.extract_fps, saved_fp, extracts_meta=extracts_meta
        )
        self.assertFalse(has_changed)
        self.assertEqual(len(reasons), 0)
        self.assertEqual(country_status["germany"], "unverändert (cached_head_failed)")
        self.assertEqual(country_status["austria"], "unverändert (fallback_after_error)")

    def test_8_corrupted_fingerprint_triggers_build(self):
        """8. Fingerprint-Datei kaputt -> Build."""
        fp_file = os.path.join(self.raw_dir, "build_fingerprint.json")
        with open(fp_file, "w") as f:
            f.write("{corrupted_json_content: true,")

        saved_fp = build_features.load_build_fingerprint(raw_dir=self.raw_dir)
        self.assertIsNone(saved_fp)

        has_changed, reasons, _ = build_features.check_fingerprint_changes(
            self.builder_hash, self.extract_fps, saved_fp
        )
        self.assertTrue(has_changed)
        self.assertTrue(any("Kein gültiger Build-Fingerprint" in r for r in reasons))

    def test_merge_geojson_files_deduplicates_by_id(self):
        """merge_geojson_files führt mehrere FeatureCollections zusammen und entfernt Duplikate."""
        with tempfile.TemporaryDirectory() as tmpdir:
            file1 = os.path.join(tmpdir, "part1.geojson")
            file2 = os.path.join(tmpdir, "part2.geojson")
            merged = os.path.join(tmpdir, "merged.geojson")

            with open(file1, "w", encoding="utf-8") as f:
                json.dump({
                    "type": "FeatureCollection",
                    "features": [
                        {"type": "Feature", "id": "w1", "properties": {"v": 1}},
                        {"type": "Feature", "id": "w2", "properties": {"v": 1}}
                    ]
                }, f)

            with open(file2, "w", encoding="utf-8") as f:
                json.dump({
                    "type": "FeatureCollection",
                    "features": [
                        {"type": "Feature", "id": "w2", "properties": {"v": 2}},  # Duplikat
                        {"type": "Feature", "id": "w3", "properties": {"v": 1}}
                    ]
                }, f)

            build_features.merge_geojson_files([file1, file2], merged)

            with open(merged, "r", encoding="utf-8") as f:
                result = json.load(f)

            self.assertEqual(result["type"], "FeatureCollection")
            features = result["features"]
            self.assertEqual(len(features), 3)
            ids = [feat["id"] for feat in features]
            self.assertEqual(ids, ["w1", "w2", "w3"])
            # Erstes Auftreten bleibt erhalten
            self.assertEqual(features[1]["properties"]["v"], 1)

    def test_download_preserves_partial_file_on_curl_error(self):
        """Bei curl-Netzwerkfehlern oder Timeouts bleibt die .download-Datei für Resume (-C -) erhalten."""
        with tempfile.TemporaryDirectory() as tmpdir:
            target = os.path.join(tmpdir, "extract-latest.osm.pbf")
            tmp_download = target + ".download"

            # Simuliere abgebrochenen Download derselben Quelle, der schon 50 KB geschrieben hat
            info = {"status": 200, "url": "https://example.com/test.pbf",
                    "last_modified": "Thu, 01 Oct 2026 01:02:00 GMT", "content_length": 3500000}
            with open(tmp_download, "wb") as f:
                f.write(b"x" * 50000)
            with open(tmp_download + ".source.json", "w", encoding="utf-8") as f:
                json.dump({k: info[k] for k in ("url", "last_modified", "content_length")}, f)

            with patch("build_features.run_cmd", side_effect=RuntimeError("curl (28) timeout")):
                with self.assertRaises(RuntimeError):
                    build_features._download_and_replace("https://example.com/test.pbf", target, remote_info=info)

            # .download-Datei muss erhalten geblieben sein!
            self.assertTrue(os.path.exists(tmp_download))
            self.assertEqual(os.path.getsize(tmp_download), 50000)


class TestDownloadResume(unittest.TestCase):
    """curl -C - darf nur einen Teil-Download derselben Quelle und desselben Serverstands fortsetzen."""

    URL = "https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf"
    INFO = {"status": 200, "url": "https://download.geofabrik.de/europe/liechtenstein-261001.osm.pbf",
            "last_modified": "Thu, 01 Oct 2026 01:02:00 GMT", "content_length": 3500000}

    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.target = os.path.join(self.tmpdir.name, "liechtenstein-latest.osm.pbf")
        self.partial = self.target + ".download"
        self.marker = self.partial + ".source.json"
        self.seen = {}

    def tearDown(self):
        self.tmpdir.cleanup()

    def _write_partial(self, marker=None):
        with open(self.partial, "wb") as f:
            f.write(b"alt" * 1000)
        if marker is not None:
            with open(self.marker, "w", encoding="utf-8") as f:
                json.dump(marker, f)

    def _fake_curl(self, fail=False):
        def run(cmd):
            # Zustand zum Zeitpunkt des curl-Aufrufs festhalten
            self.seen["partial_kept"] = os.path.exists(self.partial)
            with open(self.marker, encoding="utf-8") as f:
                self.seen["marker"] = json.load(f)
            with open(self.partial, "ab") as f:
                f.write(b"y" * (150 * 1024))
            if fail:
                raise RuntimeError("curl: (28) Operation timed out")
            return ""
        return run

    def _download(self, info, fail=False):
        with patch("build_features.run_cmd", side_effect=self._fake_curl(fail)), \
             patch("shutil.which", return_value=None):
            return build_features._download_and_replace(self.URL, self.target, remote_info=info)

    def _marker_for(self, info):
        return {"url": info["url"], "last_modified": info["last_modified"], "content_length": info["content_length"]}

    def test_partial_without_marker_is_discarded(self):
        self._write_partial()
        self._download(self.INFO)
        self.assertFalse(self.seen["partial_kept"])
        self.assertEqual(self.seen["marker"], self._marker_for(self.INFO))

    def test_partial_from_same_source_is_resumed(self):
        self._write_partial(self._marker_for(self.INFO))
        self._download(self.INFO)
        self.assertTrue(self.seen["partial_kept"])
        with open(self.target, "rb") as f:
            self.assertTrue(f.read().startswith(b"alt"))

    def test_partial_from_older_server_state_is_discarded(self):
        old = dict(self.INFO, last_modified="Wed, 30 Sep 2026 01:02:00 GMT")
        self._write_partial(self._marker_for(old))
        self._download(self.INFO)
        self.assertFalse(self.seen["partial_kept"])

    def test_curl_failure_keeps_partial_and_marker_success_cleans_up(self):
        with self.assertRaises(RuntimeError):
            self._download(self.INFO, fail=True)
        self.assertTrue(os.path.exists(self.partial))
        self.assertTrue(os.path.exists(self.marker))

        self._download(self.INFO)
        self.assertTrue(self.seen["partial_kept"])
        self.assertFalse(os.path.exists(self.partial))
        self.assertFalse(os.path.exists(self.marker))
        self.assertTrue(os.path.exists(self.target))


if __name__ == "__main__":
    unittest.main()

