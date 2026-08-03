import { useCallback, useEffect, useRef, useState } from "react";
import type { Snapshot } from "../types";

export type ConnStatus = "connecting" | "live" | "disconnected" | "error";

export interface SimSocket {
  snapshot: Snapshot | null;
  status: ConnStatus;
  send: (msg: Record<string, unknown>) => void;
}

// One WebSocket connection per mounted page (Dashboard / DriverConsole), each
// independently receiving the same broadcast from the single shared server
// simulation -- matches the original two-static-page setup, just now as
// routes in one app instead of separate tabs.
export function useSimSocket(): SimSocket {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("live");
    ws.onclose = () => setStatus("disconnected");
    ws.onerror = () => setStatus("error");
    ws.onmessage = (msg) => setSnapshot(JSON.parse(msg.data));

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  const send = useCallback((msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  return { snapshot, status, send };
}
