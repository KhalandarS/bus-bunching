import { useEffect, useState } from "react";
import type { RouteData } from "../types";

export function useRoute(): RouteData | null {
  const [route, setRoute] = useState<RouteData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/route")
      .then((res) => res.json())
      .then((data: RouteData) => {
        if (!cancelled) setRoute(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return route;
}
