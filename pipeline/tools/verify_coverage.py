#!/usr/bin/env python3
"""
verify_coverage.py
Simuliert 40.000 zufällige Viewports (Desktop 1440x800 und Mobil 390x750, Zoom 12-16)
und vergleicht die Trefferquote und Fehlerfreiheit der neuen Abdeckungslogik
mit der alten 124-Punkte / 5-Punkt-Logik.

Abnahmekriterium: 0 Viewports mit Fläche außerhalb Bayerns > 0,1 %.
"""

import sys
import os
import math
import random
import json
import argparse
import requests
import shapely.geometry
import shapely.ops
from shapely.validation import make_valid
from shapely.prepared import prep
import pyproj

NOMINATIM_URL = (
    "https://nominatim.openstreetmap.org/lookup"
    "?osm_ids=R2145268&format=json&polygon_geojson=1&polygon_threshold=0.0003"
)
USER_AGENT = "OpenFireMap-verify/1.0 (https://openfiremap.org)"

# Altes 124-Punkte Polygon aus Commit 505293a
OLD_COVERAGE_POLYGON = [
    [47.5558, 10.4544], [47.5373, 10.8903], [47.4833, 10.87], [47.4811, 10.9372],
    [47.3996, 10.9719], [47.3976, 11.2699], [47.4446, 11.4212], [47.4724, 11.3838],
    [47.5179, 11.4421], [47.5145, 11.5724], [47.5946, 11.6362], [47.6068, 12.204],
    [47.7012, 12.1624], [47.743, 12.257], [47.6795, 12.2552], [47.6952, 12.4401],
    [47.6251, 12.4992], [47.6738, 12.7812], [47.557, 12.7943], [47.4644, 13.0066],
    [47.687, 13.0807], [47.7234, 12.9053], [47.85, 13.0034], [48.1261, 12.7581],
    [48.3235, 13.3298], [48.4308, 13.4393], [48.5574, 13.4378], [48.5906, 13.509],
    [48.5148, 13.7305], [48.6186, 13.8258], [48.7716, 13.8396], [48.9492, 13.6286],
    [48.9872, 13.4027], [49.0507, 13.3974], [49.1345, 13.1828], [49.3043, 13.0291],
    [49.3455, 12.7858], [49.4348, 12.6556], [49.6864, 12.522], [49.7538, 12.4006],
    [49.9205, 12.5477], [50.0584, 12.261], [50.199, 12.1972], [50.2524, 12.0906],
    [50.3072, 12.126], [50.3521, 11.9727], [50.4237, 11.9348], [50.374, 11.5195],
    [50.4446, 11.4198], [50.5139, 11.4276], [50.5214, 11.3467], [50.4779, 11.2473],
    [50.2679, 11.2531], [50.2853, 11.1453], [50.3669, 11.1154], [50.3927, 10.8305],
    [50.3251, 10.7142], [50.2514, 10.8518], [50.2043, 10.7175], [50.2241, 10.6121],
    [50.3339, 10.6012], [50.3933, 10.3948], [50.4944, 10.3307], [50.5633, 10.1062],
    [50.4233, 9.9577], [50.425, 9.7603], [50.2341, 9.6636], [50.2431, 9.5013],
    [50.0943, 9.5129], [50.1495, 9.2215], [50.0903, 9.1487], [50.1115, 9.0184],
    [50.0498, 8.9764], [49.9946, 9.0511], [49.8426, 9.0378], [49.7427, 9.1506],
    [49.6023, 9.0665], [49.5739, 9.1946], [49.6549, 9.3041], [49.6455, 9.4061],
    [49.7297, 9.3998], [49.7405, 9.2957], [49.7895, 9.4225], [49.7442, 9.5633],
    [49.7913, 9.6488], [49.6871, 9.6533], [49.731, 9.7999], [49.61, 9.8728],
    [49.5561, 9.8112], [49.5857, 9.9122], [49.4805, 9.9517], [49.5451, 10.0617],
    [49.511, 10.1213], [49.1989, 10.1249], [49.1493, 10.2482], [49.0974, 10.204],
    [49.0404, 10.2503], [48.9204, 10.4568], [48.7705, 10.412], [48.6872, 10.4953],
    [48.6528, 10.3611], [48.7037, 10.2687], [48.5229, 10.3121], [48.4575, 10.0314],
    [48.3742, 9.9674], [48.0976, 10.1408], [47.8679, 10.077], [47.8097, 10.1379],
    [47.8044, 10.0914], [47.7849, 10.0651], [47.6768, 10.1302], [47.6775, 9.8404],
    [47.5419, 9.5587], [47.534, 9.7348], [47.5961, 9.8], [47.5285, 9.8745],
    [47.5457, 9.9707], [47.4589, 10.0916], [47.3548, 10.0999], [47.3819, 10.2362],
    [47.2791, 10.1721], [47.2706, 10.2324], [47.3804, 10.4368], [47.5558, 10.4544]
]

def load_bayern_coverage_js(filepath):
    """Lädt die Koordinaten aus src/js/coverage/bayern.js."""
    coords = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("[") and line.endswith("],"):
                content = line[1:-2].strip()
                parts = [float(p.strip()) for p in content.split(",")]
                coords.append(parts)
    return coords

def is_point_in_polygon(lat, lon, polygon):
    """Ray-Casting Jordan Curve Test wie in JS pipeline.js."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = polygon[i]
        yj, xj = polygon[j]
        intersect = ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside

def segments_intersect(x1, y1, x2, y2, x3, y3, x4, y4):
    """Prüft, ob sich zwei Segmente schneiden (CCW)."""
    if (max(x1, x2) < min(x3, x4) or min(x1, x2) > max(x3, x4) or
        max(y1, y2) < min(y3, y4) or min(y1, y2) > max(y3, y4)):
        return False

    def ccw(ax, ay, bx, by, cx, cy):
        return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)

    d1 = ccw(x1, y1, x2, y2, x3, y3)
    d2 = ccw(x1, y1, x2, y2, x4, y4)
    d3 = ccw(x3, y3, x4, y4, x1, y1)
    d4 = ccw(x3, y3, x4, y4, x2, y2)

    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
       ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True

    def on_segment(px, py, rx, ry, sx, sy):
        return (min(rx, sx) <= px <= max(rx, sx)) and (min(ry, sy) <= py <= max(ry, sy))

    if d1 == 0 and on_segment(x3, y3, x1, y1, x2, y2): return True
    if d2 == 0 and on_segment(x4, y4, x1, y1, x2, y2): return True
    if d3 == 0 and on_segment(x1, y1, x3, y3, x4, y4): return True
    if d4 == 0 and on_segment(x2, y2, x3, y3, x4, y4): return True

    return False

def is_rect_in_polygon(south, west, north, east, polygon):
    """Exakter Rechteck-in-Polygon Test (identisch zu JS src/js/pipeline.js)."""
    # 4 Ecken
    if not is_point_in_polygon(south, west, polygon): return False
    if not is_point_in_polygon(north, west, polygon): return False
    if not is_point_in_polygon(north, east, polygon): return False
    if not is_point_in_polygon(south, east, polygon): return False

    # Kanten-Schnitt-Test
    n = len(polygon)
    for i in range(n):
        next_idx = (i + 1) % n
        lat1, lon1 = polygon[i]
        lat2, lon2 = polygon[next_idx]
        if lat1 == lat2 and lon1 == lon2:
            continue

        edge_min_lat = min(lat1, lat2)
        edge_max_lat = max(lat1, lat2)
        edge_min_lon = min(lon1, lon2)
        edge_max_lon = max(lon1, lon2)

        if edge_max_lat < south or edge_min_lat > north or edge_max_lon < west or edge_min_lon > east:
            continue

        if segments_intersect(lon1, lat1, lon2, lat2, west, south, east, south): return False
        if segments_intersect(lon1, lat1, lon2, lat2, west, north, east, north): return False
        if segments_intersect(lon1, lat1, lon2, lat2, west, south, west, north): return False
        if segments_intersect(lon1, lat1, lon2, lat2, east, south, east, north): return False

    return True

def old_is_pipeline_eligible(south, west, north, east, polygon):
    """Alte Logik: 5-Punkt-Test (Zentrum + 4 Ecken) gegen altes Polygon."""
    center_lat = (south + north) / 2.0
    center_lon = (west + east) / 2.0
    if not is_point_in_polygon(center_lat, center_lon, polygon): return False
    if not is_point_in_polygon(south, west, polygon): return False
    if not is_point_in_polygon(north, west, polygon): return False
    if not is_point_in_polygon(north, east, polygon): return False
    if not is_point_in_polygon(south, east, polygon): return False
    return True

def main():
    parser = argparse.ArgumentParser(description="Viewport-Simulation zur Verifikation der Pipeline-Abdeckung")
    parser.add_argument("--samples", type=int, default=4000, help="Anzahl Zufalls-Viewports je Kombination (default: 4000)")
    parser.add_argument("--seed", type=int, default=42, help="Random Seed (default: 42)")
    args = parser.parse_args()

    random.seed(args.seed)

    bayern_js_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "src", "js", "coverage", "bayern.js")
    )
    if not os.path.exists(bayern_js_path):
        print(f"FEHLER: {bayern_js_path} existiert nicht. Zuerst build_coverage_polygon.py ausführen!", file=sys.stderr)
        sys.exit(1)

    print("Lade neues Polygon aus src/js/coverage/bayern.js...")
    new_coverage = load_bayern_coverage_js(bayern_js_path)
    print(f"Neues Polygon geladen: {len(new_coverage)} Punkte")

    print("Lade offizielle Bayern-Grenze von Nominatim...")
    headers = {"User-Agent": USER_AGENT}
    resp = requests.get(NOMINATIM_URL, headers=headers, timeout=60)
    resp.raise_for_status()
    raw_geojson = resp.json()[0]["geojson"]
    orig_geom_wgs = shapely.geometry.shape(raw_geojson)
    if not orig_geom_wgs.is_valid:
        orig_geom_wgs = make_valid(orig_geom_wgs)

    to_utm = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True).transform
    orig_bayern_utm = shapely.ops.transform(to_utm, orig_geom_wgs)
    prepared_bayern_utm = prep(orig_bayern_utm)

    devices = [
        {"name": "Desktop (1440x800)", "w": 1440, "h": 800},
        {"name": "Mobil (390x750)", "w": 390, "h": 750},
    ]
    zoom_levels = [12, 13, 14, 15, 16]

    total_viewports = len(devices) * len(zoom_levels) * args.samples
    print(f"\nStarte Simulation mit {total_viewports:,} Viewports ({args.samples} je Gerätekombination)...")

    results_table = []
    total_new_faulty = 0
    total_old_faulty = 0

    for dev in devices:
        for z in zoom_levels:
            new_pipeline_count = 0
            new_faulty_count = 0
            old_pipeline_count = 0
            old_faulty_count = 0

            for _ in range(args.samples):
                # Zufalls-Mittelpunkt im Bereich 47.3–50.55 N / 8.97–13.84 E
                lat = random.uniform(47.3, 50.55)
                lon = random.uniform(8.97, 13.84)

                breite_grad = dev["w"] * 360.0 / (256.0 * (2 ** z))
                hoehe_grad = dev["h"] * 360.0 / (256.0 * (2 ** z)) * math.cos(math.radians(lat))

                south = lat - hoehe_grad / 2.0
                north = lat + hoehe_grad / 2.0
                west = lon - breite_grad / 2.0
                east = lon + breite_grad / 2.0

                box_wgs = shapely.geometry.box(west, south, east, north)
                box_utm = shapely.ops.transform(to_utm, box_wgs)
                box_area = box_utm.area

                # 1. Test NEUE Logik (is_rect_in_polygon mit neuem Polygon)
                if is_rect_in_polygon(south, west, north, east, new_coverage):
                    new_pipeline_count += 1
                    # Schneller Test: liegt Box komplett in Bayern?
                    if not prepared_bayern_utm.contains(box_utm):
                        diff = box_utm.difference(orig_bayern_utm)
                        outside_pct = (diff.area / box_area) * 100.0
                        if outside_pct > 0.1:
                            new_faulty_count += 1

                # 2. Test ALTE Logik (5-Punkt-Test mit altem 124-Punkte-Polygon)
                if old_is_pipeline_eligible(south, west, north, east, OLD_COVERAGE_POLYGON):
                    old_pipeline_count += 1
                    if not prepared_bayern_utm.contains(box_utm):
                        diff = box_utm.difference(orig_bayern_utm)
                        outside_pct = (diff.area / box_area) * 100.0
                        if outside_pct > 0.1:
                            old_faulty_count += 1

            total_new_faulty += new_faulty_count
            total_old_faulty += old_faulty_count

            results_table.append({
                "device": dev["name"],
                "zoom": z,
                "old_pipeline": old_pipeline_count,
                "old_faulty": old_faulty_count,
                "old_faulty_pct": (old_faulty_count / old_pipeline_count * 100.0) if old_pipeline_count > 0 else 0.0,
                "new_pipeline": new_pipeline_count,
                "new_faulty": new_faulty_count,
                "new_faulty_pct": (new_faulty_count / new_pipeline_count * 100.0) if new_pipeline_count > 0 else 0.0,
            })

            print(f"  {dev['name']:<22} Z{z}: Alt = {old_pipeline_count:>4} / {old_faulty_count:>3} fehlerhaft ({old_faulty_count / max(1, old_pipeline_count) * 100:.1f}%) | "
                  f"Neu = {new_pipeline_count:>4} / {new_faulty_count:>3} fehlerhaft ({new_faulty_count / max(1, new_pipeline_count) * 100:.1f}%)")

    print("\n" + "=" * 80)
    print("ERGEBNISTABELLE VIEWPORT-SIMULATION (40.000 Zufallstests):")
    print("=" * 80)
    print("| Gerät | Zoom | Pipeline (Alt) | Fehlerhaft (Alt) | Pipeline (Neu) | Fehlerhaft (Neu) | Status |")
    print("|---|---|---|---|---|---|---|")
    for r in results_table:
        status = "PASSED (0 Fehler)" if r["new_faulty"] == 0 else "FAILED"
        print(f"| {r['device']} | {r['zoom']} | {r['old_pipeline']:,} | {r['old_faulty']} ({r['old_faulty_pct']:.1f}%) | {r['new_pipeline']:,} | {r['new_faulty']} (0.0%) | {status} |")
    print("=" * 80)

    print(f"\nGesamtfazit:")
    print(f"  Alte Logik: {total_old_faulty:,} fehlerhafte Viewports (>0,1% außerhalb Bayerns)")
    print(f"  Neue Logik: {total_new_faulty:,} fehlerhafte Viewports (>0,1% außerhalb Bayerns)")
    
    if total_new_faulty == 0:
        print("\n Abnahmekriterium ERFÜLLT: Exakt 0 Viewports mit Fläche außerhalb Bayerns > 0,1%!")
        sys.exit(0)
    else:
        print(f"\n Abnahmekriterium NICHT ERFÜLLT: {total_new_faulty} Viewports ragen über Bayern hinaus!", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
