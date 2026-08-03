"""
Daganzo (2009) adaptive headway control.

At a control-point stop, a bus is held for a *fraction* (theta) of the gap
between its own forward headway and the target headway -- not the full gap.
Full correction (theta=1) overcorrects and re-triggers oscillation; partial
correction damps it. See bus-bunching-prevention-research.md section 5.3.
"""

THETA = 0.6          # damping factor (0 < theta <= 1)
MAX_HOLD_S = 45.0    # safety cap so a single bus is never held absurdly long


def hold_time(forward_headway_s, target_headway_s, theta=THETA, max_hold=MAX_HOLD_S):
    raw = theta * (target_headway_s - forward_headway_s)
    return max(0.0, min(raw, max_hold))
