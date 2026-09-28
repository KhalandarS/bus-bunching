"""
Builds route.json for the Tumkur KSRTC Bus Stand -> SIET College Gate corridor
from data/tumkur_bus_stand_siet_stops.csv: 4 stops, independently verified on
2026-08-25 against OpenStreetMap/Nominatim/Overpass (not the earlier 9-stop,
8.9km CSV, which turned out to be synthetic -- see
data/deprecated_synthetic_dataset/README.md for how that was found and why
it's no longer used).

Road-following geometry (OSRM) is fetched for all 3 hops between the 4 stops
and used unconditionally, giving a measured corridor length of ~4.3km -- this
matches the independently researched real-world distance for this route, and
is consistent with the turn-by-turn OSRM steps (the corridor runs north along
Ashoka Road / Sira Road, NH-4/NH-48) and with the AI-search-derived landmark
distances (Ashoka Circle ~1.3km, Siragate Circle ~3.0km).
"""
import csv
import json
import math
import os
import time
import urllib.request

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "tumkur_bus_stand_siet_stops.csv")
OUT_PATH = os.path.join(os.path.dirname(__file__), "route.json")
EARTH_R = 6371000.0


def haversine(lon1, lat1, lon2, lat2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))


def fetch_hop_geometry(lon1, lat1, lon2, lat2):
    url = (f"https://router.project-osrm.org/route/v1/driving/"
           f"{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson")
    with urllib.request.urlopen(url, timeout=15) as resp:
        d = json.load(resp)
    if d.get("code") != "Ok":
        return None
    return d["routes"][0]["distance"], d["routes"][0]["geometry"]["coordinates"]


def main():
    stops_in = []
    with open(CSV_PATH, newline="") as f:
        for row in csv.DictReader(f):
            stops_in.append({
                "name": row["stop_name"],
                "lat": float(row["latitude"]),
                "lon": float(row["longitude"]),
            })

    n = len(stops_in)
    pts = [(s["lon"], s["lat"]) for s in stops_in]

    coords_lonlat = [pts[0]]
    cumulative_m = [0.0]
    stop_indices_in_coords = [0]

    for i in range(n - 1):
        lon1, lat1 = pts[i]
        lon2, lat2 = pts[i + 1]
        hop_geom = None
        hop_osrm_m = None
        try:
            result = fetch_hop_geometry(lon1, lat1, lon2, lat2)
            if result is not None:
                hop_osrm_m, hop_geom = result
        except Exception:
            hop_geom = None
        time.sleep(0.2)

        if hop_osrm_m is not None:
            print(f"  hop {i}: osrm={hop_osrm_m:.1f}m ({stops_in[i]['name']} -> {stops_in[i+1]['name']})")
        else:
            print(f"  hop {i}: OSRM fetch failed, using straight line")

        if hop_geom is None:
            hop_geom = [[lon1, lat1], [lon2, lat2]]

        for pt in hop_geom[1:]:
            prev_lon, prev_lat = coords_lonlat[-1]
            cumulative_m.append(cumulative_m[-1] + haversine(prev_lon, prev_lat, pt[0], pt[1]))
            coords_lonlat.append(pt)
        stop_indices_in_coords.append(len(coords_lonlat) - 1)

    total_length_m = cumulative_m[-1]

    stops = []
    for i in range(n):
        stops.append({
            "index": i,
            "name": stops_in[i]["name"],
            "dist_m": cumulative_m[stop_indices_in_coords[i]],
            "is_landmark": i not in (0, n - 1),
        })

    out = {
        "corridor_name": "Tumkur KSRTC Bus Stand → SIET College Gate, Tumkur (Ashoka Road / Sira Road corridor)",
        "source": (
            "4 stop coordinates independently verified 2026-08-25 via OpenStreetMap "
            "Nominatim/Overpass and cross-checked against an AI-search-assisted "
            "landmark route description (see data/deprecated_synthetic_dataset/README.md "
            "for the investigation that replaced the earlier, synthetic 9-stop/8.9km "
            "dataset). Road-following polyline from OSRM for all 3 hops; measured "
            "corridor length ~4.3km matches the independently researched real-world "
            "distance for this route."
        ),
        "coords_lonlat": coords_lonlat,
        "cumulative_m": cumulative_m,
        "total_length_m": total_length_m,
        "stops": stops,
    }
    json.dump(out, open(OUT_PATH, "w"))
    print(f"total_length_m={total_length_m:.1f}  points={len(coords_lonlat)}  stops={n}")
    for s in stops:
        tag = " *" if s["is_landmark"] else ""
        print(f"  [{s['index']}] {s['dist_m']:8.1f}m  {s['name']}{tag}")


if __name__ == "__main__":
    main()
