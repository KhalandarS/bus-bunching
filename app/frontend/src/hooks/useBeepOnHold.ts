import { useEffect, useRef } from "react";
import type { Bus } from "../types";

// Reuses one AudioContext instead of spawning a new one per beep, but always
// attempts playback (doesn't require a prior click first); it opportunistically
// resumes on any interaction as a bonus, without gating sound behind it.
function useAudioCtx() {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const resume = () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state === "suspended") ctx.resume();
    };
    const events: (keyof DocumentEventMap)[] = ["click", "keydown", "touchstart"];
    events.forEach((evt) => document.addEventListener(evt, resume, { once: true }));
    return () => events.forEach((evt) => document.removeEventListener(evt, resume));
  }, []);

  return () => {
    if (!ctxRef.current) {
      try {
        ctxRef.current = new AudioContext();
      } catch {
        return null;
      }
    }
    return ctxRef.current;
  };
}

function beep(ctx: AudioContext) {
  try {
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    /* ignore */
  }
}

// Beeps the moment any bus transitions into the "holding" state, edge-triggered
// against each bus's previous state so it fires once per hold, not every tick.
export function useBeepOnHold(buses: Bus[]) {
  const getCtx = useAudioCtx();
  const prevStateRef = useRef<Record<number, string>>({});

  useEffect(() => {
    buses.forEach((bus) => {
      if (prevStateRef.current[bus.id] !== "holding" && bus.state === "holding") {
        const ctx = getCtx();
        if (ctx) beep(ctx);
      }
      prevStateRef.current[bus.id] = bus.state;
    });
  }, [buses, getCtx]);
}
