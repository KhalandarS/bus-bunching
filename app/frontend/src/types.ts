export type BusState = "moving" | "dwelling" | "holding" | "signal_delay" | "layover";
export type SpeedState = "normal" | "easing" | "boosting";

export interface Bus {
  id: number;
  lat: number;
  lon: number;
  dist_m: number;
  state: BusState;
  speed_state: SpeedState;
  timer_s: number;
  current_hold_s: number;
  forward_headway_s: number;
  stop_label: string;
}

export interface Metrics {
  cv: number;
  mean_headway_s: number;
  excess_wait_s: number;
  bunch_pct: number;
}

export type SimEvent =
  | { action: "control_on" | "control_off"; t: number; bus_id: null; stop: null }
  | {
      action: "hold" | "ok" | "unmanaged";
      t: number;
      bus_id: number;
      stop: string;
      hold_s: number;
      forward_headway_s: number;
      target_headway_s: number;
    }
  | {
      action: "speed_ease" | "speed_boost";
      t: number;
      bus_id: number;
      stop: null;
      forward_gap_m: number;
      backward_gap_m: number;
      speed_factor: number;
    };

export interface Snapshot {
  t: number;
  control_enabled: boolean;
  target_headway_s: number;
  buses: Bus[];
  metrics: Metrics;
  events?: SimEvent[];
}

export interface Stop {
  index: number;
  name: string;
  dist_m: number;
  is_landmark: boolean;
}

export interface RouteData {
  corridor_name: string;
  coords: [number, number][]; // [lat, lon]
  cumulative_m: number[];
  stops: Stop[];
  control_point_idxs: number[];
  signal_idxs: number[];
  target_headway_s: number;
}
