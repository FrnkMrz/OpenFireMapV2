#!/usr/bin/env python3
"""
Unit-Tests für den Feature-Builder (DACHLiLu & Single-Region)
"""

import os
import sys
import unittest

# Füge builder-Verzeichnis zum Suchpfad hinzu
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "builder")))
import build_features


class TestBuildFeatures(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
