"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { usePrefsStore } from "@/utils/hooks/useUserPreferences";
import type { BaliRegion } from "@/lib/data/baliRegions";

export interface RegionWithCount extends BaliRegion {
  guideCount: number;
}

interface MapExplorerProps {
  regions: RegionWithCount[];
}

// Fix Leaflet default marker icon path issue in Next.js bundling (mirrors components/ui/LeafletMap.tsx)
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function popupHtml(r: RegionWithCount): string {
  const region = encodeURIComponent(r.name);
  const guidesLabel =
    r.guideCount > 0 ? `${r.guideCount} guide${r.guideCount === 1 ? "" : "s"}` : "Guides coming soon";
  // Only offer "View guides" when the region actually has guides — a link to an
  // empty filtered list is a dead end. "Plan trip here" always works.
  const guidesButton =
    r.guideCount > 0
      ? `<a href="/guides?region=${region}" style="font-size:12px;font-weight:600;color:#0071CE;text-decoration:none;border:1px solid #0071CE;padding:5px 10px;border-radius:9999px">View ${guidesLabel}</a>`
      : "";
  return `
    <div style="min-width:200px">
      <div style="font-weight:700;font-size:15px;color:#111827">${r.emoji} ${r.name}</div>
      <div style="margin:4px 0 8px;font-size:12px;color:#4b5563;line-height:1.4">${r.blurb}</div>
      ${r.guideCount === 0 ? `<div style="font-size:11px;font-weight:600;color:#9ca3af;margin-bottom:8px">${guidesLabel}</div>` : ""}
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <a href="/ai/plan?region=${region}" style="font-size:12px;font-weight:600;color:#fff;background:#0071CE;text-decoration:none;padding:5px 10px;border-radius:9999px">Plan trip here</a>
        ${guidesButton}
      </div>
    </div>`;
}

export default function MapExplorer({ regions }: MapExplorerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [selected, setSelected] = useState<string | null>(null);

  // Seed the shared prefs store so Guides personalization + AI Trip Planner
  // auto-default to the region the user just explored (session-only, not persisted).
  const prefs = usePrefsStore((s) => s.prefs);
  const setPrefs = usePrefsStore((s) => s.setPrefs);
  const seedRegionPref = (name: string) => {
    if (prefs.regionPref === name) return;
    setPrefs({ ...prefs, regionPref: name });
  };

  const bounds = useMemo(
    () => L.latLngBounds(regions.map((r) => [r.lat, r.lng] as [number, number])),
    [regions]
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    regions.forEach((r) => {
      const marker = L.marker([r.lat, r.lng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(popupHtml(r), { closeButton: true });
      marker.on("click", () => setSelected(r.name));
      markersRef.current[r.name] = marker;
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    };
  }, [regions, bounds]);

  const focusRegion = (name: string) => {
    const map = mapInstanceRef.current;
    const marker = markersRef.current[name];
    const region = regions.find((r) => r.name === name);
    if (!map || !marker || !region) return;
    setSelected(name);
    seedRegionPref(name);
    map.flyTo([region.lat, region.lng], 12, { duration: 0.8 });
    marker.openPopup();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Map */}
      <div className="order-1 flex-1 min-w-0">
        <div
          ref={mapRef}
          className="w-full h-[52vh] min-h-[340px] lg:h-[640px] rounded-2xl overflow-hidden border border-gray-200 z-0"
        />
        <p className="mt-2 text-xs text-gray-400 text-center lg:text-left">
          Tap a pin or a region card to explore guides and build an itinerary.
        </p>
      </div>

      {/* Region list */}
      <aside className="order-2 lg:w-[340px] lg:flex-shrink-0">
        <div className="lg:max-h-[640px] lg:overflow-y-auto lg:pr-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3">
          {regions.map((r) => {
            const isActive = selected === r.name;
            return (
              <button
                key={r.name}
                type="button"
                onClick={() => focusRegion(r.name)}
                className={`text-left rounded-xl border p-3 transition group ${
                  isActive
                    ? "border-[#0071CE] bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-[#0071CE] hover:bg-blue-50/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                    <span aria-hidden>{r.emoji}</span>
                    {r.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      r.guideCount > 0
                        ? "bg-[#0071CE]/10 text-[#0071CE]"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {r.guideCount > 0 ? `${r.guideCount} guide${r.guideCount === 1 ? "" : "s"}` : "Soon"}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500 leading-snug line-clamp-2">{r.blurb}</p>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
