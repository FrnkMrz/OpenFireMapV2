import test from "node:test";
import assert from "node:assert/strict";
import { OSM_NOTICE, CREDIT, ATTRIBUTION_LINES, SRC_SIZE, formatStand, formatDay, standLine, basemapUntil } from "./attribution.js";

test("Pflichttext: OSM-Nennung, Lizenz und ausgeschriebene Adresse", () => {
  assert.match(OSM_NOTICE, /© OpenStreetMap contributors/);
  assert.match(OSM_NOTICE, /ODbL/);
  assert.match(OSM_NOTICE, /https:\/\/www\.openstreetmap\.org\/copyright/);
  assert.equal(ATTRIBUTION_LINES[0], OSM_NOTICE, "der Pflichttext steht zuerst");
});

test("freiwillige Hinweise sind kurz (hoechstens eine Zeile, kein zweiter Lizenztext)", () => {
  assert.match(CREDIT, /Protomaps/);
  assert.match(CREDIT, /OpenFireMap\.org/);
  assert.ok(CREDIT.length <= 50);
  assert.equal(ATTRIBUTION_LINES.length, 2);
});

test("Quelle ist nicht kleiner als die Legende (Legendentext 2,2 mm; die Quelle darf etwas kleiner sein, bleibt aber gut lesbar)", () => {
  assert.ok(SRC_SIZE >= 1.9 && SRC_SIZE <= 2.2);
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

test("formatDay und standLine: kurze Zeile mit beiden Staenden", () => {
  assert.equal(formatDay("2026-10-24T20:20:51Z"), "24.10.2026");
  assert.equal(formatDay("kaputt"), null);
  assert.equal(standLine("2026-10-24T20:20:51Z", "2026-11-01T04:00:00Z"), "Stand: Feuerwehr-Daten 24.10.2026 · Basiskarte 01.11.2026");
  assert.equal(standLine("2026-10-24T20:20:51Z", null), "Stand: Feuerwehr-Daten 24.10.2026");
  assert.equal(standLine(null, "2026-11-01T04:00:00Z"), "Stand: Basiskarte 01.11.2026");
  assert.equal(standLine(undefined, undefined), "Stand: unbekannt");
});
