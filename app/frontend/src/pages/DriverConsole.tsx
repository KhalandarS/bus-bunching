import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSimSocket } from "../hooks/useSimSocket";
import { useBeepOnHold } from "../hooks/useBeepOnHold";
import { busStatus } from "../lib/driverStatus";
import "../styles/driver.css";

type ViewMode = "single" | "grid";

export default function DriverConsole() {
  const { snapshot, status } = useSimSocket();
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);

  const buses = snapshot?.buses ?? [];
  useBeepOnHold(buses);

  const knownIds = useMemo(() => buses.map((b) => b.id).sort((a, b) => a - b), [buses]);

  useEffect(() => {
    if (selectedBusId === null && buses.length > 0) setSelectedBusId(buses[0].id);
  }, [selectedBusId, buses]);

  const statusLabel = status === "live" ? "live" : status === "connecting" ? "connecting…" : status;

  if (!snapshot) {
    return (
      <div className="screen idle">
        <div className="big-label idle">Connecting&hellip;</div>
      </div>
    );
  }

  const selectedBus = buses.find((b) => b.id === selectedBusId) ?? buses[0];
  const single = selectedBus ? busStatus(selectedBus, snapshot) : null;

  return (
    <>
      <div className="topbar">
        <div className="title">Driver Console (simulated cab display)</div>
        <button className={viewMode === "single" ? "active" : ""} onClick={() => setViewMode("single")}>
          Single bus
        </button>
        <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>
          Compare all buses
        </button>
        {viewMode === "single" && (
          <select value={selectedBusId ?? ""} onChange={(e) => setSelectedBusId(parseInt(e.target.value, 10))}>
            {knownIds.map((id) => (
              <option key={id} value={id}>
                Bus {id}
              </option>
            ))}
          </select>
        )}
        <div className="spacer" />
        <span className="conn">{statusLabel}</span>
        <Link to="/">&larr; Back to control room map</Link>
      </div>

      {viewMode === "single" && selectedBus && single && (
        <div className={`screen ${single.cls}`}>
          <div className={`big-label ${single.cls}`}>{single.labelTxt}</div>
          <div className="countdown">{single.countdownTxt}</div>
          <div className="reason">{single.reasonTxt}</div>
          <div className="speed-note">{single.speedTxt}</div>
          <div className="stop-name">{selectedBus.stop_label}</div>
          <div className="gap-readout">
            Gap to bus ahead: <b>{Math.round(selectedBus.forward_headway_s)}s</b> &nbsp;|&nbsp; Target:{" "}
            <b>{Math.round(snapshot.target_headway_s)}s</b> &nbsp;|&nbsp; Bunching control:{" "}
            <b>{snapshot.control_enabled ? "ON" : "OFF"}</b>
          </div>
        </div>
      )}

      {viewMode === "grid" && (
        <div className="grid-wrap">
          <div className="grid-header">
            Bunching control: <b>{snapshot.control_enabled ? "ON" : "OFF"}</b> &nbsp;|&nbsp; Target headway:{" "}
            <b>{Math.round(snapshot.target_headway_s)}s</b> &nbsp;|&nbsp; {buses.length} buses on the road
          </div>
          <div className="grid">
            {[...buses]
              .sort((a, b) => a.id - b.id)
              .map((bus) => {
                const s = busStatus(bus, snapshot);
                return (
                  <div className={`card ${s.cls}`} key={bus.id}>
                    <div className="card-top">
                      <div className="card-bus-id">Bus {bus.id}</div>
                    </div>
                    <div className={`card-label ${s.cls}`}>{s.labelTxt}</div>
                    <div className="card-countdown">{s.countdownTxt}</div>
                    <div className="card-stop">{bus.stop_label}</div>
                    <div className="card-gap">
                      gap ahead <b>{Math.round(bus.forward_headway_s)}s</b> / target{" "}
                      <b>{Math.round(snapshot.target_headway_s)}s</b>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </>
  );
}
