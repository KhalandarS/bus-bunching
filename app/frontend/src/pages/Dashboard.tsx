import { useEffect, useState, useCallback } from "react";
import { useSimSocket } from "../hooks/useSimSocket";
import { useRoute } from "../hooks/useRoute";
import MapView from "../components/MapView";
import MetricsPanel from "../components/MetricsPanel";
import ControlToggle from "../components/ControlToggle";
import BunchBanner from "../components/BunchBanner";
import ControlsBar from "../components/ControlsBar";
import EventsFeed from "../components/EventsFeed";
import CVChart, { type ToggleMarker } from "../components/CVChart";
import type { SimEvent } from "../types";

const CV_HISTORY_MAX = 240;
const EVENTS_MAX = 150;
const DEFAULT_SPEED = 0.6;

export default function Dashboard() {
  const { snapshot, status, send } = useSimSocket();
  const routeData = useRoute();

  const [cvHistory, setCvHistory] = useState<number[]>([]);
  const [toggleMarkers, setToggleMarkers] = useState<ToggleMarker[]>([]);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [maxGroupSize, setMaxGroupSize] = useState(1);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  useEffect(() => {
    if (!snapshot) return;

    setCvHistory((prevCv) => {
      let cv = [...prevCv, snapshot.metrics.cv];
      const dropped = cv.length > CV_HISTORY_MAX;
      if (dropped) cv = cv.slice(cv.length - CV_HISTORY_MAX);

      setToggleMarkers((prevToggles) => {
        let toggles = dropped
          ? prevToggles.map((tm) => ({ ...tm, index: tm.index - 1 })).filter((tm) => tm.index >= 0)
          : prevToggles;
        (snapshot.events ?? []).forEach((ev) => {
          if (ev.action === "control_on" || ev.action === "control_off") {
            toggles = [...toggles, { index: cv.length - 1, enabled: ev.action === "control_on" }];
          }
        });
        return toggles;
      });

      return cv;
    });

    const newEvents = snapshot.events ?? [];
    if (newEvents.length > 0) {
      setEvents((prev) => {
        const combined = [...newEvents].reverse().concat(prev);
        return combined.length > EVENTS_MAX ? combined.slice(0, EVENTS_MAX) : combined;
      });
    }
  }, [snapshot]);

  const onBunchChange = useCallback((n: number) => setMaxGroupSize(n), []);

  const controlEnabled = snapshot?.control_enabled ?? false;

  const onToggleControl = () => send({ type: "control", enabled: !controlEnabled });
  const onFastForward = () => send({ type: "fast_forward", seconds: 600 });
  const onTogglePause = () => {
    send({ type: paused ? "resume" : "pause" });
    setPaused((p) => !p);
  };
  const onReset = () => {
    send({ type: "reset" });
    setCvHistory([]);
    setToggleMarkers([]);
    setEvents([]);
  };
  const onSpeedChange = (v: number) => {
    setSpeed(v);
    send({ type: "speed", value: v });
  };

  return (
    <>
      <header>
        <div className="title-block">
          <h1>Bus Bunching Prevention — Live Control Demo</h1>
          <p className="subtitle">Outer Ring Road, Bangalore &middot; Marathahalli &rarr; Silk Board Junction &middot; real road geometry</p>
        </div>
        <ControlsBar
          paused={paused}
          onTogglePause={onTogglePause}
          onReset={onReset}
          onFastForward={onFastForward}
          speed={speed}
          onSpeedChange={onSpeedChange}
          status={status}
        />
      </header>

      <section className="control-switch-bar">
        <ControlToggle enabled={controlEnabled} onToggle={onToggleControl} />
        <BunchBanner maxGroupSize={maxGroupSize} />
      </section>

      <main className="single">
        <section className="panel">
          <MapView routeData={routeData} buses={snapshot?.buses ?? []} onBunchChange={onBunchChange} />
          {snapshot && <MetricsPanel metrics={snapshot.metrics} />}
        </section>

        <section className="feed-panel">
          <h3>Live decision feed</h3>
          <p className="feed-note">What the system is seeing and deciding, as it happens.</p>
          <EventsFeed events={events} />
        </section>
      </main>

      <section className="lower">
        <div className="chart-block">
          <h3>Headway coefficient of variation (rolling window)</h3>
          <CVChart cvHistory={cvHistory} toggleMarkers={toggleMarkers} />
          <div className="legend">
            <span className="legend-note">
              Lower is better. CV &gt; ~0.5 is visibly bunched service; well-controlled routes run ~0.2&ndash;0.3. Dashed
              lines mark when bunching control was switched on/off.
            </span>
          </div>
        </div>
      </section>

      <footer>
        <details>
          <summary>How this works</summary>
          <p>
            Two real disturbances drive bunching here: random red-light delays at real ORR junctions, and dwell time at
            major stops that grows with how long it's been since the previous bus left (more waiting passengers, longer
            boarding) &mdash; the actual feedback loop that turns one red light into a spiral of lateness.
          </p>
          <p>
            When bunching control is on, two mechanisms from the transit-control literature run together: Daganzo's
            (2009) adaptive <strong>holding</strong> at junction stops (
            <code>hold = max(0, &theta;&middot;(H_target &minus; forward_headway))</code>), and Daganzo &amp;
            Pilachowski's (2011) cooperative <strong>speed control</strong> between stops, where every bus continuously
            eases up or speeds up a little based on its gap to the bus ahead vs. the bus behind &mdash; which is what
            stops small gaps from ever turning into a pileup at a single stop in the first place.
          </p>
        </details>
      </footer>
    </>
  );
}
