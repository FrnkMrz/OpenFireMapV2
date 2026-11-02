import test from "node:test";
import assert from "node:assert/strict";
import { fitText } from "./fittext.js";

const measure = (t, size) => t.length * 0.5 * size;

test("passt der Text, bleibt er unveraendert", () => {
  assert.deepEqual(fitText({ text: "Rollhofen", size: 9, minSize: 4.5, maxW: 100, measure }), { text: "Rollhofen", size: 9 });
});

test("zu breit: erst kleiner, ohne zu kuerzen", () => {
  const r = fitText({ text: "Hersbruck an der Pegnitz", size: 9, minSize: 4.5, maxW: 70, measure });
  assert.equal(r.text, "Hersbruck an der Pegnitz");
  assert.ok(r.size < 9 && r.size >= 4.5);
  assert.ok(measure(r.text, r.size) <= 70 + 1e-9);
});

test("auch bei kleinster Schrift zu breit: mit Auslassungspunkten gekuerzt, nie breiter als erlaubt", () => {
  const r = fitText({ text: "Ein sehr langer Name, der nirgends mehr hinpasst", size: 9, minSize: 4.5, maxW: 40, measure });
  assert.equal(r.size, 4.5);
  assert.ok(r.text.endsWith("…") && r.text.length < 30);
  assert.ok(measure(r.text, r.size) <= 40 + 1e-9);
});

test("schmale Karte (44 mm) und breiteres Blatt: die Ueberschrift bekommt die Breite des Blatts, nicht des Rahmens", () => {
  const head = fitText({ text: "Orts- und Hydrantenplan", size: 6, minSize: 3.4, maxW: 277, measure });
  assert.deepEqual(head, { text: "Orts- und Hydrantenplan", size: 6 });
  const narrow = fitText({ text: "Orts- und Hydrantenplan", size: 6, minSize: 3.4, maxW: 44, measure });
  assert.ok(measure(narrow.text, narrow.size) <= 44 + 1e-9, "auch im schlimmsten Fall nichts ueber den Rand");
});

test("leerer Text und winzige Breite", () => {
  assert.deepEqual(fitText({ text: "  ", size: 9, minSize: 4, maxW: 50, measure }), { text: "", size: 9 });
  assert.equal(fitText({ text: "Abc", size: 9, minSize: 4, maxW: 1, measure }).text, "…");
});
