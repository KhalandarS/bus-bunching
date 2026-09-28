import { Link } from "react-router-dom";
import type { ConnStatus } from "../hooks/useSimSocket";
import { useLanguage } from "../context/LanguageContext";
import LanguageSelector from "./LanguageSelector";

interface ControlsBarProps {
  paused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  onFastForward: () => void;
  speed: number;
  onSpeedChange: (v: number) => void;
  status: ConnStatus;
}

export default function ControlsBar({
  paused,
  onTogglePause,
  onReset,
  onFastForward,
  speed,
  onSpeedChange,
  status,
}: ControlsBarProps) {
  const { t } = useLanguage();

  const getStatusLabel = (s: ConnStatus) => {
    switch (s) {
      case "live":
        return t.statusLive;
      case "connecting":
        return t.statusConnecting;
      case "disconnected":
        return t.statusDisconnected;
      case "error":
        return t.statusError;
    }
  };

  return (
    <div className="controls">
      <LanguageSelector />
      <button onClick={onTogglePause}>{paused ? t.resume : t.pause}</button>
      <button onClick={onReset}>{t.reset}</button>
      <button onClick={onFastForward}>{t.skipAhead10Min}</button>
      <label className="speed-label">
        {t.speed}
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
        />
        <span>{speed.toFixed(2)}&times;</span>
      </label>
      <span className={`conn-status ${status === "live" ? "live" : status === "connecting" ? "" : "down"}`}>
        {getStatusLabel(status)}
      </span>
      <Link to="/driver" target="_blank" className="driver-link">
        {t.driverConsoleLink}
      </Link>
      <Link to="/passenger" target="_blank" className="driver-link">
        {t.passengerViewLink}
      </Link>
    </div>
  );
}
