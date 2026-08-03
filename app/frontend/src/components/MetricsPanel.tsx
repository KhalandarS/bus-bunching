import type { Metrics } from "../types";
import { fmtMMSS } from "../lib/format";

export default function MetricsPanel({ metrics }: { metrics: Metrics }) {
  return (
    <div className="metrics">
      <div className="metric">
        <div className="val">{metrics.cv.toFixed(2)}</div>
        <div className="lbl">Headway CV</div>
      </div>
      <div className="metric">
        <div className="val">{fmtMMSS(metrics.mean_headway_s)}</div>
        <div className="lbl">Mean headway</div>
      </div>
      <div className="metric">
        <div className="val">{fmtMMSS(metrics.excess_wait_s)}</div>
        <div className="lbl">Est. rider wait</div>
      </div>
      <div className="metric">
        <div className="val">{metrics.bunch_pct.toFixed(0)}%</div>
        <div className="lbl">Time spent bunched</div>
      </div>
    </div>
  );
}
