"use client";

import dynamic from "next/dynamic";
import type { RegionWithCount } from "./MapExplorer";

// Leaflet touches `window`/`document` at import time, so load it client-only.
const MapExplorer = dynamic(() => import("./MapExplorer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[52vh] min-h-[340px] lg:h-[640px] rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
  ),
});

export default function MapExplorerLoader({ regions }: { regions: RegionWithCount[] }) {
  return <MapExplorer regions={regions} />;
}
