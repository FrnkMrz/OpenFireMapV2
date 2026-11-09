// Zugang zu den Ortsplan-Seiten: nur am Computer (nicht auf dem Smartphone) und nur, solange die Notbremse nicht gezogen ist.
// Die Seiten laden MapLibre und den Rest erst nach dieser Prüfung (dynamischer Import in start-wizard.js / start-blatt.js).
import { Config } from "../config.js";

/**
 * Smartphone? Touch als Hauptzeiger und eine kurze Fensterseite unter maxShortSide. Tablets (ab maxShortSide) und Computer mit Touch-Bildschirm
 * (Hauptzeiger Maus) bleiben zugelassen. Rein, damit es sich ohne Browser prüfen lässt.
 */
export function isPhoneEnvironment({ coarse = false, width = 0, height = 0, maxShortSide = 600 } = {}) {
  const short = Math.min(width, height);
  return !!coarse && short > 0 && short < maxShortSide;
}

/** Grund, warum die Seite nicht starten darf: "disabled" (Notbremse), "phone" (Smartphone) oder null. */
export function evaluateGate(win = window, cfg = Config.ortsplan) {
  if (!cfg.enabled) return "disabled";
  const coarse = !!win.matchMedia?.("(pointer: coarse)").matches;
  if (isPhoneEnvironment({ coarse, width: win.innerWidth, height: win.innerHeight, maxShortSide: cfg.phoneMaxShortSide })) return "phone";
  return null;
}

const TEXTS = {
  de: {
    phone: ["Bitte am Computer öffnen", "Der Ortsplan lässt sich nur in einem Browser am Computer oder Tablet erstellen, nicht auf dem Smartphone."],
    disabled: ["Zurzeit nicht verfügbar", "Der Ortsplan ist vorübergehend abgeschaltet."],
    nobasemap: ["Basiskarte noch nicht verfügbar", "Die Hintergrundkarte für den Ortsplan ist noch nicht veröffentlicht. Bitte später noch einmal versuchen."],
    back: "Zur Karte",
    legal: "Impressum und Datenschutz",
  },
  en: {
    phone: ["Please open on a computer", "The town plan can only be created in a browser on a computer or tablet, not on a smartphone."],
    disabled: ["Currently unavailable", "The town plan is temporarily switched off."],
    nobasemap: ["Base map not available yet", "The background map for the town plan has not been published yet. Please try again later."],
    back: "Back to the map",
    legal: "Legal notice and privacy",
  },
};

/** Sprache der Hinweise: Deutsch, wenn der Browser Deutsch bevorzugt, sonst Englisch. */
export const noticeLang = (nav = navigator) => (String(nav.language || "").toLowerCase().startsWith("de") ? "de" : "en");

/** Zeigt statt des Assistenten einen ruhigen Hinweis (reason: "phone", "disabled", "nobasemap"). */
export function showNotice(reason, doc = document) {
  const t = TEXTS[noticeLang()];
  const [title, text] = t[reason] || t.disabled;
  doc.documentElement.lang = noticeLang();
  doc.title = `${title} – OpenFireMap`;
  const box = doc.getElementById("ortsplan-notice");
  if (!box) return;
  box.replaceChildren();
  const h = doc.createElement("h1"); h.textContent = title;
  const p = doc.createElement("p"); p.textContent = text;
  const a = doc.createElement("a"); a.href = "/"; a.textContent = `← ${t.back}`;
  const legal = doc.createElement("p"); const la = doc.createElement("a"); la.href = "/?legal=1"; la.textContent = t.legal; legal.append(la);
  box.append(h, p, a, legal);
  box.hidden = false;
  for (const el of doc.querySelectorAll("[data-ortsplan-app]")) el.hidden = true;
}
