import { defineConfig } from "vite";

// Eigenstaendiger Spike: Daten (PMTiles) liegen in ./data und werden unter / ausgeliefert.
export default defineConfig({
  publicDir: "data",
  server: { allowedHosts: true },
});
