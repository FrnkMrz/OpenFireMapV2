// Gemeinsame Hilfe fuer die Playwright-Skripte (shot.mjs, smoke.mjs): auf "Seite fertig" warten, aber bei einem Skriptfehler
// der Seite sofort abbrechen. Der Pruef-Timer wird IMMER wieder abgeschaltet, sonst haelt er den Node-Prozess offen
// (Fund aus dem Codex-Review: smoke.mjs und shot.mjs ohne sheet=1 beendeten sich nach Erfolg nicht).
export async function waitReady(page, { key = "__ready", timeout = 120000, failure = () => null } = {}) {
  let timer;
  const failFast = new Promise((_, reject) => {
    timer = setInterval(() => {
      const f = failure();
      if (f) reject(new Error(`Seite meldet Fehler: ${f}`));
    }, 200);
  });
  try {
    await Promise.race([page.waitForFunction((k) => window[k] === true, key, { timeout }), failFast]);
  } finally {
    clearInterval(timer);
  }
}
