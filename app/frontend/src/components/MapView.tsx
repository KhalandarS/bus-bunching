import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Bus, RouteData } from "../types";
import { computeFannedPositions, latlonAtDist } from "../lib/geo";
import { shortPlate } from "../lib/format";
import { useLanguage } from "../context/LanguageContext";

const STATE_COLORS: Record<string, string> = {
  moving: "#2d5ba3",
  dwelling: "#9a9d9f",
  holding: "#1c7a4a",
  signal_delay: "#b8332a",
  layover: "#5c6167",
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
  const { lang, t, translateStop } = useLanguage();
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, MarkerEntry>>({});

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { zoomControl: true, attributionControl: true });
    // Satellite imagery for real road/terrain detail, with an OSM-based
    // labels+roads overlay on top so street names and alignments still read
    // clearly against the imagery.
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      opacity: 0.9,
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

    // White casing under the yellow line so the road reads clearly against
    // busy satellite imagery at any zoom level, not just when zoomed in.
    const casing = L.polyline(routeData.coords, { color: "#ffffff", weight: 7, opacity: 0.9 });
    const line = L.polyline(routeData.coords, { color: "#e0a72e", weight: 4, opacity: 0.95 });
    casing.addTo(map);
    line.addTo(map);
    map.fitBounds(line.getBounds(), { padding: [40, 40] });

    const controlSet = new Set(routeData.control_point_idxs);
    const signalSet = new Set(routeData.signal_idxs);
    const stopMarkers: L.Layer[] = [];

    routeData.stops.forEach((stop) => {
      const isControl = controlSet.has(stop.index);
      const isSignal = signalSet.has(stop.index);
      const isTerminus = !isControl && !isSignal;
      const pos = latlonAtDist(routeData, stop.dist_m);

      let color = "#2d5ba3"; // terminus (Bus Stand / SIET College Gate)
      let radius = 7;
      if (isControl || isSignal) {
        color = "#b8332a";
        radius = 6;
      }

      const marker = L.circleMarker(pos, {
        radius,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      }).addTo(map);
      stopMarkers.push(marker);

      const translatedName = translateStop(stop.name);
      let label = translatedName;
      if (isTerminus) label += t.terminusSuffix;
      else label += t.controlPointSuffix;

      marker.bindTooltip(label, {
        permanent: true,
        direction: "top",
        offset: [0, -radius - 2],
        className: "stop-name-label",
      });
    });

    return () => {
      casing.remove();
      line.remove();
      stopMarkers.forEach((m) => m.remove());
    };
  }, [routeData, lang, t, translateStop]);

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
      const speedTag =
        bus.speed_state === "easing" ? `<span class="arr">▼</span>` : bus.speed_state === "boosting" ? `<span class="arr">▲</span>` : "";
      const labelHtml = `<div class="bus-label" style="--bus-color:${fillColor}">${shortPlate(bus.plate)}${speedTag}</div>`;

      let entry = markersRef.current[bus.id];
      if (!entry) {
        const marker = L.circleMarker([pos.lat, pos.lon], {
          radius: isHolding ? 9 : 7,
          color: "#fff",
          weight: isHolding ? 3 : 2,
          fillColor,
          fillOpacity: 0.95,
        }).addTo(map);
        const label = L.marker([pos.lat, pos.lon], {
          icon: L.divIcon({ className: "", html: labelHtml, iconSize: [0, 0] }),
          interactive: false,
        }).addTo(map);
        entry = { marker, label };
        markersRef.current[bus.id] = entry;
      } else {
        entry.marker.setLatLng([pos.lat, pos.lon]);
        entry.marker.setStyle({ fillColor, radius: isHolding ? 9 : 7, weight: isHolding ? 3 : 2 });
        entry.label.setLatLng([pos.lat, pos.lon]);
        entry.label.setIcon(L.divIcon({ className: "", html: labelHtml, iconSize: [0, 0] }));
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
