"""
Live server for the bus bunching prevention demo.

Serves the static frontend and streams simulation ticks (bus positions,
metrics, decision-feed events) over a WebSocket. A single fleet runs
continuously; the frontend can flip control on/off live so you watch the
*same* buses respond, rather than comparing two separate simulated worlds.
"""
import asyncio
import json
import os

from fastapi import FastAPI, WebSocket
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from sim.engine import Simulation, TARGET_HEADWAY_S

DIST_DIR = os.path.join(os.path.dirname(__file__), "static", "dist")

app = FastAPI()
app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

SIM_DT_S = 0.4            # sim-seconds per engine step -- kept small so bus motion reads as driving, not teleporting
BROADCAST_INTERVAL_S = 0.15
DEFAULT_SPEED = 0.6

state = {
    "sim": Simulation(),
    "speed": DEFAULT_SPEED,
    "running": True,
}


@app.get("/")
async def index():
    return FileResponse(os.path.join(DIST_DIR, "index.html"))


@app.get("/driver")
async def driver_console():
    # client-side route handled by React Router -- same SPA shell
    return FileResponse(os.path.join(DIST_DIR, "index.html"))


@app.get("/route")
async def route_geometry():
    sim = state["sim"]
    route = sim.route
    return {
        "corridor_name": route.corridor_name,
        "coords": [[lat, lon] for lon, lat in route.coords],
        "cumulative_m": route.cum,
        "stops": route.stops,
        "control_point_idxs": sorted(sim.control_point_idxs),
        "signal_idxs": sim.signal_idxs,
        "target_headway_s": TARGET_HEADWAY_S,
    }


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    recv_task = asyncio.create_task(_handle_incoming(ws))
    try:
        while True:
            if state["running"]:
                # continuous scaling (not integer step repetition) so the
                # speed slider has an effect at every value, not just >=1.5x
                state["sim"].step(SIM_DT_S * state["speed"])
                snap = state["sim"].snapshot()
                snap["events"] = state["sim"].pop_events()
                await ws.send_text(json.dumps(snap))
            await asyncio.sleep(BROADCAST_INTERVAL_S)
    except Exception:
        # the specific exception here varies (WebSocketDisconnect, RuntimeError
        # from a send racing a close, websockets.ConnectionClosedError from a
        # ping timeout, ...) but all of them just mean the client is gone
        # (closed tab, refresh, network drop) -- nothing to recover, so stop
        # quietly instead of letting uvicorn print a full traceback for a
        # routine disconnect.
        pass
    finally:
        recv_task.cancel()


async def _handle_incoming(ws: WebSocket):
    try:
        while True:
            msg = await ws.receive_text()
            try:
                cmd = json.loads(msg)
            except json.JSONDecodeError:
                continue
            t = cmd.get("type")
            if t == "speed":
                state["speed"] = max(0.1, min(float(cmd.get("value", 1.0)), 3.0))
            elif t == "pause":
                state["running"] = False
            elif t == "resume":
                state["running"] = True
            elif t == "reset":
                state["sim"] = Simulation()
            elif t == "control":
                state["sim"].set_control(bool(cmd.get("enabled")))
            elif t == "fast_forward":
                seconds = max(60.0, min(float(cmd.get("seconds", 600.0)), 3600.0))
                n_steps = int(seconds / SIM_DT_S)
                for _ in range(n_steps):
                    state["sim"].step(SIM_DT_S)
                snap = state["sim"].snapshot()
                snap["events"] = state["sim"].pop_events()
                await ws.send_text(json.dumps(snap))
    except Exception:
        pass
