import { BUNCH_DIST_M } from "../lib/geo";
import { useLanguage } from "../context/LanguageContext";

export default function BunchBanner({ maxGroupSize }: { maxGroupSize: number }) {
  const { t } = useLanguage();

  if (maxGroupSize < 2) return <div className="bunch-banner hidden" />;
  return <div className="bunch-banner">{t.bunchingDetected(maxGroupSize, BUNCH_DIST_M)}</div>;
}
