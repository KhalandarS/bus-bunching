# Project Status — Bus Bunching Prevention System (Bangalore ORR Demo)

*Last updated: 2026-08-01 — rebuilt per feedback: v1 (two side-by-side fleets +
trajectory chart) didn't read as clearly "intelligent" and had a visible bug
(buses piling up 3-4 deep at one stop). Rebuilt as a single toggleable fleet
with a live decision feed and a second control mechanism (cooperative speed
control) that directly reduces the pileup problem instead of just hiding it.*

## Current design (v2)

**One fleet, one map, a live "AI Control: ON/OFF" switch.** You watch the same
9 buses run unmanaged (bunching develops, visibly, with a red "🚨 N buses
bunched" banner), then flip control on and watch the same fleet recover in
real time — CV drops from ~1.5-2.2 down to ~0.2-0.3 over a few laps, and the
recovery is marked directly on the CV chart with a dashed line at the moment
you flipped the switch. Measured headlessly before shipping: bunching genuinely
climbs to CV ~2+ / ~70% of headway samples "bunched" under 15+ minutes of
no control, then decays to CV ~0.25 / ~0-7% bunched within roughly 2 hours of
simulated service after control is enabled (a few minutes of wall-clock time
with fast-forward).

**Two control mechanisms run together when AI control is on** (this is also
what fixed the pileup complaint):
1. Daganzo (2009) discrete **holding** at 6 real junction stops (unchanged from v1).
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

**Bunching is now explicit, not inferred.** When 2+ buses cluster within 150m
of each other, the frontend fans their markers out along a perpendicular to
the road (so you see distinct buses in a tight queue, not one overlapping
blob) and raises a pulsing "🚨 N buses currently bunched" banner — turning what
read as a rendering bug in v1 into the intended, explicit demonstration of the
exact "three buses at once" phenomenon from the original pitch.

## Real-world GPS + driver actuation (answers "how would this actually work")

**GPS tracking — this isn't actually a hardware problem in India.** India's
AIS-140 regulation already mandates GPS/panic-button telematics devices on all
public service vehicles, including buses — the hardware is very likely already
on real BMTC buses. The real gap is *data access*, not tracking capability.
Three realistic tiers, cheapest first:
1. **Partner with the data holder.** [Chalo](https://www.chalo.com) already
   does exactly this commercially for BMTC and 15+ other Indian cities (live
   GPS + arrival prediction, per public app-store listings) — the fastest
   real path is a data-sharing conversation with them or directly with BMTC,
   not building new tracking infrastructure.
2. **DIY pilot on a volunteer fleet, no agency needed.** A spare Android phone
   mounted per bus running an open-source GPS-forwarding client (e.g.
   [Traccar](https://www.traccar.org/)'s free client app) posts location to a
   server every few seconds over mobile data — enough for a real few-bus pilot
   without any institutional partnership. This is the actual next step if you
   wanted to move off simulated data.
3. **Simulation** (what this project currently does) — good for proving the
   algorithm, not for measuring real BMTC service quality (see caveats below).

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
BMTC drivers' working language is Kannada) — that needs a native-speaker pass,
not a machine translation guess, so the demo intentionally leans on
color/icon/audio cues that don't depend on reading English, and leaves the
wording as an English placeholder rather than shipping unverified Kannada.

## What got built (components)

A working, live, real-road simulation and dashboard that proves the "invisible
traffic cop" concept from the original pitch — not a toy, a real control-theory
implementation running on real street geometry.

**Corridor:** Outer Ring Road, Bangalore — Marathahalli Bridge → Silk Board
Junction (12.4 km). This is a real, heavily-congested, genuinely bunching-prone
BMTC bus corridor — chosen deliberately so the demo is grounded in a corridor
Indians will actually recognize, not an abstract city.

**Road geometry:** fetched live from OSRM (OpenStreetMap-based routing), not
hand-guessed coordinates — the polyline the buses drive on is the actual real
street alignment.

**What it shows, live, on one map:**
- 9 buses dispatched every 5 minutes on the real road, hit by random red-light
  delays at 6 real junctions (Kadubeesanahalli, Bellandur Gate, Sarjapur Road
  Jn, Iblur Jn, HSR Layout Jn, Central Mall Jn).
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
"C:\Users\Khalandar\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn server:app --host 127.0.0.1 --port 8731
```
Then open **http://127.0.0.1:8731** in a browser. (A server is already running
in the background on this port from the build/test session — you can likely
open that URL right now.)

Controls: the big AI Control switch, Pause/Resume, Skip ahead 10 min (instant
fast-forward so you don't wait real-time for bunching/recovery), Speed slider
(0.25×–6×), Reset (fresh fleet, control OFF, t=0).

## Project layout

```
buncch/
  bus-bunching-prevention-research.md   <- original research brief (approved)
  PROJECT_STATUS.md                     <- this file
  app/
    server.py                           <- FastAPI app: HTTP + WebSocket tick stream
    sim/
      route.py                          <- real-road linear referencing (lat/lon <-> distance)
      control.py                        <- Daganzo adaptive holding control law
      engine.py                         <- single toggleable fleet: buses, dwell/signal disturbances,
                                            holding + cooperative speed control, metrics
    static/
      index.html, style.css, main.js    <- live single-map dashboard (Leaflet + OSM/CARTO tiles),
                                            AI control toggle, decision feed, fanned-out bus markers
    data/
      build_route.py                    <- one-time script: OSRM geometry -> route.json + stops
      route.json, orr_route_raw.json    <- processed / raw route geometry (generated)
```

## How it actually works

**1. Real road, real distances.** `sim/route.py` takes the OSRM-fetched polyline
and builds a cumulative-distance table so any bus's position can be expressed
as "N meters along the corridor" and converted back to real lat/lon for the
map. This is the same "linear referencing" technique real transit-ops systems
use.

**2. Why bunching happens (modeled honestly, not faked).** Two real disturbance
sources feed the simulation:
- *Signals* — at 6 real junctions, each bus independently has a ~40% chance of
  hitting a red light (0–50s delay). This is the *exogenous* random shock — a
  real bus really does hit red lights unpredictably.
- *Crowd feedback at major stops* — dwell time at junction stops grows with how
  long it's been since the previous bus left that same stop (more elapsed time
  → more people waiting → longer boarding). This is the *endogenous* mechanism
  that turns a one-off red-light delay into a spiraling, self-reinforcing delay
  — exactly the domino effect described in the original pitch: a late bus meets
  a bigger crowd, which makes it later still, while the bus behind it finds an
  emptied stop and starts catching up.

The random signal-delay draws are keyed deterministically by bus/lap/junction
so re-running is reproducible, but since this is now one fleet observed
before/after a live toggle (not two parallel universes), fairness comes from
literally being the same buses under the same evolving conditions, just with
the control law switched on partway through.

**3. The two control mechanisms**, both active when AI control is on:

Discrete holding at 6 intermediate junction stops (Daganzo 2009):
```
hold = max(0, θ · (H_target − forward_headway))
```
where `forward_headway` is the time since the bus immediately ahead left that
same stop, `H_target` is the scheduled 5-minute interval, and `θ≈0.6` is a
*damping* factor — held for only part of the gap it's missing, not the whole
thing (full correction, θ=1, actually overcorrects and re-triggers
oscillation — the non-obvious result from the literature that makes this a
studied algorithm, not a naive fix).

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

Validated headlessly before wiring up the UI, then reconfirmed live through
the actual WebSocket server — one fleet, control OFF for the first ~90
simulated minutes, then switched ON:

| | Control OFF | Control ON (after toggling, once settled) |
|---|---|---|
| Headway CV | climbs to **~2.0–2.2** | settles to **~0.2–0.3** within roughly 2 hours of simulated service |
| % of arrivals "bunched" (gap < 30% of target) | **~60–77%** | settles to **~0–7%** |
| Mean headway | drifts erratically (100s–450s) | converges toward a stable value near target |

**In plain terms:** with control off, headways don't just get uneven, they
collapse — most bus arrivals end up bunched, exactly the "wait 40 minutes,
three come at once" complaint. Flip AI control on and, over the next few
laps, the same fleet's spacing visibly recovers and stabilizes — you can
watch the CV number fall and the bunching banner stop firing in real time.

## Honest caveats (worth knowing before showing this to anyone technical)

- This is a **calibrated simulation**, not live BMTC data — there's no GTFS-realtime
  feed plugged in (BMTC does not currently publish one publicly in a form this
  project consumes). The road is real; the bus schedule, passenger demand, and
  signal-delay statistics are modeled, tuned to produce realistic-looking
  dynamics, not measured from actual BMTC operations.
- The demand/dwell-time feedback strength and signal-delay probabilities were
  hand-tuned (see commit history in `engine.py` constants) to produce a
  believable, stable bunching-vs-controlled contrast rather than fit to a
  specific measured dataset. Treat the specific CV numbers as illustrative of
  the *mechanism*, not as a claim about real BMTC service quality.
- No driver-facing actuation exists (per the original research brief, that
  requires an actual transit-agency partnership) — this is Phase 0/1 from that
  brief: simulation + live visualization, proving the algorithm.

## Possible next steps (not started — for your call)

1. Swap in a real GTFS-realtime feed if/when one becomes available for an
   Indian city (Chalo/Google publish some Indian transit realtime data
   commercially; a few Indian cities have begun piloting GTFS-RT) — would let
   this become a live monitoring dashboard on real buses.
2. Backtest against a real historical delay dataset instead of synthetic
   signal-delay statistics, if such data is ever available for BMTC.
3. Let the user tune θ (holding aggressiveness) and the speed-control gain
   live from the UI, to feel the stability/overcorrection tradeoff directly.
