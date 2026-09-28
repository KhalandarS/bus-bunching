"""
Headless, multi-seed statistical evaluation of the bunching control system.

Motivation: the headline "CV ~2.0 -> ~0.25" numbers in PROJECT_STATUS.md came
from watching a *single* run. That's fine for a live demo but not defensible
in front of a mentor or an IEEE reviewer, who will reasonably ask "over how
many trials, and is the difference actually significant, or could it be
explained by which red lights that one run happened to draw?" This script
answers that by running many independent seeded trials and reporting means,
95% confidence intervals, and a paired significance test.

Design (paired, three-arm):
  For each trial (a fresh random seed), the same disturbance realization is
  played out under three conditions:
    - "off"           control never turns on (baseline)
    - "holding_only"  Daganzo (2009) discrete holding only (mechanism 1),
                      cooperative speed control disabled -- isolates what
                      holding alone buys you
    - "combined"      holding + cooperative speed control together
                      (mechanism 1 + 2, i.e. what the live demo calls
                      "AI Control: ON")
  All three share an identical warmup window (control off) before the
  measured window starts, so all three see the exact same disturbance
  history up to that point -- the *pairing* is what lets a fairly small
  number of trials detect a real effect, since across-trial noise (which
  red lights got drawn) is differenced out rather than averaged out.

Metrics (headway CV, % bunched, mean headway, excess wait) are computed only
over headway samples recorded *after* the warmup window in each arm, so all
three arms are compared over the same elapsed service time.

Usage (from the app/ directory):
    "C:\\Users\\Khalandar\\AppData\\Local\\Programs\\Python\\Python312\\python.exe" -m sim.batch_eval
    ... --trials 40 --warmup-min 90 --eval-min 120 --out eval_results.json

Caveat: confidence intervals and the paired test below use a normal
approximation (z = 1.96) to the sampling distribution of the mean, which is
accurate for --trials >= ~30 (per the central limit theorem) but is an
approximation, not an exact Student-t interval -- said plainly so it isn't
misquoted as more precise than it is.
"""
import argparse
import json
import math
import statistics as stats_mod
import time

from .engine import Simulation, TARGET_HEADWAY_S, BUNCH_HEADWAY_FRAC

MODES = ("off", "holding_only", "combined")


def run_condition(seed: int, mode: str, total_s: float, dt: float, cutoff_s: float):
    """Returns the full (t, headway) log from cutoff_s onward -- callers slice
    out whichever sub-window (full measured window vs. steady-state tail)
    they need."""
    sim = Simulation(seed=seed)
    switched = False
    t = 0.0
    while t < total_s - 1e-9:
        if not switched and mode != "off" and t >= cutoff_s:
            sim.set_control(True)
            if mode == "holding_only":
                sim.speed_control_enabled = False
            switched = True
        sim.step(dt)
        t += dt
    return [(ts, h) for (ts, h) in sim.fleet.headway_log if ts >= cutoff_s]


def stats_from_samples(samples):
    n = len(samples)
    if n < 2:
        return {"n": n, "mean_headway_s": float("nan"), "cv": float("nan"),
                "bunch_pct": float("nan"), "excess_wait_s": float("nan")}
    mean = stats_mod.mean(samples)
    sd = stats_mod.pstdev(samples, mu=mean)
    cv = sd / mean if mean > 0 else 0.0
    bunch_pct = 100.0 * sum(1 for x in samples if x < BUNCH_HEADWAY_FRAC * TARGET_HEADWAY_S) / n
    excess_wait = (mean / 2.0) * (1.0 + cv ** 2)
    return {"n": n, "mean_headway_s": mean, "cv": cv, "bunch_pct": bunch_pct, "excess_wait_s": excess_wait}


def _norm_cdf(z):
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2)))


def summarize(values):
    n = len(values)
    mean = stats_mod.mean(values)
    if n < 2:
        return {"mean": mean, "ci95_lo": mean, "ci95_hi": mean, "n": n}
    sd = stats_mod.stdev(values)
    se = sd / math.sqrt(n)
    margin = 1.96 * se  # normal approximation -- see module docstring caveat
    return {"mean": mean, "ci95_lo": mean - margin, "ci95_hi": mean + margin, "n": n}


def paired_test(baseline_vals, treatment_vals):
    diffs = [t - b for b, t in zip(baseline_vals, treatment_vals)]
    n = len(diffs)
    mean_d = stats_mod.mean(diffs)
    if n < 2:
        return {"mean_diff": mean_d, "z": float("nan"), "p_value_approx": float("nan"), "n": n}
    sd_d = stats_mod.stdev(diffs)
    se_d = sd_d / math.sqrt(n)
    z = mean_d / se_d if se_d > 0 else float("inf")
    p = 2 * (1 - _norm_cdf(abs(z))) if math.isfinite(z) else 0.0
    return {"mean_diff": mean_d, "z": z, "p_value_approx": p, "n": n}


def main():
    parser = argparse.ArgumentParser(
        description="Multi-seed statistical evaluation: off vs holding-only vs combined control")
    parser.add_argument("--trials", type=int, default=30)
    parser.add_argument("--warmup-min", type=float, default=90.0,
                         help="minutes of control-off warmup shared by all arms before the measured window starts")
    parser.add_argument("--eval-min", type=float, default=120.0,
                         help="minutes of simulated service measured after warmup, in every arm")
    parser.add_argument("--tail-min", type=float, default=30.0,
                         help="trailing minutes of the eval window treated as 'steady state' -- reported "
                              "separately from the full eval window, since the full window's average "
                              "necessarily includes the recovery transient right after control switches on")
    parser.add_argument("--dt", type=float, default=1.0, help="sim seconds per engine step (headless)")
    parser.add_argument("--seed-base", type=int, default=1000)
    parser.add_argument("--out", type=str, default=None, help="optional path to dump full per-trial JSON")
    args = parser.parse_args()

    warmup_s = args.warmup_min * 60.0
    eval_s = args.eval_min * 60.0
    total_s = warmup_s + eval_s
    tail_cutoff_s = total_s - args.tail_min * 60.0

    t0 = time.time()
    rows = {"full": {mode: [] for mode in MODES}, "tail": {mode: [] for mode in MODES}}
    per_trial = []

    for i in range(args.trials):
        seed = args.seed_base + i
        trial_row = {"seed": seed}
        for mode in MODES:
            log = run_condition(seed, mode, total_s, args.dt, warmup_s)
            full_s = stats_from_samples([h for (_t, h) in log])
            tail_s = stats_from_samples([h for (t, h) in log if t >= tail_cutoff_s])
            rows["full"][mode].append(full_s)
            rows["tail"][mode].append(tail_s)
            trial_row[mode] = {"full": full_s, "tail": tail_s}
        per_trial.append(trial_row)

    elapsed = time.time() - t0

    def build_summary(window):
        summary = {}
        for key in ("cv", "bunch_pct", "mean_headway_s", "excess_wait_s"):
            summary[key] = {mode: summarize([r[key] for r in rows[window][mode]]) for mode in MODES}
            summary[key]["holding_only_vs_off"] = paired_test(
                [r[key] for r in rows[window]["off"]], [r[key] for r in rows[window]["holding_only"]])
            summary[key]["combined_vs_off"] = paired_test(
                [r[key] for r in rows[window]["off"]], [r[key] for r in rows[window]["combined"]])
            summary[key]["combined_vs_holding_only"] = paired_test(
                [r[key] for r in rows[window]["holding_only"]], [r[key] for r in rows[window]["combined"]])
        return summary

    summary = {"full": build_summary("full"), "tail": build_summary("tail")}

    config = {
        "trials": args.trials, "warmup_min": args.warmup_min, "eval_min": args.eval_min,
        "tail_min": args.tail_min, "dt": args.dt, "seed_base": args.seed_base,
        "elapsed_s": round(elapsed, 1),
    }

    def print_window(window, label):
        print(f"\n--- {label} ---")
        header = f"{'metric':<16}{'off':>22}{'holding_only':>24}{'combined':>22}"
        print(header)
        print("-" * len(header))
        for key in ("cv", "bunch_pct", "mean_headway_s", "excess_wait_s"):
            row = summary[window][key]

            def fmt(mode):
                m = row[mode]
                return f"{m['mean']:.3f} [{m['ci95_lo']:.3f},{m['ci95_hi']:.3f}]"

            print(f"{key:<16}{fmt('off'):>22}{fmt('holding_only'):>24}{fmt('combined'):>22}")
        print()
        for key in ("cv", "bunch_pct", "mean_headway_s", "excess_wait_s"):
            cvo = summary[window][key]["combined_vs_off"]
            print(f"{key}: combined vs off  mean_diff={cvo['mean_diff']:+.3f}  "
                  f"z={cvo['z']:.2f}  p~={cvo['p_value_approx']:.4g}")

    print(f"\n=== Batch evaluation: {args.trials} trials, {args.warmup_min:.0f}min warmup, "
          f"{args.eval_min:.0f}min measured window, {args.tail_min:.0f}min steady-state tail ({elapsed:.1f}s) ===")
    print_window("full", f"Full measured window ({args.eval_min:.0f} min after control switches -- includes recovery transient)")
    print_window("tail", f"Steady-state tail (last {args.tail_min:.0f} min of the measured window only)")

    if args.out:
        with open(args.out, "w") as f:
            json.dump({"config": config, "per_trial": per_trial, "summary": summary}, f, indent=2)
        print(f"\nFull per-trial data written to {args.out}")


if __name__ == "__main__":
    main()
