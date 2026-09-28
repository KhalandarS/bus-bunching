import type { SimEvent } from "../types";
import { fmtMMSS } from "./format";
import type { Language } from "../i18n/translations";
import { translateStopName } from "../i18n/translations";

/** Plain-text one-liner for a decision-feed event -- used by the passenger
 * view's per-bus drill-down, which needs simple text rather than
 * EventsFeed's styled multi-span JSX. */
export function describeEvent(ev: SimEvent, lang: Language = "kn"): string {
  const stopName = translateStopName(ev.stop ?? "", lang);
  if (lang === "kn") {
    switch (ev.action) {
      case "control_on":
        return `ಬಂಚಿಂಗ್ ನಿಯಂತ್ರಣ ಆನ್ ಮಾಡಲಾಗಿದೆ @ ${fmtMMSS(ev.t)}`;
      case "control_off":
        return `ಬಂಚಿಂಗ್ ನಿಯಂತ್ರಣ ಆಫ್ ಮಾಡಲಾಗಿದೆ @ ${fmtMMSS(ev.t)}`;
      case "hold":
        return `[${fmtMMSS(ev.t)}] (${stopName}): ಅಂತರ ${ev.forward_headway_s}ಸೆ (ಗುರಿ ${ev.target_headway_s}ಸೆ) — ಅತಿ ಹತ್ತಿರ, +${ev.hold_s}ಸೆ ತಡೆಹಿಡಿಯಲಾಗಿದೆ`;
      case "ok":
        return `[${fmtMMSS(ev.t)}] (${stopName}): ಅಂತರ ${ev.forward_headway_s}ಸೆ (ಗುರಿ ${ev.target_headway_s}ಸೆ) — ಅಂತರ ಸರಿಯಾಗಿದೆ`;
      case "unmanaged":
        return `[${fmtMMSS(ev.t)}] (${stopName}): ಅಂತರ ${ev.forward_headway_s}ಸೆ (ಗುರಿ ${ev.target_headway_s}ಸೆ) — ನಿಯಂತ್ರಣ ಆಫ್ ಆಗಿದೆ`;
      case "speed_ease":
        return `[${fmtMMSS(ev.t)}] ಮುಂದಿನ ಬಸ್ ಹತ್ತಿರವಿದ್ದ ಕಾರಣ ವೇಗವನ್ನು ${ev.speed_factor}× ಗೆ ಇಳಿಸಲಾಗಿದೆ`;
      case "speed_boost":
        return `[${fmtMMSS(ev.t)}] ಹಿಂದೆ ಉಳಿದಿದ್ದ ಕಾರಣ ವೇಗವನ್ನು ${ev.speed_factor}× ಗೆ ಹೆಚ್ಚಿಸಲಾಗಿದೆ`;
    }
  }

  switch (ev.action) {
    case "control_on":
      return `Bunching control turned ON @ ${fmtMMSS(ev.t)}`;
    case "control_off":
      return `Bunching control turned OFF @ ${fmtMMSS(ev.t)}`;
    case "hold":
      return `[${fmtMMSS(ev.t)}] at ${stopName}: gap ${ev.forward_headway_s}s (target ${ev.target_headway_s}s) — too close, held +${ev.hold_s}s`;
    case "ok":
      return `[${fmtMMSS(ev.t)}] at ${stopName}: gap ${ev.forward_headway_s}s (target ${ev.target_headway_s}s) — spacing fine`;
    case "unmanaged":
      return `[${fmtMMSS(ev.t)}] at ${stopName}: gap ${ev.forward_headway_s}s (target ${ev.target_headway_s}s) — control disabled`;
    case "speed_ease":
      return `[${fmtMMSS(ev.t)}] eased to ${ev.speed_factor}× speed (crowding the bus ahead)`;
    case "speed_boost":
      return `[${fmtMMSS(ev.t)}] sped up to ${ev.speed_factor}× speed (falling behind)`;
  }
}
