import { useEffect, useState, useCallback, useRef } from "react";
import { useSimSocket } from "../hooks/useSimSocket";
import { useRoute } from "../hooks/useRoute";
import { useLanguage } from "../context/LanguageContext";
import MapView from "../components/MapView";
import MetricsPanel from "../components/MetricsPanel";
import ControlToggle from "../components/ControlToggle";
import BunchBanner from "../components/BunchBanner";
import ControlsBar from "../components/ControlsBar";
import EventsFeed from "../components/EventsFeed";
import CVChart, { type ToggleMarker } from "../components/CVChart";
import ParamsPanel from "../components/ParamsPanel";
import type { SimEvent } from "../types";

const CV_HISTORY_MAX = 240;
const EVENTS_MAX = 150;
const DEFAULT_SPEED = 0.6;
// Mirrors sim/engine.py's DEFAULT_THETA (control.py's THETA) and SPEED_GAIN
// -- only used as the slider's initial value until the first snapshot
// arrives and reports the server's actual live values.
const DEFAULT_THETA = 0.6;
const DEFAULT_SPEED_GAIN = 0.35;

export default function Dashboard() {
  const { snapshot, status, send } = useSimSocket();
  const routeData = useRoute();
  const { t } = useLanguage();

  const [cvHistory, setCvHistory] = useState<number[]>([]);
  const [toggleMarkers, setToggleMarkers] = useState<ToggleMarker[]>([]);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [maxGroupSize, setMaxGroupSize] = useState(1);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [theta, setTheta] = useState(DEFAULT_THETA);
  const [speedGain, setSpeedGain] = useState(DEFAULT_SPEED_GAIN);
  const paramsSyncedRef = useRef(false);

  // Scoped theme-light on body
  useEffect(() => {
    document.body.classList.add("theme-light");
    return () => document.body.classList.remove("theme-light");
  }, []);

  useEffect(() => {
    if (!snapshot) return;

    if (!paramsSyncedRef.current) {
      setTheta(snapshot.theta);
      setSpeedGain(snapshot.speed_gain);
      paramsSyncedRef.current = true;
    }

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
    setTheta(DEFAULT_THETA);
    setSpeedGain(DEFAULT_SPEED_GAIN);
  };
  const onSpeedChange = (v: number) => {
    setSpeed(v);
    send({ type: "speed", value: v });
  };
  const onThetaChange = (v: number) => {
    setTheta(v);
    send({ type: "params", theta: v });
  };
  const onSpeedGainChange = (v: number) => {
    setSpeedGain(v);
    send({ type: "params", speed_gain: v });
  };

  return (
    <>
      <header>
        <div className="title-block">
          <h1>{t.appTitle}</h1>
          <p className="subtitle">{t.appSubtitle}</p>
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
        <ParamsPanel
          theta={theta}
          speedGain={speedGain}
          onThetaChange={onThetaChange}
          onSpeedGainChange={onSpeedGainChange}
        />
      </section>

      <main className="single">
        <section className="panel">
          <MapView routeData={routeData} buses={snapshot?.buses ?? []} onBunchChange={onBunchChange} />
          {snapshot && <MetricsPanel metrics={snapshot.metrics} />}
        </section>

        <section className="feed-panel">
          <h3>{t.liveFeedTitle}</h3>
          <p className="feed-note">{t.liveFeedSubtitle}</p>
          <EventsFeed events={events} />
        </section>
      </main>

      <section className="lower">
        <div className="chart-block">
          <h3>{t.chartTitle}</h3>
          <CVChart cvHistory={cvHistory} toggleMarkers={toggleMarkers} />
          <div className="legend">
            <span className="legend-note">{t.chartLegend}</span>
          </div>
        </div>
      </section>

      <footer>
        <details>
          <summary>{t.howThisWorks}</summary>
          <p>{t.howThisWorksP1}</p>
          <p>{t.howThisWorksP2}</p>
        </details>
      </footer>
    </>
  );
}
