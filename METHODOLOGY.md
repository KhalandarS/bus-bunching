  # III. Methodology

  This section describes the research design, study setting, data source, instruments,
  procedure, and analysis methods used to design and evaluate the proposed bunching-mitigation
  control system. As this is a computational/simulation study rather than a human-subjects
  study, the structure below follows the standard methodology template adapted for
  simulation-based transit-operations research: study design → study area → data source →
  instruments → procedure → analysis → ethical/data considerations.

  ## A. Research Design

  This study follows a **quantitative, simulation-based experimental design**. A discrete-event
  simulation of a real bus corridor was constructed and calibrated against a real logged
  operational dataset, and the effect of two candidate control mechanisms was evaluated using a
  **paired, multi-trial controlled experiment** — the simulation-study analogue of a within-subjects
  experimental design, where each trial (a fixed random seed) is run under three conditions
  ("arms") that share an identical disturbance history up to the point the treatment is applied.
  This pairing removes across-trial disturbance variability as a confound, isolating the effect of
  the control system itself. The three arms compared are:

  1. **Off** — no control (baseline).
  2. **Holding-only** — Daganzo (2009) discrete adaptive holding alone.
  3. **Combined** — holding + Daganzo & Pilachowski (2011) cooperative speed control together.

  The design is therefore best classified as an **experimental, comparative simulation study**,
  distinct from a purely descriptive or observational one: it does not merely describe the real
  dataset, it uses that dataset to calibrate a model whose causal claims (does control reduce
  bunching, and by how much) are then tested under controlled, repeatable conditions that would be
  impractical or unsafe to run on a live public transit corridor.

  ## B. Study Area

  The corridor modeled is a real, congestion-prone Karnataka State Road Transport Corporation
  (KSRTC) route segment: **Tumkur KSRTC Bus Stand → SIET College Gate**, along NH-4, in Tumkur
  (Tumakuru), Karnataka, India. This corridor was selected because (a) a real logged
  bus-tracking dataset for it was available, and (b) it exhibits the operating conditions —
  short stop spacing, mixed traffic, at-grade signalized junctions — that make bunching a
  practically relevant problem for Indian tier-2-city transit, as opposed to an idealized or
  synthetic corridor.

  The corridor spans approximately 8.7 km across 9 stops. Stop coordinates and cumulative
  distances were taken directly from the dataset described in Section C; the connecting road
  geometry was independently reconstructed and validated (Section D.2).

  ## C. Data Source

  Unlike a survey- or interview-based study, this project's "sample" is a **logged operational
  dataset** rather than human participants:

  - **Source file:** `data/tumkur_siet_bus_bunching_data_264rows.csv`
  - **Size:** 264 rows, spanning **30 trips** across **9 stops per trip**.
  - **Fleet:** 6 real KSRTC bus registration plates (KA-06-F-1201, -1345, -1522, -1678, -1899,
    -2011), each contributing multiple trips.
  - **Fields logged per stop-visit:** trip ID, bus ID, stop sequence number, stop name, latitude,
    longitude, cumulative distance (km), scheduled arrival timestamp, actual arrival timestamp,
    delay (s), dwell time (s), scheduled headway (s), actual headway (s), and a binary
    bunching-flag.

  No selection/sampling procedure was applied by the researcher — all 264 logged rows were used
  in full for calibration. This is disclosed as a limitation (Section VI, per the paper outline):
  30 trips from a single corridor is a modest sample for fitting a general disturbance
  distribution, and the fitted parameters should be understood as calibrated to *this* corridor
  under the conditions it was logged in, not assumed to generalize to other corridors without
  re-calibration.

  ## D. Data Collection and Research Instruments

  ### D.1 Statistical calibration of disturbance sources

  The logged dataset was analyzed (`data/analyze.py`, using `pandas`/`numpy`) prior to choosing
  any disturbance model, rather than assuming one a priori. Specifically, the analysis computed:

  - Dwell time mean/std/min/max, grouped by stop name.
  - Delay (s) growth across stop sequence, and the per-hop delay *increment* between consecutive
    stops (`delay_gain`), to isolate exogenous per-segment delay from cumulative drift.
  - Inter-stop segment travel speed (m/s), derived from consecutive actual-arrival timestamps
    net of dwell time.
  - The ratio of actual to scheduled headway, and actual headway grouped by stop sequence.
  - Rows flagged as bunched, for a sanity check against the modeled bunching definition.

  This analysis produced the two headline findings that shaped the simulation's disturbance
  model: (i) dwell time is essentially flat across stops (mean ≈26 s, std ≈10 s) and not
  correlated with headway (Pearson r = 0.08), contrary to a common "crowding feedback" assumption
  in prior bunching literature; and (ii) instability is instead driven by a per-hop,
  approximately-exponential traffic/signal delay averaging ≈47–48 s (positive on ≈93% of
  observed hops), consistent with the classical Newell & Potts (1964) mechanism of unmanaged
  delay variance accumulating along a corridor.

  ### D.2 Route geometry reconstruction and validation

  Because the dataset provides stop coordinates and cumulative distance but not full road
  geometry, the connecting polyline was reconstructed using the OSRM (Open Source Routing
  Machine) public routing API, then **independently validated against the dataset's own
  distances** rather than trusted uncritically:

  - Each of the 8 inter-stop hops was queried individually.
  - The OSRM-returned hop distance was compared to the CSV's own logged hop distance
    (ratio = OSRM distance ÷ CSV distance).
  - Hops with ratio ≤ 1.5 (5 of 8 hops) were accepted as real road geometry.
  - Hops with ratio > 1.5 (3 of 8 hops, 1.55×–2.65×, corresponding to known small-town OSM
    coverage gaps near two stops) were rejected in favor of an honest straight-line fallback for
    that hop only, rather than shipping a fabricated detour as if it were real road geometry.

  This per-hop validation — rather than accepting a single end-to-end routed path uncritically —
  is itself a methodological choice: an unvalidated full-corridor OSRM query was found to
  overestimate total corridor length by ≈53% (13.6 km vs. the CSV's 8.9 km) before this per-hop
  check was introduced.

  ### D.3 Simulation and control instruments

  - **Simulation engine** (`app/sim/engine.py`): a discrete-event simulation implemented in
    Python, representing each bus's position via linear referencing along the validated corridor
    polyline (`app/sim/route.py`), with deterministic, seed-reproducible stochastic draws for
    dwell time and per-hop delay (`app/sim/engine.py`, hashlib-seeded RNG).
  - **Control algorithms** (`app/sim/control.py`, `app/sim/engine.py`):
    1. *Adaptive holding* (Daganzo, 2009): `hold = max(0, θ·(H_target − forward_headway))`,
      θ ≈ 0.6, applied at stops.
    2. *Cooperative speed control* (Daganzo & Pilachowski, 2011): continuous cruising-speed
      adjustment between stops, proportional to the imbalance between the gap ahead and the gap
      behind.
  - **Target headway derivation**: rather than importing the dataset's raw scheduled-dispatch
    headway (1200 s / 20 min, which describes 30 discrete one-way dispatches from a terminus),
    `TARGET_HEADWAY_S` was *derived* as the calibrated mean round-trip time divided by the real
    fleet size (6 buses), yielding 360 s (6 min) — the value consistent with this simulation's
    continuous closed-loop-fleet topology.
  - **Live visualization instrument**: a FastAPI backend streaming simulation state over
    WebSockets to a React/Leaflet browser dashboard (map view, live metrics, event feed),
    plus simulated driver- and passenger-facing views, used for qualitative/observational
    inspection of control behavior during development (not part of the quantitative evaluation
    in Section G).

  ## E. Procedure

  The study was carried out in the following chronological sequence:

  1. Acquire and inspect the raw logged dataset (264 rows, 30 trips, 9 stops, 6 buses).
  2. Statistically analyze the dataset (Section D.1) to characterize dwell-time and delay
    behavior before choosing a disturbance model.
  3. Reconstruct and validate corridor road geometry per-hop against the dataset (Section D.2).
  4. Implement the discrete-event simulation engine and fit its stochastic parameters
    (`DWELL_MEAN_S`, `DWELL_NOISE`, `HOP_DELAY_MEAN_S`, `CRUISE_SPEED_MPS`) directly to the
    statistics computed in step 2.
  5. Derive `TARGET_HEADWAY_S` analytically from the calibrated round-trip time and real fleet
    size (Section D.3), rather than importing the dataset's scheduled-dispatch figure.
  6. Implement the two control mechanisms (holding, cooperative speed control) as
    independently toggleable modules.
  7. Run the simulation qualitatively via the live dashboard to confirm face-valid behavior
    (bunching emerging under "off", visibly correcting under "combined").
  8. Run the quantitative multi-trial batch evaluation (Section G) to obtain statistically
    defensible effect estimates.

  ## F. Data Analysis

  Quantitative evaluation was performed with `app/sim/batch_eval.py`. For each of *n* = 30
  independently seeded trials, all three arms (off / holding-only / combined) were run from an
  identical shared warmup window (90 min, control off) before diverging at a control-switch
  point, ensuring all three arms observed the same disturbance realization up to that point. Each
  arm was then measured over a 120-minute post-switch window (with a 30-minute "steady-state
  tail" sub-window reported separately, to exclude the transient immediately following the
  control switch).

  For each arm and trial, the following metrics were computed from the recorded headway samples:

  - **Headway coefficient of variation (CV)** = σ/μ of observed headways.
  - **Percent bunched** = fraction of headway samples below a fixed fraction of the target
    headway.
  - **Mean headway.**
  - **Estimated excess passenger wait time**, via the standard headway-reliability formula
    E[wait] = (H/2)·(1 + CV²).

  Across-trial summary statistics (mean, 95% confidence interval) were computed using a
  **normal approximation** (z = 1.96) to the sampling distribution of the mean, which is
  appropriate for *n* ≥ 30 per the Central Limit Theorem; this is disclosed explicitly as an
  approximation rather than an exact Student-*t* interval, since exact/bootstrap intervals were
  identified as a documented next step but not yet implemented at time of writing. Treatment
  effects (holding-only vs. off, combined vs. off, combined vs. holding-only) were tested via a
  **paired z-test** on the per-trial differences, exploiting the shared-disturbance pairing
  design (Section A) to reduce variance relative to an unpaired comparison.

  Headline result: across 30 trials, enabling combined control reduced steady-state headway CV
  from 0.830 to 0.208 and the percentage of bunched arrivals from 22.1% to 0.1% (p ≈ 0).

  ## G. Ethical Considerations

  This study involves no human participants, no personally identifiable information, and no
  intervention on a live operational transit system — it is a computational simulation study
  using a pre-existing, de-identified operational dataset (bus registration plates and stop
  names only; no passenger-level or driver-level personal data is present in or used by the
  dataset or simulation). Accordingly, no informed-consent procedure or institutional ethics
  board approval was required. Two considerations are nonetheless disclosed for transparency:

  - **Data provenance and honesty in reporting**: all disturbance parameters are stated as
    *fitted to* the logged dataset's statistics, not as a row-by-row replay of it, and the
    dataset's modest size (30 trips, one corridor) is disclosed as a limitation on
    generalizability (Section D.3, Section VI of the accompanying paper) rather than
    overclaiming validation against "live" data.
  - **Route-geometry integrity**: where real road geometry could not be reliably obtained
    (Section D.2), a straight-line approximation was used and explicitly disclosed per-hop,
    rather than presenting an unvalidated or fabricated routing result as ground truth.
