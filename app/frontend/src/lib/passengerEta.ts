import type { Bus, BusState, SpeedState } from "../types";

// Matches sim/engine.py's CRUISE_SPEED_MPS -- used only to estimate passenger
// arrival times client-side; not authoritative, same approximation real
// transit ETA apps make (steady cruising speed, not per-stop lookahead).
export const CRUISE_SPEED_MPS = 5.5;

const STATIONARY_STATES: BusState[] = ["dwelling", "holding", "signal_delay", "layover"];

// Within this distance of the stop while stationary, treat the bus as
// "here now" (boarding) rather than showing a misleading arrival countdown
// for a bus that has, in fact, already arrived.
const AT_STOP_EPSILON_M = 40;

export interface StopArrival {
  busId: number;
  plate: string;
  etaS: number;
  distAwayM: number;
  state: BusState;
  speedState: SpeedState;
  atStopNow: boolean;
}

/** Ranks buses by estimated arrival time at a given stop (by distance along
 * the route). Buses already past the stop this lap are assumed to arrive
 * next lap. Currently-stationary buses (holding/dwelling/signal/layover)
 * add their remaining wait on top of travel time -- unless they're
 * stationary essentially at the target stop itself, in which case there's
 * no "arrival" left to count down, just a boarding window. */
export function computeStopArrivals(stopDistM: number, lengthM: number, buses: Bus[]): StopArrival[] {
  const arrivals: StopArrival[] = buses.map((b) => {
    const aheadOfStop = b.dist_m <= stopDistM;
    const remaining = aheadOfStop ? stopDistM - b.dist_m : lengthM - b.dist_m + stopDistM;
    const stationary = STATIONARY_STATES.includes(b.state);
    const atStopNow = stationary && aheadOfStop && remaining <= AT_STOP_EPSILON_M;
    const stationaryWait = stationary ? b.timer_s : 0;
    const etaS = atStopNow ? stationaryWait : stationaryWait + remaining / CRUISE_SPEED_MPS;
    return { busId: b.id, plate: b.plate, etaS, distAwayM: remaining, state: b.state, speedState: b.speed_state, atStopNow };
  });
  return arrivals.sort((a, b) => a.etaS - b.etaS);
}
