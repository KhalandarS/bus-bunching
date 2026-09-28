import type { SimEvent } from "../types";
import { fmtMMSS, shortPlate } from "../lib/format";
import { useLanguage } from "../context/LanguageContext";

interface EventsFeedProps {
  events: SimEvent[]; // most-recent-first
}

function EventLine({ ev }: { ev: SimEvent }) {
  const { lang, t, translateStop } = useLanguage();

  switch (ev.action) {
    case "control_on":
    case "control_off": {
      const on = ev.action === "control_on";
      return (
        <div className={`ev divider ${on ? "on" : "off"}`}>
          {on ? t.evControlOn(fmtMMSS(ev.t)) : t.evControlOff(fmtMMSS(ev.t))}
        </div>
      );
    }
    case "hold": {
      const stopName = translateStop(ev.stop);
      const plate = shortPlate(ev.bus_plate);
      return (
        <div className="ev">
          {lang === "kn" ? (
            <>
              [{fmtMMSS(ev.t)}] {t.busLabel(plate)} ({stopName}): ಅಂತರ {ev.forward_headway_s}ಸೆ (ಗುರಿ {ev.target_headway_s}ಸೆ) &rarr;{" "}
              <span className="tag-hold">ಅತಿ ಹತ್ತಿರ, ತಡೆಹಿಡಿಯಲಾಗಿದೆ (HOLDING) +{ev.hold_s}ಸೆ</span>
            </>
          ) : (
            <>
              [{fmtMMSS(ev.t)}] Bus {plate} at {stopName}: gap {ev.forward_headway_s}s (target {ev.target_headway_s}s) &rarr;{" "}
              <span className="tag-hold">too close, HOLDING +{ev.hold_s}s</span>
            </>
          )}
        </div>
      );
    }
    case "ok": {
      const stopName = translateStop(ev.stop);
      const plate = shortPlate(ev.bus_plate);
      return (
        <div className="ev">
          {lang === "kn" ? (
            <>
              [{fmtMMSS(ev.t)}] {t.busLabel(plate)} ({stopName}): ಅಂತರ {ev.forward_headway_s}ಸೆ (ಗುರಿ {ev.target_headway_s}ಸೆ) —{" "}
              <span className="tag-ok">ಅಂತರ ಸರಿಯಾಗಿದೆ, ಯಾವುದೇ ತಡೆ ಇಲ್ಲ</span>
            </>
          ) : (
            <>
              [{fmtMMSS(ev.t)}] Bus {plate} at {stopName}: gap {ev.forward_headway_s}s (target {ev.target_headway_s}s) —{" "}
              <span className="tag-ok">spacing fine, no action</span>
            </>
          )}
        </div>
      );
    }
    case "unmanaged": {
      const stopName = translateStop(ev.stop);
      const plate = shortPlate(ev.bus_plate);
      return (
        <div className="ev">
          {lang === "kn" ? (
            <>
              [{fmtMMSS(ev.t)}] {t.busLabel(plate)} ({stopName}): ಅಂತರ {ev.forward_headway_s}ಸೆ (ಗುರಿ {ev.target_headway_s}ಸೆ) —{" "}
              <span className="tag-unmanaged">ನಿಯಂತ್ರಣ ಆಫ್ ಆಗಿದೆ, ಯಾವುದೇ ಕ್ರಮವಿಲ್ಲ</span>
            </>
          ) : (
            <>
              [{fmtMMSS(ev.t)}] Bus {plate} at {stopName}: gap {ev.forward_headway_s}s (target {ev.target_headway_s}s) —{" "}
              <span className="tag-unmanaged">control disabled, no action taken</span>
            </>
          )}
        </div>
      );
    }
    case "speed_ease":
    case "speed_boost": {
      const plate = shortPlate(ev.bus_plate);
      if (lang === "kn") {
        const verb = ev.action === "speed_ease" ? "ವೇಗ ಇಳಿಕೆ" : "ವೇಗ ಹೆಚ್ಚಳ";
        const reason = ev.action === "speed_ease" ? "ಮುಂದಿನ ಬಸ್‌ಗೆ ತುಂಬಾ ಹತ್ತಿರ" : "ಹಿಂದೆ ಉಳಿದಿದೆ";
        return (
          <div className="ev">
            [{fmtMMSS(ev.t)}] {t.busLabel(plate)}: <span className="tag-speed">{verb} {ev.speed_factor}&times; ವೇಗ</span> ({reason}:{" "}
            {ev.forward_gap_m}ಮೀ ಮುಂದೆ vs {ev.backward_gap_m}ಮೀ ಹಿಂದೆ)
          </div>
        );
      }
      const verb = ev.action === "speed_ease" ? "easing to" : "speeding up to";
      const reason = ev.action === "speed_ease" ? "crowding the bus ahead" : "falling behind";
      return (
        <div className="ev">
          [{fmtMMSS(ev.t)}] Bus {plate}: <span className="tag-speed">{verb} {ev.speed_factor}&times; speed</span> ({reason}:{" "}
          {ev.forward_gap_m}m ahead vs {ev.backward_gap_m}m behind)
        </div>
      );
    }
  }
}

export default function EventsFeed({ events }: EventsFeedProps) {
  return (
    <div className="events-log">
      {events.map((ev, i) => (
        <EventLine key={i} ev={ev} />
      ))}
    </div>
  );
}
