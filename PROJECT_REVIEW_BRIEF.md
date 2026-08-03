# Project Review Brief

*Prepared for: Project Review Meeting, Wednesday 2:00 PM*

---

## PART 1 — One-Page Project Summary

### Project Title
**An Adaptive Control Framework for Bus Bunching Mitigation in Urban Transit: A Simulation-Based Study on Bangalore's Outer Ring Road**

*(Shorter alternate title, if your format needs one: "Real-Time Bus Bunching Prevention Using Adaptive Headway and Cooperative Speed Control")*

### Abstract
Bus bunching — the phenomenon where vehicles scheduled at even intervals clump together, producing long, irregular waiting gaps for passengers — is a well-documented instability in high-frequency transit systems, arising from a positive feedback loop between dwell time and headway (a delayed bus meets a larger crowd, which delays it further, while the following bus finds an empty stop and closes the gap). This project designs and evaluates a real-time bunching-prevention system combining two complementary control mechanisms from the transit-operations literature: Daganzo's (2009) adaptive holding control, which partially corrects headway deviations at designated stops, and Daganzo & Pilachowski's (2011) cooperative speed control, which continuously adjusts cruising speed between stops based on a bus's spacing relative to its neighbors. The system is evaluated using a discrete-event simulation grounded in real road geometry — the Marathahalli–Silk Board stretch of Bangalore's Outer Ring Road, a corridor with well-documented real-world congestion and bunching — sourced from OpenStreetMap via the OSRM routing engine. Two empirically motivated disturbance sources drive the simulated instability: stochastic signal-junction delays and ridership-driven dwell-time growth. A live web-based monitoring dashboard (FastAPI, WebSocket streaming, Leaflet mapping) visualizes bus positions, control decisions, and headway statistics in real time, alongside a simulated driver-facing console demonstrating how hold instructions could be communicated to a driver in practice. Under simulated conditions, enabling the control system reduced the headway coefficient of variation (CV) from approximately 2.0 (severely bunched service) to approximately 0.25 (within the range the literature considers well-regulated) within a few service cycles. The results support the technical feasibility of low-cost, GPS-based adaptive control as a scalable intervention for Indian bus corridors, and identify a concrete, low-cost path (phone-based GPS + driver app) to a real pilot deployment.

### Methodology
1. **Problem formalization** — defined bunching in control-theoretic terms using the headway coefficient of variation (CV) and the standard headway-reliability wait-time formula, `E[wait] = H/2·(1+CV²)`.
2. **Real-world grounding** — acquired actual road geometry for a real, congestion-prone BMTC corridor (Marathahalli → Silk Board Junction) via the OSRM routing API over OpenStreetMap data, rather than an abstract/synthetic route.
3. **Disturbance modeling** — two literature-motivated sources of instability: (a) stochastic red-light delays at real junctions (exogenous shock), and (b) dwell time that grows with elapsed gap since the previous bus (endogenous feedback — the actual mechanism that turns a one-off delay into a spiral).
4. **Control algorithm design** — implemented and combined two published control laws:
   - Discrete **adaptive holding** at stops (Daganzo, 2009): `hold = max(0, θ·(H_target − forward_headway))`, θ≈0.6 (partial correction; full correction is known to overcorrect and re-trigger oscillation).
   - Continuous **cooperative speed control** between stops (Daganzo & Pilachowski, 2011): cruising speed is nudged proportionally to the imbalance between the gap to the bus ahead and the gap to the bus behind.
5. **System implementation** — a Python/FastAPI simulation backend streaming live state over WebSockets; a browser-based control-room dashboard (Leaflet/OpenStreetMap map, live metrics, decision feed); a simulated driver console demonstrating the actuation side of the loop.
6. **Evaluation** — same simulated fleet, same random disturbance realizations, compared with control OFF vs ON, measured via headway CV, % of arrivals classified as bunched, mean headway, and estimated passenger wait time.

### Expected Outcome
- A working reference implementation demonstrating that combined holding + cooperative speed control reduces headway CV by roughly an order of magnitude (**~2.0 → ~0.25**) under realistic simulated disturbance conditions.
- A documented, India-grounded feasibility case for a low-cost real-world pilot: since AIS-140 already mandates GPS telematics on Indian public buses, and open-source phone-based GPS-forwarding tools (e.g. Traccar) exist, a real few-bus pilot would not require new hardware development — only a data pipeline and driver-app integration.
- A reusable simulation and visualization framework that can later be extended with real GTFS-realtime data if agency access becomes available.
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
3. Related Work — Newell (1974), Daganzo (2009), Daganzo & Pilachowski (2011), recent RL-based approaches (2020–2025), positioning this work as a combined classical-control approach validated on real Indian road geometry
4. System Design — corridor selection, disturbance model, control laws (with equations), system architecture diagram
5. Simulation Setup — parameters, assumptions, what was tuned and why (honesty note: parameters were hand-tuned for realistic dynamics, not fit to measured BMTC data — state this plainly in the paper's limitations)
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
| Real road geometry acquisition | ✅ Done | 12.4 km corridor fetched via OSRM/OpenStreetMap, processed into a stop/distance model |
| Disturbance model | ✅ Done | Signal-delay + ridership-driven dwell time, calibrated for realistic (not runaway) dynamics |
| Control algorithm 1: adaptive holding | ✅ Done | Daganzo (2009), implemented and validated |
| Control algorithm 2: cooperative speed control | ✅ Done | Daganzo & Pilachowski (2011), implemented and validated |
| Simulation engine | ✅ Done | Single toggleable fleet; control can be switched on/off live to observe before/after on the same fleet |
| Live monitoring dashboard | ✅ Done | FastAPI + WebSocket backend, Leaflet/OpenStreetMap frontend, live metrics (CV, mean headway, estimated wait, % bunched), live decision-feed log |
| Driver actuation prototype | ✅ Done | Simulated in-cab console (single-bus and all-buses comparison views) showing hold/go instructions with countdown and audible alert |
| Quantitative validation | ✅ Done | Headless and live testing confirms CV reduction from ~2.0 to ~0.25 within a few simulated service cycles |

### Not yet done (explicitly out of scope so far)
| Component | Status | Why |
|---|---|---|
| Real GPS / GTFS-realtime data | ❌ Not started | No public real-time feed for BMTC currently integrated; would require either an agency/Chalo data-sharing partnership or a DIY phone-tracker pilot (both scoped as future work, not attempted) |
| Real driver hardware / field test | ❌ Not started | Driver console is a software simulation only — no physical device, no real bus |
| Kannada/local-language localization | ❌ Not started | Driver console UI is English-only; flagged as a real gap, not silently ignored |
| Reinforcement-learning control comparison | ❌ Not started | Classical control (Daganzo formulas) was used deliberately for explainability; RL comparison listed as future work |
| IEEE paper manuscript | ❌ Not started | See Part 2 |

### Tech stack used (for the "what technology" question)
- **Backend / simulation:** Python 3.12, FastAPI, WebSockets (asyncio)
- **Road data:** OpenStreetMap data via the OSRM public routing API (real street-snapped geometry, not hand-placed coordinates)
- **Frontend map:** Leaflet.js with CARTO dark-tile OpenStreetMap basemap (no API key required, fully open-source stack)
- **Control theory:** classical adaptive control (not machine learning) — Daganzo (2009) and Daganzo & Pilachowski (2011), chosen specifically for explainability, which matters for a review/paper context where you need to be able to derive and defend the equations
- **No GPU/ML training involved** — worth stating clearly if asked, since the system is sometimes assumed to be "AI-based"; it is a deterministic control-theoretic system, which is arguably a stronger, more explainable claim for an academic evaluation

### Honest framing for the review meeting
This is a **simulation-validated proof of concept**, not a live deployment — the road is real, the disturbance model is realistic but hand-calibrated (not fit to measured BMTC operations data), and there is no live GPS or real-agency involvement yet. Presenting it this way (rather than overstating it as "deployed" or "AI-powered") will hold up better under a mentor's questions and is the more defensible position for the IEEE paper's claims section.
