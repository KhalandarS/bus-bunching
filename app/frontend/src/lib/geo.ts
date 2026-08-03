import type { Bus, RouteData } from "../types";

// Distance within which buses are considered part of the same "bunch" and get
// fanned out perpendicular to the road so they render as distinct markers.
export const BUNCH_DIST_M = 150;
const FAN_SPACING_M = 14;

export function latlonAtDist(rd: RouteData, distM: number): [number, number] {
  const cum = rd.cumulative_m;
  const coords = rd.coords;
  let lo = 0;
  let hi = cum.length - 1;
  if (distM <= cum[0]) return coords[0];
  if (distM >= cum[hi]) return coords[hi];
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < distM) lo = mid + 1;
    else hi = mid;
  }
  const i = lo;
  const d0 = cum[i - 1];
  const d1 = cum[i];
  const frac = d1 === d0 ? 0 : (distM - d0) / (d1 - d0);
  const [lat0, lon0] = coords[i - 1];
  const [lat1, lon1] = coords[i];
  return [lat0 + (lat1 - lat0) * frac, lon0 + (lon1 - lon0) * frac];
}

// Local perpendicular unit vector (in meters, lat/lon-ish) at a given distance
// along the route, used to fan out buses that are bunched close together so
// each one stays visible as a distinct marker.
function perpAtDist(rd: RouteData, distM: number) {
  const cum = rd.cumulative_m;
  const eps = 40; // meters, look this far ahead/behind for a bearing
  const [lat0, lon0] = latlonAtDist(rd, Math.max(0, distM - eps));
  const [lat1, lon1] = latlonAtDist(rd, Math.min(cum[cum.length - 1], distM + eps));
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const dx = (lon1 - lon0) * mPerDegLon;
  const dy = (lat1 - lat0) * mPerDegLat;
  const len = Math.hypot(dx, dy) || 1;
  // rotate direction vector 90 degrees
  return { ux: -dy / len, uy: dx / len, mPerDegLat, mPerDegLon };
}

function metersOffsetToLatLon(
  lat: number,
  lon: number,
  dxMeters: number,
  dyMeters: number,
  mPerDegLat: number,
  mPerDegLon: number,
): [number, number] {
  return [lat + dyMeters / mPerDegLat, lon + dxMeters / mPerDegLon];
}

export interface FannedPosition {
  lat: number;
  lon: number;
  bunched: boolean;
}

export interface FannedResult {
  positions: Record<number, FannedPosition>;
  maxGroupSize: number;
}

// Groups buses (excluding layover) that are within BUNCH_DIST_M of each other
// along the corridor, and spreads each group out perpendicular to the road so
// a pileup renders as distinct, visible dots rather than one overlapping blob.
export function computeFannedPositions(buses: Bus[], routeData: RouteData): FannedResult {
  const active = buses.filter((b) => b.state !== "layover").sort((a, b) => a.dist_m - b.dist_m);
  const groups: Bus[][] = [];
  let current: Bus[] = [];
  for (const b of active) {
    if (current.length && b.dist_m - current[current.length - 1].dist_m > BUNCH_DIST_M) {
      groups.push(current);
      current = [];
    }
    current.push(b);
  }
  if (current.length) groups.push(current);

  const positions: Record<number, FannedPosition> = {};
  let maxGroupSize = 1;
  groups.forEach((group) => {
    maxGroupSize = Math.max(maxGroupSize, group.length);
    if (group.length === 1) {
      positions[group[0].id] = { lat: group[0].lat, lon: group[0].lon, bunched: false };
      return;
    }
    const centerDist = group.reduce((s, b) => s + b.dist_m, 0) / group.length;
    const { ux, uy, mPerDegLat, mPerDegLon } = perpAtDist(routeData, centerDist);
    group.forEach((b, i) => {
      const offsetIdx = i - (group.length - 1) / 2;
      const dx = ux * offsetIdx * FAN_SPACING_M;
      const dy = uy * offsetIdx * FAN_SPACING_M;
      const [lat, lon] = metersOffsetToLatLon(b.lat, b.lon, dx, dy, mPerDegLat, mPerDegLon);
      positions[b.id] = { lat, lon, bunched: true };
    });
  });
  buses.forEach((b) => {
    if (!(b.id in positions)) positions[b.id] = { lat: b.lat, lon: b.lon, bunched: false };
  });
  return { positions, maxGroupSize };
}
