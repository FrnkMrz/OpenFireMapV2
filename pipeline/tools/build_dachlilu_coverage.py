#!/usr/bin/env python3
"""
build_dachlilu_coverage.py
Erzeugt das präzise Abdeckungspolygon für die DACHLiLu-Region
(Deutschland, Österreich, Schweiz, Luxemburg, Liechtenstein) aus OpenStreetMap-Daten.

Schritte:
1. Lädt die Landesgrenzen der 5 Staaten über Nominatim:
   - Deutschland:    R51477
   - Österreich:     R16239
   - Schweiz:        R51701
   - Luxemburg:      R2171347
   - Liechtenstein:  R1155955
2. Führt die Grenzgeometrien per unary_union zu einem gemeinsamen Verbund zusammen.
   (Binnengrenzen zwischen den 5 Ländern verschwinden automatisch).
3. Projiziert nach EPSG:25832 (UTM Zone 32N, metrisch).
4. Puffert 500 m nach innen (-500 m).
5. Vereinfacht mit 250 m Toleranz.
6. Projiziert zurück nach EPSG:4326 (WGS84).
7. Rundet Koordinaten auf 4 Nachkommastellen ([lat, lon]).
8. Validiert, dass das erzeugte Polygon zu 100% innerhalb der 5 Staaten liegt.
9. Schreibt das Ergebnis als ES-Modul nach src/js/coverage/dachlilu.js.
"""

import sys
import os
import datetime
import json
import argparse
import urllib.request

try:
    import shapely.geometry
    import shapely.ops
    from shapely.validation import make_valid
    import pyproj
    HAS_GEO_DEPS = True
except ImportError:
    HAS_GEO_DEPS = False

COUNTRY_RELATIONS = [
    {"iso": "DE", "name": "Deutschland", "rel": "R51477"},
    {"iso": "AT", "name": "Österreich", "rel": "R16239"},
    {"iso": "CH", "name": "Schweiz", "rel": "R51701"},
    {"iso": "LU", "name": "Luxemburg", "rel": "R2171347"},
    {"iso": "LI", "name": "Liechtenstein", "rel": "R1155955"},
]

USER_AGENT = "OpenFireMap-DACHLiLu-coverage/1.0 (https://openfiremap.org)"


def fetch_country_geometry(rel_id, name):
    url = (
        f"https://nominatim.openstreetmap.org/lookup"
        f"?osm_ids={rel_id}&format=json&polygon_geojson=1&polygon_threshold=0.005"
    )
    print(f"Lade Grenze für {name} ({rel_id})...")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        if not data or not isinstance(data, list) or "geojson" not in data[0]:
            raise RuntimeError(f"Unerwartete Antwort für {name} ({rel_id}): kein GeoJSON gefunden.")
        geom_wgs = shapely.geometry.shape(data[0]["geojson"])
        if not geom_wgs.is_valid:
            geom_wgs = make_valid(geom_wgs)
        return geom_wgs


def main():
    parser = argparse.ArgumentParser(description="Erzeuge DACHLiLu-Abdeckungspolygon für OpenFireMap")
    parser.add_argument(
        "--output",
        default=os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "src", "js", "coverage", "dachlilu.js")
        ),
        help="Pfad zur Zieldatei (default: src/js/coverage/dachlilu.js)",
    )
    parser.add_argument("--buffer", type=float, default=-500.0, help="Innenpuffer in Metern (default: -500)")
    parser.add_argument("--simplify", type=float, default=250.0, help="Vereinfachungstoleranz in Metern (default: 250)")
    args = parser.parse_args()

    if not HAS_GEO_DEPS:
        print("FEHLER: shapely und pyproj sind erforderlich. Bitte installieren mit: pip install shapely pyproj", file=sys.stderr)
        sys.exit(1)

    print("=== Starte Geometrie-Abruf für DACHLiLu (5 Länder) ===")
    geoms = []
    for c in COUNTRY_RELATIONS:
        g = fetch_country_geometry(c["rel"], c["name"])
        geoms.append(g)

    print("Vereinige Ländergeometrien (unary_union)...")
    union_wgs = shapely.ops.unary_union(geoms)
    if not union_wgs.is_valid:
        union_wgs = make_valid(union_wgs)

    print("Transformiere nach EPSG:25832 (UTM 32N)...")
    to_utm = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True).transform
    to_wgs = pyproj.Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True).transform

    union_utm = shapely.ops.transform(to_utm, union_wgs)
    orig_area_km2 = union_utm.area / 1e6
    print(f"Gesamtfläche DACHLiLu: {orig_area_km2:.1f} km²")

    print(f"Puffere um {args.buffer} m nach innen...")
    buffered_utm = union_utm.buffer(args.buffer)

    print(f"Vereinfache mit {args.simplify} m Toleranz...")
    simplified_utm = buffered_utm.simplify(args.simplify, preserve_topology=True)

    polygons = []
    if simplified_utm.geom_type == "Polygon":
        polygons = [simplified_utm]
    elif simplified_utm.geom_type == "MultiPolygon":
        polygons = [g for g in simplified_utm.geoms if g.area / 1e6 > 50.0]  # Nur relevante Landmassen (>50 km²)
    else:
        raise RuntimeError(f"Unerwarteter Geometrietyp nach Vereinfachung: {simplified_utm.geom_type}")

    total_buffered_area = sum(p.area / 1e6 for p in polygons)
    lost_area = orig_area_km2 - total_buffered_area
    print(f"Gepufferte Fläche: {total_buffered_area:.1f} km² (an Overpass abgegeben: {lost_area:.1f} km²)")

    print("Transformiere zurück nach EPSG:4326 (WGS84)...")
    poly_list_wgs = []
    total_points = 0
    for p_utm in polygons:
        p_wgs = shapely.ops.transform(to_wgs, p_utm)
        coords = [[round(lat, 4), round(lon, 4)] for lon, lat in p_wgs.exterior.coords]
        poly_list_wgs.append(coords)
        total_points += len(coords)

    print(f"Erzeugte Polygone: {len(poly_list_wgs)} mit insgesamt {total_points} Stützpunkten.")

    today_str = datetime.date.today().isoformat()
    lines = [
        "/**",
        " * ==========================================================================================",
        " * DATEI: dachlilu.js",
        " * ZWECK: Hochpräzises Abdeckungspolygon für die DACHLiLu-Region (DE, AT, CH, LU, LI).",
        " *",
        f" * Generiert am:     {today_str}",
        " * Quellen:          OSM-Landesgrenzen (R51477, R16239, R51701, R2171347, R1155955)",
        f" * Puffer:           {args.buffer} m (nach innen gepuffert)",
        f" * Toleranz:         {args.simplify} m (Douglas-Peucker-Vereinfachung)",
        f" * Teil-Polygone:    {len(poly_list_wgs)}",
        f" * Stützpunkte:      {total_points}",
        f" * Randverlust:      ca. {lost_area:.1f} km² (bewusst an Overpass übergeben)",
        " *",
        " * Lizenz & Daten:   © OpenStreetMap contributors (ODbL)",
        " * Generator-Skript: pipeline/tools/build_dachlilu_coverage.py",
        " * ==========================================================================================",
        " */",
        "",
        "// DACHLiLu-Abdeckung: Liste geschlossener Polygone ([[lat, lon], ...])",
        "export const DACHLILU_COVERAGE = ["
    ]

    for poly_idx, coords in enumerate(poly_list_wgs):
        lines.append(f"  // Polygon {poly_idx + 1}")
        lines.append("  [")
        for lat, lon in coords:
            lines.append(f"    [{lat:.4f}, {lon:.4f}],")
        lines.append("  ],")
    lines.append("];")
    lines.append("")

    out_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Erfolgreich geschrieben: {out_path} ({os.path.getsize(out_path)} Bytes)")


if __name__ == "__main__":
    main()
