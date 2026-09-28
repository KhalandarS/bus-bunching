# Deprecated — do not use as "real logged data"

`tumkur_siet_bus_bunching_data_264rows.csv` and `analyze.py` were used earlier in this
project and described throughout the docs as a "real logged bus-tracking dataset" (30
trips, 6-bus fleet, real GPS coordinates). That description was wrong.

Independently verifying the dataset's stop coordinates against OpenStreetMap (2026-08-25)
found:
- The corridor described (Tumkur KSRTC Bus Stand → SIET College Gate) is really about
  **4.3 km** by road. This dataset's stops run to **8.9 km**, roughly twice as long.
- The dataset's "Tumkur City Railway Station" stop (13.3499, 77.1180) is nowhere near the
  real railway station (OSM: 13.3339, 77.1020, south of the bus stand) — the dataset's
  route heads steadily east from the bus stand and never actually turns north onto the
  real Sira Road corridor toward SIET.
- Only the two termini (Bus Stand, and loosely SIET) are close to their real locations;
  the 7 intermediate stop coordinates could not be independently confirmed and at least
  one is demonstrably wrong.

In short: this was very likely a synthetic dataset (plausible stop names with
hand-authored incrementing coordinates) rather than an actual GPS log, despite being
presented as one. It's kept here, unused, for transparency about what this project
previously claimed — not as a source of truth. The live simulation
(`app/data/build_tumkur_route.py`, `app/sim/engine.py`) now uses a small, independently
verified real-coordinate table (`data/tumkur_bus_stand_siet_stops.csv`) for the corridor
geometry, and openly-labeled assumption-based parameters (not "fit to real data") for the
dwell/delay/speed disturbance model — see `METHODOLOGY.md` Sections C and D.1 for the
current, honest framing.
