# Bus Bunching Prevention System — Research Brief

*Research only — no code has been written yet. This document is for review/approval before implementation begins.*

---

## 1. TL;DR

An "air traffic control" system for city buses: it watches every bus's live position via GPS/GTFS-realtime feeds, computes the gap (headway) between consecutive buses on a route, and when a bus is closing in on the one ahead of it, issues a **hold instruction** (wait N extra seconds at the current/next stop) so headways re-equalize and buses stop arriving in clumps.

This is a well-studied transit operations problem with 50 years of academic literature and several production deployments. You are not inventing the concept — you're building an implementation of **dynamic headway-based holding control**, which is genuinely valuable to build well.

---

## 2. The problem, more precisely

### 2.1 Why bunching happens (the domino effect, formalized)

Given two consecutive buses A (ahead) and B (behind) on the same route, let `h` = the headway (time gap) between them. In a perfectly scheduled world `h` = target headway `H` for every bus pair, all the time.

In practice, small random perturbations (a red light, a slow boarding, a wheelchair lift, traffic) push `h` away from `H`. The key insight is that **the system is unstable without control**: if Bus A falls behind, the headway *behind* A grows, so more passengers accumulate at the next stop, so Bus A's dwell time grows, so it falls further behind — positive feedback. Simultaneously, Bus B (behind) finds fewer passengers waiting (A just took them), so its dwell time shrinks and it catches up faster. Without intervention, `h → 0` for that pair (bunching) while the headway on the *other* side of the bunch grows very large (the classic "gap" a rider waits 25 minutes for and then two buses arrive together).

This is a textbook example of an **unstable feedback loop with no damping**, first formalized by Newell & Potts (1964) and Newell (1974), and is why literally every bus operations research paper from the 1970s onward treats bunching as a control-theory problem, not a scheduling problem. Scheduling (fixed timetables) cannot fix it because the disturbances are stochastic and occur faster than a schedule can be rewritten.

### 2.2 Why this can't be fixed by "just add more buses" or "better schedules"

More buses lowers *H* but doesn't remove the instability — it actually make gaps compound faster on high-frequency routes (which is why bunching is worst on the busiest, most frequent lines, exactly where it hurts the most riders). The fix has to be **active, real-time, closed-loop control**, not static planning.

---

## 3. Prior art (so we build on, not reinvent)

This is the most important section to internalize before designing anything, because there is a mature body of control laws to choose from.

| Approach | Core idea | Source |
|---|---|---|
| **Schedule-based holding** | Hold a bus at a control point until its scheduled departure time. | Oldest method; brittle — falls apart when the whole route is already behind schedule. |
| **Self-equalizing / adaptive headway control** | Hold each bus at control points for a *fraction* of the deviation between its actual forward headway and the target headway (not the full deviation) — this "damps" the oscillation instead of overcorrecting into the opposite failure mode. | Newell (1974) "self-equalizing"; Daganzo (2009), *"A headway-based approach to eliminate bus bunching: Systematic analysis and comparisons"*, Transportation Research Part B. |
| **Two-way-looking control** | Instead of only reacting to the gap behind you (forward headway), also factor in the gap in front of the bus behind you (backward headway), and adjust *cruising speed* between stops, not just holding time. Cooperative — both buses in a pair adjust. | Daganzo & Pilachowski (2011), *"Reducing bunching with bus-to-bus cooperation"*; Xuan, Argote & Daganzo (2011) two-way extension. |
| **Optimal linear control** | Formalize holding as a control-theory problem (state-space, feedback gain matrices) to minimize passenger wait time subject to not over-holding. | Daganzo & Pilachowski; various ScienceDirect papers on "dynamic bus holding strategies for schedule reliability." |
| **Reinforcement learning (RL) holding control** | Train a policy (Q-learning, PPO/TRPO via Stable-Baselines3, multi-agent deep RL) against a simulated route to learn holding times directly from reward = -wait time, without hand-deriving a control law. Recent (2020–2025) papers show RL can outperform hand-tuned control laws, especially under highly stochastic demand, at the cost of needing a simulator and being harder to explain/audit. | Multiple 2020–2025 papers (multi-agent DRL, Q-learning with look-ahead, LLM-enhanced RL for holding). |

**Recommendation:** start with **Daganzo's adaptive control law** (section 6) — it's simple, well-validated, explainable to a non-technical audience (a judge, a transit agency, a reader of your writeup), and testable without a simulator. RL is a strong "phase 2" upgrade once you have a working simulation harness.

### 3.1 Real-world deployments (so you know this isn't purely academic)
- **MBTA (Boston)** open-sourced [`transit-performance`](https://github.com/mbta/transit-performance) — ingests GTFS-realtime VehiclePositions + TripUpdates to measure headway-based service performance in real time.
- **TransitClock** (Java, open source) — consumes raw AVL/GPS feeds and produces real-time predictions and control signals; used by several US transit agencies.
- **OneBusAway** exposes a [GTFS-realtime Export API](https://developer.onebusaway.org/api/gtfs-realtime) that many agencies already run.
- Several US and European agencies operate **holding at control points** manually today via dispatcher radio — your project is essentially the automation of a real, existing dispatcher job.
- TriMet (Portland) and MBTA have both studied/deployed **transit signal priority (TSP)** as a complementary lever (speeding up a late bus at intersections) alongside holding.

### 3.2 Existing open-source simulators/starting points
- [`ywnch/buskit`](https://github.com/ywnch/buskit) — lightweight Python bus-bunching simulation environment (NYC-based), built specifically to let you try different control strategies.
- [`josephgrech01/BusBunchingRL`](https://github.com/josephgrech01/BusBunchingRL) — SUMO + Stable-Baselines3 (PPO/TRPO) RL approach; a good reference once you're past the MVP.
- [SUMO](https://eclipse.dev/sumo/) ("Simulation of Urban Mobility") — the standard open-source microscopic traffic simulator, has first-class public-transport/bus-stop scheduling support and a Python control API (TraCI) for injecting hold commands programmatically. This is the most credible way to demo "it works" without needing a real transit agency partnership.

---

## 4. What your system actually needs to do (functional breakdown)

1. **Ingest** live bus positions (and ideally scheduled/static route data).
2. **Compute headways** between every consecutive pair of buses on each route, continuously.
3. **Detect bunching risk** — a bus's forward headway shrinking below some threshold relative to the target headway.
4. **Decide a control action** — how long to hold, and where (which stop / control point).
5. **Communicate the instruction** — to a driver (app, console, radio-integrated system) or, in a simulation, to the simulated vehicle agent directly.
6. **Visualize** — the "smart map" the pitch describes: live bus positions, headway gaps, active holds, color-coded bunching risk.
7. **Measure impact** — before/after headway variance, wait time estimates, so you can prove the system works.

---

## 5. Proposed architecture

```
┌─────────────────┐      ┌──────────────────────┐      ┌───────────────────┐
│  Data Sources     │      │   Core Engine          │      │  Outputs            │
│                   │      │                        │      │                     │
│ GTFS static       │─────▶│ Route/Stop model       │      │                     │
│ (schedule, stops) │      │                        │      │                     │
│                   │      │ Headway Calculator     │─────▶│ Live Map Dashboard  │
│ GTFS-realtime     │─────▶│  (per route, streaming)│      │ (web, Leaflet/      │
│ VehiclePositions  │      │                        │      │  Mapbox)            │
│ + TripUpdates     │      │ Control Law            │─────▶│ Hold instructions   │
│  (polled/streamed)│      │  (Daganzo adaptive /   │      │  → driver app /     │
│                   │      │   two-way-looking)     │      │    console / sim    │
│ (MVP: simulator   │      │                        │      │                     │
│  instead of live  │      │ Metrics/Logging        │─────▶│ Before/after charts │
│  feed — see §8)   │      │                        │      │ (headway CV, wait)  │
└─────────────────┘      └──────────────────────┘      └───────────────────┘
```

### 5.1 Data layer
- **GTFS static** (schedule, routes, stops, shapes) — defines the route topology and the target headway `H` per route/time-of-day. Public agencies publish this as a zip; there are hundreds of open feeds (transitfeeds.com / agency developer portals / OneBusAway demo instances).
- **GTFS-realtime** (protobuf feeds: `VehiclePositions.pb`, `TripUpdates.pb`) — the live GPS positions and predicted arrival times. This is the industry-standard feed format; almost every mid-size-or-larger US transit agency publishes one, many publicly and for free.
- For a project without an agency partnership yet, **simulate** this layer instead (see §8) — SUMO or a custom simulator emitting synthetic "GTFS-realtime-shaped" position updates. This lets you build the entire pipeline against a realistic interface and swap in a real feed later with minimal changes.

### 5.2 Headway calculator
For each route, maintain an ordered list of active buses by position along the route shape (project each bus's lat/lon onto the route polyline to get a 1-D "distance traveled" value — this is the standard technique, sometimes called route "milestoning" or "linear referencing"). Then:

```
forward_headway(bus_k)  = time_estimate(bus_k reaches next stop) − time_estimate(bus_{k-1} reached same stop)
backward_headway(bus_k) = time_estimate(bus_{k+1} reaches same stop) − time_estimate(bus_k reaches same stop)
```
Target headway `H` comes from the schedule (average scheduled interval for that route/time window), or empirically from recent history if you don't trust the schedule.

### 5.3 Control law (the "invisible traffic cop" logic)

**Option A — Daganzo (2009) adaptive control at fixed control points** (recommended starting point):

At each control point (a subset of stops, e.g. every 4th stop, or timepoints already defined in the GTFS schedule), when bus *k* arrives:

```
h_forward = arrival_time(bus_k) − departure_time(bus_{k-1}, same control point)

hold_time = max(0,  θ · H − h_forward)
```
where `θ` (0 < θ ≤ 1, typically ~0.5–0.7) is a damping factor tuned so the correction is partial, not full — full correction (θ=1, "always depart exactly H after the bus ahead") actually *overcorrects* and can make things worse; partial correction converges to stable, quasi-regular headways. This is the key mathematical result from the self-equalizing-headway literature — worth stating explicitly in any writeup since it's the non-obvious part reviewers will ask about ("why not just fully equalize every time?").

**Option B — Two-way-looking (Daganzo & Pilachowski, 2011)**, phase-2 upgrade: instead of holding only at stops, continuously adjust *cruising speed* between stops using both forward and backward headway:

```
speed_adjustment(bus_k) ∝ (h_backward − h_forward)
```
i.e., if the bus behind you is further away than the bus ahead of you is close, speed up slightly; if you're closing in on the bus ahead while the bus behind has room, slow down. This is literally your bus-to-bus "traffic cop" framing but bidirectional and continuous rather than stop-and-hold — a nice thing to mention as the "v2" of the pitch.

**Option C — RL-learned policy** (phase 3): train against a SUMO or buskit simulation with reward = −(passenger wait time + bus idle time), using PPO/TRPO. Only worth doing once A/B are working and you want a research-grade comparison.

### 5.4 Communication/actuation layer
This is the part most pitches gloss over — how does the instruction actually reach the driver?
- **Simulation mode (MVP)**: the "instruction" just tells the simulated bus agent to wait; no real-world actuation needed. This is enough to prove the algorithm and produce a compelling demo/video.
- **Real-world, non-partnered**: a companion **rider-facing or dispatcher-facing web dashboard** showing recommended holds — useful for a research/advocacy artifact, doesn't require agency buy-in.
- **Real-world, agency-partnered**: push to a **driver tablet/console app** (many modern buses already run an onboard computer/AVL unit that could surface a message), or integrate with an agency's existing dispatch/radio system. This requires an actual transit agency relationship and is out of scope for a first build.

### 5.5 Visualization ("the smart map")
- Web map (Leaflet/Mapbox GL) showing live bus icons color-coded by bunching risk (green = healthy headway, yellow = closing gap, red = bunched/holding).
- Headway timeline/strip chart per route (classic "trajectory diagram" used in transit ops research — time on x-axis, distance-along-route on y-axis, one line per bus; bunching shows up as lines converging).
- Live log of hold instructions issued and their effect on subsequent headway.

### 5.6 Metrics (how you prove it works)
- **Headway coefficient of variation (CV = stddev(headway)/mean(headway))** — the standard transit-research metric for bunching severity; lower is better. This should be your headline "before vs. after" number.
- **Excess wait time** — for headway-based routes, expected passenger wait time ≈ `H/2 · (1 + CV²)`, a standard formula from transit reliability literature — nice because it converts your CV improvement directly into "average rider wait time saved," which is the pitch's emotional hook.
- **On-time performance / schedule adherence** (secondary, if using schedule-based target headways).
- **Total holding time imposed** (cost side of the ledger — a system that eliminates bunching by holding every bus for 10 minutes isn't actually good).

---

## 6. Tech stack recommendation

| Layer | Suggestion | Why |
|---|---|---|
| Data ingestion | Python + `gtfs-realtime-bindings` (official protobuf bindings) | Standard, well-documented, used in the Malaysia GTFS-RT example and OneBusAway. |
| Simulation (MVP) | `buskit` (fastest to a working demo) or SUMO+TraCI (more credible/rigorous, steeper setup) | buskit is purpose-built for exactly this; SUMO is the field standard if you want a more "real" demo later. |
| Core engine | Python (pandas/numpy for headway math, or a small real-time service if you want it live) | Matches the ecosystem of every reference project above. |
| Control law | Implement Daganzo adaptive control directly (a few dozen lines) | No need for a library — it's a small, explicit formula, which also makes it easy to explain/defend. |
| Visualization | Web dashboard — React/Leaflet or even a Streamlit/Plotly Dash app for a fast MVP | Streamlit/Dash gets you a live map + charts with minimal frontend work; upgrade to React/Mapbox later if this becomes a polished product. |
| Metrics/eval | matplotlib/Plotly for before/after headway trajectory diagrams and CV charts | This is the evidence slide for any presentation of the project. |

---

## 7. Suggested phased roadmap

**Phase 0 — Simulation-only proof of concept** (no real data needed, no agency partnership needed)
- Build/adapt a simple bus-loop simulator (or fork `buskit`) with N buses on a circular route, random stop dwell-time noise.
- Implement headway calculation + Daganzo adaptive holding.
- Show, with a trajectory diagram, that headways stay regular *with* control and diverge (bunch) *without* control. This is the core proof and the most convincing artifact for a pitch/demo.

**Phase 1 — Real data, read-only**
- Pull a real public GTFS-realtime feed (many US agencies expose one for free) and GTFS static schedule.
- Compute live headways and bunching risk on a real route, display on the map dashboard — no actuation yet, purely observational ("here's where bunching is happening right now").

**Phase 2 — Closed-loop demo**
- Feed the real headway data *into* the control law and show what holds *would* be recommended (still not actuated on a real bus — a "shadow mode").
- Backtest against historical GTFS-realtime archives (several agencies/researchers publish these) to quantify how much your control law *would have* reduced CV/wait time on real historical bunching events.

**Phase 3 — Real actuation (requires a transit agency partner)**
- Only pursue this with an actual agency relationship — this is the part that involves driver communication, safety review, and operational buy-in, and is a different kind of project (partnerships/pilot program) than the software itself.

---

## 8. Data sources to start with

- **Static + realtime GTFS feeds**: most US transit agencies publish both; a good way to find them is each agency's developer portal (search "`<agency name>` GTFS-realtime developer"), or aggregator sites like transitfeeds.com / Mobility Database.
- **Historical GTFS-realtime archives**: some agencies/researchers archive raw feed snapshots over time (useful for backtesting a control law against *real* historical bunching events without needing to actuate anything live). MBTA in particular has been unusually open with both live feeds and open-source tooling (`transit-performance`).
- **If no live feed is convenient yet**: SUMO's public-transport tutorial + a synthetic GTFS-realtime-shaped emitter is enough to develop and validate the whole pipeline before touching real data.

---

## 9. Known challenges / risks to plan for

- **GPS/positional noise** — raw AVL positions jitter; you'll need to project onto the route shape and probably smooth (e.g., Kalman filter or simple moving average) before trusting headway estimates.
- **Terminal/first-bus edge cases** — the first bus of the day, or a bus just leaving the terminal, has no meaningful "forward headway" yet; the control law needs a defined fallback (e.g., schedule-based holding until a real predecessor exists).
- **Overcorrection** — as noted in §5.3, full correction (not partial/damped) can *induce* oscillation rather than remove it; θ must be tuned/validated, not assumed.
- **Driver compliance & safety** — real-world holding instructions must never create an unsafe stop condition (blocking an intersection, stopping somewhere without a safe pull-out); this is exactly why Phase 3 needs an actual transit-agency safety review and can't be software-only.
- **Equity/UX framing** — holding the "fast" bus means someone already on that bus experiences an added delay for the benefit of people waiting elsewhere; that's the correct tradeoff (aggregate wait time drops), but worth stating explicitly in any writeup since it's the natural pushback question.
- **Agency data reliability** — real GTFS-realtime feeds vary hugely in update frequency and positional accuracy agency-to-agency; validate assumptions on whichever feed you pick before trusting results.

---

## 10. Open questions for you before we implement anything

- Do you want to start from a **pure simulation demo** (fastest, no data-access blockers, best for a pitch/hackathon-style deliverable) or go straight for a **real GTFS-realtime feed** for a specific city (more impressive if it works, more setup/edge-case risk)?
- Is the end goal a **research/demo artifact** (map + charts proving the concept), or do you eventually want to pursue an actual **transit agency pilot**? This materially changes how much to invest in the actuation/communication layer now vs. later.
- Any preference on **stack** (Python/Streamlit for speed vs. a full web app) or is that open?

---

## Sources consulted

- [A self-adaptive method to equalize headways (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0191261515302071)
- [Two-way-looking self-equalizing headway control for bus operations (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0191261516308074)
- [A headway-based approach to eliminate bus bunching: Systematic analysis and comparisons (ScienceDirect, Daganzo 2009)](https://www.sciencedirect.com/science/article/abs/pii/S0191261509000484)
- [Dynamic bus holding strategies for schedule reliability: Optimal linear control and performance analysis (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0191261511001093)
- [Holding times to maintain quasi-regular headways and reduce real-time bus bunching (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10188328/)
- [Bus bunching: a comprehensive review from demand, supply, and decision-making perspectives (Taylor & Francis, 2024)](https://www.tandfonline.com/doi/full/10.1080/01441647.2024.2313969)
- [Dynamic holding control to avoid bus bunching: A multi-agent deep reinforcement learning framework (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0968090X20305763)
- [A Dynamic Holding Approach to Stabilizing a Bus Line Based on Q-learning with Multistage Look-ahead (arXiv)](https://arxiv.org/pdf/2006.08706)
- [Integrating Conventional Headway Control with Reinforcement Learning to Avoid Bus Bunching (arXiv)](https://arxiv.org/pdf/2210.00201)
- [Mitigating bus bunching with real-time crowding information (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8895103/)
- [An Online Optimal Bus Signal Priority Strategy to Equalise Headway in Real-Time (MDPI)](https://www.mdpi.com/2078-2489/14/2/101)
- [MBTA transit-performance (GitHub, open source)](https://github.com/mbta/transit-performance)
- [GTFS-Realtime Export API — OneBusAway Developers](https://developer.onebusaway.org/api/gtfs-realtime)
- [GTFS Realtime — General Transit Feed Specification](https://old.gtfs.org/resources/gtfs-realtime/)
- [buskit — bus bunching simulation environment (GitHub)](https://github.com/ywnch/buskit)
- [BusBunchingRL — SUMO + PPO/TRPO reinforcement learning (GitHub)](https://github.com/josephgrech01/BusBunchingRL)
- [SUMO Public Transport Tutorial](https://sumo.dlr.de/docs/Tutorials/PublicTransport.html)
- [Eclipse SUMO — Simulation of Urban Mobility](https://eclipse.dev/sumo/)
