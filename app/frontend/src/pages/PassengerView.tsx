import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSimSocket } from "../hooks/useSimSocket";
import { useRoute } from "../hooks/useRoute";
import { useLanguage } from "../context/LanguageContext";
import { computeStopArrivals, type StopArrival } from "../lib/passengerEta";
import { fmtMMSS, shortPlate } from "../lib/format";
import { describeEvent } from "../lib/eventText";
import LanguageSelector from "../components/LanguageSelector";
import type { BusState, SpeedState, SimEvent } from "../types";
import "../styles/passenger.css";

const MAX_SHOWN = 3;
const TIGHT_GAP_S = 90; // arrivals closer together than this read as "bunched" to a waiting rider
const EVENTS_MAX = 150;
const PER_BUS_EVENTS_SHOWN = 4;

export default function PassengerView() {
  const { snapshot, status } = useSimSocket();
  const routeData = useRoute();
  const { lang, t, translateStop } = useLanguage();
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [expandedBusId, setExpandedBusId] = useState<number | null>(null);

  useEffect(() => {
    const newEvents = snapshot?.events ?? [];
    if (newEvents.length === 0) return;
    setEvents((prev) => {
      const combined = [...newEvents].reverse().concat(prev);
      return combined.length > EVENTS_MAX ? combined.slice(0, EVENTS_MAX) : combined;
    });
  }, [snapshot]);

  // Exclude the two termini (index 0 / last) -- they're layover points, not
  // realistic places for a rider to be waiting, and including them mixes
  // "bus hasn't left the depot" states into what should be a simple stop list.
  const stops = useMemo(() => {
    if (!routeData) return [];
    const lastIdx = routeData.stops.length - 1;
    return routeData.stops.filter((s) => s.is_landmark && s.index !== 0 && s.index !== lastIdx);
  }, [routeData]);

  const [stopIdx, setStopIdx] = useState<number | null>(null);

  const selectedStop = useMemo(() => {
    if (stops.length === 0) return null;
    if (stopIdx !== null) {
      const found = stops.find((s) => s.index === stopIdx);
      if (found) return found;
    }
    // default to a representative stop roughly in the middle of the
    // corridor, not the first one in the list
    return stops[Math.floor(stops.length / 2)];
  }, [stops, stopIdx]);

  const lengthM = routeData ? routeData.cumulative_m[routeData.cumulative_m.length - 1] : 0;

  const arrivals = useMemo(() => {
    if (!snapshot || !selectedStop || !lengthM) return [];
    return computeStopArrivals(selectedStop.dist_m, lengthM, snapshot.buses).slice(0, MAX_SHOWN);
  }, [snapshot, selectedStop, lengthM]);

  return (
    <div className="passenger-page">
      <header className="passenger-header">
        <h1>{t.nextBus}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <LanguageSelector />
          <Link to="/" className="back-link">
            {t.controlRoom}
          </Link>
        </div>
      </header>

      <div className="stop-picker">
        <select
          value={selectedStop?.index ?? ""}
          onChange={(e) => {
            setStopIdx(Number(e.target.value));
            setExpandedBusId(null);
          }}
          disabled={stops.length === 0}
        >
          {stops.map((s) => (
            <option key={s.index} value={s.index}>
              {translateStop(s.name)}
            </option>
          ))}
        </select>
        {snapshot && (
          <span className={`control-status ${snapshot.control_enabled ? "on" : "off"}`}>
            {t.spacingControlLabel(snapshot.control_enabled)}
          </span>
        )}
      </div>

      {status !== "live" && <p className="conn-note">{t.connectingMsg}</p>}
      {status === "live" && arrivals.length === 0 && <p className="conn-note">{t.noBusesForStop}</p>}

      <div className="arrivals-list">
        {arrivals.map((a, i) => {
          const prev = i > 0 ? arrivals[i - 1] : null;
          const gapS = prev ? a.etaS - prev.etaS : null;
          const tight = gapS !== null && gapS < TIGHT_GAP_S;
          return (
            <ArrivalRow
              key={a.busId}
              arrival={a}
              rank={i}
              gapBeforeS={gapS}
              tight={tight}
              expanded={expandedBusId === a.busId}
              onToggle={() => setExpandedBusId((cur) => (cur === a.busId ? null : a.busId))}
              recentEvents={events.filter((ev) => ev.bus_id === a.busId).slice(0, PER_BUS_EVENTS_SHOWN)}
              lang={lang}
            />
          );
        })}
      </div>
    </div>
  );
}

function ArrivalRow({
  arrival,
  rank,
  gapBeforeS,
  tight,
  expanded,
  onToggle,
  recentEvents,
  lang,
}: {
  arrival: StopArrival;
  rank: number;
  gapBeforeS: number | null;
  tight: boolean;
  expanded: boolean;
  onToggle: () => void;
  recentEvents: SimEvent[];
  lang: "kn" | "en";
}) {
  const { t } = useLanguage();

  const stateNote = useMemo(() => {
    const stateNotes: Partial<Record<BusState, string>> = {
      holding: t.passengerNoteHolding,
      signal_delay: t.passengerNoteSignal,
      layover: t.passengerNoteLayover,
    };
    const speedNotes: Partial<Record<SpeedState, string>> = {
      easing: t.passengerNoteEasing,
      boosting: t.passengerNoteBoosting,
    };
    return stateNotes[arrival.state] ?? speedNotes[arrival.speedState];
  }, [arrival.state, arrival.speedState, t]);

  return (
    <div className="arrival-row">
      {gapBeforeS !== null && (
        <div className={`arrival-gap ${tight ? "tight" : ""}`}>
          {tight ? t.arrivingCloseBehind : t.arrivingAfter(fmtMMSS(gapBeforeS))}
        </div>
      )}
      <div className="arrival-line" onClick={onToggle} role="button" tabIndex={0}>
        <div className="arrival-label">
          <span className="arrival-rank">{rank === 0 ? t.rankNext : t.rankNumber(rank + 1)}</span>
          <span className="arrival-bus">{t.busLabel(shortPlate(arrival.plate))}</span>
        </div>
        <div className="arrival-value">
          {arrival.atStopNow ? (
            <span className="arrival-eta boarding">{t.hereNow}</span>
          ) : (
            <span className="arrival-eta">{fmtMMSS(arrival.etaS)}</span>
          )}
          <span className="arrival-dist">
            {arrival.atStopNow ? t.boardingLabel : t.kmAway((arrival.distAwayM / 1000).toFixed(1))}
          </span>
        </div>
      </div>
      {!arrival.atStopNow && stateNote && <div className="arrival-note">{stateNote}</div>}
      {expanded && recentEvents.length > 0 && (
        <ul className="arrival-detail">
          {recentEvents.map((ev, i) => (
            <li key={i}>{describeEvent(ev, lang)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
