import unittest

from sim.engine import Simulation, SPEED_FACTOR_MIN, SPEED_FACTOR_MAX, SPEED_FACTOR_RAMP_PER_S


def run(seed, steps, dt=1.0, control_on_at=None):
    sim = Simulation(seed=seed)
    t = 0.0
    for _ in range(steps):
        if control_on_at is not None and not sim.control_enabled and t >= control_on_at:
            sim.set_control(True)
        sim.step(dt)
        t += dt
    return sim


class TestReproducibility(unittest.TestCase):
    def test_same_seed_same_result(self):
        # the live demo and the batch evaluation both depend on a fixed seed
        # replaying identically -- if this breaks, "n=30 seeded trials" stops
        # meaning anything
        a = run(seed=7, steps=500, control_on_at=100.0)
        b = run(seed=7, steps=500, control_on_at=100.0)
        self.assertEqual(a.t, b.t)
        for ba, bb in zip(a.fleet.buses, b.fleet.buses):
            self.assertAlmostEqual(ba.dist_m, bb.dist_m)
            self.assertEqual(ba.state, bb.state)

    def test_different_seeds_diverge(self):
        # batch_eval.py relies on --seed-base + i actually producing
        # independent disturbance realizations, not the same script replayed
        a = run(seed=1, steps=500, control_on_at=100.0)
        b = run(seed=2, steps=500, control_on_at=100.0)
        distances_a = [b_.dist_m for b_ in a.fleet.buses]
        distances_b = [b_.dist_m for b_ in b.fleet.buses]
        self.assertNotEqual(distances_a, distances_b)


class TestSpeedRamp(unittest.TestCase):
    def test_factor_never_snaps_in_one_tick(self):
        # the driver-safety fix: a bus's speed_factor must never move more
        # than the rate-limited step per tick, no matter how large the
        # instantaneous gap imbalance target would otherwise be
        sim = Simulation(seed=3)
        sim.set_control(True)
        dt = 1.0
        for _ in range(300):
            prev = [b.speed_factor for b in sim.fleet.buses]
            sim.step(dt)
            for p, b in zip(prev, sim.fleet.buses):
                self.assertLessEqual(abs(b.speed_factor - p), SPEED_FACTOR_RAMP_PER_S * dt + 1e-9)

    def test_factor_stays_in_bounds(self):
        sim = Simulation(seed=4)
        sim.set_control(True)
        for _ in range(2000):
            sim.step(1.0)
            for b in sim.fleet.buses:
                self.assertGreaterEqual(b.speed_factor, SPEED_FACTOR_MIN - 1e-9)
                self.assertLessEqual(b.speed_factor, SPEED_FACTOR_MAX + 1e-9)

    def test_control_off_ramps_back_to_one(self):
        sim = Simulation(seed=5)
        sim.set_control(True)
        for _ in range(600):
            sim.step(1.0)
        sim.set_control(False)
        for _ in range(600):
            sim.step(1.0)
        for b in sim.fleet.buses:
            self.assertAlmostEqual(b.speed_factor, 1.0, places=2)


class TestHoldingOnlyAblation(unittest.TestCase):
    def test_speed_control_disabled_keeps_factor_at_one(self):
        # used by batch_eval.py's "holding_only" arm -- must actually
        # suppress mechanism 2 entirely, not just tone it down
        sim = Simulation(seed=6)
        sim.set_control(True)
        sim.speed_control_enabled = False
        for _ in range(500):
            sim.step(1.0)
            for b in sim.fleet.buses:
                self.assertEqual(b.speed_factor, 1.0)


class TestLiveParams(unittest.TestCase):
    def test_set_params_clamps_range(self):
        sim = Simulation(seed=8)
        sim.set_params(theta=5.0, speed_gain=-3.0)
        self.assertEqual(sim.theta, 1.0)
        self.assertEqual(sim.speed_gain, 0.0)

    def test_set_params_partial_update(self):
        sim = Simulation(seed=9)
        original_gain = sim.speed_gain
        sim.set_params(theta=0.2)
        self.assertEqual(sim.theta, 0.2)
        self.assertEqual(sim.speed_gain, original_gain)


class TestMetrics(unittest.TestCase):
    def test_default_metrics_before_any_headway_sample(self):
        sim = Simulation(seed=10)
        m = sim.fleet.metrics()
        self.assertEqual(m["cv"], 0.0)
        self.assertEqual(m["bunch_pct"], 0.0)


if __name__ == "__main__":
    unittest.main()
