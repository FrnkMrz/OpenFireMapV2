import test from "node:test";
import assert from "node:assert/strict";
import { paginate } from "./paginate.js";

const count = (pages) => pages.flat().reduce((s, [a, b]) => s + (b - a), 0);
const contiguous = (pages) => {
  let next = 0;
  for (const [a, b] of pages.flat()) { assert.equal(a, next); next = b; }
  return next;
};

test("400 Eintraege: alle werden verteilt, auch ueber mehrere Folgeseiten (Fund aus dem Codex-Review)", () => {
  const pages = paginate(400, [40, 40], [60, 60, 60, 60]);
  assert.equal(count(pages), 400);
  assert.equal(contiguous(pages), 400);
  assert.equal(pages.length, 3); // 80 + 240 + 80 = 400: drei Seiten, die alten 270 Eintraege waeren hier verloren gegangen
  const more = paginate(1000, [40, 40], [60, 60, 60, 60]);
  assert.equal(count(more), 1000);
  assert.ok(more.length > 3);
});

test("passt alles auf die erste Seite, gibt es nur eine", () => {
  const pages = paginate(30, [40, 40], [60]);
  assert.equal(pages.length, 1);
  assert.deepEqual(pages[0], [[0, 30]]);
});

test("keine Eintraege: eine leere erste Seite, keine Endlosschleife", () => {
  assert.deepEqual(paginate(0, [10, 10], [10]), [[]]);
});

test("Kapazitaet 0 wird auf 1 angehoben, sonst gaebe es eine Endlosschleife", () => {
  const pages = paginate(5, [0, 0], [0]);
  assert.equal(count(pages), 5);
});
