// Einstieg der Blattseite (/ortsplan/blatt/): wie start-wizard.js.
import { evaluateGate, showNotice } from "./gate.js";
import { getSources } from "./sources.js";

const gate = evaluateGate();
if (gate) showNotice(gate);
else if (!(await getSources()).basemapUrl) showNotice("nobasemap");
else await import("./blatt.js");
