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

test("Paritaet mit der App: jedes Symbol ist Zeichen fuer Zeichen das der Karte (src/js/marker-symbols.js)", async (t) => {
  const { readFileSync, writeFileSync, mkdtempSync, existsSync } = await import("node:fs");
  if (!existsSync(new URL("../../src/js/marker-symbols.js", import.meta.url))) return t.skip("src/js/marker-symbols.js fehlt (alter Checkout)");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const src = readFileSync(new URL("../../src/js/marker-symbols.js", import.meta.url), "utf-8")
    .replace(/import \{ Config \} from '\.\/config\.js';/, "const Config = { colors: { station: '#dc2626', hydrant: '#dc2626', water: '#2563eb', defib: '#15803d' } };");
  const dir = mkdtempSync(join(tmpdir(), "ofm-sym-"));
  const file = join(dir, "marker-symbols.mjs");
  writeFileSync(file, src.replace("./marker-symbols-core.js", "./marker-symbols-core.mjs")); // die App hat die Symbole in einen Kern ohne Config ausgelagert
  writeFileSync(join(dir, "marker-symbols-core.mjs"), readFileSync(new URL("../../src/js/marker-symbols-core.js", import.meta.url), "utf-8"));
  const app = await import(pathToFileURL(file).href);
  const norm = (s) => s.replace(/width="\d+px" height="\d+px"/, "").replace(/\s+/g, " ").replace(/> </g, "><").trim();
  const cases = [
    ["water_tank", {}], ["water_tank", { man_made: "storage_tank" }], ["water_tank", { natural: "water", water: "basin" }],
    ["fire_water_pond", {}], ["suction_point", {}], ["cistern", {}], ["pipe", { water_source: "groundwater" }], ["pipe", {}],
    ["underground", {}], ["wsh", {}], ["pillar", {}], ["pillar", { "pillar:type": "dry_barrel" }], ["wall", {}],
  ];
  for (const [type, tags] of cases) {
    assert.equal(norm(svgFor(iconIdForType(type, tags))), norm(app.getMarkerSvg(app.getHydrantMarkerType(type, tags), 200, 2, tags)), `${type} ${JSON.stringify(tags)}`);
    assert.equal(waterKindOf(type, tags), app.getWaterMarkerKind(type, tags), `Art ${type} ${JSON.stringify(tags)}`);
  }
});
