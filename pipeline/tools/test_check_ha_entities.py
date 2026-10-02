#!/usr/bin/env python3
"""Tests für check_ha_entities.py (Entitäts-IDs aus name, default_entity_id, command_line)."""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_ha_entities as checker

REPO_PACKAGE = Path(__file__).resolve().parents[1] / "monitoring" / "homeassistant" / "openfiremap.yaml"

SAMPLE = """\
rest:
  - resource: "<PIPELINE_PUBLIC_URL>/metadata.json"
    sensor:
      - name: "OpenFireMap Hydrants"
        unique_id: openfiremap_hydrants
command_line:
  - sensor:
      name: "OpenFireMap Disk Free"
      unique_id: openfiremap_disk_free
template:
  - binary_sensor:
      - name: "OpenFireMap Warnung Status"
        unique_id: openfiremap_status_problem
        default_entity_id: binary_sensor.openfiremap_status_problem
        state: "{{ states('sensor.openfiremap_hydrants') | int(0) < 1 }}"
      - name: "OpenFireMap Disk Low"
        state: "{{ states('sensor.openfiremap_disk_free') | float(0) < 20 }}"
automation:
  - triggers:
      - trigger: state
        entity_id: binary_sensor.openfiremap_status_problem
"""


class TestCheckHaEntities(unittest.TestCase):
    def _definitions(self, text):
        return {entity_id for _, _, entity_id in checker.find_definitions(text.splitlines())}

    def test_slugify_matches_home_assistant(self):
        self.assertEqual(checker.slugify("OpenFireMap Sync Letzte Prüfung"), "openfiremap_sync_letzte_prufung")
        self.assertEqual(checker.slugify("OpenFireMap Publish-Verzug"), "openfiremap_publish_verzug")

    def test_default_entity_id_and_command_line_names(self):
        defined = self._definitions(SAMPLE)
        self.assertEqual(defined, {
            "sensor.openfiremap_hydrants",
            "sensor.openfiremap_disk_free",
            "binary_sensor.openfiremap_status_problem",
            "binary_sensor.openfiremap_disk_low",
        })
        self.assertNotIn("binary_sensor.openfiremap_warnung_status", defined)

    def test_audit_sample_has_no_missing_references(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "pkg.yaml"
            path.write_text(SAMPLE, encoding="utf-8")
            self.assertEqual(checker.audit(path), 0)

    def test_audit_reports_missing_reference(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "pkg.yaml"
            path.write_text(SAMPLE.replace("default_entity_id: binary_sensor.openfiremap_status_problem\n", ""),
                            encoding="utf-8")
            self.assertEqual(checker.audit(path), 1)

    def test_repo_package_is_consistent(self):
        """Das ausgelieferte Paket hat keine fehlenden oder doppelten Entitäts-IDs."""
        self.assertEqual(checker.audit(REPO_PACKAGE), 0)

    def test_repo_package_contains_no_lan_details(self):
        text = REPO_PACKAGE.read_text(encoding="utf-8")
        self.assertNotRegex(text, r"192\\.168\\.|10\\.\\d+\\.\\d+\\.\\d+|mobile_app_[a-z0-9]")


if __name__ == "__main__":
    unittest.main()
