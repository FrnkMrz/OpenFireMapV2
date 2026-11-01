// Eine Textzeile in eine vorgegebene Breite bringen (rein, ohne DOM, mit `node --test` pruefbar):
// erst verkleinern (bis minSize), dann mit "…" kuerzen. measure(text, size) liefert die Breite.
export function fitText({ text, size, minSize, maxW, measure }) {
  let t = String(text ?? "").trim();
  if (!t) return { text: "", size };
  const floor = Math.min(size, minSize);
  const step = size * 0.04;
  let s = size;
  while (s > floor && measure(t, s) > maxW) s = Math.max(floor, s - step);
  while (t.length > 1 && measure(t, s) > maxW) t = `${t.slice(0, -2).trimEnd()}…`;
  return { text: t, size: s };
}
