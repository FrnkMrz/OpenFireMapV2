import test from "node:test";
import assert from "node:assert/strict";
import { pdfFileName, pdfPageFormat, buildPdf } from "./pdfout.js";

// 1x1-PNG (weiss)
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("Dateiname: Umlaute, Sonderzeichen und Leerzeichen werden zu Bindestrichen", () => {
  assert.equal(pdfFileName({ place: "Neunkirchen am Sand", scale: 5000, paper: "a3l", dpi: 150 }), "ortsplan-neunkirchen-am-sand-5000-a3l-150dpi.pdf");
  assert.equal(pdfFileName({ place: "Schnaittach / Ödenberg", scale: 10000, paper: "a2p", dpi: 200 }), "ortsplan-schnaittach-odenberg-10000-a2p-200dpi.pdf");
  assert.equal(pdfFileName({ place: "Großweiher", scale: 5000, paper: "a3l", dpi: 150 }), "ortsplan-grossweiher-5000-a3l-150dpi.pdf");
  assert.equal(pdfFileName({ place: "", scale: 5000, paper: "a3l", dpi: 150 }), "ortsplan-ortsplan-5000-a3l-150dpi.pdf");
  assert.equal(pdfFileName({ place: "!!!", scale: 5000, paper: "a3l", dpi: 150 }), "ortsplan-ortsplan-5000-a3l-150dpi.pdf");
});

test("Seitenformat: Ausrichtung folgt dem Papier, die Masse bleiben in mm", () => {
  assert.deepEqual(pdfPageFormat([420, 297]), { orientation: "landscape", format: [297, 420] });
  assert.deepEqual(pdfPageFormat([297, 420]), { orientation: "portrait", format: [297, 420] });
});

test("PDF: eine Seite je Bild in Papiergroesse, kein Bild geht verloren", async () => {
  const blob = await buildPdf({ pages: [PNG, PNG, PNG], paperMm: [420, 297], title: "Test" });
  assert.equal(blob.type, "application/pdf");
  const text = Buffer.from(await blob.arrayBuffer()).toString("latin1");
  assert.ok(text.startsWith("%PDF-"));
  assert.equal((text.match(/\/Type\s*\/Page\b/g) || []).length, 3, "drei Seiten");
  // A3 quer = 841,89 x 595,28 pt
  const box = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  assert.ok(box, "MediaBox vorhanden");
  assert.ok(Math.abs(+box[1] - 1190.55) < 0.5 && Math.abs(+box[2] - 841.89) < 0.5, `A3 quer, war ${box[1]} x ${box[2]}`);
});

test("PDF: Hochformat und Eigenschaften", async () => {
  const blob = await buildPdf({ pages: [PNG], paperMm: [297, 420], title: "Ortsplan Test" });
  const text = Buffer.from(await blob.arrayBuffer()).toString("latin1");
  const box = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  assert.ok(+box[2] > +box[1], "hoch");
  assert.ok(text.includes("Ortsplan Test"));
  assert.ok(text.includes("OpenStreetMap contributors"), "Quelle in den Dokumenteigenschaften");
});

test("PDF: ohne Seiten gibt es einen klaren Fehler", async () => {
  await assert.rejects(() => buildPdf({ pages: [], paperMm: [420, 297] }), /Kein Blatt/);
});
