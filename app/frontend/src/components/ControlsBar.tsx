import { Link } from "react-router-dom";
import type { ConnStatus } from "../hooks/useSimSocket";

interface ControlsBarProps {
  paused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  onFastForward: () => void;
  speed: number;
  onSpeedChange: (v: number) => void;
  status: ConnStatus;
}

const STATUS_LABEL: Record<ConnStatus, string> = {
  connecting: "connecting…",
  live: "live",
  disconnected: "disconnected",
  error: "error",
};

export default function ControlsBar({
  paused,
  onTogglePause,
  onReset,
  onFastForward,
  speed,
  onSpeedChange,
  status,
}: ControlsBarProps) {
  return (
    <div className="controls">
      <button onClick={onTogglePause}>{paused ? "Resume" : "Pause"}</button>
      <button onClick={onReset}>Reset</button>
      <button onClick={onFastForward}>Skip ahead 10 min</button>
      <label className="speed-label">
        Speed
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
        {STATUS_LABEL[status]}
      </span>
      <Link to="/driver" target="_blank" className="driver-link">
        🚌 Open driver console &rarr;
      </Link>
    </div>
  );
}
