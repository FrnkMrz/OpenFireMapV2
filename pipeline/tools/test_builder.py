#!/usr/bin/env python3
"""
Unit-Tests für den Feature-Builder (DACHLiLu & Single-Region)
Einschließlich Resilienz, Download-Fallbacks und Metadaten-Bereinigung.
"""

import os
import sys
import time
import json
import tempfile
import unittest
from unittest.mock import patch

# Füge builder-Verzeichnis zum Suchpfad hinzu
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "builder")))
import build_features


class TestBuildFeatures(unittest.TestCase):
    def setUp(self):
        build_features.BUILD_WARNINGS.clear()

    def test_feature_configs_complete(self):
        """Prüft, ob alle 5 Ebenen konfiguriert sind."""
        names = [f["name"] for f in build_features.FEATURE_CONFIGS]
        self.assertEqual(len(names), 5)
        self.assertIn("hydrants", names)
        self.assertIn("fire_stations", names)
        self.assertIn("water_points", names)
        self.assertIn("defibrillators", names)
        self.assertIn("boundaries", names)

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
                    self.assertIn(ext_info["status"], ["fresh_download", "cached_head_ok", "cached_head_failed", "fallback_after_error"])

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
            # Ohne osmium (oder wenn osmium gemockt wird) besteht die Größenprüfung
            with patch("shutil.which", return_value=None):
                build_features.validate_pbf_file(valid_size_file)


if __name__ == "__main__":
    unittest.main()
