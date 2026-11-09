// Einstieg des Assistenten (/ortsplan/): erst prüfen (Computer, Notbremse, Basiskarte), dann MapLibre und den Assistenten nachladen.
import { evaluateGate, showNotice } from "./gate.js";
import { getSources } from "./sources.js";

const gate = evaluateGate();
if (gate) showNotice(gate);
else if (!(await getSources()).basemapUrl) showNotice("nobasemap");
else await import("./wizard.js");
