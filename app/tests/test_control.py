import unittest

from sim.control import hold_time, THETA, MAX_HOLD_S


class TestHoldTime(unittest.TestCase):
    def test_never_negative(self):
        # a bus arriving ahead of schedule (forward_headway > target) should
        # never be held -- hold_time must clamp at 0, not go negative
        self.assertEqual(hold_time(forward_headway_s=500, target_headway_s=300), 0.0)

    def test_never_exceeds_cap(self):
        # a bus arriving right on top of the one ahead (headway ~ 0) would
        # imply a huge raw hold -- the safety cap must still apply
        h = hold_time(forward_headway_s=0.0, target_headway_s=300, theta=1.0)
        self.assertLessEqual(h, MAX_HOLD_S)

    def test_partial_correction_by_default(self):
        # theta=0.6 means only 60% of the deficit is held back, per Daganzo
        # (2009) -- full correction (theta=1) is known to overcorrect.
        # Deficit kept small enough to stay under MAX_HOLD_S so this isolates
        # theta's effect from the separate safety-cap behavior tested above.
        forward_headway, target = 280.0, 300.0
        expected = THETA * (target - forward_headway)
        self.assertAlmostEqual(hold_time(forward_headway, target), expected)

    def test_monotonic_in_deficit(self):
        # the further behind schedule the bus ahead was, the longer this
        # bus should be held (until the cap kicks in)
        h_small_deficit = hold_time(forward_headway_s=250, target_headway_s=300)
        h_big_deficit = hold_time(forward_headway_s=100, target_headway_s=300)
        self.assertLess(h_small_deficit, h_big_deficit)


if __name__ == "__main__":
    unittest.main()
