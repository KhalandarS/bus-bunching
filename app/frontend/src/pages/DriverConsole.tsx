import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSimSocket } from "../hooks/useSimSocket";
import { useBeepOnHold } from "../hooks/useBeepOnHold";
import { useLanguage } from "../context/LanguageContext";
import { busStatus } from "../lib/driverStatus";
import { shortPlate } from "../lib/format";
import LanguageSelector from "../components/LanguageSelector";
import "../styles/driver.css";

type ViewMode = "single" | "grid";

export default function DriverConsole() {
  const { snapshot, status } = useSimSocket();
  const { t, translateStop } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);

  const buses = snapshot?.buses ?? [];
  useBeepOnHold(buses);

  const knownIds = useMemo(() => buses.map((b) => b.id).sort((a, b) => a - b), [buses]);

  useEffect(() => {
    if (selectedBusId === null && buses.length > 0) setSelectedBusId(buses[0].id);
  }, [selectedBusId, buses]);

  const statusLabel =
    status === "live"
      ? t.statusLive
      : status === "connecting"
        ? t.statusConnecting
        : status === "disconnected"
          ? t.statusDisconnected
          : t.statusError;

  if (!snapshot) {
    return (
      <div className="screen idle">
        <div className="big-label idle">{t.connectingMsg}</div>
      </div>
    );
  }

  const selectedBus = buses.find((b) => b.id === selectedBusId) ?? buses[0];
  const single = selectedBus ? busStatus(selectedBus, snapshot, t) : null;

  return (
    <>
      <div className="topbar">
        <div className="title">{t.driverConsoleTitle}</div>
        <button className={viewMode === "single" ? "active" : ""} onClick={() => setViewMode("single")}>
          {t.singleBus}
        </button>
        <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}>
          {t.compareAllBuses}
        </button>
        {viewMode === "single" && (
          <select value={selectedBusId ?? ""} onChange={(e) => setSelectedBusId(parseInt(e.target.value, 10))}>
            {knownIds.map((id) => (
              <option key={id} value={id}>
                {t.busLabel(shortPlate(buses.find((b) => b.id === id)?.plate ?? ""))}
              </option>
            ))}
          </select>
        )}
        <div className="spacer" />
        <LanguageSelector />
        <span className="conn">{statusLabel}</span>
        <Link to="/">{t.backToControlMap}</Link>
      </div>

      {viewMode === "single" && selectedBus && single && (
        <div className={`screen ${single.cls}`}>
          <div className={`big-label ${single.cls}`}>{single.labelTxt}</div>
          <div className="countdown">{single.countdownTxt}</div>
          <div className="reason">{single.reasonTxt}</div>
          <div className="speed-note">{single.speedTxt}</div>
          <div className="stop-name">{translateStop(selectedBus.stop_label)}</div>
          <div className="gap-readout">
            {t.gapToBusAhead}: <b>{Math.round(selectedBus.forward_headway_s)}s</b> &nbsp;|&nbsp; {t.targetHeadway}:{" "}
            <b>{Math.round(snapshot.target_headway_s)}s</b> &nbsp;|&nbsp; {t.bunchingControl}:{" "}
            <b>{snapshot.control_enabled ? "ON" : "OFF"}</b>
          </div>
        </div>
      )}

      {viewMode === "grid" && (
        <div className="grid-wrap">
          <div className="grid-header">
            {t.bunchingControl}: <b>{snapshot.control_enabled ? "ON" : "OFF"}</b> &nbsp;|&nbsp; {t.targetHeadway}:{" "}
            <b>{Math.round(snapshot.target_headway_s)}s</b> &nbsp;|&nbsp; {t.busesOnRoad(buses.length)}
          </div>
          <div className="grid">
            {[...buses]
              .sort((a, b) => a.id - b.id)
              .map((bus) => {
                const s = busStatus(bus, snapshot, t);
                return (
                  <div className={`card ${s.cls}`} key={bus.id}>
                    <div className="card-top">
                      <div className="card-bus-id">{t.busLabel(shortPlate(bus.plate))}</div>
                    </div>
                    <div className={`card-label ${s.cls}`}>{s.labelTxt}</div>
                    <div className="card-countdown">{s.countdownTxt}</div>
                    <div className="card-stop">{translateStop(bus.stop_label)}</div>
                    <div className="card-gap">
                      {t.gapAheadSmall(Math.round(bus.forward_headway_s), Math.round(snapshot.target_headway_s))}
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
