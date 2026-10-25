import test from "node:test";
import assert from "node:assert/strict";
import { paginate } from "./paginate.js";

const flat = (pages) => pages.flat();
const covered = (pages) => {
  let next = 0;
  for (const [a, b] of flat(pages)) { assert.equal(a, next); assert.ok(b > a); next = b; }
  return next;
};

test("400 gleich hohe Eintraege: alle werden verteilt, auch ueber mehrere Folgeseiten (Codex-Review Runde 2)", () => {
  const pages = paginate(400, () => 1, [40, 40], [60, 60, 60, 60]);
  assert.equal(covered(pages), 400);
  assert.equal(pages.length, 3); // 80 + 240 + 80
  assert.equal(covered(paginate(1000, () => 1, [40, 40], [60, 60, 60, 60])), 1000);
});

test("mehrzeilige Eintraege (Codex-Review Runde 3): die Hoehe zaehlt, nicht die Anzahl", () => {
  // jeder dritte Eintrag hat zwei Zeilen: 60 Eintraege brauchen 80 Zeilen, zwei Spalten zu je 30 fassen nur 60 Zeilen
  const h = (i) => (i % 3 === 0 ? 2 : 1);
  const pages = paginate(60, h, [30, 30], [30, 30]);
  assert.equal(covered(pages), 60);
  for (const page of pages) {
    for (const [a, b] of page) {
      let used = 0;
      for (let n = a; n < b; n++) used += h(n);
      assert.ok(used <= 30, `Spalte ueberschreitet die Hoehe: ${used}`);
    }
  }
});

test("Hoehe haengt von der Seitenart ab (schmale Spalte auf Seite 1 bricht mehr Zeilen um)", () => {
  const h = (i, first) => (first ? 3 : 1);
  const pages = paginate(100, h, [30, 30], [20, 20, 20, 20]);
  assert.equal(covered(pages), 100);
  assert.equal(flat([pages[0]]).reduce((s, [a, b]) => s + (b - a), 0), 20); // 2 Spalten * 10 Eintraege
});

test("passt alles auf die erste Seite, gibt es nur eine", () => {
  const pages = paginate(30, () => 1, [40, 40], [60]);
  assert.equal(pages.length, 1);
  assert.deepEqual(pages[0], [[0, 30]]);
});

test("keine Eintraege: eine leere erste Seite, keine Endlosschleife", () => {
  assert.deepEqual(paginate(0, () => 1, [10, 10], [10]), [[]]);
});

test("Eintrag hoeher als die Spalte oder Kapazitaet 0: er bekommt trotzdem eine Spalte, es gibt keine Endlosschleife", () => {
  assert.equal(covered(paginate(5, () => 50, [10, 10], [10])), 5);
  assert.equal(covered(paginate(5, () => 1, [0, 0], [0])), 5);
});
