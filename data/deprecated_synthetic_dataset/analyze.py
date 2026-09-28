"""
Calibration statistics for app/sim/engine.py, derived from the real logged
dataset (30 trips, 9 stops, 6-bus fleet). Run from the data/ directory:
    python analyze.py

The numbers this prints (dwell mean/std per stop, per-hop delay growth,
segment cruise speed, headway drift, dwell-vs-headway correlation) are what
engine.py's DWELL_MEAN_S / DWELL_NOISE / HOP_DELAY_MEAN_S / CRUISE_SPEED_MPS /
TARGET_HEADWAY_S constants are fit to -- see the module docstring in
app/sim/engine.py and PROJECT_STATUS.md's 2026-08-22 update for how each
number here maps to a constant there.
"""
import pandas as pd
import numpy as np

df = pd.read_csv("tumkur_siet_bus_bunching_data_264rows.csv", parse_dates=["scheduled_arrival", "actual_arrival"])
df = df.sort_values(["trip_id", "stop_seq"]).reset_index(drop=True)

print("=== stops in order (first trip) ===")
stops = df[df.trip_id == "T001"][["stop_seq", "stop_name", "latitude", "longitude", "distance_km"]]
print(stops.to_string(index=False))

print("\n=== dwell_sec by stop_name ===")
print(df.groupby("stop_name")["dwell_sec"].agg(["mean", "std", "min", "max", "count"]).round(1))

print("\n=== delay_sec by stop_seq (growth along route) ===")
print(df.groupby("stop_seq")["delay_sec"].agg(["mean", "std", "min", "max"]).round(1))

# per-trip delay picked up between consecutive stops (signal-ish exogenous delay)
df["prev_delay"] = df.groupby("trip_id")["delay_sec"].shift(1)
df["delay_gain"] = df["delay_sec"] - df["prev_delay"]
print("\n=== delay gained per hop (delay_sec increase vs previous stop), by stop_seq ===")
print(df.groupby("stop_seq")["delay_gain"].agg(["mean", "std", "min", "max"]).round(1))

# segment travel time (actual) minus dwell at arriving stop's PREVIOUS stop -> to get cruise speed
df["prev_actual"] = df.groupby("trip_id")["actual_arrival"].shift(1)
df["prev_dist"] = df.groupby("trip_id")["distance_km"].shift(1)
df["prev_dwell"] = df.groupby("trip_id")["dwell_sec"].shift(1)
df["seg_time_s"] = (df["actual_arrival"] - df["prev_actual"]).dt.total_seconds()
df["seg_dist_m"] = (df["distance_km"] - df["prev_dist"]) * 1000
df["travel_time_s"] = df["seg_time_s"] - df["prev_dwell"]
df["speed_mps"] = df["seg_dist_m"] / df["travel_time_s"]
print("\n=== segment speed (m/s) stats (excludes dwell) ===")
print(df["speed_mps"].describe().round(2))
print("\n=== segment speed by stop_seq (arriving stop) ===")
print(df.groupby("stop_seq")["speed_mps"].agg(["mean", "std"]).round(2))

print("\n=== headway_actual / headway_scheduled ratio ===")
df["hw_ratio"] = df["headway_actual_sec"] / df["headway_scheduled_sec"]
print(df["hw_ratio"].describe().round(2))

print("\n=== headway_actual by stop_seq ===")
print(df.groupby("stop_seq")["headway_actual_sec"].agg(["mean", "std", "min", "max"]).round(1))

print("\n=== bunching flag rows ===")
print(df[df.bunching_flag == 1][["trip_id","bus_id","stop_seq","stop_name","headway_actual_sec","delay_sec"]])

print("\n=== overall corridor length km (max distance_km) ===", df["distance_km"].max())
print("=== num unique bus_id ===", df["bus_id"].nunique(), df["bus_id"].unique())
print("=== scheduled headway sec (mode) ===", df["headway_scheduled_sec"].mode())
