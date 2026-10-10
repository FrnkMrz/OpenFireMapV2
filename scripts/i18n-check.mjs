import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const langDir = path.join(root, "src", "js", "lang");

// Welche Sprache ist “Master”?
const MASTER = "de";
const FALLBACK = "en";

// Mit --copies werden die möglicherweise unübersetzten Schlüssel einzeln aufgelistet
const SHOW_COPIES = process.argv.includes("--copies");

function loadLang(file) {
  // wir lesen als Text und parsen simpel, weil deine Dateien JS-Module sind
  // Erwartung: export default { ... } oder export const strings = { ... }
  const src = fs.readFileSync(file, "utf8");

  // 1) Versuch: export default {...}
  const mDefault = src.match(/export\s+default\s+(\{[\s\S]*\});?\s*$/m);
  if (mDefault) {
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${mDefault[1]});`)();
  }

  // 2) Versuch: export const strings = {...}
  const mStrings = src.match(/export\s+const\s+strings\s*=\s*(\{[\s\S]*?\});/m);
  if (mStrings) {
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${mStrings[1]});`)();
  }

  throw new Error(`Unrecognized export format in ${file}`);
}

function flatten(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

const files = fs.readdirSync(langDir).filter(f => f.endsWith(".js"));
if (!files.includes(`${MASTER}.js`)) throw new Error(`Missing master language: ${MASTER}.js`);
if (!files.includes(`${FALLBACK}.js`)) throw new Error(`Missing fallback language: ${FALLBACK}.js`);

const masterObj = loadLang(path.join(langDir, `${MASTER}.js`));
const fallbackObj = loadLang(path.join(langDir, `${FALLBACK}.js`));

const masterKeys = flatten(masterObj);
const fallbackKeys = flatten(fallbackObj);

const missingInFallback = [...masterKeys].filter(k => !fallbackKeys.has(k));
if (missingInFallback.length) {
  console.log(`\n❌ Fallback '${FALLBACK}' is missing ${missingInFallback.length} keys compared to '${MASTER}':`);
  for (const k of missingInFallback) console.log(`  - ${k}`);
  process.exitCode = 2;
} else {
  console.log(`✅ Fallback '${FALLBACK}' covers all keys from '${MASTER}'.`);
}

// Check all other languages
for (const f of files.sort()) {
  const lang = f.replace(".js", "");
  if (lang === MASTER || lang === FALLBACK) continue;

  const obj = loadLang(path.join(langDir, f));
  const keys = flatten(obj);

  const missing = [...masterKeys].filter(k => !keys.has(k));
  const extra = [...keys].filter(k => !masterKeys.has(k));

  console.log(`\nLanguage: ${lang}`);
  console.log(`  Missing: ${missing.length}`);
  if (missing.length) {
    for (const k of missing.slice(0, 30)) console.log(`    - ${k}`);
    if (missing.length > 30) console.log(`    ... +${missing.length - 30} more`);
  }

  if (extra.length) {
    console.log(`  Extra (not in ${MASTER}): ${extra.length}`);
    for (const k of extra.slice(0, 15)) console.log(`    + ${k}`);
    if (extra.length > 15) console.log(`    ... +${extra.length - 15} more`);
  } else {
    console.log(`  Extra: 0`);
  }

  // Hinweis (kein Fehler): Werte, die exakt dem englischen Text entsprechen, sind oft nur kopierte,
  // unübersetzte Strings. Treffer können legitim sein (z. B. "Source" im Französischen, Markennamen).
  const copies = Object.keys(fallbackObj).filter(k =>
    typeof fallbackObj[k] === "string" &&
    obj[k] === fallbackObj[k] &&
    /[A-Za-z]{4,}/.test(fallbackObj[k])
  );
  if (copies.length) {
    console.log(`  Identical to '${FALLBACK}' (possibly untranslated): ${copies.length}`);
    if (SHOW_COPIES) for (const k of copies) console.log(`    ~ ${k}`);
  }
}

console.log(`\nDone.`);
