// Aufruf: node --test grid.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { clipSegment, cellsOfSegment } from "./grid.js";

const keys = (cells) => cells.map(([c, r]) => `${c},${r}`).sort();

test("Strecke ueber den Rahmen hinaus: alle durchquerten Zellen (Fund aus dem Codex-Review)", () => {
  // Rahmen 100 mm breit, 25-mm-Zellen, waagerecht von x=-10 bis x=110
  assert.deepEqual(keys(cellsOfSegment(-10, 10, 110, 10, 25, 100, 100)), ["0,0", "1,0", "2,0", "3,0"]);
});

test("Strecke, deren Anfang, Mitte und Ende ausserhalb liegen, aber den Rahmen kreuzt", () => {
  assert.deepEqual(keys(cellsOfSegment(-200, 30, 300, 30, 25, 100, 100)), ["0,1", "1,1", "2,1", "3,1"]);
});

test("Strecke komplett ausserhalb ergibt keine Zelle", () => {
  assert.deepEqual(cellsOfSegment(-50, -50, -10, 200, 25, 100, 100), []);
  assert.deepEqual(cellsOfSegment(120, 0, 120, 100, 25, 100, 100), []);
});

test("Strecke innerhalb einer Zelle", () => {
  assert.deepEqual(keys(cellsOfSegment(2, 2, 20, 20, 25, 100, 100)), ["0,0"]);
});

test("Senkrechte Strecke und Rand genau am Rahmenende", () => {
  assert.deepEqual(keys(cellsOfSegment(60, -5, 60, 100, 25, 100, 100)), ["2,0", "2,1", "2,2", "2,3"]);
  assert.deepEqual(keys(cellsOfSegment(100, 10, 100, 40, 25, 100, 100)), ["3,0", "3,1"]);
});

test("Schraege Strecke durch den ganzen Rahmen beruehrt jede Zelle der Diagonale", () => {
  const cells = keys(cellsOfSegment(0, 0, 100, 100, 25, 100, 100));
  for (let i = 0; i < 4; i++) assert.ok(cells.includes(`${i},${i}`), `Diagonale ${i},${i}`);
});

test("Rahmen, dessen Breite kein Vielfaches der Zelle ist (letzte Zelle angeschnitten)", () => {
  assert.deepEqual(keys(cellsOfSegment(0, 5, 90, 5, 25, 90, 60)), ["0,0", "1,0", "2,0", "3,0"]);
});

test("clipSegment liefert null fuer parallele Strecken ausserhalb", () => {
  assert.equal(clipSegment(-5, -5, 50, -5, 100, 100), null);
});
