// Feuerwehr-Ebene mit den Regeln der App (src/js/map.js, renderMarkers):
//  - Typ: Wache / Defibrillator / Hydranten-Typ bzw. emergency-Tag, Unterflur + Style wsh = wsh
//  - Wachen: Objekte innerhalb 150 m werden zusammengefasst (mehr Tags = Master, Mittelpunkt)
//  - Wasser/Hydranten innerhalb 5 m werden bei grossem Massstab zu einem Zaehler-Symbol (App: Zoom 17/18)
//  - Wachen-Schutzfilter: nur amenity=fire_station oder building=fire_station
import { iconIdForType, loadIcons } from "./icons.js";

const LAYERS = ["fire_stations", "hydrants", "water_points", "defibrillators"];

function pointOf(geom) {
  if (!geom) return null;
  const c = geom.coordinates;
  if (geom.type === "Point") return { lon: c[0], lat: c[1] };
  if (geom.type === "MultiPoint" || geom.type === "LineString") return { lon: c[0][0], lat: c[0][1] };
  if (geom.type === "Polygon") return { lon: c[0][0][0], lat: c[0][0][1] };
  if (geom.type === "MultiPolygon") return { lon: c[0][0][0][0], lat: c[0][0][0][1] };
  return null;
}

function distanceMeters(a, b) {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function appType(tags, isStation, isDefib) {
  let type = isStation ? "station" : isDefib ? "defibrillator" : tags["fire_hydrant:type"] || tags.emergency;
  if (type === "underground" && String(tags["fire_hydrant:style"] || "").toLowerCase() === "wsh") type = "wsh";
  return type;
}

/** Liest die geladenen Kacheln der Quelle "ofm" und baut die Elemente wie die App. */
export function collectElements(map) {
  const seen = new Set();
  const els = [];
  for (const layer of LAYERS) {
    for (const f of map.querySourceFeatures("ofm", { sourceLayer: layer })) {
      const p = f.properties || {};
      const pos = pointOf(f.geometry);
      if (!pos) continue;
      const key = `${layer}:${p["@type"] ?? ""}:${p["@id"] ?? f.id ?? `${pos.lat.toFixed(6)}_${pos.lon.toFixed(6)}`}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { "@type": _t, "@id": _i, ...tags } = p;
      if (layer === "fire_stations" && !(tags.amenity === "fire_station" || tags.building === "fire_station")) continue;
      els.push({ key, layer, lat: pos.lat, lon: pos.lon, tags });
    }
  }
  return els;
}

function clusterStations(stations, radius = 150) {
  if (stations.length < 2) return stations;
  const sorted = [...stations].sort((a, b) => Object.keys(b.tags).length - Object.keys(a.tags).length);
  const done = new Set();
  const out = [];
  for (const m of sorted) {
    if (done.has(m.key)) continue;
    let sumLat = m.lat, sumLon = m.lon, n = 1;
    for (const c of sorted) {
      if (c === m || done.has(c.key)) continue;
      if (distanceMeters(m, c) < radius) {
        done.add(c.key);
        sumLat += c.lat; sumLon += c.lon; n++;
      }
    }
    done.add(m.key);
    out.push({ ...m, lat: sumLat / n, lon: sumLon / n });
  }
  return out;
}

function clusterPois(pois, radius = 5) {
  if (pois.length < 2) return pois.map((p) => ({ ...p, count: 1 }));
  const sorted = [...pois].sort((a, b) => a.key.localeCompare(b.key));
  const done = new Set();
  const out = [];
  for (const m of sorted) {
    if (done.has(m.key)) continue;
    let sumLat = m.lat, sumLon = m.lon, n = 1;
    for (const c of sorted) {
      if (c === m || done.has(c.key)) continue;
      if (distanceMeters(m, c) < radius) {
        done.add(c.key);
        sumLat += c.lat; sumLon += c.lon; n++;
      }
    }
    done.add(m.key);
    out.push(n > 1 ? { ...m, lat: sumLat / n, lon: sumLon / n, count: n } : { ...m, count: 1 });
  }
  return out;
}

/** Erzeugt GeoJSON-Features mit icon, cls und sortKey. clusterPoi: wie App ab Zoom 17. */
export function buildFeatures(elements, { clusterPoi }) {
  const stations = clusterStations(elements.filter((e) => e.layer === "fire_stations"));
  const drawn = [];
  const stationEls = stations.filter((s) => {
    const dup = drawn.some((d) => Math.abs(d.lat - s.lat) < 0.0001 && Math.abs(d.lon - s.lon) < 0.0001);
    if (!dup) drawn.push(s);
    return !dup;
  });
  const defibs = elements.filter((e) => e.layer === "defibrillators");
  const poisRaw = elements.filter((e) => e.layer === "hydrants" || e.layer === "water_points");
  const pois = clusterPoi ? clusterPois(poisRaw) : poisRaw.map((p) => ({ ...p, count: 1 }));

  const feats = [];
  const add = (e, icon, cls, sortKey) =>
    feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [e.lon, e.lat] }, properties: { icon, cls, sortKey } });
  for (const p of pois) {
    const type = appType(p.tags, false, false);
    add(p, p.count > 1 ? `badge-${p.count}` : iconIdForType(type), "poi", 0);
  }
  for (const s of stationEls) add(s, "station", "station", 1000);
  for (const d of defibs) add(d, "defibrillator", "poi", 2000);
  return feats;
}

export async function addFireLayers(map, features, sizes, { beforeId, ignorePlacement }) {
  const ids = [...new Set(features.map((f) => f.properties.icon))];
  const images = await loadIcons(ids);
  for (const [id, data] of images) if (!map.hasImage(id)) map.addImage(id, data, { pixelRatio: 1 });
  map.addSource("fire", { type: "geojson", data: { type: "FeatureCollection", features } });
  map.addLayer({
    id: "fire-icons", type: "symbol", source: "fire",
    layout: {
      "icon-image": ["get", "icon"],
      "icon-size": ["match", ["get", "cls"], "station", sizes.station, sizes.poi],
      "icon-allow-overlap": true,
      "icon-ignore-placement": ignorePlacement,
      "symbol-sort-key": ["get", "sortKey"],
    },
  }, beforeId);
  return { stations: features.filter((f) => f.properties.cls === "station").length, total: features.length };
}
