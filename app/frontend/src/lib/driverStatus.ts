import type { Bus, Snapshot } from "../types";
import { fmtSS } from "./format";
import type { Translations } from "../i18n/translations";
import { translations } from "../i18n/translations";

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
export function busStatus(bus: Bus, snap: Snapshot, t: Translations = translations.kn): BusStatus {
  if (bus.state === "holding") {
    return {
      cls: "wait",
      labelTxt: t.statusWaitHere,
      countdownTxt: fmtSS(bus.timer_s),
      reasonTxt: t.driverReasonHolding(
        Math.round(bus.forward_headway_s),
        Math.round(snap.target_headway_s),
        Math.round(bus.current_hold_s)
      ),
      speedTxt: "",
    };
  }
  if (bus.state === "dwelling") {
    return {
      cls: "go",
      labelTxt: t.statusBoarding,
      countdownTxt: fmtSS(bus.timer_s),
      reasonTxt: snap.control_enabled ? t.driverReasonDwellingOn : t.driverReasonDwellingOff,
      speedTxt: "",
    };
  }
  if (bus.state === "signal_delay") {
    return {
      cls: "signal",
      labelTxt: t.statusStoppedSignal,
      countdownTxt: fmtSS(bus.timer_s),
      reasonTxt: t.driverReasonSignal,
      speedTxt: "",
    };
  }
  if (bus.state === "layover") {
    return {
      cls: "idle",
      labelTxt: t.statusAtDepot,
      countdownTxt: fmtSS(bus.timer_s),
      reasonTxt: t.driverReasonLayover,
      speedTxt: "",
    };
  }
  // moving
  let speedTxt = "";
  if (bus.speed_state === "easing") speedTxt = t.driverSpeedEasing;
  if (bus.speed_state === "boosting") speedTxt = t.driverSpeedBoosting;
  return { cls: "go", labelTxt: t.statusGo, countdownTxt: "", reasonTxt: t.driverReasonGoNormal, speedTxt };
}
