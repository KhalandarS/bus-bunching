import type { Bus, Snapshot } from "../types";
import { fmtSS } from "./format";

export type StatusClass = "idle" | "go" | "wait" | "signal";

export interface BusStatus {
  cls: StatusClass;
  labelTxt: string;
  countdownTxt: string;
  reasonTxt: string;
  speedTxt: string;
}

// Derives the display status for one bus -- shared by the single-bus screen
// and the all-buses grid so the two views never disagree.
export function busStatus(bus: Bus, snap: Snapshot): BusStatus {
  if (bus.state === "holding") {
    return {
      cls: "wait",
      labelTxt: "WAIT HERE",
      countdownTxt: fmtSS(bus.timer_s),
      reasonTxt: `You're running close behind the bus ahead of you — gap is ${Math.round(bus.forward_headway_s)}s, target is ${Math.round(snap.target_headway_s)}s. Bunching control asked you to hold ${Math.round(bus.current_hold_s)}s extra here so spacing stays even.`,
      speedTxt: "",
    };
  }
  if (bus.state === "dwelling") {
    return {
      cls: "go",
      labelTxt: "BOARDING",
      countdownTxt: fmtSS(bus.timer_s),
      reasonTxt: snap.control_enabled
        ? "Normal stop — your spacing looks fine, no extra wait needed."
        : "Normal stop. (Bunching control is currently OFF — no spacing checks are being made.)",
      speedTxt: "",
    };
  }
  if (bus.state === "signal_delay") {
    return {
      cls: "signal",
      labelTxt: "STOPPED AT SIGNAL",
      countdownTxt: fmtSS(bus.timer_s),
      reasonTxt: "Red light — this is just traffic, not a bunching-control instruction.",
      speedTxt: "",
    };
  }
  if (bus.state === "layover") {
    return {
      cls: "idle",
      labelTxt: "AT DEPOT",
      countdownTxt: fmtSS(bus.timer_s),
      reasonTxt: "Layover before starting the next trip.",
      speedTxt: "",
    };
  }
  // moving
  let speedTxt = "";
  if (bus.speed_state === "easing") speedTxt = "Cooperative control: easing off slightly — you're crowding the bus ahead.";
  if (bus.speed_state === "boosting") speedTxt = "Cooperative control: speed up slightly — the bus behind is catching up.";
  return { cls: "go", labelTxt: "GO", countdownTxt: "", reasonTxt: "Proceed as normal.", speedTxt };
}
