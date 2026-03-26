"use client";

import { useEffect, useState } from "react";
import type { ViatorLogistics } from "@/utils/hooks/useViator";

interface LogisticsSectionProps {
  logistics: ViatorLogistics;
  timeZone?: string;
}

interface ResolvedLocation {
  ref: string;
  name: string | null;
  address: string | null;
  center: { latitude: number; longitude: number } | null;
}

function formatPickupType(type?: string): string {
  if (!type) return "";
  const map: Record<string, string> = {
    PICKUP_AND_MEET_AT_START_POINT: "Pickup available or meet at start point",
    PICKUP_EVERYONE: "Pickup included for all travelers",
    MEET_EVERYONE_AT_START_POINT: "Meet at the start point",
  };
  return map[type] || type.replace(/_/g, " ").toLowerCase();
}

function mapsUrl(loc: ResolvedLocation, fallbackText?: string): string {
  if (loc.center) {
    return `https://www.google.com/maps?q=${loc.center.latitude},${loc.center.longitude}`;
  }
  const query = loc.name || loc.address || fallbackText || "";
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query + ", Bali")}`;
  }
  return "#";
}

function LocationCard({
  resolved,
  description,
  fallbackText,
}: {
  resolved: ResolvedLocation | null;
  description?: string;
  fallbackText?: string;
}) {
  const displayName = resolved?.name || fallbackText || description;
  const displayAddress = resolved?.address;
  const hasMap = resolved?.center || displayName;
  const url = resolved ? mapsUrl(resolved, fallbackText) : "#";

  return (
    <div className="flex items-start gap-3">
      <svg
        className="w-4 h-4 text-[#0071CE] shrink-0 mt-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <div className="flex-1 min-w-0">
        {displayName && (
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
        )}
        {displayAddress && (
          <p className="text-xs text-gray-500 mt-0.5">{displayAddress}</p>
        )}
        {description && description !== displayName && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
        {hasMap && url !== "#" && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-[#0071CE] hover:text-[#005ba6] transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Google Maps
          </a>
        )}
      </div>
    </div>
  );
}

// Embedded map preview
function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
      <iframe
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`}
        className="w-full h-48"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Location map"
      />
    </div>
  );
}

export default function LogisticsSection({ logistics, timeZone }: LogisticsSectionProps) {
  const startPoints = logistics.start?.filter((s) => s.description || s.location?.ref) ?? [];
  const endPoints = logistics.end?.filter((e) => e.description || e.location?.ref) ?? [];
  const pickup = logistics.travelerPickup;
  const redemption = logistics.redemption;

  const hasStartEnd = startPoints.length > 0 || endPoints.length > 0;
  const hasPickup = pickup && (pickup.pickupOptionType || pickup.additionalInfo);
  const hasRedemption = redemption?.specialInstructions;

  // Collect all unique location refs to resolve
  const allRefs = new Set<string>();
  for (const loc of [...startPoints, ...endPoints]) {
    const ref = loc.location?.ref;
    if (ref && !ref.startsWith("MEET_") && !ref.startsWith("CONTACT_")) {
      allRefs.add(ref);
    }
  }

  const [resolvedMap, setResolvedMap] = useState<Map<string, ResolvedLocation>>(new Map());
  const [loading, setLoading] = useState(allRefs.size > 0);

  useEffect(() => {
    if (allRefs.size === 0) {
      setLoading(false);
      return;
    }

    const resolve = async () => {
      try {
        const res = await fetch("/api/viator/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refs: Array.from(allRefs) }),
        });
        const data = await res.json();
        const map = new Map<string, ResolvedLocation>();
        for (const loc of data.locations || []) {
          map.set(loc.ref, loc);
        }
        setResolvedMap(map);
      } catch {
        // Silently fail — we still show the description text
      } finally {
        setLoading(false);
      }
    };
    resolve();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasStartEnd && !hasPickup && !hasRedemption) return null;

  // Check if start and end are the same location
  const isSameLocation =
    startPoints.length === 1 &&
    endPoints.length === 1 &&
    startPoints[0].location?.ref === endPoints[0].location?.ref;

  // Get the primary resolved location for map embed
  const primaryRef = startPoints[0]?.location?.ref;
  const primaryResolved = primaryRef ? resolvedMap.get(primaryRef) : null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <hr className="h-8 w-[4px] bg-orange-400 border-none rounded" />
        <h2 className="text-xl font-bold text-black">Meeting & Pickup</h2>
      </div>

      <div className="space-y-4">
        {/* Start / End points */}
        {hasStartEnd && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-5 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0071CE] border-t-transparent" />
                <span className="text-sm text-gray-500">Loading location details...</span>
              </div>
            ) : isSameLocation ? (
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Start & End Point</h3>
                  <span className="text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    Returns to start
                  </span>
                </div>
                <div className="pl-9">
                  <LocationCard
                    resolved={resolvedMap.get(startPoints[0].location?.ref) || null}
                    description={startPoints[0].description}
                  />
                </div>
                {primaryResolved?.center && (
                  <div className="pl-9">
                    <MapEmbed lat={primaryResolved.center.latitude} lng={primaryResolved.center.longitude} />
                  </div>
                )}
              </div>
            ) : (
              <>
                {startPoints.length > 0 && (
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Start Point</h3>
                    </div>
                    <div className="space-y-3 pl-9">
                      {startPoints.map((loc, i) => (
                        <LocationCard
                          key={i}
                          resolved={resolvedMap.get(loc.location?.ref) || null}
                          description={loc.description}
                        />
                      ))}
                    </div>
                    {primaryResolved?.center && (
                      <div className="pl-9">
                        <MapEmbed lat={primaryResolved.center.latitude} lng={primaryResolved.center.longitude} />
                      </div>
                    )}
                  </div>
                )}

                {endPoints.length > 0 && startPoints.length > 0 && (
                  <hr className="border-gray-100" />
                )}

                {endPoints.length > 0 && (
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">End Point</h3>
                    </div>
                    <div className="space-y-3 pl-9">
                      {endPoints.map((loc, i) => {
                        const endResolved = resolvedMap.get(loc.location?.ref) || null;
                        return (
                          <LocationCard
                            key={i}
                            resolved={endResolved}
                            description={loc.description}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Pickup info */}
        {hasPickup && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </span>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Pickup Details</h3>
            </div>
            <div className="space-y-3 pl-9">
              {pickup!.pickupOptionType && (
                <p className="text-sm text-gray-800 font-medium">
                  {formatPickupType(pickup!.pickupOptionType)}
                </p>
              )}
              {pickup!.additionalInfo && (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {pickup!.additionalInfo}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Redemption / special instructions */}
        {hasRedemption && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </span>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">What to Bring</h3>
            </div>
            <ul className="space-y-1.5 pl-9">
              {redemption!
                .specialInstructions!.split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 font-bold shrink-0 mt-px">•</span>
                    <span>{line}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Timezone */}
        {timeZone && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5 pl-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Timezone: {timeZone.replace(/_/g, " ")}
          </p>
        )}
      </div>
    </section>
  );
}
