"""Route geometry: linear referencing along the real Tumkur corridor polyline."""
import json
import bisect
import os

_ROUTE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "route.json")


class Route:
    def __init__(self, path=_ROUTE_PATH):
        with open(path) as f:
            data = json.load(f)
        self.corridor_name = data["corridor_name"]
        self.coords = data["coords_lonlat"]  # [ [lon,lat], ... ]
        self.cum = data["cumulative_m"]
        self.length_m = data["total_length_m"]
        self.stops = data["stops"]  # list of {index, name, dist_m, is_landmark}

    def latlon_at(self, dist_m):
        """Interpolate (lat, lon) at distance dist_m along the route."""
        d = max(0.0, min(dist_m, self.length_m))
        i = bisect.bisect_left(self.cum, d)
        if i <= 0:
            lon, lat = self.coords[0]
            return lat, lon
        if i >= len(self.cum):
            lon, lat = self.coords[-1]
            return lat, lon
        d0, d1 = self.cum[i - 1], self.cum[i]
        lon0, lat0 = self.coords[i - 1]
        lon1, lat1 = self.coords[i]
        frac = 0.0 if d1 == d0 else (d - d0) / (d1 - d0)
        lat = lat0 + (lat1 - lat0) * frac
        lon = lon0 + (lon1 - lon0) * frac
        return lat, lon

    def bbox(self):
        lats = [c[1] for c in self.coords]
        lons = [c[0] for c in self.coords]
        return min(lats), min(lons), max(lats), max(lons)
