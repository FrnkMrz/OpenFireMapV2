// Alias für Browser-Locale "de-DE" -> nutzt die normale "de"-Übersetzung
export { strings } from "./de.js";
export default (await import("./de.js")).default;
