export function fmtMMSS(seconds: number): string {
  if (!isFinite(seconds)) return "--:--";
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function fmtSS(seconds: number): string {
  return `${Math.max(0, Math.round(seconds))}s`;
}
