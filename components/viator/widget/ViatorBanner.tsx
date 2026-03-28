"use client";

import { useEffect, useRef } from "react";

interface ViatorBannerProps {
  partnerId?: string;
  width?: number | string;
  height?: number | string;
  language?: string;
  selection?: string;
}

const BANNER_SCRIPT_URL = "https://partners.vtrcdn.com/static/scripts/banners/banners.js";

export default function ViatorBanner({
  partnerId,
  width,
  height,
  language,
  selection,
}: ViatorBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any previous iframe (stale from earlier render)
    container.innerHTML = "";

    // Create the data div that the Viator script scans
    const bannerDiv = document.createElement("div");
    bannerDiv.setAttribute("data-id", "viator-banner");
    if (partnerId) bannerDiv.setAttribute("data-partner-id", partnerId);
    bannerDiv.setAttribute("data-url", "https://www.viator.com/Bali/d98-ttd");
    if (width) bannerDiv.setAttribute("data-banner-width", String(width));
    if (height) bannerDiv.setAttribute("data-banner-height", String(height));
    if (language) bannerDiv.setAttribute("data-banner-language", language);
    if (selection) bannerDiv.setAttribute("data-banner-selection", selection);
    container.appendChild(bannerDiv);

    // Load or re-execute the banner script
    const existingScript = document.querySelector(`script[src="${BANNER_SCRIPT_URL}"]`);

    if (existingScript) {
      // Script already loaded from a previous page — remove and re-add to force re-execution
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = BANNER_SCRIPT_URL;
    script.async = true;
    container.appendChild(script);

    return () => {
      // Cleanup on unmount
      container.innerHTML = "";
    };
  }, [partnerId, width, height, language, selection]);

  return (
    <div className="flex justify-center w-full">
      <div ref={containerRef} />
    </div>
  );
}
