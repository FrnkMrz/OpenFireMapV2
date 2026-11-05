// PDF-Ausgabe des Planblatts: jede zusammengesetzte Seite (PNG) kommt in Papiergroesse auf eine PDF-Seite.
// Die Pixel bleiben unveraendert (kein Neuberechnen, kein JPEG): das PDF druckt genau, was das PNG zeigt, im gewaehlten Papierformat.
// jsPDF wird erst beim Klick geladen, damit die Seite selbst nicht dafuer wartet.

/** Dateiname ohne Sonderzeichen: Ortsname, Massstab, Papier. */
export function pdfFileName({ place, scale, paper, dpi }) {
  const slug = String(place || "ortsplan").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "ortsplan";
  return `ortsplan-${slug}-${scale}-${paper}-${dpi}dpi.pdf`;
}

/** Seitenformat fuer jsPDF: Quer-/Hochformat aus den Massen, Einheit mm. */
export function pdfPageFormat([w, h]) {
  return { orientation: w >= h ? "landscape" : "portrait", format: [Math.min(w, h), Math.max(w, h)] };
}

/**
 * Baut das PDF. pages: PNG-Data-URLs (Blatt, danach Folgeseiten). paperMm: [Breite, Hoehe] des Papiers.
 * Rueckgabe: Blob (application/pdf).
 */
export async function buildPdf({ pages, paperMm, title, subject }) {
  if (!pages?.length) throw new Error("Kein Blatt zum Speichern: die Seite ist noch nicht fertig");
  const { jsPDF } = await import("jspdf");
  const [w, h] = paperMm;
  const { orientation, format } = pdfPageFormat(paperMm);
  const doc = new jsPDF({ orientation, unit: "mm", format, compress: true });
  doc.setProperties({
    title: title || "Ortsplan",
    subject: subject || "© OpenStreetMap contributors (ODbL; https://www.openstreetmap.org/copyright)",
    creator: "OpenFireMap.org",
  });
  pages.forEach((url, i) => {
    if (i > 0) doc.addPage(format, orientation);
    doc.addImage(url, "PNG", 0, 0, w, h, undefined, "FAST");
  });
  return doc.output("blob");
}
