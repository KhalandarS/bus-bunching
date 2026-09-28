# Project Review Brief

*Prepared for: Project Review Meeting, Wednesday 2:00 PM*

---

## PART 1 — One-Page Project Summary

### Project Title
**An Adaptive Control Framework for Bus Bunching Mitigation in Urban Transit: A Data-Calibrated Simulation Study on a Real Tumkur KSRTC Corridor**

*(Shorter alternate title, if your format needs one: "Real-Time Bus Bunching Prevention Using Adaptive Headway and Cooperative Speed Control")*

### Abstract
Bus bunching — the phenomenon where vehicles scheduled at even intervals clump together, producing long, irregular waiting gaps for passengers — is a well-documented instability in high-frequency transit systems. This project designs and evaluates a real-time bunching-prevention system combining two complementary control mechanisms from the transit-operations literature: Daganzo's (2009) adaptive holding control, which partially corrects headway deviations at designated stops, and Daganzo & Pilachowski's (2011) cooperative speed control, which continuously adjusts cruising speed between stops based on a bus's spacing relative to its neighbors. The system is evaluated using a discrete-event simulation grounded in a real corridor — the Tumkur KSRTC Bus Stand → SIET College Gate stretch of Ashoka Road / Sira Road in Tumkur, Karnataka — using stop coordinates and road geometry independently verified against OpenStreetMap (Nominatim/Overpass) and a cross-checked landmark route description (4 stops, ≈4.3 km, measured directly from OSRM road-following geometry). No real per-trip GPS/AVL log exists for this corridor, so rather than overclaim calibration against data that doesn't exist, the disturbance model's parameters (per-hop traffic/signal delay, dwell-time noise) are documented as explicit assumptions grounded in typical Indian tier-2-city mixed-traffic bus operating characteristics, and stated as such throughout. (An earlier version of this project used a 264-row CSV presented as a real logged dataset; independent verification found it was very likely synthetic — its corridor was roughly double the real distance and one stop's coordinate did not match its named real-world location — and it has been retired; see the Data Provenance Note below.) A live web-based monitoring dashboard (FastAPI, WebSocket streaming, Leaflet mapping) visualizes bus positions, control decisions, and headway statistics in real time, alongside simulated driver-facing and passenger-facing views. Over a 30-trial statistical evaluation, enabling the control system reduced the steady-state headway coefficient of variation (CV) from 0.763 to 0.311 and the fraction of "bunched" arrivals from 18.4% to 1.2% (p≈0 on a paired test), within a target headway derived from the expected round-trip time and the assumed fleet size. The results support the technical feasibility of low-cost, GPS-based adaptive control for Indian bus corridors on real route geometry, under a transparently assumption-based disturbance model pending real AVL-log calibration.

**Data Provenance Note (read this before the review meeting).** On 2026-08-25, independent verification revealed that a dataset previously presented in this project as "a real 264-row logged bus-tracking dataset" was very likely synthetic. If a mentor asks about the earlier "real data" claims in any prior version of this brief or the paper outline, the honest answer is: that dataset has been retired, the corridor and calibration were rebuilt from real, independently-verified route geometry plus explicitly-labeled assumptions, and the correction itself — not just the fix — is documented (`data/deprecated_synthetic_dataset/README.md`, `METHODOLOGY.md` Section G, `EVALUATION_AND_SAFETY_NOTES.md`'s final update). This is a stronger position for an academic review than either quietly re-fitting the numbers or continuing to claim data that doesn't exist.

### Methodology
1. **Problem formalization** — defined bunching in control-theoretic terms using the headway coefficient of variation (CV) and the standard headway-reliability wait-time formula, `E[wait] = H/2·(1+CV²)`.
2. **Real-world grounding** — used stop coordinates and road geometry independently verified against OpenStreetMap and a cross-checked landmark route description for a real KSRTC corridor (Tumkur KSRTC Bus Stand → SIET College Gate), rather than an abstract/synthetic route or an unverified single source. OSRM road-following geometry was fetched for all 3 hops between the 4 verified stops and measured directly (≈4.3 km total) — see `app/data/build_tumkur_route.py`.
3. **Disturbance modeling, documented as assumptions, not fit to data** — no real per-trip log exists for this corridor, so parameters are stated as explicit assumptions grounded in typical Indian mixed-traffic bus operation: (a) a per-hop traffic/signal delay, exponential, mean ≈35s; (b) dwell time as flat per-stop noise (mean 20s, ±33%), not headway-correlated — appropriate for low-ridership intermediate stops rather than a crowd-feedback assumption. This is disclosed as a limitation, not presented as measured.
4. **Control algorithm design** — implemented and combined two published control laws:
   - Discrete **adaptive holding** at stops (Daganzo, 2009): `hold = max(0, θ·(H_target − forward_headway))`, θ≈0.6 (partial correction; full correction is known to overcorrect and re-trigger oscillation).
   - Continuous **cooperative speed control** between stops (Daganzo & Pilachowski, 2011): cruising speed is nudged proportionally to the imbalance between the gap to the bus ahead and the gap to the bus behind.
5. **System implementation** — a Python/FastAPI simulation backend streaming live state over WebSockets; a browser-based control-room dashboard (Leaflet/OpenStreetMap map, live metrics, decision feed); simulated driver and passenger-facing views.
6. **Evaluation** — a 30-trial paired statistical evaluation (`app/sim/batch_eval.py`), same disturbance realizations per trial across control OFF / holding-only / combined arms, measured via headway CV, % of arrivals classified as bunched, mean headway, and estimated passenger wait time, with 95% confidence intervals and a paired significance test.

### Expected Outcome
- A working reference implementation demonstrating that combined holding + cooperative speed control reduces steady-state headway CV by more than half (**0.763 → 0.311**, p≈0, n=30 trials) under a documented, assumption-based disturbance model applied to real, verified corridor geometry.
- A documented, India-grounded feasibility case for a low-cost real-world pilot: since AIS-140 already mandates GPS telematics on Indian public buses, and open-source phone-based GPS-forwarding tools (e.g. Traccar) exist, a real few-bus pilot would not require new hardware development — only a data pipeline and driver-app integration, which would also let the disturbance model be replaced with real fitted statistics.
- A reusable simulation and visualization framework, with independently verified route-geometry provenance, that can later be recalibrated against a real AVL/GPS log for this or any similar corridor once one becomes available.
- Basis for the IEEE conference paper submission (see status below).

---

## PART 2 — IEEE Conference Paper Preparation Status

**Status: Not yet drafted.** No manuscript currently exists — this section is an honest status report plus a ready-to-use outline, not a paper.

**What exists that can seed the paper:**
- The literature review is effectively done in working form — the algorithmic design in this project is directly built on and cites Daganzo (2009) and Daganzo & Pilachowski (2011), with the broader survey already gathered during the research phase of this project (Newell 1974's self-equalizing headway control, RL-based holding approaches, MBTA's open-source `transit-performance` tooling, OneBusAway/GTFS-realtime standards).
- The methodology and results described in Part 1 above map directly onto standard IEEE paper sections.

**Proposed outline (ready to fill in):**
1. Abstract *(draft available above — needs trimming to ~150 words for most IEEE templates)*
2. Introduction — the bunching problem, its cost to riders, motivation for an India-specific study
3. Related Work — Newell (1974), Newell & Potts (1964), Daganzo (2009), Daganzo & Pilachowski (2011), recent RL-based approaches (2020–2025), positioning this work as a combined classical-control approach evaluated on real, independently-verified Indian corridor geometry
4. System Design — corridor selection, disturbance model, control laws (with equations), system architecture diagram
5. Simulation Setup — parameters, assumptions, what is real (route geometry) vs. what is an explicit, documented assumption (disturbance magnitudes) (honesty note for the limitations section: no real per-trip AVL log exists for this corridor, so the quantitative results illustrate the effect's existence, mechanism, and relative size under stated assumptions, not a validated measurement of this corridor's real-world bunching rate — state this plainly; real-log calibration is future work)
6. Results — CV/bunching-percentage before-after tables, discussion
7. Discussion — real-world deployment path (AIS-140 GPS mandate, DIY phone-tracker pilot option, driver-console actuation prototype), limitations
8. Conclusion & Future Work — real GTFS-RT integration, agency pilot, RL comparison
9. References

**Next steps to move this forward:** pick a target venue/deadline, decide on co-authors, and I can help draft section-by-section once you confirm the outline with your guide.

---

## PART 3 — Project Implementation Status

### Completed
| Component | Status | Detail |
|---|---|---|
| Real corridor acquisition | ✅ Done | ≈4.3 km, 4 real stops with coordinates independently verified against OpenStreetMap (Nominatim/Overpass) and a cross-checked landmark route description; road geometry measured via OSRM — see `app/data/build_tumkur_route.py`. Fleet size (6) and plates are documented assumptions, not logged |
| Disturbance model | ✅ Done | Per-hop delay + dwell-time noise, **documented as explicit assumptions** (no real per-trip log exists for this corridor) — see Part 1 methodology and Data Provenance Note above |
| Control algorithm 1: adaptive holding | ✅ Done | Daganzo (2009), implemented and validated |
| Control algorithm 2: cooperative speed control | ✅ Done | Daganzo & Pilachowski (2011), implemented and validated, rate-limited for driver-safety realism |
| Simulation engine | ✅ Done | Single toggleable fleet; control can be switched on/off live to observe before/after on the same fleet |
| Live monitoring dashboard | ✅ Done | FastAPI + WebSocket backend, Leaflet/OpenStreetMap frontend, live metrics (CV, mean headway, estimated wait, % bunched), live decision-feed log, live θ/speed-gain tuning |
| Driver actuation prototype | ✅ Done | Simulated in-cab console (single-bus and all-buses comparison views) showing hold/go instructions with countdown and audible alert |
| Passenger-facing view | ✅ Done | `/passenger` — stop picker, live ETAs, plain-English reason when a bus is holding/easing/boosting |
| Quantitative validation | ✅ Done | 30-trial paired statistical evaluation (`batch_eval.py`): steady-state CV 0.763→0.311, bunch_pct 18.4%→1.2%, p≈0 — not a single-run impression (under the assumption-based disturbance model above) |

### Not yet done (explicitly out of scope so far)
| Component | Status | Why |
|---|---|---|
| Live GPS / GTFS-realtime feed, or any real per-trip log | ❌ Not started | No real per-trip AVL log exists for this corridor yet; a live feed or logged pilot would need either an agency data-sharing partnership or a DIY phone-tracker pilot (both scoped as future work, not attempted) — and would let the disturbance model move from assumed to fitted |
| Real driver hardware / field test | ❌ Not started | Driver console is a software simulation only — no physical device, no real bus |
| Kannada/local-language localization | ❌ Not started | Driver/passenger UI is English-only; flagged as a real gap, not silently ignored |
| Reinforcement-learning control comparison | ❌ Not started | Classical control (Daganzo formulas) was used deliberately for explainability; RL comparison listed as future work |
| IEEE paper manuscript | ❌ Not started | See Part 2 |

### Tech stack used (for the "what technology" question)
- **Backend / simulation:** Python 3.12, FastAPI, WebSockets (asyncio)
- **Corridor data:** stop coordinates and road distances independently verified against OpenStreetMap for this specific corridor (`data/tumkur_bus_stand_siet_stops.csv`) — not hand-placed coordinates; fleet size and plates are documented assumptions, not a logged roster (see Data Provenance Note above)
- **Frontend map:** Leaflet.js with CARTO dark-tile OpenStreetMap basemap (no API key required, fully open-source stack)
- **Control theory:** classical adaptive control (not machine learning) — Daganzo (2009) and Daganzo & Pilachowski (2011), chosen specifically for explainability, which matters for a review/paper context where you need to be able to derive and defend the equations
- **No GPU/ML training involved** — worth stating clearly if asked, since the system is sometimes assumed to be "AI-based"; it is a deterministic control-theoretic system, which is arguably a stronger, more explainable claim for an academic evaluation

### Honest framing for the review meeting
This is a **real-geometry, assumption-calibrated simulation, validated statistically, not a live deployment** — the corridor and its 4 stops are real and independently verified against OpenStreetMap; the disturbance *parameters* (dwell time, per-hop delay) are documented assumptions grounded in typical Indian mixed-traffic bus operation, not fit to any real per-trip log, because no such log exists for this corridor yet (a prior version of this project mistakenly presented a synthetic dataset as a real one — see the Data Provenance Note above — that has been corrected and disclosed, not silently fixed). There is no live GPS or real-agency involvement yet. Presenting it this way (real route geometry, explicitly-assumed disturbance model, statistically validated, not "deployed" or "AI-powered," and openly correcting the earlier data error) is a stronger and more defensible position for the IEEE paper's claims section than either overclaiming real-data calibration or underclaiming "purely synthetic."

---

## PART 4 — Task List (What's Left, Concretely)

*Grounded in the current repo state as of 2026-08-25, not a generic wishlist — each item below is a real, checkable gap. (Since the 2026-08-22 version of this list: the "264-row logged dataset" was found to be very likely synthetic and retired; the corridor was rebuilt around 4 real, independently-verified stops (~4.3km); the disturbance model is now explicitly assumption-based rather than claimed to be fit to real data. See the Data Provenance Note above.)*

### Quick / simple tasks (hours, not days)
- [ ] **Commit and push everything.** The passenger view, evaluation/safety work, `ParamsPanel.tsx`, the Tumkur corridor rebuild (real verified stops, `app/data/build_tumkur_route.py`, updated docs), and the 2026-08-25 data-provenance correction are all finished locally but not yet in the GitHub repo — a mentor or reviewer looking at GitHub right now would not see any of this.
- [ ] **Trim the Part 1 abstract to ~150 words** for the actual IEEE template — Part 2 already flags this as needed but it hasn't been done.
- [ ] **Decide the fate of `eval_results.json`** (generated batch-eval output, currently untracked, just regenerated with the new corridor/calibration) — either commit it as a reference result or add it to `.gitignore`; right now it's just sitting ambiguous.
- [ ] **Confirm `data/deprecated_synthetic_dataset/`'s disposition.** The retired CSV and `analyze.py` are kept there (unused) with a README explaining why, for transparency — decide whether that's how you want it presented to a mentor, or whether you'd rather it not be in the repo at all; either is defensible, but it should be a deliberate choice.

### Real tasks (multi-day, substantive)
- [ ] **Draft the IEEE manuscript.** Nothing is written yet beyond the Part 2 outline — this is the single largest remaining item and the one that actually gates submission. Note the abstract/methodology now describe real verified route geometry plus an assumption-based disturbance model, not real-data calibration — write the paper to match this framing from the start rather than around the retired claim.
- [ ] **Replace the normal-approximation statistics in `batch_eval.py`** with an exact or bootstrap confidence interval. `EVALUATION_AND_SAFETY_NOTES.md` already flags the current z=1.96 approach as approximate, not exact — a reviewer is likely to ask about this directly.
- [ ] **Add an RL (or simple heuristic) baseline comparison.** The project currently only compares "off" vs. classical control; a real comparison point would make the paper's "classical control over RL, for explainability" argument measured rather than asserted.
- [ ] **Get a real per-trip log for this corridor**, even a modest one — this is now the highest-value data task: it would let the disturbance model move from documented assumptions to fitted statistics, which is the main quantitative limitation a reviewer is likely to press on (see Data Provenance Note above).
- [ ] **Pick one live-GPS pilot tier and actually start it** — either an agency data-sharing conversation or the DIY Traccar phone-on-a-volunteer-bus pilot, both already scoped in `PROJECT_STATUS.md` but neither begun. The corridor and stops are already real and verified, so a pilot would mainly need to replace the assumed disturbance draws with a live or logged feed.
- [ ] **Kannada localization of the driver console and passenger view** (`/driver`, `/passenger`, currently English-only) — needs an actual native-speaker translation pass, not a machine-translation placeholder, before calling it deployment-ready.
- [ ] **Harden the speed-control safety model beyond rate-limiting.** The ramp fix in `EVALUATION_AND_SAFETY_NOTES.md` §2 bounds how fast a speed *setpoint* can change but has no jerk limit or following/braking-distance check — the doc names this as an honest remaining gap before any real driver pilot.
- [ ] **Build a rider-facing channel beyond the `/passenger` web page** — SMS/missed-call query, IVR, or a physical stop-side display, for riders without a smartphone/data plan; named as a gap in `EVALUATION_AND_SAFETY_NOTES.md` §3 but nothing built yet.
- [x] ~~Backtest against real historical delay data~~ — **reverted 2026-08-25**: the 264-row dataset this was previously marked done against turned out to be very likely synthetic (see Data Provenance Note above) and has been retired. The disturbance model is now explicitly assumption-based, not fit to any log. This task is genuinely open again — see "Get a real per-trip log for this corridor" above.
