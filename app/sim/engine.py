"""
Single-fleet bus bunching simulation on the real Tumkur KSRTC Bus Stand ->
SIET College Gate corridor (Tumkur, Karnataka -- Ashoka Road / Sira Road),
with a *live-toggleable* control system.

Route geometry (data/tumkur_bus_stand_siet_stops.csv, app/data/route.json)
is real: 4 stop coordinates independently verified 2026-08-25 against
OpenStreetMap Nominatim/Overpass and an AI-search-assisted landmark
description, with OSRM road-following geometry for all 3 hops -- measured
corridor length ~4.3km. An earlier version of this project presented a
264-row CSV as a "real logged dataset" (30 trips, 6 buses) and calibrated
dwell/delay/speed straight from it; that dataset turned out to be synthetic
(its corridor was ~8.9km/9 stops, roughly double the real distance, and one
stop's coordinate was nowhere near its named real-world location -- see
data/deprecated_synthetic_dataset/README.md for the investigation). It is no
longer used for anything.

There is no real per-trip GPS log for this corridor, so the disturbance
model below is built from documented, explicitly-labeled *assumptions*
about typical Indian urban bus operation on a short mixed-traffic corridor
(short dwell at low-ridership intermediate stops, exponentially-distributed
per-hop traffic/junction delay), not fit to logged data. The mechanism that
produces bunching is still the textbook one: i.i.d. per-hop delay variance
accumulating along the corridor with no self-correction, interacting with
the no-overtaking constraint -- the classic Newell & Potts (1964)
instability mechanism.

TARGET_HEADWAY_S is *derived* from these assumed constants, not scheduled:
this engine models a small fleet (N_BUSES) in continuous closed-loop
circulation (the standard topology for an interactive bunching/control
demo), so steady-state in-service spacing is loop_time/N_BUSES regardless of
any nominal timetable. Expected lap time = corridor_length/CRUISE_SPEED_MPS
+ 2*DWELL_MEAN_S + 2*HOP_DELAY_MEAN_S + TERMINUS_LAYOVER_S
= 4296.15/5.5 + 2*20 + 2*35 + 45 ~= 936s; divided by 6 buses and rounded to
a clean 150s (2.5 min) -- see PROJECT_STATUS.md for the arithmetic.

When `control_enabled` is True, two complementary mechanisms from the
literature kick in simultaneously:
  1. Daganzo (2009) adaptive HOLDING at intermediate stops -- a bus that has
     closed in too tight on the one ahead is held a little longer.
  2. Daganzo & Pilachowski (2011) two-way-looking cooperative SPEED CONTROL
     between stops -- every moving bus continuously eases up or speeds up a
     little based on its gap to the bus ahead vs. the bus behind, rather than
     only correcting at discrete stops. This is what keeps buses from ever
     needing a big last-second hold in the first place, and is why control
     should show far fewer multi-bus pileups than the uncontrolled case.

The system starts with control OFF so bunching can be observed developing
naturally; the frontend flips `control_enabled` live via the same running
fleet so you watch the *same* buses get corrected, not a separate universe.
"""
import hashlib
import math
from dataclasses import dataclass, field

from .route import Route
from .control import hold_time as daganzo_hold, THETA as DEFAULT_THETA

# ---- simulation constants -------------------------------------------------
# Illustrative plate numbers in the real KA-06 (Tumkur) registration series.
# Fleet size (6) is an assumed operational scale for a short town corridor
# like this one, not drawn from any logged roster.
TUMKUR_BUS_PLATES = [
    "KA-06-F-1201",
    "KA-06-F-1345",
    "KA-06-F-1522",
    "KA-06-F-1678",
    "KA-06-F-1899",
    "KA-06-F-2011",
]
N_BUSES = len(TUMKUR_BUS_PLATES)
TARGET_HEADWAY_S = 150.0           # 2.5 min -- derived, see module docstring
# CRUISE_SPEED_MPS: assumed moving-only speed (excludes dwell/signal-delay
# time, which are modeled separately below) for a mixed-traffic town
# corridor -- ~20 km/h, a typical in-motion speed for an urban bus on a
# 2-lane NH corridor with junctions, not a highway cruising speed.
CRUISE_SPEED_MPS = 5.5
DWELL_MEAN_S = 20.0                 # assumed mean dwell at a low-ridership intermediate stop
DWELL_NOISE = 0.33                  # assumed relative noise -> std ~7s
HOP_DELAY_MEAN_S = 35.0             # assumed mean per-hop traffic/junction delay (exponential)
HOP_DELAY_MAX_S = 150.0             # assumed cap on a single hop's delay
TERMINUS_LAYOVER_S = 45.0
MIN_GAP_M = 25.0                  # buses may not pass each other (real constraint)
HEADWAY_WINDOW = 30               # rolling window size for CV metric

# Cooperative speed control (mechanism 2 above)
SPEED_GAIN = 0.35                 # how aggressively gap imbalance adjusts cruise speed
SPEED_FACTOR_MIN = 0.55
SPEED_FACTOR_MAX = 1.30
SPEED_EASE_THRESHOLD = 0.88       # speed_factor below this logged as "easing off"
SPEED_BOOST_THRESHOLD = 1.12      # speed_factor above this logged as "speeding up"
# Real buses (and drivers) can't jump cruising speed instantly -- the target
# speed_factor computed each tick is a *setpoint*, and the actual factor is
# ramped toward it at a bounded rate so an on-road "ease off"/"speed up"
# instruction is always a gradual nudge, never a sudden brake/accelerate
# command. Full range (0.55x-1.30x) takes ~7.5s to traverse, in line with
# comfortable transit-bus acceleration (~0.8 m/s^2).
SPEED_FACTOR_RAMP_PER_S = 0.10

BUNCH_HEADWAY_FRAC = 0.3          # headway sample below this fraction of target = "bunched"

STATE_MOVING = "moving"
STATE_DWELLING = "dwelling"
STATE_HOLDING = "holding"
STATE_SIGNAL = "signal_delay"
STATE_LAYOVER = "layover"


def det_rand(*key_parts):
    """Deterministic pseudo-random float in [0,1), keyed by stable identifiers
    (so re-running with the same bus/lap/junction history is reproducible)."""
    h = hashlib.md5("|".join(str(k) for k in key_parts).encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


@dataclass
class Bus:
    id: int
    plate: str = ""
    lap: int = 0
    dist_m: float = 0.0
    state: str = STATE_LAYOVER
    timer_s: float = 0.0
    next_stop_idx: int = 0
    next_signal_idx: int = 0
    last_forward_headway_s: float = TARGET_HEADWAY_S
    total_progress_m: float = -1.0     # lap*L + dist_m
    speed_factor: float = 1.0          # cooperative speed control multiplier
    speed_state: str = "normal"        # "normal" | "easing" | "boosting" (for display + edge-triggered logging)
    current_hold_s: float = 0.0        # the AI-control-ordered portion of the current stop's wait (0 if none)


@dataclass
class Fleet:
    name: str
    route: Route
    buses: list = field(default_factory=list)
    last_departure_at_stop: dict = field(default_factory=dict)
    headway_samples: list = field(default_factory=list)
    bunch_flags: list = field(default_factory=list)
    # full (t, headway) history, unbounded -- unlike headway_samples (a
    # bounded rolling window kept small for the live UI metric), this is for
    # offline/batch evaluation that needs to slice a specific time window.
    headway_log: list = field(default_factory=list)
    events: list = field(default_factory=list)   # decision feed: hold/ok/speed events

    def record_headway(self, t, h):
        self.headway_samples.append(h)
        self.bunch_flags.append(1 if h < BUNCH_HEADWAY_FRAC * TARGET_HEADWAY_S else 0)
        if len(self.headway_samples) > HEADWAY_WINDOW:
            self.headway_samples.pop(0)
            self.bunch_flags.pop(0)
        self.headway_log.append((t, h))

    def metrics(self):
        n = len(self.headway_samples)
        if n < 2:
            return {"cv": 0.0, "mean_headway_s": TARGET_HEADWAY_S, "excess_wait_s": TARGET_HEADWAY_S / 2, "bunch_pct": 0.0}
        mean = sum(self.headway_samples) / n
        var = sum((x - mean) ** 2 for x in self.headway_samples) / n
        sd = math.sqrt(var)
        cv = sd / mean if mean > 0 else 0.0
        excess_wait = (mean / 2.0) * (1.0 + cv ** 2)
        bunch_pct = 100.0 * sum(self.bunch_flags) / n
        return {"cv": cv, "mean_headway_s": mean, "excess_wait_s": excess_wait, "bunch_pct": bunch_pct}


class Simulation:
    def __init__(self, seed=0):
        self.route = Route()
        self.t = 0.0
        self.seed = seed
        self.control_enabled = False
        # holding (mechanism 1) is governed by control_enabled above; this
        # lets a batch evaluation isolate mechanism 2's contribution by
        # running "holding only" (control_enabled=True, speed_control_enabled
        # =False) as a middle condition between fully off and both-combined.
        # Not exposed in the live UI -- toggled directly by eval code.
        self.speed_control_enabled = True
        # Live-tunable control-law parameters (theta: holding damping factor
        # from control.py; speed_gain: cooperative speed control gain from
        # SPEED_GAIN above) -- exposed to the UI via a "params" WS message so
        # the stability/overcorrection tradeoff can be felt directly instead
        # of just described. Defaults match the module-level constants that
        # were validated in EVALUATION_AND_SAFETY_NOTES.md.
        self.theta = DEFAULT_THETA
        self.speed_gain = SPEED_GAIN
        n_stops = len(self.route.stops)
        self.control_point_idxs = {
            s["index"] for s in self.route.stops
            if s["is_landmark"] and s["index"] not in (0, n_stops - 1)
        }
        self.signal_idxs = sorted(
            s["index"] for s in self.route.stops
            if s["is_landmark"] and s["index"] not in (0, n_stops - 1)
        )
        self.fleet = Fleet("service", self.route)
        for i in range(N_BUSES):
            b = Bus(id=i, plate=TUMKUR_BUS_PLATES[i], state=STATE_LAYOVER, timer_s=-i * TARGET_HEADWAY_S)
            self.fleet.buses.append(b)

    def set_params(self, theta=None, speed_gain=None):
        if theta is not None:
            self.theta = max(0.0, min(float(theta), 1.0))
        if speed_gain is not None:
            self.speed_gain = max(0.0, min(float(speed_gain), 1.0))

    def set_control(self, enabled: bool):
        if enabled != self.control_enabled:
            self.fleet.events.append({
                "t": self.t, "bus_id": None, "stop": None,
                "action": "control_on" if enabled else "control_off",
            })
        self.control_enabled = enabled

    # -- disturbance model ------------------------------------------------
    # Assumed flat across stops and not headway-correlated (see module
    # docstring) -- so this is plain per-stop noise, applied the same way
    # regardless of stop, not a crowd-buildup function of gap.
    def _dwell_time(self, bus: Bus, stop_idx: int) -> float:
        noise = 1.0 + DWELL_NOISE * (2 * det_rand("dwell", self.seed, bus.id, bus.lap, stop_idx) - 1)
        return max(5.0, DWELL_MEAN_S * noise)

    # Per-hop traffic/junction delay -- exponential draw (assumed, see
    # module docstring), a standard shape for stochastic urban-traffic delay.
    def _signal_delay(self, bus: Bus, signal_idx: int) -> float:
        u = det_rand("signal_roll", self.seed, bus.id, bus.lap, signal_idx)
        delay = -HOP_DELAY_MEAN_S * math.log(max(1e-9, 1.0 - u))
        return min(delay, HOP_DELAY_MAX_S)

    def _enforce_no_passing(self):
        buses_sorted = sorted(self.fleet.buses, key=lambda b: -b.total_progress_m)
        for i in range(1, len(buses_sorted)):
            ahead = buses_sorted[i - 1]
            me = buses_sorted[i]
            max_allowed = ahead.total_progress_m - MIN_GAP_M
            if me.total_progress_m > max_allowed:
                me.total_progress_m = max_allowed
                me.lap = int(me.total_progress_m // self.route.length_m)
                me.dist_m = me.total_progress_m - me.lap * self.route.length_m

    # -- cooperative speed control (mechanism 2) ---------------------------
    def _ramp_toward(self, bus: Bus, target_factor: float, max_delta: float):
        delta = max(-max_delta, min(target_factor - bus.speed_factor, max_delta))
        bus.speed_factor += delta

    def _update_speed_factors(self, dt: float):
        L = self.route.length_m
        ideal_gap_m = TARGET_HEADWAY_S * CRUISE_SPEED_MPS
        buses = self.fleet.buses
        max_delta = SPEED_FACTOR_RAMP_PER_S * dt

        if not self.control_enabled or not self.speed_control_enabled or len(buses) < 2:
            # control just switched off (or was never on) -- still ramp back
            # to normal speed gradually rather than snapping, since a bus
            # mid-road can't instantly resume full cruising speed either.
            for b in buses:
                self._ramp_toward(b, 1.0, max_delta)
                if abs(b.speed_factor - 1.0) < 1e-3:
                    b.speed_state = "normal"
            return

        order = sorted(buses, key=lambda b: b.total_progress_m % L)
        n = len(order)
        for i, bus in enumerate(order):
            ahead = order[(i + 1) % n]
            behind = order[(i - 1) % n]
            pos = bus.total_progress_m % L
            pos_ahead = ahead.total_progress_m % L
            pos_behind = behind.total_progress_m % L
            forward_gap = (pos_ahead - pos) % L
            backward_gap = (pos - pos_behind) % L
            imbalance = (forward_gap - backward_gap) / ideal_gap_m
            target_factor = 1.0 + self.speed_gain * imbalance
            target_factor = max(SPEED_FACTOR_MIN, min(target_factor, SPEED_FACTOR_MAX))
            self._ramp_toward(bus, target_factor, max_delta)

            prev_state = bus.speed_state
            if bus.speed_factor < SPEED_EASE_THRESHOLD:
                new_state = "easing"
            elif bus.speed_factor > SPEED_BOOST_THRESHOLD:
                new_state = "boosting"
            else:
                new_state = "normal"
            if new_state != prev_state and new_state != "normal":
                self.fleet.events.append({
                    "t": self.t, "bus_id": bus.id, "bus_plate": bus.plate, "stop": None,
                    "action": "speed_ease" if new_state == "easing" else "speed_boost",
                    "forward_gap_m": round(forward_gap, 0),
                    "backward_gap_m": round(backward_gap, 0),
                    "speed_factor": round(bus.speed_factor, 2),
                })
            bus.speed_state = new_state

    # -- main step ----------------------------------------------------------
    def step(self, dt: float):
        self.t += dt
        self._update_speed_factors(dt)
        for bus in self.fleet.buses:
            self._step_bus(bus, dt)
        self._enforce_no_passing()

    def _step_bus(self, bus: Bus, dt: float):
        stops = self.route.stops
        fleet = self.fleet

        if bus.state == STATE_LAYOVER:
            bus.timer_s -= dt
            if bus.timer_s <= 0:
                bus.state = STATE_MOVING
                bus.dist_m = 0.0
                bus.next_stop_idx = 0
                bus.next_signal_idx = 0
                bus.total_progress_m = bus.lap * self.route.length_m
            return

        if bus.state in (STATE_DWELLING, STATE_HOLDING, STATE_SIGNAL):
            bus.timer_s -= dt
            if bus.timer_s <= 0:
                if bus.state in (STATE_DWELLING, STATE_HOLDING):
                    stop_idx = bus.next_stop_idx - 1
                    fleet.last_departure_at_stop[stop_idx] = self.t
                bus.state = STATE_MOVING
                bus.current_hold_s = 0.0
            return

        # STATE_MOVING
        bus.dist_m += CRUISE_SPEED_MPS * bus.speed_factor * dt
        bus.total_progress_m = bus.lap * self.route.length_m + bus.dist_m

        if bus.dist_m >= self.route.length_m:
            bus.state = STATE_LAYOVER
            bus.timer_s = TERMINUS_LAYOVER_S
            bus.lap += 1
            bus.dist_m = 0.0
            return

        if bus.next_signal_idx < len(self.signal_idxs):
            sig_stop_idx = self.signal_idxs[bus.next_signal_idx]
            sig_dist = stops[sig_stop_idx]["dist_m"]
            if bus.dist_m >= sig_dist:
                delay = self._signal_delay(bus, bus.next_signal_idx)
                bus.next_signal_idx += 1
                if delay > 0:
                    bus.state = STATE_SIGNAL
                    bus.timer_s = delay
                    return

        if bus.next_stop_idx < len(stops):
            stop = stops[bus.next_stop_idx]
            if bus.dist_m >= stop["dist_m"]:
                stop_idx = bus.next_stop_idx
                dwell = self._dwell_time(bus, stop_idx)

                extra_hold = 0.0
                if stop_idx in self.control_point_idxs:
                    last_dep = fleet.last_departure_at_stop.get(stop_idx)
                    fwd_headway = (self.t - last_dep) if last_dep is not None else TARGET_HEADWAY_S
                    bus.last_forward_headway_s = fwd_headway
                    fleet.record_headway(self.t, fwd_headway)

                    if self.control_enabled:
                        extra_hold = daganzo_hold(fwd_headway, TARGET_HEADWAY_S, theta=self.theta)
                        action = "hold" if extra_hold > 1.0 else "ok"
                    else:
                        action = "unmanaged"
                    fleet.events.append({
                        "t": self.t, "bus_id": bus.id, "bus_plate": bus.plate, "stop": stop["name"],
                        "action": action,
                        "hold_s": round(extra_hold, 1),
                        "forward_headway_s": round(fwd_headway, 1),
                        "target_headway_s": TARGET_HEADWAY_S,
                    })

                bus.next_stop_idx += 1
                if extra_hold > 0:
                    bus.state = STATE_HOLDING
                    bus.timer_s = dwell + extra_hold
                    bus.current_hold_s = extra_hold
                else:
                    bus.state = STATE_DWELLING
                    bus.timer_s = dwell
                    bus.current_hold_s = 0.0
                return

    def _stop_label(self, bus: Bus) -> str:
        stops = self.route.stops
        if bus.state == STATE_LAYOVER:
            return f"{stops[0]['name']} (terminus)"
        if bus.state in (STATE_DWELLING, STATE_HOLDING):
            return stops[bus.next_stop_idx - 1]["name"]
        if bus.next_stop_idx < len(stops):
            return f"approaching {stops[bus.next_stop_idx]['name']}"
        return stops[-1]["name"]

    # -- serialization for the frontend ------------------------------------
    def snapshot(self):
        buses_out = []
        for b in self.fleet.buses:
            lat, lon = self.route.latlon_at(b.dist_m)
            buses_out.append({
                "id": b.id,
                "plate": b.plate,
                "lat": lat,
                "lon": lon,
                "dist_m": round(b.dist_m, 1),
                "state": b.state,
                "speed_state": b.speed_state,
                "timer_s": round(max(b.timer_s, 0.0), 1),
                "current_hold_s": round(b.current_hold_s, 1),
                "forward_headway_s": round(b.last_forward_headway_s, 1),
                "stop_label": self._stop_label(b),
            })
        return {
            "t": round(self.t, 1),
            "control_enabled": self.control_enabled,
            "target_headway_s": TARGET_HEADWAY_S,
            "theta": round(self.theta, 2),
            "speed_gain": round(self.speed_gain, 2),
            "buses": buses_out,
            "metrics": self.fleet.metrics(),
        }

    def pop_events(self):
        out = self.fleet.events
        self.fleet.events = []
        return out
