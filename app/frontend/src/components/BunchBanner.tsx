import { BUNCH_DIST_M } from "../lib/geo";

export default function BunchBanner({ maxGroupSize }: { maxGroupSize: number }) {
  if (maxGroupSize < 2) return <div className="bunch-banner hidden" />;
  return (
    <div className="bunch-banner">
      BUNCHING DETECTED — {maxGroupSize} buses within {BUNCH_DIST_M}m of each other
    </div>
  );
}
