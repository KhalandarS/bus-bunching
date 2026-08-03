import type { SimEvent } from "../types";
import { fmtMMSS } from "../lib/format";

interface EventsFeedProps {
  events: SimEvent[]; // most-recent-first
}

function EventLine({ ev }: { ev: SimEvent }) {
  switch (ev.action) {
    case "control_on":
    case "control_off": {
      const on = ev.action === "control_on";
      return (
        <div className={`ev divider ${on ? "on" : "off"}`}>
          {on ? `— BUNCHING CONTROL TURNED ON @ ${fmtMMSS(ev.t)} —` : `— BUNCHING CONTROL TURNED OFF @ ${fmtMMSS(ev.t)} —`}
        </div>
      );
    }
    case "hold":
      return (
        <div className="ev">
          [{fmtMMSS(ev.t)}] Bus {ev.bus_id} at {ev.stop}: gap {ev.forward_headway_s}s (target {ev.target_headway_s}s) &rarr;{" "}
          <span className="tag-hold">too close, HOLDING +{ev.hold_s}s</span>
        </div>
      );
    case "ok":
      return (
        <div className="ev">
          [{fmtMMSS(ev.t)}] Bus {ev.bus_id} at {ev.stop}: gap {ev.forward_headway_s}s (target {ev.target_headway_s}s) —{" "}
          <span className="tag-ok">spacing fine, no action</span>
        </div>
      );
    case "unmanaged":
      return (
        <div className="ev">
          [{fmtMMSS(ev.t)}] Bus {ev.bus_id} at {ev.stop}: gap {ev.forward_headway_s}s (target {ev.target_headway_s}s) —{" "}
          <span className="tag-unmanaged">control disabled, no action taken</span>
        </div>
      );
    case "speed_ease":
    case "speed_boost": {
      const verb = ev.action === "speed_ease" ? "easing to" : "speeding up to";
      const reason = ev.action === "speed_ease" ? "crowding the bus ahead" : "falling behind";
      return (
        <div className="ev">
          [{fmtMMSS(ev.t)}] Bus {ev.bus_id}: <span className="tag-speed">{verb} {ev.speed_factor}&times; speed</span> ({reason}:{" "}
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
