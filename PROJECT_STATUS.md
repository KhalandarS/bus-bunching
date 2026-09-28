# Project Status — Bus Bunching Prevention System (Tumkur SIET Corridor Demo)

*Last updated: 2026-08-25 — rebuilt the corridor around 4 real,
independently-verified stops (~4.3km) after discovering the previously-used
264-row "logged dataset" was very likely synthetic. See "Update (2026-08-25)"
at the bottom for the full writeup — the numbers throughout this file below
have been refreshed to match.*

## Current design (v2)

**One fleet, one map, a live "AI Control: ON/OFF" switch.** You watch the same
6 illustrative buses (KA-06-F-1201/1345/1522/1678/1899/2011 — plausible plates
in the real Tumkur registration series, fleet size assumed, not logged — see
"Honest caveats" below) run unmanaged (bunching develops, visibly, with a red
"🚨 N buses bunched" banner), then flip control on and watch the same fleet
recover in real time. Measured headlessly over 30 seeded trials (see "Measured
result" below): steady-state headway CV is **0.763** uncontrolled vs **0.311**
with both control mechanisms on — both statistically significant (p<0.001),
not just an impression from one run.

**Two control mechanisms run together when AI control is on** (this is also
what fixed the pileup complaint):
1. Daganzo (2009) discrete **holding** at both intermediate real stops (every
   stop on this 4-stop corridor except the two termini).
2. Daganzo & Pilachowski (2011) **cooperative speed control** between stops —
   every moving bus continuously eases up or speeds up a little based on its
   gap to the bus ahead vs. the bus behind. This is new in v2 and is the actual
   fix for "3-4 buses piling up at one stop": under holding alone, correction
   only happens in discrete lumps at stops, so buses could still queue up
   nose-to-tail between corrections; continuous speed adjustment smooths that
   out before it turns into a stop-side pileup.

**Live decision feed** narrates every control-point arrival in plain English —
not just holds, but "gap fine, no action" and "control disabled, no action
taken" too, so it reads as continuous monitoring rather than an occasional
scripted event — plus speed-control events ("Bus 5 easing to 0.81× speed,
crowding the bus ahead"). This is the piece meant to make the system feel like
an actual dispatcher making decisions, not a physics animation.

**Bunching is now explicit, not inferred.** When 2+ buses cluster within 75m
of each other, the frontend fans their markers out along a perpendicular to
the road (so you see distinct buses in a tight queue, not one overlapping
blob) and raises a pulsing "🚨 N buses currently bunched" banner — turning what
read as a rendering bug in v1 into the intended, explicit demonstration of the
exact "three buses at once" phenomenon from the original pitch.

## Real-world GPS + driver actuation (answers "how would this actually work")

**GPS tracking — this isn't actually a hardware problem in India.** India's
AIS-140 regulation already mandates GPS/panic-button telematics devices on all
public service vehicles, including buses — the hardware is very likely already
on real KSRTC buses. The real gap is *data access*, not tracking capability.
Three realistic tiers, cheapest first:
1. **Partner with the data holder.** [Chalo](https://www.chalo.com) already
   does exactly this commercially for BMTC and 15+ other Indian cities (live
   GPS + arrival prediction, per public app-store listings) — for a KSRTC town
   service like this one, the equivalent path is a data-sharing conversation
   with the depot/division directly, not building new tracking infrastructure.
2. **DIY pilot on a volunteer fleet, no agency needed.** A spare Android phone
   mounted per bus running an open-source GPS-forwarding client (e.g.
   [Traccar](https://www.traccar.org/)'s free client app) posts location to a
   server every few seconds over mobile data — enough for a real few-bus pilot
   without any institutional partnership. This is the actual next step if you
   wanted to move off logged/simulated data to a live feed.
3. **Real route geometry + assumption-based simulation** (what this project
   currently does — see the 2026-08-25 update below) — good for proving the
   control algorithm on a real corridor's real geometry, not a substitute for
   a live feed or for real disturbance statistics (see caveats below).

**Driver actuation — built and running (`/driver`).** The same phone used for
GPS in tier 2 above can double as the instruction display: `app/static/driver.html`
is a live "driver console" page — pick a bus, and it shows a full-screen,
high-contrast, icon-first display driven by the same live simulation:
a red "✋ WAIT HERE" screen with a live countdown and plain-English reason when
that bus is being held, a green "GO" screen otherwise, an audible beep the
moment a hold begins, and a note when cooperative speed control is easing or
boosting that bus. Open it from the "🚌 Open driver console" link on the main
dashboard, or directly at `/driver`.

Honest gap: the on-screen English text would need proper localization (most
KSRTC drivers' working language is Kannada) — that needs a native-speaker pass,
not a machine translation guess, so the demo intentionally leans on
color/icon/audio cues that don't depend on reading English, and leaves the
wording as an English placeholder rather than shipping unverified Kannada.

## What got built (components)

A working, live simulation and dashboard, on a real corridor's real,
independently-verified geometry, that proves the "invisible traffic cop"
concept from the original pitch — with an explicitly-labeled assumption-based
disturbance model, not silently presented as measured from data that doesn't
exist (see "Update (2026-08-25)" below for why this framing changed).

**Corridor:** Tumkur KSRTC Bus Stand → SIET College Gate, Tumkur (~4.3 km
along Ashoka Road / Sira Road, measured from real road geometry — see "Road
geometry" below) — 4 real stops (Tumkur KSRTC Bus Stand, Ashoka Circle /
Amanikere Lake, Siragate Circle / Kalidas Circle, SIET College Gate), with
coordinates independently verified against OpenStreetMap (Nominatim/Overpass)
and a cross-checked landmark route description
(`data/tumkur_bus_stand_siet_stops.csv`).

**Road geometry:** real OSRM road-following polyline for all 3 hops between
stops, totalling ~4.296km — closely matching the independently researched
real-world distance for this route (see `app/data/build_tumkur_route.py`).
Cruise speed (5.5 m/s) is a documented assumption for moving-only speed on a
mixed-traffic town corridor, not derived from any logged data — see the
2026-08-25 update below.

**What it shows, live, on one map:**
- 6 buses (fleet size assumed, see "Honest caveats"), spaced by a headway
  *derived* from the expected round-trip time divided by fleet size (~150s /
  2.5 min — see the 2026-08-25 update below for the arithmetic), hit by a
  random traffic/signal delay at every intermediate stop (mean ~35s,
  exponential, an assumed value, not fit to any log).
- A big "AI Control: ON/OFF" switch you flip live. Off: watch buses visibly
  clump together over a few loops (with an explicit "🚨 N buses bunched"
  banner when it happens) — exactly the "three buses at once" phenomenon from
  the pitch. On: the same fleet, going forward, runs Daganzo (2009) adaptive
  holding *and* Daganzo & Pilachowski (2011) cooperative speed control —
  watch spacing visibly recover over the next few minutes.
- A live decision feed narrating every control-point check in plain English
  (hold / no-action / control-disabled / speed-easing / speed-boosting), plus
  live metric tiles (CV, mean headway, estimated rider wait, % time bunched)
  and a CV chart with dashed markers at the moments you toggled control.

## How to run it

```
cd C:\Users\Khalandar\Desktop\buncch\app
"C:\Users\Khalandar\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```
Then open **http://127.0.0.1:8000** for the control-room dashboard, **/driver**
for the driver console, or **/passenger** for the rider-facing view. The
frontend is a built React/Vite app (`app/frontend/`) served as static files
from `app/static/dist/` — after any change under `app/frontend/src`, rebuild
with `npm run build` (from `app/frontend/`) before refreshing the browser;
`--reload` only picks up backend (`.py`) changes automatically.

Controls: the big AI Control switch, Pause/Resume, Skip ahead 10 min (instant
fast-forward so you don't wait real-time for bunching/recovery), Speed slider
(0.25×–6×), Reset (fresh fleet, control OFF, t=0).

## Project layout

```
buncch/
  bus-bunching-prevention-research.md   <- original research brief (approved)
  PROJECT_STATUS.md                     <- this file
  data/
    tumkur_bus_stand_siet_stops.csv     <- 4 real, independently-verified stop coordinates
    deprecated_synthetic_dataset/       <- retired 264-row CSV + analyze.py, unused (see README.md there)
  app/
    server.py                           <- FastAPI app: HTTP + WebSocket tick stream
    sim/
      route.py                          <- real-road linear referencing (lat/lon <-> distance)
      control.py                        <- Daganzo adaptive holding control law
      engine.py                         <- single toggleable fleet: buses, dwell/signal disturbances,
                                            holding + cooperative speed control, metrics
      batch_eval.py                     <- headless multi-seed statistical evaluation
    tests/                              <- unittest coverage for control.py / engine.py
    data/
      build_tumkur_route.py             <- verified stops -> route.json (real OSRM road geometry for every hop)
      route.json                        <- processed route geometry (generated, served via GET /route)
    frontend/                           <- React + Vite source (Dashboard, DriverConsole, PassengerView)
    static/dist/                        <- built frontend (npm run build output), served by FastAPI
```

## How it actually works

**1. Real stops, real distances.** `sim/route.py` builds a cumulative-distance
table over the 4 real, independently-verified Tumkur stop coordinates so any
bus's position can be expressed as "N meters along the corridor" and
converted back to real lat/lon for the map. This is the same "linear
referencing" technique real transit-ops systems use.

**2. Why bunching happens (modeled from documented assumptions, not real
per-trip logs — none exist for this corridor).** Two disturbance sources feed
the simulation, both explicitly labeled as assumed rather than measured (see
METHODOLOGY.md Section D.1):
- *Per-hop traffic/signal delay* — at every intermediate stop, an exponential
  random delay (mean ~35s, capped 150s), a standard shape for stochastic
  urban-traffic delay. This is the *exogenous* random shock.
- *Dwell time* — flat per-stop noise (mean ~20s, ~33% relative noise), not a
  crowd-buildup function of headway gap — appropriate for low-ridership
  intermediate stops where boarding volume doesn't meaningfully track how
  full the bus already is. Bunching comes from the exogenous per-hop delay
  variance accumulating with no self-correction, combined with the
  no-overtaking constraint — the classical Newell & Potts (1964) mechanism.

The random delay draws are keyed deterministically by bus/lap/stop so
re-running is reproducible, but since this is one fleet observed before/after
a live toggle (not two parallel universes), fairness comes from literally
being the same buses under the same evolving conditions, just with the
control law switched on partway through.

**3. The two control mechanisms**, both active when AI control is on:

Discrete holding at both intermediate real stops (Daganzo 2009):
```
hold = max(0, θ · (H_target − forward_headway))
```
where `forward_headway` is the time since the bus immediately ahead left that
same stop, `H_target` is the *derived* 150s (2.5 min) target headway — see the
2026-08-25 update below for the arithmetic — and `θ≈0.6` is a *damping*
factor — held for only part of the gap
it's missing, not the whole thing (full correction, θ=1, actually
overcorrects and re-triggers oscillation — the non-obvious result from the
literature that makes this a studied algorithm, not a naive fix).

Continuous cooperative speed control between stops (Daganzo & Pilachowski 2011):
every moving bus's cruising speed is nudged by a factor proportional to
`(forward_gap − backward_gap) / ideal_gap` — easing off if it's crowding the
bus ahead with room behind, speeding up if the reverse. This is what prevents
the discrete holds from being the *only* lever, and is the direct fix for
buses queueing up 3-4 deep at one stop: corrections get smoothed out
continuously along the road instead of dumped entirely at discrete points.

Every control-point check (hold, no-action, or control-disabled) and every
speed-state transition is logged to the live decision feed.

## Measured result (this is the proof)

Re-run against the rebuilt 4-stop/~4.3km Tumkur engine on 2026-08-25 (real
road geometry for all 3 hops, assumption-based disturbance model — see
below), 30 seeded trials, 90min warmup / 120min measured window / 30min
steady-state tail (`eval_results.json` has the full per-trial data):

| | off | combined (holding + speed control) |
|---|---|---|
| Headway CV (steady-state) | **0.763** [0.678, 0.849] | **0.311** [0.286, 0.337] |
| % of arrivals "bunched" (steady-state) | **18.4%** [14.6, 22.3] | **1.23%** [0.49, 1.98] |
| Excess wait, s (steady-state) | **118.9** [107.6, 130.2] | **72.2** [70.9, 73.4] |

`combined vs off` on steady-state CV: mean diff **-0.452**, z=-10.25, p≈0 —
not a one-run impression, a 30-trial paired result.

**In plain terms:** with control off, headways don't just get uneven, they
collapse — roughly 1 in 5 arrivals ends up bunched, the "wait a while, then
three come at once" phenomenon this corridor's assumed dwell/delay
parameters are enough to produce on their own, given real corridor geometry
and the no-overtaking constraint. Flip AI control on and the same fleet's
spacing visibly recovers and stabilizes — you can watch the CV number fall
and the bunching banner stop firing in real time. As with any simulation
built on assumed (not logged) disturbance magnitudes, treat the exact
percentages as illustrative of the effect's direction and size, not as a
validated measurement of this corridor's real-world bunching rate (see
"Honest caveats" below).

## Honest caveats (worth knowing before showing this to anyone technical)

- Route geometry (stop coordinates, road-following polyline, ~4.3km corridor
  length) is real and independently verifiable. Fleet size (6), bus plates,
  and the disturbance model's parameters (dwell time, per-hop delay) are
  **documented assumptions**, not measurements — no real per-trip GPS/AVL log
  exists for this corridor. An earlier version of this project presented a
  264-row CSV as such a log; independent verification found it was very
  likely synthetic and it has been retired (see "Update (2026-08-25)" below
  and `data/deprecated_synthetic_dataset/README.md`). Treat the headline
  numbers above as illustrating the *existence and mechanism* of the
  bunching effect and the *relative* improvement from control, not as a
  validated measurement of this corridor's real-world severity.
- `TARGET_HEADWAY_S` (150s) is *derived* from dividing the expected
  round-trip time (built from the assumed disturbance parameters above) by
  the assumed 6-bus fleet size — see the 2026-08-25 update below for the
  arithmetic.
- No driver-facing actuation exists on a real bus (per the original research
  brief, that requires an actual transit-agency partnership) — this is
  Phase 0/1 from that brief: simulation + live visualization, proving the
  algorithm.

## Possible next steps (not started — for your call)

1. Swap in a real live GPS feed (see the DIY/Traccar tier above) instead of an
   assumption-based disturbance model — would let this become a live
   monitoring dashboard on real buses rather than a calibrated demo, and
   would let the dwell/delay parameters be genuinely fit to data instead of
   assumed.
2. Log real per-trip data for this specific corridor (even a modest sample)
   to replace the assumed dwell/per-hop-delay parameters with fitted ones.
3. Kannada localization pass on the driver console (`/driver`) and passenger
   view (`/passenger`) text — currently English placeholders (see above).

## Update (2026-08-03): statistical evaluation, speed-ramp safety fix, passenger view

See `EVALUATION_AND_SAFETY_NOTES.md` for full detail. Summary:
- A headless multi-seed batch evaluation (`app/sim/batch_eval.py`) replaces
  the single-run demo numbers above with a 30-trial paired statistical
  comparison (off / holding-only / combined), reported over both the full
  recovery window and a steady-state tail. Steady-state combined CV:
  **0.245 [0.232, 0.258]** (n=30) — statistically confirms the "~0.25"
  figure quoted above rather than resting on one observed run.
- Cooperative speed control (mechanism 2) previously changed a bus's target
  cruising speed instantly, tick to tick — unsafe if ever translated to a
  real driver instruction. It's now rate-limited (`SPEED_FACTOR_RAMP_PER_S`
  in `sim/engine.py`) so speed changes ramp gradually, in line with
  comfortable bus acceleration/deceleration.
- Added a passenger-facing view (`/passenger`) — the project previously had
  a control-room dashboard and a driver console but nothing representing how
  an actual rider would learn a bus is coming or is intentionally holding.

## Update (2026-08-22): migrated to the real Tumkur SIET corridor + fleet

A real 264-row logged dataset (`data/tumkur_siet_bus_bunching_data_264rows.csv`
— 30 trips, 9 real stops, a 6-bus real fleet, Tumkur, Karnataka) replaced the
synthetic Bangalore ORR corridor everywhere. `data/analyze.py` holds the
calibration statistics; `app/data/build_tumkur_route.py` builds the new
route.json.

- **Route.** Real GPS coordinates for all 9 stops (Tumkur KSRTC Bus Stand →
  SIET College Gate, 8.73km along the built polyline). OSRM road geometry was
  fetched per-hop (8 hops between 9 stops) and checked against the dataset's
  own reported distance for that hop; 5 of 8 hops agreed within 1.5x (a
  plausible real-road/straight-line ratio) and kept real road-following
  geometry, while 3 hops came out 1.5-2.6x the dataset's distance (Tumkur's
  OSM coverage is patchy enough to route through a maze of turns on a couple
  of hops) and fall back to a straight line between the real coordinates
  instead of a fabricated-looking detour — see `app/data/build_tumkur_route.py`
  for the exact per-hop numbers.
- **Fleet.** `N_BUSES` dropped from 9 to 6, matching the real fleet
  (KA-06-F-1201/1345/1522/1678/1899/2011), which now appear as real plates in
  the UI (map labels, driver console, decision feed, passenger view) instead
  of bare integer IDs.
- **Disturbance model, recalibrated from the real data, not re-tuned by feel:**
  cruise speed 8.3→5.65 m/s (real mean inter-stop segment speed, ~20km/h);
  dwell time changed from a landmark-only crowd-feedback formula to flat
  per-stop noise (mean 26s, std 10s) because the real data shows dwell is
  *not* headway-correlated here (r=0.08) — forcing the old feedback narrative
  onto this corridor would have been dishonest to the data; the old discrete
  "40% chance of a red light" signal model was replaced with an exponential
  per-hop delay (mean 48s) fit to the real per-hop delay_sec increase (which
  is positive on ~93% of hops, not a discrete low-probability event).
- **Target headway is derived, not copied from the CSV.** The CSV's 1200s
  (20 min) figure is a *scheduled dispatch interval* for one-way trips from a
  terminus; this engine models a small fleet in continuous closed-loop
  circulation (needed for a live interactive demo). Feeding 6 buses into a
  ~2180s loop at a 1200s target is physically inconsistent — steady-state
  in-service spacing would collapse to loop_time/N_BUSES (~365s) regardless of
  the nominal target, making every holding decision compare against a headway
  the fleet can never run at. `TARGET_HEADWAY_S` is instead the calibrated
  mean round-trip time divided by the real fleet size, rounded to 360s (6 min).
- **Re-ran the batch evaluation** against the new calibration (30 trials): CV
  0.830→0.208 steady-state (previously 0.245 under the old Bangalore
  calibration), bunch_pct 22.1%→0.11%, both p≈0. `app/eval_results.json`
  updated; existing unittest suite (`app/tests/`) still passes unchanged
  (13/13) since it exercises `control.py`/`engine.py` mechanics generically,
  not corridor-specific numbers.
- Updated all location-specific text across the frontend (Dashboard subtitle
  and "How this works" explainer, driver-console and passenger-view copy) and
  this file to describe the real corridor and real disturbance model instead
  of the retired Bangalore framing.

## Update (2026-08-25): corrected a data-provenance error, rebuilt the corridor around 4 real, verified stops

**What triggered this.** A request to fix the map's road-following geometry
for two specific coordinates led to independently researching the real
Tumkur KSRTC Bus Stand → SIET College Gate route (OpenStreetMap Nominatim/
Overpass geocoding, plus an AI-search-assisted landmark route description).
Cross-checking that research against the 264-row CSV used since the
2026-08-22 update above surfaced a large discrepancy: the CSV's corridor was
~8.9km, roughly double the real ~4.3km road distance between the same two
termini, its route drifted steadily east and never turned north onto the
real Sira Road corridor, and its "Tumkur City Railway Station" stop
coordinate was several kilometers from that station's real, OSM-verified
location. Only the two termini were independently confirmable; the 7
intermediate stops could not be, and at least one was demonstrably wrong.

**Conclusion: the 264-row dataset was very likely synthetic**, not a real
logged bus-tracking dataset as it had been described throughout this project
since 2026-08-22 (and, per that update's writeup, presented as the basis for
"real" calibration). It has been moved to
`data/deprecated_synthetic_dataset/` (with a README documenting the exact
findings above) and is no longer used anywhere in the simulation, docs, or
results.

**What replaced it.**
- **Stops.** 4 real, independently-verified stops
  (`data/tumkur_bus_stand_siet_stops.csv`): Tumkur KSRTC Bus Stand, Ashoka
  Circle (Amanikere Lake), Siragate Circle (Kalidas Circle), SIET College
  Gate. The two intermediate stops were placed by interpolating along the
  real OSRM road polyline at the landmark distances from the independently
  researched route description (~1.3km, ~3.0km from the bus stand).
- **Route.** `app/data/build_tumkur_route.py` rewritten to build
  `route.json` from these 4 stops; OSRM road geometry fetched for all 3 hops
  gives a measured corridor length of **4296.15m**, closely matching the
  independently researched real-world distance.
- **Disturbance model, reframed as documented assumptions, not "real data."**
  There is no real per-trip log for this corridor, so `sim/engine.py`'s
  constants are now explicitly labeled assumptions instead of claimed
  statistics: `CRUISE_SPEED_MPS` 8.63→5.5 m/s (assumed moving-only speed,
  ~20km/h, for a mixed-traffic town corridor), `DWELL_MEAN_S` 26→20s,
  `HOP_DELAY_MEAN_S` 47→35s (`HOP_DELAY_MAX_S` 180→150s). `N_BUSES` (6) and
  the KA-06 plate numbers are unchanged but now labeled as an assumed fleet
  scale / illustrative plates, not a logged roster.
- **`TARGET_HEADWAY_S`** recomputed from the new assumed constants: expected
  lap time = 4296.15/5.5 + 2·20 + 2·35 + 45 ≈ 936s, divided by 6 buses,
  rounded to **150s (2.5 min)**, down from 360s.
- **Frontend constants**, updated to match: `BUNCH_DIST_M` (geo.ts) 229→75m,
  `CRUISE_SPEED_MPS` (passengerEta.ts) 8.63→5.5 to match the new engine
  value. Dashboard subtitle and "How this works" copy rewritten to describe
  real, independently-verified route geometry plus an assumption-based
  disturbance model, instead of a "264-row logged dataset."
- **Re-ran everything.** Frontend rebuilt (`tsc -b && npm run build`);
  backend unittest suite still 13/13 (corridor-agnostic); batch evaluation
  re-run (30 trials): steady-state CV **0.763→0.311**, bunch_pct
  **18.4%→1.23%**, both p≈0 (see "Measured result" above; `eval_results.json`
  updated).
- `METHODOLOGY.md` substantially rewritten (Sections B, C, D.1, D.2, D.3, E,
  F, G) to describe the real 4-stop/4.3km corridor, the assumption-based
  calibration, and — in Section G — the data-provenance correction itself,
  disclosed rather than silently fixed.
