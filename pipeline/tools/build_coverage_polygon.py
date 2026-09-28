#!/usr/bin/env python3
"""
build_coverage_polygon.py
Erzeugt das präzise Abdeckungspolygon für Bayern aus OpenStreetMap-Daten.

Schritte:
1. Lädt die Landesgrenze von Bayern (OSM-Relation R2145268) über Nominatim.
2. Projiziert nach EPSG:25832 (UTM Zone 32N, metrisch).
3. Puffert 500 m nach innen (-500 m).
4. Vereinfacht mit 250 m Toleranz.
5. Wählt das größte Teilpolygon.
6. Projiziert zurück nach EPSG:4326 (WGS84).
7. Rundet Koordinaten auf 4 Nachkommastellen ([lat, lon]).
8. Validiert, dass das vereinfachte Polygon vollständig innerhalb der Originalgrenze liegt (within).
9. Schreibt das Ergebnis als ES-Modul nach src/js/coverage/bayern.js.
"""

import sys
import os
import datetime
import json
import argparse
import requests
import shapely.geometry
import shapely.ops
from shapely.validation import make_valid
import pyproj

NOMINATIM_URL = (
    "https://nominatim.openstreetmap.org/lookup"
    "?osm_ids=R2145268&format=json&polygon_geojson=1&polygon_threshold=0.0003"
)
USER_AGENT = "OpenFireMap-coverage/1.0 (https://openfiremap.org)"

def main():
    parser = argparse.ArgumentParser(description="Erzeuge Bayern-Abdeckungspolygon für OpenFireMap")
    parser.add_argument(
        "--output",
        default=os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "src", "js", "coverage", "bayern.js")
        ),
        help="Pfad zur Zieldatei (default: src/js/coverage/bayern.js)",
    )
    parser.add_argument("--buffer", type=float, default=-500.0, help="Innenpuffer in Metern (default: -500)")
    parser.add_argument("--simplify", type=float, default=250.0, help="Vereinfachungstoleranz in Metern (default: 250)")
    args = parser.parse_args()

    print(f"Lade Bayern-Grenze (R2145268) von Nominatim...")
    headers = {"User-Agent": USER_AGENT}
    resp = requests.get(NOMINATIM_URL, headers=headers, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    if not data or not isinstance(data, list) or "geojson" not in data[0]:
        raise RuntimeError("Unerwartete Antwort von Nominatim: kein GeoJSON gefunden.")

    raw_geojson = data[0]["geojson"]
    orig_geom_wgs = shapely.geometry.shape(raw_geojson)
    if not orig_geom_wgs.is_valid:
        orig_geom_wgs = make_valid(orig_geom_wgs)

    print("Transformiere nach EPSG:25832 (UTM 32N)...")
    to_utm = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True).transform
    to_wgs = pyproj.Transformer.from_crs("EPSG:25832", "EPSG:4326", always_xy=True).transform

    orig_utm = shapely.ops.transform(to_utm, orig_geom_wgs)
    orig_area_km2 = orig_utm.area / 1e6
    print(f"Originalfläche Bayern: {orig_area_km2:.1f} km²")

    print(f"Puffere um {args.buffer} m nach innen...")
    buffered_utm = orig_utm.buffer(args.buffer)

    print(f"Vereinfache mit {args.simplify} m Toleranz...")
    simplified_utm = buffered_utm.simplify(args.simplify, preserve_topology=True)

    if simplified_utm.geom_type == "Polygon":
        largest_utm = simplified_utm
    elif simplified_utm.geom_type == "MultiPolygon":
        largest_utm = max(simplified_utm.geoms, key=lambda g: g.area)
    else:
        raise RuntimeError(f"Unerwarteter Geometrietyp nach Vereinfachung: {simplified_utm.geom_type}")

    buffered_area_km2 = largest_utm.area / 1e6
    lost_area_km2 = orig_area_km2 - buffered_area_km2
    print(f"Gepufferte Fläche: {buffered_area_km2:.1f} km²")
    print(f"Verlorene Randfläche (an Overpass abgegeben): {lost_area_km2:.1f} km²")

    print("Transformiere zurück nach EPSG:4326 (WGS84) und runde Koordinaten...")
    poly_wgs = shapely.ops.transform(to_wgs, largest_utm)
    coords_lat_lon = [[round(lat, 4), round(lon, 4)] for lon, lat in poly_wgs.exterior.coords]
    point_count = len(coords_lat_lon)
    print(f"Punktanzahl: {point_count}")

    print("Validiere: Liegt das gerundete Polygon vollständig innerhalb der Originalgrenze?")
    rounded_poly_wgs = shapely.geometry.Polygon([(lon, lat) for lat, lon in coords_lat_lon])
    if not rounded_poly_wgs.within(orig_geom_wgs):
        diff = rounded_poly_wgs.difference(orig_geom_wgs)
        diff_utm = shapely.ops.transform(to_utm, diff)
        err_msg = (
            f"FEHLER: Das erzeugte Polygon ragt um {diff_utm.area / 1e6:.4f} km² "
            "über die echte Grenze Bayerns hinaus! Vorgang abgebrochen."
        )
        print(err_msg, file=sys.stderr)
        sys.exit(1)

    print("Validierung erfolgreich: Polygon liegt zu 100% innerhalb der Bayern-Grenze.")

    today_str = datetime.date.today().isoformat()
    lines = [
        "/**",
        " * ==========================================================================================",
        " * DATEI: bayern.js",
        " * ZWECK: Hochpräzises Abdeckungspolygon für das Bundesland Bayern in OpenFireMap.",
        " *",
        f" * Generiert am:     {today_str}",
        " * Quelle:           OpenStreetMap Relation R2145268 (OSM-Landesgrenze Bayern)",
        f" * Puffer:           {args.buffer} m (nach innen gepuffert)",
        f" * Toleranz:         {args.simplify} m (Douglas-Peucker-Vereinfachung)",
        f" * Punkte:           {point_count}",
        f" * Randverlust:      ca. {lost_area_km2:.1f} km² (bewusst an Overpass übergeben)",
        " *",
        " * Lizenz & Daten:   © OpenStreetMap contributors (ODbL)",
        " * Generator-Skript: pipeline/tools/build_coverage_polygon.py",
        " * ==========================================================================================",
        " */",
        "",
        "export const BAYERN_COVERAGE = ["
    ]

    for lat, lon in coords_lat_lon:
        lines.append(f"  [{lat:.4f}, {lon:.4f}],")
    lines.append("];")
    lines.append("")

    out_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Erfolgreich geschrieben: {out_path} ({os.path.getsize(out_path)} Bytes)")

if __name__ == "__main__":
    main()
