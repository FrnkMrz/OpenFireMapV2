import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Quellen der Ortsplan-Seiten im Betrieb: Zeigerdatei der Basiskarte, versionierte Feuerwehr-Datei
const JSON_BY_PATH = {
  "/basemap/de.json": { file: "basemap/de-20261101.pmtiles", built_at: "2026-11-01T00:00:00Z", osm_data_until: "2026-10-30T00:00:00Z" },
  "/metadata.json": { generated_at: "2026-11-08T03:00:00Z", osm_data_until: "2026-11-07T20:00:00Z" },
};

function stubFetch(map) {
  vi.stubGlobal("fetch", vi.fn(async (url) => {
    const body = map[new URL(url).pathname];
    return body ? { ok: true, json: async () => body } : { ok: false, json: async () => null };
  }));
}

describe("getSources (Betrieb)", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("hängt die Build-Zeit als ?v= an die Feuerwehr-Datei", async () => {
    stubFetch(JSON_BY_PATH);
    const { getSources } = await import("../../src/js/ortsplan/sources.js");
    const s = await getSources(new URLSearchParams(""));
    expect(s.fireUrl).toMatch(/\.pmtiles\?v=2026-11-08T03%3A00%3A00Z$/);
    expect(s.basemapUrl).toMatch(/\/basemap\/de-20261101\.pmtiles$/);
    expect(s.basemapMeta.osm_data_until).toBe("2026-10-30T00:00:00Z");
  });

  it("ohne metadata.json bleibt die Adresse unversioniert", async () => {
    stubFetch({ "/basemap/de.json": JSON_BY_PATH["/basemap/de.json"] });
    const { getSources } = await import("../../src/js/ortsplan/sources.js");
    const s = await getSources(new URLSearchParams(""));
    expect(s.fireUrl).not.toContain("?v=");
    expect(s.fireMeta).toBeNull();
  });

  it("ohne Zeigerdatei gibt es keine Basiskarte; unsichere Dateinamen werden abgelehnt", async () => {
    stubFetch({});
    let { getSources } = await import("../../src/js/ortsplan/sources.js");
    expect((await getSources(new URLSearchParams(""))).basemapUrl).toBeNull();
    vi.resetModules();
    stubFetch({ "/basemap/de.json": { file: "../geheim.pmtiles" } });
    ({ getSources } = await import("../../src/js/ortsplan/sources.js"));
    expect((await getSources(new URLSearchParams(""))).basemapUrl).toBeNull();
  });
});
