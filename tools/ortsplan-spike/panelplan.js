// Anordnung von Legende, Massstab und Verzeichnis im waagerechten Bereich (oben/unten) -- rein, ohne DOM, mit `node --test` pruefbar.
// Aufgabe: Die Bloecke muessen zusammen in die Breite des Bereichs passen. Sonst (zum Beispiel A4 hoch mit zweispaltiger Legende)
// wuerde das Verzeichnis ausserhalb des Blatts landen.

/**
 * @param {object} o
 * @param {number} o.panelW      Breite des Bereichs (virtuelle mm)
 * @param {number} o.legendCols  benoetigte Spalten der Legende
 * @param {number} o.legColW     Breite einer Legendenspalte
 * @param {number} o.scaleW      Breite des Massstab-Blocks
 * @param {number} o.minIndexW   kleinste sinnvolle Breite des Verzeichnisses neben den anderen Bloecken
 * @param {number} o.gap         Abstand zwischen den Bloecken
 * @param {boolean} o.showIndex
 * @returns {{mode:"row"|"stacked", legendCols:number, legendW:number, indexW:number, indexOnContinuation:boolean}}
 */
export function planHorizontal({ panelW, legendCols, legColW, scaleW, minIndexW, gap, showIndex }) {
  const cols = Math.max(1, legendCols);
  const legendW = cols * legColW;
  const needRow = legendW + gap + scaleW + gap + (showIndex ? minIndexW : 0);
  if (needRow <= panelW) {
    const indexW = showIndex ? panelW - legendW - gap - scaleW - gap : 0;
    return { mode: "row", legendCols: cols, legendW, indexW, indexOnContinuation: false };
  }
  // Passt nicht nebeneinander: Legende und Massstab untereinander (Legende so breit wie moeglich, mindestens eine Spalte),
  // das Verzeichnis steht dann auf den Folgeseiten.
  const fitCols = Math.max(1, Math.min(cols, Math.floor(panelW / legColW)));
  return { mode: "stacked", legendCols: fitCols, legendW: fitCols * legColW, indexW: 0, indexOnContinuation: showIndex };
}
