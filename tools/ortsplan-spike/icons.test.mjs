import test from "node:test";
import assert from "node:assert/strict";
import { waterKindOf, iconIdForType, svgFor } from "./icons.js";

test("Wasserstellen: gleiche Zuordnung wie getWaterMarkerKind der App", () => {
  assert.equal(waterKindOf("suction_point"), "suction_point");
  assert.equal(waterKindOf("fire_water_pond"), "open_water");
  assert.equal(waterKindOf("pond"), "open_water");
  assert.equal(waterKindOf("water_tank"), "water_tank");
  assert.equal(waterKindOf("water_tank", { man_made: "storage_tank" }), "closed_water_tank");
  assert.equal(waterKindOf("water_tank", { man_made: "reservoir_covered" }), "closed_water_tank");
  assert.equal(waterKindOf("water_tank", { natural: "water", water: "basin" }), "open_water");
  assert.equal(waterKindOf("water_tank", { landuse: "reservoir" }), "open_water");
  assert.equal(waterKindOf("cistern"), "water_tank");
  assert.equal(waterKindOf("pipe", { water_source: "groundwater" }), "groundwater_pipe");
  assert.equal(waterKindOf("pipe"), null);
  assert.equal(waterKindOf("underground"), null);
});

test("Symbol-ID: Wasser vor Hydrant, Trockenhydrant und WSH aus den Zusatztags", () => {
  assert.equal(iconIdForType("suction_point", {}), "suction_point");
  assert.equal(iconIdForType("pipe", { water_source: "groundwater" }), "groundwater_pipe");
  assert.equal(iconIdForType("pipe", {}), "pipe");
  assert.equal(iconIdForType("pillar", { "pillar:type": "dry_barrel" }), "dry_barrel");
  assert.equal(iconIdForType("pillar", {}), "pillar");
  assert.equal(iconIdForType("station"), "station");
  assert.equal(iconIdForType("unbekannt", {}), "plain");
});

test("Wassersymbole sind blau mit weissem Zeichen, Hydranten rot", () => {
  for (const id of ["water_tank", "closed_water_tank", "open_water", "suction_point", "groundwater_pipe"]) {
    const svg = svgFor(id);
    assert.ok(svg.includes('fill="#2563eb"'), `${id} blau`);
    assert.ok(!svg.includes('fill="#dc2626"'), `${id} nicht rot`);
  }
  assert.ok(svgFor("suction_point").includes("M72 24 L48 58"), "Saugstelle: Saugrohr ins Wasser");
  assert.ok(svgFor("groundwater_pipe").includes(">I<"), "Rohrsymbol bleibt");
  assert.ok(svgFor("pillar").includes('fill="#dc2626"'));
});
