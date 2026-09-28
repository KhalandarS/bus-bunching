# Evaluation Rigor, Driver-Safety Speed Ramping, and a Passenger View

*Added 2026-08-03, on top of the React frontend migration. Three changes,
each answering a specific gap raised in review: (1) the headline CV numbers
came from watching one run, not a defensible evaluation; (2) cooperative
speed control could change a bus's target speed instantly, which is not
something you could safely hand to a real driver in live Bangalore traffic;
(3) the project had a control-room view and a driver view but nothing
representing how an actual rider would learn any of this.*

*Correction (2026-08-25): the "real 264-row logged dataset" referenced
throughout §"Update (2026-08-22)" below turned out to be very likely
synthetic (see "Update (2026-08-25)" at the bottom for the full
investigation and the corrected numbers). The evaluation **methodology**
described in §1 (paired multi-seed batch eval) and the speed-ramp safety fix
in §2 are unaffected — only the corridor geometry and disturbance parameters
they were applied to have changed. Numbers quoted anywhere above the final
section that derive from the old corridor/dataset are superseded; the
current, correct numbers are in "Update (2026-08-25)."*

---

## 1. Multi-seed statistical evaluation (`app/sim/batch_eval.py`)

**The gap.** `PROJECT_STATUS.md`'s "CV ~2.0 → ~0.25" result came from watching
a single live run. That's fine for a demo, but not defensible in front of a
mentor or an IEEE reviewer, who will reasonably ask: over how many trials,
and could the difference just be which red lights that one run happened to
draw?

**Method — paired, three-arm design.** For each of *N* independently seeded
trials, the same disturbance realization (which red lights, which dwell-time
noise draws) is replayed under three conditions:

- **off** — control never turns on (baseline)
- **holding_only** — Daganzo (2009) discrete holding only, cooperative speed
  control disabled — isolates what holding alone buys
- **combined** — holding + cooperative speed control together (what the live
  demo calls "AI Control: ON")

All three arms share an identical control-off warmup window before the
measured window starts, so they see the *exact same* disturbance history up
to that point. Pairing this way means across-trial noise (which red lights a
given trial drew) is differenced out rather than averaged out — it's what
lets a modest trial count detect a real effect.

Metrics are reported over two windows, because they tell different stories:
- **Full measured window** (120 min after the switch) — includes the
  recovery transient right after control turns on, so it's a conservative,
  "including the time it takes to work" number.
- **Steady-state tail** (last 30 min of that window) — what the live demo's
  rolling-window UI metric actually shows once the system has settled;
  this is what the original "~0.25" figure was describing.

This distinction itself was a real finding, not just a formatting choice —
see below.

**Reproduce it:**
```
cd C:\Users\Khalandar\Desktop\buncch\app
"C:\Users\Khalandar\AppData\Local\Programs\Python\Python312\python.exe" -m sim.batch_eval --trials 30 --warmup-min 90 --eval-min 120 --tail-min 30 --seed-base 1000 --out ../eval_results.json
```

**Results (n=30 trials, seeds 1000–1029, 12.2s wall-clock):**

Full measured window (120 min after control switches, includes recovery):

| metric | off | holding_only | combined |
|---|---|---|---|
| CV | 2.222 [2.205, 2.240] | 1.814 [1.774, 1.854] | 1.060 [1.026, 1.094] |
| % bunched | 79.1 [77.8, 80.5] | 65.5 [63.7, 67.3] | 25.9 [24.7, 27.0] |
| excess wait (s) | 594.4 [583.4, 605.4] | 418.8 [403.5, 434.0] | 207.9 [199.0, 216.9] |

combined vs off: CV mean diff = −1.162, z = −75.2, p ≈ 0 (n=30, paired)

Steady-state tail (last 30 min only):

| metric | off | holding_only | combined |
|---|---|---|---|
| CV | 2.245 [2.214, 2.276] | 1.328 [1.272, 1.385] | **0.245 [0.232, 0.258]** |
| % bunched | 80.1 [78.3, 81.8] | 54.4 [52.0, 56.7] | 3.6 [2.2, 5.0] |
| excess wait (s) | 609.1 [595.1, 623.1] | 256.7 [241.2, 272.1] | 93.4 [92.7, 94.1] |

combined vs off: CV mean diff = −2.000, z = −110.2, p ≈ 0 (n=30, paired)

**What this actually shows, that wasn't shown before:**
1. The steady-state CV of **0.245 [0.232, 0.258]** now statistically confirms
   the previously-quoted "~0.25" figure — with a tight 95% CI across 30
   independent disturbance realizations, not one lucky run.
2. The full-window number (CV → 1.06, not 0.25) is the more honest number to
   quote if someone asks "how good is it *on average*, including the time it
   takes to recover after you flip the switch" — worth stating plainly rather
   than only citing the flattering steady-state figure.
3. **The holding-only ablation quantifies, for the first time, what the
   cooperative speed control (mechanism 2) actually contributes.** Holding
   alone gets steady-state CV to ~1.33 (54% still bunched) — a real
   improvement over uncontrolled, but nowhere near "well-regulated." Adding
   speed control is what gets CV under the ~0.3 threshold the literature
   treats as well-regulated service. This was previously only *asserted* in
   `PROJECT_STATUS.md` ("this is the actual fix for pileups"); now it's
   measured.

**Statistical caveat (state this plainly if asked):** the confidence
intervals and p-values use a normal approximation (z = 1.96) to the sampling
distribution of the mean, valid for trial counts ≳30 by the central limit
theorem, not an exact Student-t interval. Good enough to support the claims
above (the effect sizes are large relative to the CIs), but say "approximate"
if pressed, not "exact."

**Paper-readiness:** this table (two windows × three arms × four metrics,
with CIs and paired significance) is now close to a drop-in Results section
table, including the honest full-window-vs-steady-state distinction and the
mechanism-2 ablation the paper's contribution claim rests on.

---

## 2. Driver-safety: rate-limited cooperative speed control (`app/sim/engine.py`)

**The concern raised:** cooperative speed control recomputed each moving
bus's target cruising-speed multiplier from live gap imbalance *every single
tick* and applied it instantly. Translated to a real deployment, that's
telling an actual BMTC driver, mid-traffic on the ORR, to instantly go from
cruising speed to 55% speed (or up to 130%) between one instant and the next.
A real driver executing that literally — hard braking or sudden
acceleration in dense Bangalore traffic — is a genuine safety and passenger-
comfort problem, not just a simulation nicety, and it's exactly the kind of
gap a live pilot would surface immediately.

**The fix:** the previously-instant assignment is now a bounded ramp.
`SPEED_FACTOR_RAMP_PER_S = 0.10` means the computed value is a *setpoint*,
and the bus's actual speed factor moves toward it at a capped rate — crossing
the full 0.55×–1.30× range takes roughly 7.5 simulated seconds, in the
neighborhood of a bus's comfortable ~0.8 m/s² acceleration/deceleration. This
applies symmetrically when control is switched off, too: a bus that was
mid-ease or mid-boost ramps back to normal speed gradually instead of
snapping, since a moving bus can't instantly resume full speed either.

Concretely (`sim/engine.py`):
- `_update_speed_factors` now takes `dt` and calls a new `_ramp_toward(bus,
  target_factor, max_delta)` helper instead of assigning the factor directly.
- The "control disabled" branch also ramps toward 1.0 instead of resetting
  it, for the same reason.

Verified directly (not just by inspection):
```
Simulation(seed=42), 50s uncontrolled -> speed_factors all 1.0
same sim, control on, +200s -> [1.3, 0.93, 1.142, 1.0, 1.001, 0.999, 1.001, 0.999, 0.55]
```
i.e. factors move gradually and land at sensible intermediate values, not
snapping straight to the 0.55/1.30 extremes.

**Honest remaining gap:** this bounds the *rate of the setpoint*, which is
enough to make the instruction physically followable — it is not a full
vehicle-dynamics model (no jerk limits, no following-distance safety margin,
no braking-distance check against the vehicle ahead). A real pilot deploying
this to an actual driver display would still need a transit-engineering
sign-off on the ramp rate and a real safety review, not just this simulation
change. Worth stating exactly that way if asked — this fixes the "we'd be
telling a driver to do something physically absurd" problem, not the full
"this is road-safety-certified" problem.

---

## 3. Passenger-facing view (`/passenger`)

**The gap raised:** the dashboard is a control-room view (for you and a
mentor) and `/driver` is an in-cab view (for a driver) — but nothing in the
project represented how an actual *rider* would find any of this out. That
matters because the original problem statement ("wait 40 minutes, three
buses come at once") is a *passenger* complaint — a system that fixes
bunching but gives passengers no visibility into it only half-closes the
loop.

**What was built:** a new React route, `/passenger`
(`app/frontend/src/pages/PassengerView.tsx`), reachable from the dashboard's
controls bar ("🧍 Open passenger view"). Pick a stop from a dropdown; see:
- the next ~3 buses' estimated arrival time (mm:ss) and distance away,
- a plain-English note when a bus is intentionally holding, easing, or
  boosting for spacing — so a bus that's deliberately holding doesn't read
  to a waiting rider as broken down or stuck,
- a live "AI spacing control: ON/OFF" badge.

ETA logic (`app/frontend/src/lib/passengerEta.ts`) is a straight-line,
constant-cruise-speed estimate along the route from each bus's current
position to the selected stop, with any current stationary wait (holding /
dwelling / signal / layover) added on top. This is explicitly flagged
in-page as approximate — it does not look ahead through every intervening
stop or signal, which would need a fuller route-position lookahead this
project doesn't otherwise do. Real ETA apps (Chalo, Google Maps transit)
make comparable simplifications; this isn't pretending to be more precise
than it is.

**Honest gap vs. a real deployment:** this is a web page, reachable to
whoever has the link — a real India rollout for a mass-transit rider base
needs to reckon with the fact that not every rider carries a smartphone with
a data plan. Real channels would include SMS/missed-call query, IVR, or
physical stop-side displays, none of which exist here. `PROJECT_STATUS.md`'s
GPS section already discusses the driver/tracking side of a real pilot in
some depth; it did not previously discuss the rider-facing channel at all —
this is a genuinely new item worth naming explicitly in the paper's
limitations/future-work section, not silently left out.

---

## 4. Three follow-up features (2026-08-03, later same day)

**Live θ / speed-gain sliders on the dashboard.** `sim/engine.py`'s
`Simulation` now has `self.theta` and `self.speed_gain` instead of reading
the module constants directly, plus `set_params(theta=, speed_gain=)`
(clamped to [0, 1]) and both values are included in every snapshot. The
dashboard has two new sliders (`ParamsPanel.tsx`) sending a `{"type":
"params", ...}` WS message on change — you (or your mentor) can feel the
overcorrection/oscillation tradeoff live instead of only reading about it in
`control.py`'s docstring. Verified end-to-end with a raw WebSocket client:
default snapshot reports `theta=0.6, speed_gain=0.35`; after sending a
`params` message, the next snapshot reflects the new values.

**Tap-a-bus decision drill-down on `/passenger`.** Each arrival card is now
clickable and expands to show that specific bus's last few decision-feed
entries (hold/no-action/speed-ease/speed-boost), in plain English
(`lib/eventText.ts`). Lets a rider — or a reviewer — trace a given ETA back
to *why* it is what it is, instead of just trusting a number.

**Automated tests (`app/tests/`, stdlib `unittest`, no new dependency).**
13 tests covering: `hold_time` bounds and monotonicity; that a fixed seed
reproduces an identical run bit-for-bit (this is the assumption the whole
batch-evaluation methodology in §1 depends on); that different seeds
actually diverge (batch_eval.py's trials aren't secretly replaying the same
script); that the speed-ramp safety fix never moves a bus's factor more
than the rate limit in one tick and stays in bounds; that disabling
`speed_control_enabled` truly holds the factor at 1.0 (the holding-only
ablation's basic assumption); and that `set_params` clamps out-of-range
input. Run with:
```
cd C:\Users\Khalandar\Desktop\buncch\app
"C:\Users\Khalandar\AppData\Local\Programs\Python\Python312\python.exe" -m unittest discover -s tests -v
```
(scipy and pytest are not installed in this environment and were not
installed for this — the batch evaluation's statistics and these tests both
use only the Python standard library.)

---

## Files touched

- `app/sim/engine.py` — seed threading through `det_rand` (needed so
  `batch_eval.py` can run independent trials instead of always replaying the
  same disturbance draws), `Fleet.headway_log` (unbounded history for
  offline analysis, separate from the bounded rolling window the live UI
  uses), `speed_control_enabled` flag (for the holding-only ablation), and
  the rate-limited speed ramp.
- `app/sim/batch_eval.py` — new, the batch statistical evaluation script.
- `app/server.py` — `Simulation(seed=...)` randomized on reset (each reset
  now gets a fresh disturbance realization instead of literally replaying
  the same script); new `/passenger` route (SPA shell, same pattern as
  `/driver`).
- `app/frontend/src/pages/PassengerView.tsx`, `lib/passengerEta.ts`,
  `styles/passenger.css` — new passenger view.
- `app/frontend/src/App.tsx` — added the `/passenger` route.
- `app/frontend/src/components/ControlsBar.tsx` — added the passenger-view
  link.

---

## Update (2026-08-22): real Tumkur data replaces the synthetic Bangalore corridor

**Superseded 2026-08-25 — see the final section below.** The 264-row CSV
this section describes as "real logged data" turned out to be very likely
synthetic; it and its corridor/calibration numbers are retired. This section
is kept as a historical record of what was believed at the time, not as
current information.

*The user supplied a 264-row dataset described at the time as a real logged
(`data/tumkur_siet_bus_bunching_data_264rows.csv`: 30 trips, 9 real stops with
GPS coordinates and real cumulative road distance, a 6-bus real fleet, Tumkur,
Karnataka) and asked for the simulation to actually be calibrated against it,
not just re-skinned. Everything in this section postdates and does not
reopen the evaluation-rigor / speed-ramp-safety work above — that methodology
(paired multi-seed batch eval, rate-limited speed ramp) is unchanged; only the
corridor, fleet, and disturbance *parameters* it's applied to changed.*

**What was actually measurable in the real data** (`data/analyze.py` has the
full breakdown): dwell time is flat across all 9 stops (mean 26s, std 10s) and
essentially uncorrelated with headway (r=0.08) — so the earlier synthetic
model's "dwell grows with how long since the last bus left" crowd-feedback
term does not hold up against this dataset and was removed for this corridor,
rather than kept and just relabeled. What *does* show up clearly is a per-hop
delay that accumulates stop to stop (mean ~48s, positive on ~93% of hops,
std ~42s) — that's now modeled as an exponential draw at every intermediate
stop, replacing the old discrete "40% chance of a red light" model. This
matters for defensibility: the demo's bunching mechanism is now the one the
real logs actually support (accumulating i.i.d. per-hop delay + no-overtaking
constraint, i.e. Newell & Potts 1964), not an assumed crowd-buildup story.

**Route geometry.** The 9 stops' real GPS coordinates came straight from the
CSV. An OSRM road-routing fetch was done per-hop (8 hops between 9 stops,
`app/data/build_tumkur_route.py`) and checked against the CSV's own reported
distance for that hop: 5 hops agreed within 1.5x (a plausible real-road/
straight-line ratio — this cluster runs 0.95-1.37x) and kept real
road-following geometry; 3 hops (both hops touching "Antharasanahalli", plus
the final hop into SIET College Gate) came out 1.55-2.65x the CSV's distance,
routed through 10+ turns each — small-town OSM coverage gaps around those
specific points are the likely cause, not a chaining artifact (confirmed by
re-querying the worst hop in isolation: same 2.65x result). Those 3 hops fall
back to a straight line between the real coordinates instead of shipping a
geometrically wrong detour; the other 5 (63% of the corridor) are genuine
OSRM road geometry. If a mentor asks why the map isn't fully curved: it is,
where the road data actually supports it — the straight segments are an
honest fallback, not a shortcut taken everywhere.

**Target headway is derived, not imported.** The CSV's 1200s (20 min) is a
scheduled one-way dispatch interval; this engine models continuous closed-loop
circulation of a small fixed fleet (necessary for an interactive live-toggle
demo). Those are different real-world operating models — feeding 1200s
directly into a 6-bus closed loop with a ~2180s round trip would make the
holding logic compare against a headway the fleet structurally cannot run at
(steady-state spacing is loop_time/N_BUSES regardless of the nominal target).
`TARGET_HEADWAY_S` = 360s was computed by dividing the calibrated mean
round-trip time by the real fleet size, not tuned by feel.

**Re-verified, not just re-labeled:**
- `app/tests/` (13 tests) still pass unchanged — they exercise `control.py`
  and `engine.py` mechanics generically (ramp bounds, reproducibility,
  clamping), none hardcode the old Bangalore-specific constants.
- Re-ran `batch_eval.py` (30 trials, same methodology as above) against the
  new calibration: steady-state CV 0.830 (off) → 0.208 (combined), bunch_pct
  22.1% → 0.11%, both p≈0 — see `app/eval_results.json` and
  `PROJECT_STATUS.md`'s "Measured result" for the full table.
- Real bus plates (KA-06-F-1201/1345/1522/1678/1899/2011) now flow end to end:
  `engine.py`'s `Bus.plate` → WS snapshot/events → frontend `types.ts` →
  displayed (via a new `shortPlate()` helper in `lib/format.ts`) on the map,
  driver console, decision feed, and passenger view, instead of bare
  integer IDs.

**Files touched:** `app/sim/engine.py` (constants, dwell/signal formulas,
`Bus.plate`, docstring), `app/sim/route.py` (docstring only), `app/data/
build_tumkur_route.py` (new) + `app/data/route.json` (regenerated), `data/
analyze.py` (new, calibration stats), `app/frontend/src/types.ts` (`plate`,
`bus_plate` fields), `lib/format.ts` (`shortPlate`), `components/MapView.tsx`,
`components/EventsFeed.tsx`, `pages/DriverConsole.tsx`, `pages/
PassengerView.tsx`, `lib/passengerEta.ts` (plate display), `pages/
Dashboard.tsx` (subtitle + "How this works" explainer text), `lib/
driverStatus.ts` (signal-delay copy tweak), `PROJECT_STATUS.md` (full
refresh).

---

## Update (2026-08-25): the 264-row dataset was very likely synthetic — corridor rebuilt around 4 real, verified stops

**What happened.** A request to fix road-following geometry for two specific
coordinates led to independently researching the real Tumkur KSRTC Bus Stand
→ SIET College Gate route via OpenStreetMap (Nominatim geocoding, Overpass
POI search) and an AI-search-assisted landmark route description.
Cross-checking that research against the 264-row CSV used since the
2026-08-22 update surfaced a large discrepancy: the CSV's corridor was
~8.9km, roughly double the real ~4.3km road distance between the same two
termini; its route drifted steadily east and never turned north onto the
real Sira Road corridor; and its "Tumkur City Railway Station" stop
coordinate (13.3499°N, 77.1180°E) was several kilometers from that station's
real, OSM-verified location. Only the two termini were independently
confirmable — the 7 intermediate stops could not be, and at least one was
demonstrably wrong.

**Conclusion:** the dataset was very likely synthetic (plausible stop names
paired with hand-authored, incrementing coordinates), not an actual GPS log,
despite being presented as one throughout the 2026-08-22 update above. It has
been moved to `data/deprecated_synthetic_dataset/` with a README documenting
this finding, and is no longer used anywhere. This is disclosed here, and in
`METHODOLOGY.md` Section G, rather than silently corrected — the project's
academic-integrity requirement is to name the error, not just fix the
numbers.

**What replaced it — real geometry, explicitly-labeled assumptions.**
- 4 stop coordinates (`data/tumkur_bus_stand_siet_stops.csv`), independently
  verified as above: Tumkur KSRTC Bus Stand, Ashoka Circle (Amanikere Lake),
  Siragate Circle (Kalidas Circle), SIET College Gate.
- `app/data/build_tumkur_route.py` rewritten to build `route.json` from these
  4 stops; OSRM road geometry for all 3 hops gives a measured corridor length
  of 4296.15m, matching the independently researched real-world distance.
- `sim/engine.py`'s disturbance parameters are now explicitly labeled
  assumptions (no real per-trip log exists for this corridor), not claimed
  statistics: `CRUISE_SPEED_MPS` 8.63→5.5 m/s, `DWELL_MEAN_S` 26→20s,
  `HOP_DELAY_MEAN_S` 47→35s, `HOP_DELAY_MAX_S` 180→150s. `TARGET_HEADWAY_S`
  recomputed from these (4296.15/5.5 + 2·20 + 2·35 + 45 ≈ 936s / 6 buses,
  rounded to 150s), down from 360s. `N_BUSES` (6) and the KA-06 plate numbers
  are unchanged but now labeled as an assumed fleet scale / illustrative
  plates rather than a logged roster.
- Frontend constants updated to match: `BUNCH_DIST_M` (geo.ts) 229→75m,
  `CRUISE_SPEED_MPS` (passengerEta.ts) 8.63→5.5. Dashboard copy rewritten to
  describe real, verified route geometry plus an assumption-based
  disturbance model instead of a "264-row logged dataset."

**Re-verified, not just re-labeled:**
- `app/tests/` (13 tests) still pass unchanged — corridor-agnostic.
- Re-ran `batch_eval.py` (30 trials, same paired multi-seed methodology as
  §1 above, unchanged) against the new corridor/calibration:

  Steady-state tail (last 30 min):

  | metric | off | holding_only | combined |
  |---|---|---|---|
  | CV | 0.763 [0.678, 0.849] | 0.456 [0.406, 0.507] | 0.311 [0.286, 0.337] |
  | % bunched | 18.436 [14.620, 22.251] | 6.879 [4.711, 9.048] | 1.234 [0.489, 1.980] |
  | excess wait (s) | 118.898 [107.568, 130.228] | 80.142 [76.448, 83.836] | 72.159 [70.932, 73.387] |

  combined vs off: CV mean diff = −0.452, z = −10.25, p ≈ 0 (n=30, paired)

  `app/eval_results.json` (repo root) regenerated; `PROJECT_STATUS.md`'s
  "Measured result" table updated to match.
- Since route geometry and disturbance magnitudes both changed together
  (unlike the 2026-08-25-earlier-in-the-day corridor-length rescaling, which
  preserved dynamics by construction), these numbers are a genuinely new
  result, not a re-derivation of the same underlying dynamics — expected,
  since both the corridor length and the assumed disturbance parameters
  changed independently this time.

**Files touched:** `app/sim/engine.py` (constants, docstrings), `app/data/
build_tumkur_route.py` (rewritten for the 4-stop source), `app/data/
route.json` (regenerated), `data/tumkur_bus_stand_siet_stops.csv` (new),
`data/deprecated_synthetic_dataset/` (new, retired CSV + analyze.py +
README), `app/frontend/src/lib/geo.ts` (`BUNCH_DIST_M`), `app/frontend/src/
lib/passengerEta.ts` (`CRUISE_SPEED_MPS`), `app/frontend/src/pages/
Dashboard.tsx` (subtitle + "How this works" text), `METHODOLOGY.md` (Sections
B, C, D.1, D.2, D.3, E, F, G rewritten), `PROJECT_STATUS.md` (full refresh),
this file.
