export type Language = "kn" | "en";

export interface Translations {
  // App & Header
  appTitle: string;
  appSubtitle: string;
  resume: string;
  pause: string;
  reset: string;
  skipAhead10Min: string;
  speed: string;
  statusLive: string;
  statusConnecting: string;
  statusDisconnected: string;
  statusError: string;
  driverConsoleLink: string;
  passengerViewLink: string;
  backToControlMap: string;
  controlRoom: string;

  // Control Switch & Banner
  bunchingControl: string;
  bunchingControlOn: string;
  bunchingControlOff: string;
  controlDescOn: string;
  controlDescOff: string;
  bunchingDetected: (count: number, distM: number) => string;

  // Parameters
  holdingDamping: string;
  speedControlGain: string;
  paramsHint: string;

  // Metrics Panel
  metricCv: string;
  metricMeanHeadway: string;
  metricEstRiderWait: string;
  metricTimeBunched: string;

  // Live Decision Feed
  liveFeedTitle: string;
  liveFeedSubtitle: string;
  evControlOn: (time: string) => string;
  evControlOff: (time: string) => string;
  evHold: (time: string, plate: string, stop: string, gap: number, target: number, hold: number) => string;
  evOk: (time: string, plate: string, stop: string, gap: number, target: number) => string;
  evUnmanaged: (time: string, plate: string, stop: string, gap: number, target: number) => string;
  evSpeedEase: (time: string, plate: string, factor: number, fwdM: number, backM: number) => string;
  evSpeedBoost: (time: string, plate: string, factor: number, fwdM: number, backM: number) => string;
  tagHold: string;
  tagOk: string;
  tagUnmanaged: string;

  // Chart & Explanation
  chartTitle: string;
  chartLegend: string;
  howThisWorks: string;
  howThisWorksP1: string;
  howThisWorksP2: string;

  // Driver Console
  driverConsoleTitle: string;
  singleBus: string;
  compareAllBuses: string;
  busLabel: (plate: string) => string;
  gapToBusAhead: string;
  targetHeadway: string;
  busesOnRoad: (count: number) => string;
  gapAheadSmall: (gap: number, target: number) => string;
  statusWaitHere: string;
  statusBoarding: string;
  statusStoppedSignal: string;
  statusAtDepot: string;
  statusGo: string;
  driverReasonHolding: (gap: number, target: number, hold: number) => string;
  driverReasonDwellingOn: string;
  driverReasonDwellingOff: string;
  driverReasonSignal: string;
  driverReasonLayover: string;
  driverReasonGoNormal: string;
  driverSpeedEasing: string;
  driverSpeedBoosting: string;

  // Passenger View
  nextBus: string;
  spacingControlLabel: (on: boolean) => string;
  noBusesForStop: string;
  connectingMsg: string;
  rankNext: string;
  rankNumber: (rank: number) => string;
  hereNow: string;
  boardingLabel: string;
  arrivingCloseBehind: string;
  arrivingAfter: (timeStr: string) => string;
  kmAway: (km: string) => string;
  passengerNoteHolding: string;
  passengerNoteSignal: string;
  passengerNoteLayover: string;
  passengerNoteEasing: string;
  passengerNoteBoosting: string;

  // Map & Stops
  terminusSuffix: string;
  controlPointSuffix: string;
}

export const STOP_NAME_TRANSLATIONS: Record<string, { kn: string; en: string }> = {
  "Tumkur KSRTC Bus Stand": {
    kn: "ತುಮಕೂರು ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಬಸ್ ನಿಲ್ದಾಣ",
    en: "Tumkur KSRTC Bus Stand",
  },
  "Ashoka Circle (Amanikere Lake)": {
    kn: "ಅಶೋಕ ವೃತ್ತ (ಅಮಾನಿಕೆರೆ ಕೆರೆ)",
    en: "Ashoka Circle (Amanikere Lake)",
  },
  "Siragate Circle (Kalidas Circle)": {
    kn: "ಸಿರಾ ಗೇಟ್ ವೃತ್ತ (ಕಾಳಿದಾಸ ವೃತ್ತ)",
    en: "Siragate Circle (Kalidas Circle)",
  },
  "SIET College Gate": {
    kn: "ಎಸ್.ಐ.ಇ.ಟಿ ಕಾಲೇಜು ಗೇಟ್",
    en: "SIET College Gate",
  },
};

export function translateStopName(name: string, lang: Language): string {
  if (STOP_NAME_TRANSLATIONS[name]) {
    return STOP_NAME_TRANSLATIONS[name][lang];
  }
  // Try partial match if name contains suffixes
  for (const [key, val] of Object.entries(STOP_NAME_TRANSLATIONS)) {
    if (name.startsWith(key)) {
      const rest = name.slice(key.length);
      return val[lang] + rest;
    }
  }
  return name;
}

export const translations: Record<Language, Translations> = {
  kn: {
    // App & Header
    appTitle: "ಬಸ್ ಬಂಚಿಂಗ್ ತಡೆಗಟ್ಟುವಿಕೆ — ಲೈವ್ ನಿಯಂತ್ರಣ ಡೆಮೊ",
    appSubtitle: "ತುಮಕೂರು, ಕರ್ನಾಟಕ · ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಬಸ್ ನಿಲ್ದಾಣ → ಎಸ್.ಐ.ಇ.ಟಿ ಕಾಲೇಜು ಗೇಟ್ · ನೈಜ ಬಸ್ ನಿಲ್ದಾಣಗಳು ಮತ್ತು ರಸ್ತೆ ಜ್ಯಾಮಿತಿ",
    resume: "ಮುಂದುವರಿಸಿ",
    pause: "ವಿರಾಮ",
    reset: "ಮರುಹೊಂದಿಸಿ",
    skipAhead10Min: "10 ನಿಮಿಷ ಮುಂದೆ ಹೋಗಿ",
    speed: "ವೇಗ",
    statusLive: "ಲೈವ್",
    statusConnecting: "ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ…",
    statusDisconnected: "ಸಂಪರ್ಕ ಕಡಿತಗೊಂಡಿದೆ",
    statusError: "ದೋಷ",
    driverConsoleLink: "ಚಾಲಕರ ಕನ್ಸೋಲ್ →",
    passengerViewLink: "ಪ್ರಯಾಣಿಕರ ವೀಕ್ಷಣೆ →",
    backToControlMap: "← ಕಂಟ್ರೋಲ್ ರೂಮ್ ನಕ್ಷೆಗೆ ಹಿಂತಿರುಗಿ",
    controlRoom: "ಕಂಟ್ರೋಲ್ ರೂಮ್",

    // Control Switch & Banner
    bunchingControl: "ಬಂಚಿಂಗ್ ನಿಯಂತ್ರಣ",
    bunchingControlOn: "ಬಂಚಿಂಗ್ ನಿಯಂತ್ರಣ: ಆನ್ (ON)",
    bunchingControlOff: "ಬಂಚಿಂಗ್ ನಿಯಂತ್ರಣ: ಆಫ್ (OFF)",
    controlDescOn: "ಹೋಲ್ಡಿಂಗ್ + ಪರಸ್ಪರ ವೇಗ ನಿಯಂತ್ರಣ ಸಕ್ರಿಯವಾಗಿದೆ — ಬಸ್‌ಗಳ ನಡುವಿನ ಅಂತರ ಸರಿಹೊಂದುವುದನ್ನು ಗಮನಿಸಿ.",
    controlDescOff: "ಬಸ್‌ಗಳು ಅನಿರ್ಬಂಧಿತವಾಗಿ ಚಲಿಸುತ್ತಿವೆ — ಬಸ್‌ಗಳು ಒಟ್ಟಿಗೆ ಗುಂಪುಗೂಡುವುದನ್ನು (ಬಂಚಿಂಗ್) ಗಮನಿಸಿ ನಂತರ ಆನ್ ಮಾಡಿ.",
    bunchingDetected: (count, distM) => `ಬಂಚಿಂಗ್ ಪತ್ತೆಯಾಗಿದೆ — ${count} ಬಸ್‌ಗಳು ${distM}ಮೀ ಅಂತರದೊಳಗೆ ಒಟ್ಟಿಗೆ ಇವೆ`,

    // Parameters
    holdingDamping: "ಹೋಲ್ಡಿಂಗ್ ಡ್ಯಾಂಪಿಂಗ್ (θ)",
    speedControlGain: "ವೇಗ ನಿಯಂತ್ರಣ ಗೇನ್ (Gain)",
    paramsHint: "θ=1 ಅಥವಾ ಅತಿ ಹೆಚ್ಚು ಗೇನ್ ಮಿತಿಮೀರಿದ ತಿದ್ದುಪಡಿ ತರುತ್ತದೆ — ಲೈವ್ ಆಗಿ ಪ್ರಯತ್ನಿಸಿ.",

    // Metrics Panel
    metricCv: "ಹೆಡ್‌ವೇ ವ್ಯತ್ಯಾಸ (CV)",
    metricMeanHeadway: "ಸರಾಸರಿ ಅಂತರ ಸಮಯ",
    metricEstRiderWait: "ನಿರೀಕ್ಷಿತ ಕಾಯುವ ಸಮಯ",
    metricTimeBunched: "ಬಂಚಿಂಗ್‌ನಲ್ಲಿ ಕಳೆದ ಸಮಯ",

    // Live Decision Feed
    liveFeedTitle: "ಲೈವ್ ನಿರ್ಧಾರಗಳ ಮಾಹಿತಿ",
    liveFeedSubtitle: "ವ್ಯವಸ್ಥೆಯು ಪ್ರತಿ ಕ್ಷಣದಲ್ಲಿ ಏನನ್ನು ಗಮನಿಸಿ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದೆ.",
    evControlOn: (time) => `— ಬಂಚಿಂಗ್ ನಿಯಂತ್ರಣ ಆನ್ ಮಾಡಲಾಗಿದೆ @ ${time} —`,
    evControlOff: (time) => `— ಬಂಚಿಂಗ್ ನಿಯಂತ್ರಣ ಆಫ್ ಮಾಡಲಾಗಿದೆ @ ${time} —`,
    evHold: (time, plate, stop, gap, target, hold) =>
      `[${time}] ಬಸ್ ${plate} (${stop}): ಅಂತರ ${gap}ಸೆ (ಗುರಿ ${target}ಸೆ) → ಅತಿ ಹತ್ತಿರ, +${hold}ಸೆ ತಡೆಹಿಡಿಯಲಾಗಿದೆ (HOLDING)`,
    evOk: (time, plate, stop, gap, target) =>
      `[${time}] ಬಸ್ ${plate} (${stop}): ಅಂತರ ${gap}ಸೆ (ಗುರಿ ${target}ಸೆ) — ಅಂತರ ಸರಿಯಾಗಿದೆ, ಯಾವುದೇ ತಡೆ ಇಲ್ಲ`,
    evUnmanaged: (time, plate, stop, gap, target) =>
      `[${time}] ಬಸ್ ${plate} (${stop}): ಅಂತರ ${gap}ಸೆ (ಗುರಿ ${target}ಸೆ) — ನಿಯಂತ್ರಣ ಆಫ್ ಆಗಿದೆ, ಯಾವುದೇ ಕ್ರಮವಿಲ್ಲ`,
    evSpeedEase: (time, plate, factor, fwdM, backM) =>
      `[${time}] ಬಸ್ ${plate}: ಮುಂದಿನ ಬಸ್‌ಗೆ ಹತ್ತಿರವಾಗಿದ್ದರಿಂದ ವೇಗವನ್ನು ${factor}× ಗೆ ಇಳಿಸಲಾಗಿದೆ (${fwdM}ಮೀ ಮುಂದೆ vs ${backM}ಮೀ ಹಿಂದೆ)`,
    evSpeedBoost: (time, plate, factor, fwdM, backM) =>
      `[${time}] ಬಸ್ ${plate}: ಹಿಂದೆ ಉಳಿದಿದ್ದರಿಂದ ವೇಗವನ್ನು ${factor}× ಗೆ ಹೆಚ್ಚಿಸಲಾಗಿದೆ (${fwdM}ಮೀ ಮುಂದೆ vs ${backM}ಮೀ ಹಿಂದೆ)`,
    tagHold: "ಅತಿ ಹತ್ತಿರ, ತಡೆಹಿಡಿಯಲಾಗಿದೆ",
    tagOk: "ಅಂತರ ಸರಿಯಾಗಿದೆ",
    tagUnmanaged: "ನಿಯಂತ್ರಣ ಆಫ್ ಆಗಿದೆ",

    // Chart & Explanation
    chartTitle: "ಹೆಡ್‌ವೇ ವ್ಯತ್ಯಾಸ ಗುಣಾಂಕ - CV (ರೋಲಿಂಗ್ ವಿಂಡೋ)",
    chartLegend: "ಕಡಿಮೆ ಮೌಲ್ಯ ಉತ್ತಮ. CV > ~0.5 ಎಂದರೆ ಬಸ್‌ಗಳು ಗುಂಪುಗೂಡಿವೆ; ಉತ್ತಮ ನಿಯಂತ್ರಣದಲ್ಲಿ ~0.2–0.3 ಇರುತ್ತದೆ. ಚುಕ್ಕೆ ಗೆರೆಗಳು ನಿಯಂತ್ರಣ ಆನ್/ಆಫ್ ಆದ ಸಮಯವನ್ನು ಸೂಚಿಸುತ್ತವೆ.",
    howThisWorks: "ಇದು ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ?",
    howThisWorksP1:
      "ಇಲ್ಲಿ ತೋರಿಸಿರುವ ರಸ್ತೆ ಮಾರ್ಗವು ನೈಜವಾದದ್ದು (~4.3 ಕಿ.ಮೀ ತುಮಕೂರು ಕಾರಿಡಾರ್‌ನಲ್ಲಿ ಸ್ವತಂತ್ರವಾಗಿ ಪರಿಶೀಲಿಸಲಾದ ನಿಲ್ದಾಣಗಳು ಮತ್ತು OSRM ರಸ್ತೆ ಜ್ಯಾಮಿತಿ). ನೈಜ ಜಿಪಿಎಸ್ ಲಾಗ್ ಲಭ್ಯವಿಲ್ಲದ ಕಾರಣ, ಟ್ರಾಫಿಕ್ ಮತ್ತು ಸಿಗ್ನಲ್ ವಿಳಂಬಗಳ ಮಾದರಿಯನ್ನು ಆಧರಿಸಿದೆ: ಪ್ರತಿ ನಿಲ್ದಾಣದ ನಡುವೆ ಸರಾಸರಿ ~35ಸೆ ಯಾದೃಚ್ಛಿಕ ಟ್ರಾಫಿಕ್ ವಿಳಂಬ ಉಂಟಾಗುತ್ತದೆ. ಸ್ವಯಂ-ನಿಯಂತ್ರಣವಿಲ್ಲದಿದ್ದಾಗ, ಈ ಸಣ್ಣ ವಿಳಂಬಗಳು ಮಾರ್ಗದುದ್ದಕ್ಕೂ ಒಟ್ಟಾಗಿ ಸೇರಿಕೊಂಡು ಬಸ್‌ಗಳು ಒಂದನ್ನೊಂದು ಹಿಂದಿಕ್ಕಲು ಸಾಧ್ಯವಾಗದೆ ಒಟ್ಟಿಗೆ ಗುಂಪುಗೂಡುತ್ತವೆ (ಬಸ್ ಬಂಚಿಂಗ್) — ಇದು ನೆವೆಲ್ ಮತ್ತು ಪಾಟ್ಸ್ (1964) ರ ಕ್ಲಾಸಿಕಲ್ ಸಿದ್ಧಾಂತವಾಗಿದೆ.",
    howThisWorksP2:
      "ಬಂಚಿಂಗ್ ನಿಯಂತ್ರಣ ಆನ್ ಮಾಡಿದಾಗ, ಸಾರಿಗೆ ನಿಯಂತ್ರಣ ಸಾಹಿತ್ಯದ ಎರಡು ಪ್ರಮುಖ ತಂತ್ರಗಳು ಒಟ್ಟಿಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತವೆ: ಜಂಕ್ಷನ್ ನಿಲ್ದಾಣಗಳಲ್ಲಿ ಡಗಾಂಜೊ ಅವರ (2009) ಹೊಂದಾಣಿಕೆ ತಡೆಹಿಡಿಯುವಿಕೆ (ಹೋಲ್ಡಿಂಗ್: hold = max(0, θ·(H_target - forward_headway))), ಮತ್ತು ನಿಲ್ದಾಣಗಳ ನಡುವೆ ಡಗಾಂಜೊ ಮತ್ತು ಪಿಲಾಚೋವ್ಸ್ಕಿ (2011) ಅವರ ಸಹಕಾರ ವೇಗ ನಿಯಂತ್ರಣ (Speed control). ಇಲ್ಲಿ ಪ್ರತಿ ಬಸ್ಸು ತನ್ನ ಮುಂದಿನ ಮತ್ತು ಹಿಂದಿನ ಬಸ್‌ಗಳ ಅಂತರಕ್ಕೆ ಅನುಗುಣವಾಗಿ ವೇಗವನ್ನು ಸ್ವಲ್ಪ ಹೆಚ್ಚು ಅಥವಾ ಕಡಿಮೆ ಮಾಡಿಕೊಳ್ಳುತ್ತದೆ — ಇದರಿಂದ ಸಣ್ಣ ಅಂತರಗಳು ದೊಡ್ಡ ಗುಂಪುಗೂಡುವಿಕೆಯಾಗಿ ಬದಲಾಗುವುದು ತಪ್ಪುತ್ತದೆ.",

    // Driver Console
    driverConsoleTitle: "ಚಾಲಕರ ಕನ್ಸೋಲ್ (ಕ್ಯಾಬ್ ಡಿಸ್ಪ್ಲೇ)",
    singleBus: "ಒಂದು ಬಸ್",
    compareAllBuses: "ಎಲ್ಲಾ ಬಸ್‌ಗಳನ್ನು ಹೋಲಿಸಿ",
    busLabel: (plate) => `ಬಸ್ ${plate}`,
    gapToBusAhead: "ಮುಂದಿನ ಬಸ್‌ಗೆ ಅಂತರ",
    targetHeadway: "ಗುರಿ ಅಂತರ",
    busesOnRoad: (count) => `ರಸ್ತೆಯಲ್ಲಿರುವ ಬಸ್‌ಗಳು: ${count}`,
    gapAheadSmall: (gap, target) => `ಮುಂದಿನ ಅಂತರ ${gap}ಸೆ / ಗುರಿ ${target}ಸೆ`,
    statusWaitHere: "ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ (WAIT)",
    statusBoarding: "ಪ್ರಯಾಣಿಕರು ಹತ್ತುತ್ತಿದ್ದಾರೆ",
    statusStoppedSignal: "ಸಿಗ್ನಲ್‌ನಲ್ಲಿ ನಿಂತಿದೆ",
    statusAtDepot: "ಡಿಪೋದಲ್ಲಿ (ಆರಂಭಿಕ ನಿಲ್ದಾಣ)",
    statusGo: "ಮುಂದೆ ಚಲಿಸಿ (GO)",
    driverReasonHolding: (gap, target, hold) =>
      `ನೀವು ಮುಂದಿನ ಬಸ್‌ನ ತುಂಬಾ ಹತ್ತಿರದಲ್ಲಿದ್ದೀರಿ — ಪ್ರಸ್ತುತ ಅಂತರ ${gap}ಸೆ, ಗುರಿ ಅಂತರ ${target}ಸೆ. ಬಸ್‌ಗಳ ನಡುವಿನ ಅಂತರ ಸಮತೋಲನದಲ್ಲಿರಲು ಬಂಚಿಂಗ್ ಕಂಟ್ರೋಲ್ ವ್ಯವಸ್ಥೆಯು +${hold}ಸೆ ಹೆಚ್ಚುವರಿ ಕಾಯಲು ಸೂಚಿಸಿದೆ.`,
    driverReasonDwellingOn: "ಸಾಮಾನ್ಯ ನಿಲುಗಡೆ — ನಿಮ್ಮ ಬಸ್‌ನ ಅಂತರ ಸರಿಯಾಗಿದೆ, ಹೆಚ್ಚುವರಿ ಕಾಯುವಿಕೆ ಅಗತ್ಯವಿಲ್ಲ.",
    driverReasonDwellingOff: "ಸಾಮಾನ್ಯ ನಿಲುಗಡೆ. (ಬಂಚಿಂಗ್ ನಿಯಂತ್ರಣ ಪ್ರಸ್ತುತ ಆಫ್ ಆಗಿದೆ — ಅಂತರ ಪರಿಶೀಲನೆ ನಡೆಯುತ್ತಿಲ್ಲ.)",
    driverReasonSignal: "ಈ ರಸ್ತೆಯಲ್ಲಿ ಟ್ರಾಫಿಕ್ / ಸಿಗ್ನಲ್ ವಿಳಂಬವಿದೆ — ಇದು ರಸ್ತೆಯ ಪರಿಸ್ಥಿತಿಯಾಗಿದ್ದು, ನಿಯಂತ್ರಣ ವ್ಯವಸ್ಥೆಯ ಸೂಚನೆಯಲ್ಲ.",
    driverReasonLayover: "ಮುಂದಿನ ಟ್ರಿಪ್ ಪ್ರಾರಂಭವಾಗುವ ಮುನ್ನ ಡಿಪೋ ವಿಶ್ರಾಂತಿ ಸಮಯ.",
    driverReasonGoNormal: "ಸಾಮಾನ್ಯವಾಗಿ ಮುಂದುವರಿಯಿರಿ.",
    driverSpeedEasing: "ಸಹಕಾರ ನಿಯಂತ್ರಣ: ವೇಗವನ್ನು ಸ್ವಲ್ಪ ಕಡಿಮೆ ಮಾಡಿ — ನೀವು ಮುಂದಿನ ಬಸ್‌ಗೆ ಹತ್ತಿರವಾಗುತ್ತಿದ್ದೀರಿ.",
    driverSpeedBoosting: "ಸಹಕಾರ ನಿಯಂತ್ರಣ: ವೇಗವನ್ನು ಸ್ವಲ್ಪ ಹೆಚ್ಚಿಸಿ — ಹಿಂದಿನ ಬಸ್ಸು ನಿಮ್ಮನ್ನು ಸಮೀಪಿಸುತ್ತಿದೆ.",

    // Passenger View
    nextBus: "ಮುಂದಿನ ಬಸ್",
    spacingControlLabel: (on) => `ಅಂತರ ನಿಯಂತ್ರಣ ${on ? "ಆನ್ (ON)" : "ಆಫ್ (OFF)"}`,
    noBusesForStop: "ಈ ನಿಲ್ದಾಣಕ್ಕೆ ಯಾವುದೇ ಬಸ್ ಲಭ್ಯವಿಲ್ಲ.",
    connectingMsg: "ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ…",
    rankNext: "ಮುಂದಿನ ಬಸ್",
    rankNumber: (rank) => `#${rank}`,
    hereNow: "ಈಗ ಇಲ್ಲೇ ಇದೆ",
    boardingLabel: "ಹತ್ತುತ್ತಿದ್ದಾರೆ",
    arrivingCloseBehind: "ಮುಂದಿನ ಬಸ್‌ನ ತೀರ ಹತ್ತಿರದಲ್ಲೇ ಬರುತ್ತಿದೆ (ಬಂಚ್ ಆಗಿದೆ)",
    arrivingAfter: (timeStr) => `ಮುಂದಿನ ಬಸ್‌ನ ನಂತರ +${timeStr}`,
    kmAway: (km) => `${km} ಕಿ.ಮೀ ದೂರ`,
    passengerNoteHolding: "ಬಸ್‌ಗಳ ನಡುವೆ ಸಮಾನ ಅಂತರವಿರಲು ಸ್ವಲ್ಪ ಸಮಯ ತಡೆಹಿಡಿಯಲಾಗಿದೆ.",
    passengerNoteSignal: "ಟ್ರಾಫಿಕ್ / ಸಿಗ್ನಲ್‌ನಲ್ಲಿ ಸ್ವಲ್ಪ ಸಮಯ ನಿಂತಿದೆ.",
    passengerNoteLayover: "ಇನ್ನೂ ಆರಂಭಿಕ ನಿಲ್ದಾಣದಿಂದ ಹೊರಟಿಲ್ಲ.",
    passengerNoteEasing: "ಮುಂದಿನ ಬಸ್‌ಗೆ ತೀರಾ ಹತ್ತಿರವಾಗದಂತೆ ವೇಗವನ್ನು ಕಡಿಮೆ ಮಾಡಲಾಗಿದೆ.",
    passengerNoteBoosting: "ಮುಂದಿನ ಅಂತರವನ್ನು ಸರಿಪಡಿಸಲು ಸ್ವಲ್ಪ ವೇಗವನ್ನು ಹೆಚ್ಚಿಸಲಾಗಿದೆ.",

    // Map & Stops
    terminusSuffix: " (ಅಂತಿಮ ನಿಲ್ದಾಣ)",
    controlPointSuffix: " (ನಿಯಂತ್ರಣ ಬಿಂದು + ಸಿಗ್ನಲ್)",
  },
  en: {
    // App & Header
    appTitle: "Bus Bunching Prevention — Live Control Demo",
    appSubtitle: "Tumkur, Karnataka · KSRTC Bus Stand → SIET College Gate · real, independently-verified stop coordinates & road geometry",
    resume: "Resume",
    pause: "Pause",
    reset: "Reset",
    skipAhead10Min: "Skip ahead 10 min",
    speed: "Speed",
    statusLive: "live",
    statusConnecting: "connecting…",
    statusDisconnected: "disconnected",
    statusError: "error",
    driverConsoleLink: "Driver console →",
    passengerViewLink: "Passenger view →",
    backToControlMap: "← Back to control room map",
    controlRoom: "Control room",

    // Control Switch & Banner
    bunchingControl: "Bunching control",
    bunchingControlOn: "BUNCHING CONTROL: ON",
    bunchingControlOff: "BUNCHING CONTROL: OFF",
    controlDescOn: "Holding + cooperative speed control active — watch spacing recover over the next few minutes.",
    controlDescOff: "Buses running unmanaged — watch bunching develop, then flip this on.",
    bunchingDetected: (count, distM) => `BUNCHING DETECTED — ${count} buses within ${distM}m of each other`,

    // Parameters
    holdingDamping: "Holding damping (θ)",
    speedControlGain: "Speed-control gain",
    paramsHint: "θ=1 or a very high gain overcorrects and re-triggers oscillation — try it live.",

    // Metrics Panel
    metricCv: "Headway CV",
    metricMeanHeadway: "Mean headway",
    metricEstRiderWait: "Est. rider wait",
    metricTimeBunched: "Time spent bunched",

    // Live Decision Feed
    liveFeedTitle: "Live decision feed",
    liveFeedSubtitle: "What the system is seeing and deciding, as it happens.",
    evControlOn: (time) => `— BUNCHING CONTROL TURNED ON @ ${time} —`,
    evControlOff: (time) => `— BUNCHING CONTROL TURNED OFF @ ${time} —`,
    evHold: (time, plate, stop, gap, target, hold) =>
      `[${time}] Bus ${plate} at ${stop}: gap ${gap}s (target ${target}s) → too close, HOLDING +${hold}s`,
    evOk: (time, plate, stop, gap, target) =>
      `[${time}] Bus ${plate} at ${stop}: gap ${gap}s (target ${target}s) — spacing fine, no action`,
    evUnmanaged: (time, plate, stop, gap, target) =>
      `[${time}] Bus ${plate} at ${stop}: gap ${gap}s (target ${target}s) — control disabled, no action taken`,
    evSpeedEase: (time, plate, factor, fwdM, backM) =>
      `[${time}] Bus ${plate}: easing to ${factor}× speed (crowding the bus ahead: ${fwdM}m ahead vs ${backM}m behind)`,
    evSpeedBoost: (time, plate, factor, fwdM, backM) =>
      `[${time}] Bus ${plate}: speeding up to ${factor}× speed (falling behind: ${fwdM}m ahead vs ${backM}m behind)`,
    tagHold: "too close, HOLDING",
    tagOk: "spacing fine",
    tagUnmanaged: "control disabled",

    // Chart & Explanation
    chartTitle: "Headway coefficient of variation (rolling window)",
    chartLegend: "Lower is better. CV > ~0.5 is visibly bunched service; well-controlled routes run ~0.2–0.3. Dashed lines mark when bunching control was switched on/off.",
    howThisWorks: "How this works",
    howThisWorksP1:
      "The route geometry here is real (independently verified stop coordinates and OSRM road-following geometry for the ~4.3km corridor); no real per-trip GPS log exists for it, so the disturbance model is built from documented assumptions instead: a random traffic/signal delay hits at every stop-to-stop hop (mean ~35s), while dwell time at each stop is plain noise, not headway-dependent. With no self-correction, those per-hop delays accumulate along the corridor and, combined with buses never being allowed to pass each other, that's enough on its own to turn small random delays into real bunching — the classical mechanism (Newell & Potts, 1964), not a crowd-feedback one.",
    howThisWorksP2:
      "When bunching control is on, two mechanisms from the transit-control literature run together: Daganzo's (2009) adaptive holding at junction stops (hold = max(0, θ·(H_target − forward_headway))), and Daganzo & Pilachowski's (2011) cooperative speed control between stops, where every bus continuously eases up or speeds up a little based on its gap to the bus ahead vs. the bus behind — which is what stops small gaps from ever turning into a pileup at a single stop in the first place.",

    // Driver Console
    driverConsoleTitle: "Driver Console (simulated cab display)",
    singleBus: "Single bus",
    compareAllBuses: "Compare all buses",
    busLabel: (plate) => `Bus ${plate}`,
    gapToBusAhead: "Gap to bus ahead",
    targetHeadway: "Target",
    busesOnRoad: (count) => `${count} buses on the road`,
    gapAheadSmall: (gap, target) => `gap ahead ${gap}s / target ${target}s`,
    statusWaitHere: "WAIT HERE",
    statusBoarding: "BOARDING",
    statusStoppedSignal: "STOPPED AT SIGNAL",
    statusAtDepot: "AT DEPOT",
    statusGo: "GO",
    driverReasonHolding: (gap, target, hold) =>
      `You're running close behind the bus ahead of you — gap is ${gap}s, target is ${target}s. Bunching control asked you to hold ${hold}s extra here so spacing stays even.`,
    driverReasonDwellingOn: "Normal stop — your spacing looks fine, no extra wait needed.",
    driverReasonDwellingOff: "Normal stop. (Bunching control is currently OFF — no spacing checks are being made.)",
    driverReasonSignal: "Traffic / signal delay on this stretch — this is just road conditions, not a bunching-control instruction.",
    driverReasonLayover: "Layover before starting the next trip.",
    driverReasonGoNormal: "Proceed as normal.",
    driverSpeedEasing: "Cooperative control: easing off slightly — you're crowding the bus ahead.",
    driverSpeedBoosting: "Cooperative control: speed up slightly — the bus behind is catching up.",

    // Passenger View
    nextBus: "Next bus",
    spacingControlLabel: (on) => `spacing control ${on ? "on" : "off"}`,
    noBusesForStop: "No buses found for this stop.",
    connectingMsg: "Connecting…",
    rankNext: "Next",
    rankNumber: (rank) => `#${rank}`,
    hereNow: "Here now",
    boardingLabel: "boarding",
    arrivingCloseBehind: "arriving close behind the one above",
    arrivingAfter: (timeStr) => `+${timeStr} after the one above`,
    kmAway: (km) => `${km} km`,
    passengerNoteHolding: "Holding briefly to keep buses evenly spaced.",
    passengerNoteSignal: "Stopped briefly in traffic / at a signal.",
    passengerNoteLayover: "Hasn't left the starting terminus yet.",
    passengerNoteEasing: "Easing off slightly to avoid crowding the bus ahead.",
    passengerNoteBoosting: "Speeding up slightly to close the gap ahead.",

    // Map & Stops
    terminusSuffix: " (terminus)",
    controlPointSuffix: " (control point + signal)",
  },
};
