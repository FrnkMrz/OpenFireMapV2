import test from "node:test";
import assert from "node:assert/strict";
import { OSM_NOTICE, ATTRIBUTION, SRC_SIZE, formatStand, basemapUntil } from "./attribution.js";

test("Pflichttext: OSM-Nennung, Lizenz und ausgeschriebene Adresse", () => {
  assert.match(OSM_NOTICE, /© OpenStreetMap contributors/);
  assert.match(OSM_NOTICE, /ODbL/);
  assert.match(OSM_NOTICE, /https:\/\/www\.openstreetmap\.org\/copyright/);
  assert.ok(ATTRIBUTION.startsWith(OSM_NOTICE), "der Quellenblock beginnt mit dem Pflichttext");
  assert.match(ATTRIBUTION, /Protomaps © OpenStreetMap/);
  assert.match(ATTRIBUTION, /OpenFireMap\.org/);
});

test("Quelle ist nicht kleiner als die Legende (Legendentext 2,2 mm)", () => {
  assert.ok(SRC_SIZE >= 2.2);
});

test("formatStand: deutsches Datum in UTC, ohne Zeitzonen-Umrechnung", () => {
  assert.equal(formatStand("2026-10-24T20:20:51Z"), "24.10.2026 20:20 UTC");
  assert.equal(formatStand("2026-11-01T04:00:00Z"), "01.11.2026 04:00 UTC");
  assert.equal(formatStand(undefined), "unbekannt");
  assert.equal(formatStand("kaputt"), "unbekannt");
  assert.equal(formatStand(null), "unbekannt");
});

test("basemapUntil: liest den Stand aus den PMTiles-Metadaten, sonst null", () => {
  assert.equal(basemapUntil({ "planetiler:osm:osmosisreplicationtime": "2026-11-01T04:00:00Z" }), "2026-11-01T04:00:00Z");
  assert.equal(basemapUntil({}), null);
  assert.equal(basemapUntil(null), null);
  assert.equal(basemapUntil({ "planetiler:osm:osmosisreplicationtime": 5 }), null);
  assert.equal(basemapUntil({ "planetiler:osm:osmosisreplicationtime": "gestern" }), null);
});
