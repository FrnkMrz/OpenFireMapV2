import test from "node:test";
import assert from "node:assert/strict";
import { waitReady } from "./testutil.mjs";

const timers = () => process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
const fakePage = (impl) => ({ waitForFunction: impl });

test("nach Erfolg bleibt kein Timer zurueck (sonst endet der Prozess nie)", async () => {
  const before = timers();
  await waitReady(fakePage(async () => true), { failure: () => null });
  assert.equal(timers(), before);
});

test("nach einem Timeout der Seite bleibt ebenfalls kein Timer zurueck", async () => {
  const before = timers();
  await assert.rejects(() => waitReady(fakePage(async () => { throw new Error("Timeout"); })), /Timeout/);
  assert.equal(timers(), before);
});

test("Skriptfehler der Seite bricht sofort ab und raeumt den Timer auf", async () => {
  const before = timers();
  let fail = null;
  const never = new Promise(() => {}); // Seite wird nie fertig
  const p = waitReady(fakePage(() => never), { failure: () => fail });
  setTimeout(() => { fail = "Cannot access 'fmt' before initialization"; }, 50);
  await assert.rejects(() => p, /Cannot access 'fmt'/);
  assert.equal(timers(), before);
});

test("uebergibt Schluessel und Zeitgrenze an die Seite", async () => {
  let seen;
  await waitReady(fakePage(async (fn, key, opts) => { seen = { key, opts }; return true; }), { key: "__pickReady", timeout: 5000 });
  assert.deepEqual(seen, { key: "__pickReady", opts: { timeout: 5000 } });
});
