"""
Single-fleet bus bunching simulation on a real road corridor (ORR Marathahalli
-> Silk Board, Bangalore), with a *live-toggleable* control system.

This models two disturbance sources that create real bunching:
  - "signals" -- random red-light hits at real junctions (exogenous shock)
  - "crowd feedback" -- dwell time at major junction stops grows with how
    long it's been since the previous bus left that stop (the actual
    feedback loop that turns one red light into a spiral of lateness)

When `control_enabled` is True, two complementary mechanisms from the
literature kick in simultaneously:
  1. Daganzo (2009) adaptive HOLDING at intermediate junction stops -- a bus
     that has closed in too tight on the one ahead is held a little longer.
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
from .control import hold_time as daganzo_hold

# ---- simulation constants -------------------------------------------------
N_BUSES = 9
TARGET_HEADWAY_S = 300.0          # 5 minutes, scheduled dispatch interval
CRUISE_SPEED_MPS = 8.3            # ~30 km/h effective cruising speed
BASE_DWELL_S = 8.0                # minimum door-open time regardless of boarding
MINOR_STOP_DWELL_S = 16.0         # ordinary stops: fairly constant boarding, no feedback
# Crowd-feedback dwell (the actual bunching driver) is concentrated at the
# major junction stops -- this is where real headway-sensitive crowd buildup
# happens; ordinary stops have roughly constant boarding regardless of gap.
LANDMARK_PAX_BOARD_TIME_S = 1.2
LANDMARK_PAX_ARRIVAL_RATE = 0.025
LANDMARK_MAX_EXTRA_DWELL_S = 60.0
MAX_ASSUMED_GAP_S = 600.0
DWELL_NOISE = 0.2
SIGNAL_RED_PROB = 0.4
SIGNAL_MAX_DELAY_S = 50.0
TERMINUS_LAYOVER_S = 45.0
MIN_GAP_M = 25.0                  # buses may not pass each other (real constraint)
HEADWAY_WINDOW = 30               # rolling window size for CV metric

# Cooperative speed control (mechanism 2 above)
SPEED_GAIN = 0.35                 # how aggressively gap imbalance adjusts cruise speed
SPEED_FACTOR_MIN = 0.55
SPEED_FACTOR_MAX = 1.30
SPEED_EASE_THRESHOLD = 0.88       # speed_factor below this logged as "easing off"
SPEED_BOOST_THRESHOLD = 1.12      # speed_factor above this logged as "speeding up"

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
    events: list = field(default_factory=list)   # decision feed: hold/ok/speed events

    def record_headway(self, h):
        self.headway_samples.append(h)
        self.bunch_flags.append(1 if h < BUNCH_HEADWAY_FRAC * TARGET_HEADWAY_S else 0)
        if len(self.headway_samples) > HEADWAY_WINDOW:
            self.headway_samples.pop(0)
            self.bunch_flags.pop(0)

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
    def __init__(self):
        self.route = Route()
        self.t = 0.0
        self.control_enabled = False
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
            b = Bus(id=i, state=STATE_LAYOVER, timer_s=-i * TARGET_HEADWAY_S)
            self.fleet.buses.append(b)

    def set_control(self, enabled: bool):
        if enabled != self.control_enabled:
            self.fleet.events.append({
                "t": self.t, "bus_id": None, "stop": None,
                "action": "control_on" if enabled else "control_off",
            })
        self.control_enabled = enabled

    # -- disturbance model ------------------------------------------------
    def _dwell_time(self, bus: Bus, stop_idx: int) -> float:
        noise = 1.0 + DWELL_NOISE * (2 * det_rand("dwell", bus.id, bus.lap, stop_idx) - 1)
        stop = self.route.stops[stop_idx]
        if not stop["is_landmark"]:
            return MINOR_STOP_DWELL_S * noise
        last_dep = self.fleet.last_departure_at_stop.get(stop_idx)
        gap = (self.t - last_dep) if last_dep is not None else TARGET_HEADWAY_S
        gap = min(gap, MAX_ASSUMED_GAP_S)
        extra = min(LANDMARK_PAX_ARRIVAL_RATE * gap * LANDMARK_PAX_BOARD_TIME_S, LANDMARK_MAX_EXTRA_DWELL_S)
        return max(BASE_DWELL_S, (BASE_DWELL_S + extra) * noise)

    def _signal_delay(self, bus: Bus, signal_idx: int) -> float:
        roll = det_rand("signal_roll", bus.id, bus.lap, signal_idx)
        if roll > SIGNAL_RED_PROB:
            return 0.0
        frac = det_rand("signal_mag", bus.id, bus.lap, signal_idx)
        return frac * SIGNAL_MAX_DELAY_S

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
    def _update_speed_factors(self):
        L = self.route.length_m
        ideal_gap_m = TARGET_HEADWAY_S * CRUISE_SPEED_MPS
        buses = self.fleet.buses
        if not self.control_enabled or len(buses) < 2:
            for b in buses:
                b.speed_factor = 1.0
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
            factor = 1.0 + SPEED_GAIN * imbalance
            bus.speed_factor = max(SPEED_FACTOR_MIN, min(factor, SPEED_FACTOR_MAX))

            prev_state = bus.speed_state
            if bus.speed_factor < SPEED_EASE_THRESHOLD:
                new_state = "easing"
            elif bus.speed_factor > SPEED_BOOST_THRESHOLD:
                new_state = "boosting"
            else:
                new_state = "normal"
            if new_state != prev_state and new_state != "normal":
                self.fleet.events.append({
                    "t": self.t, "bus_id": bus.id, "stop": None,
                    "action": "speed_ease" if new_state == "easing" else "speed_boost",
                    "forward_gap_m": round(forward_gap, 0),
                    "backward_gap_m": round(backward_gap, 0),
                    "speed_factor": round(bus.speed_factor, 2),
                })
            bus.speed_state = new_state

    # -- main step ----------------------------------------------------------
    def step(self, dt: float):
        self.t += dt
        self._update_speed_factors()
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
                    fleet.record_headway(fwd_headway)

                    if self.control_enabled:
                        extra_hold = daganzo_hold(fwd_headway, TARGET_HEADWAY_S)
                        action = "hold" if extra_hold > 1.0 else "ok"
                    else:
                        action = "unmanaged"
                    fleet.events.append({
                        "t": self.t, "bus_id": bus.id, "stop": stop["name"],
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
            return "Marathahalli Bridge (terminus)"
        if bus.state in (STATE_DWELLING, STATE_HOLDING):
            return stops[bus.next_stop_idx - 1]["name"]
        if bus.next_stop_idx < len(stops):
            return f"approaching {stops[bus.next_stop_idx]['name']}"
        return "Silk Board Junction"

    # -- serialization for the frontend ------------------------------------
    def snapshot(self):
        buses_out = []
        for b in self.fleet.buses:
            lat, lon = self.route.latlon_at(b.dist_m)
            buses_out.append({
                "id": b.id,
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
            "buses": buses_out,
            "metrics": self.fleet.metrics(),
        }

    def pop_events(self):
        out = self.fleet.events
        self.fleet.events = []
        return out
