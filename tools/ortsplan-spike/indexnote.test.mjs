import test from "node:test";
import assert from "node:assert/strict";
import { indexNote } from "./indexnote.js";

test("ausgeschaltet: sagt, wie man es einschaltet", () => {
  assert.match(indexNote({ indexOn: false, indexPage: null, indexCount: 0, pages: 1 }), /ausgeschaltet/);
});

test("auf dem Blatt: nennt Anzahl und Ort, bei Folgeseiten den Rest", () => {
  assert.match(indexNote({ indexOn: true, indexPage: 1, indexCount: 36, pages: 1 }), /36 Straßen, auf dem Blatt/);
  const n = indexNote({ indexOn: true, indexPage: 1, indexCount: 42, pages: 2 });
  assert.match(n, /Seite 2 von 2/);
});

test("nur auf der Folgeseite (Fund des Nutzers: 'sehe kein Verzeichnis'): sagt, wo es steht und wie man es aufs Blatt bekommt", () => {
  const n = indexNote({ indexOn: true, indexPage: 2, indexCount: 19, pages: 2 });
  assert.match(n, /19 Straßen, auf Seite 2 von 2/);
  assert.match(n, /rechts oder links/);
});

test("keine benannten Strassen", () => {
  assert.match(indexNote({ indexOn: true, indexPage: null, indexCount: 0, pages: 1 }), /keine benannten Straßen/);
});
