import type { Metrics } from "../types";
import { fmtMMSS } from "../lib/format";
import { useLanguage } from "../context/LanguageContext";

export default function MetricsPanel({ metrics }: { metrics: Metrics }) {
  const { t } = useLanguage();

  return (
    <div className="metrics">
      <div className="metric">
        <div className="val">{metrics.cv.toFixed(2)}</div>
        <div className="lbl">{t.metricCv}</div>
      </div>
      <div className="metric">
        <div className="val">{fmtMMSS(metrics.mean_headway_s)}</div>
        <div className="lbl">{t.metricMeanHeadway}</div>
      </div>
      <div className="metric">
        <div className="val">{fmtMMSS(metrics.excess_wait_s)}</div>
        <div className="lbl">{t.metricEstRiderWait}</div>
      </div>
      <div className="metric">
        <div className="val">{metrics.bunch_pct.toFixed(0)}%</div>
        <div className="lbl">{t.metricTimeBunched}</div>
      </div>
    </div>
  );
}
