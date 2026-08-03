import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Bus, RouteData } from "../types";
import { computeFannedPositions, latlonAtDist } from "../lib/geo";

const STATE_COLORS: Record<string, string> = {
  moving: "#4f9dff",
  dwelling: "#c8ccd4",
  holding: "#33c17a",
  signal_delay: "#ff6b5e",
  layover: "#555b66",
};

interface MarkerEntry {
  marker: L.CircleMarker;
  label: L.Marker;
}

interface MapViewProps {
  routeData: RouteData | null;
  buses: Bus[];
  onBunchChange?: (maxGroupSize: number) => void;
}

// Leaflet manages its own DOM imperatively and doesn't play well with React's
// virtual DOM diffing for per-frame marker updates, so the map/markers are
// driven directly via refs rather than re-rendered as React elements.
export default function MapView({ routeData, buses, onBunchChange }: MapViewProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, MarkerEntry>>({});

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { zoomControl: true, attributionControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap &copy; CARTO",
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeData) return;

    const line = L.polyline(routeData.coords, { color: "#5b6472", weight: 4, opacity: 0.8 });
    line.addTo(map);
    map.fitBounds(line.getBounds(), { padding: [24, 24] });

    const controlSet = new Set(routeData.control_point_idxs);
    const signalSet = new Set(routeData.signal_idxs);

    routeData.stops.forEach((stop) => {
      const isControl = controlSet.has(stop.index);
      const isSignal = signalSet.has(stop.index);
      const pos = latlonAtDist(routeData, stop.dist_m);

      let color = "#5b6472";
      let radius = 3;
      if (isControl) {
        color = "#ffb545";
        radius = 6;
      }
      if (isSignal) {
        color = "#ff6b5e";
        radius = 5;
      }

      const marker = L.circleMarker(pos, { radius, color, weight: 2, fillColor: color, fillOpacity: 0.5 }).addTo(map);
      let label = stop.name;
      if (isControl) label += " (control point)";
      if (isSignal) label += " (signal)";
      marker.bindTooltip(label, { direction: "top" });
    });

    return () => {
      line.remove();
    };
  }, [routeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeData) return;

    const { positions, maxGroupSize } = computeFannedPositions(buses, routeData);
    onBunchChange?.(maxGroupSize);

    const seenIds = new Set<number>();
    buses.forEach((bus) => {
      seenIds.add(bus.id);
      const pos = positions[bus.id];
      const fillColor = STATE_COLORS[bus.state] || "#fff";
      const isHolding = bus.state === "holding";
      const speedTag = bus.speed_state === "easing" ? " ▼" : bus.speed_state === "boosting" ? " ▲" : "";

      let entry = markersRef.current[bus.id];
      if (!entry) {
        const marker = L.circleMarker([pos.lat, pos.lon], {
          radius: isHolding ? 10 : 8,
          color: "#fff",
          weight: isHolding ? 3 : 2,
          fillColor,
          fillOpacity: 0.95,
        }).addTo(map);
        const label = L.marker([pos.lat, pos.lon], {
          icon: L.divIcon({ className: "", html: `<div class="bus-label">Bus ${bus.id}${speedTag}</div>`, iconSize: [0, 0] }),
          interactive: false,
        }).addTo(map);
        entry = { marker, label };
        markersRef.current[bus.id] = entry;
      } else {
        entry.marker.setLatLng([pos.lat, pos.lon]);
        entry.marker.setStyle({ fillColor, radius: isHolding ? 10 : 8, weight: isHolding ? 3 : 2 });
        entry.label.setLatLng([pos.lat, pos.lon]);
        entry.label.setIcon(L.divIcon({ className: "", html: `<div class="bus-label">Bus ${bus.id}${speedTag}</div>`, iconSize: [0, 0] }));
      }
    });

    // drop markers for buses that disappeared (e.g. after a reset)
    Object.keys(markersRef.current).forEach((idStr) => {
      const id = Number(idStr);
      if (!seenIds.has(id)) {
        markersRef.current[id].marker.remove();
        markersRef.current[id].label.remove();
        delete markersRef.current[id];
      }
    });
  }, [buses, routeData, onBunchChange]);

  return <div className="map" ref={divRef} />;
}
