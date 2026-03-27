"use client";

import Script from "next/script";

interface ViatorBannerProps {
  partnerId?: string;
  width?: number | string;
  height?: number | string;
  language?: string;
  selection?: string;
}

export default function ViatorBanner({
  partnerId = "P00292613",
  width = "120",
  height = "600",
  language = "en",
  selection = "banner1",
}: ViatorBannerProps) {
  return (
    <div className="flex justify-center w-full my-4">
      {/* Container for the specific banner size */}
      <div
        data-id="viator-banner"
        data-partner-id={partnerId}
        data-url="https://www.viator.com/"
        data-banner-width={width}
        data-banner-height={height}
        data-banner-language={language}
        data-banner-selection={selection}
      />
      {/* Script from the third party, next/script optimizes its loading */}
      <Script
        id="viator-banner-script"
        src="https://partners.vtrcdn.com/static/scripts/banners/banners.js"
        strategy="lazyOnload"
      />
    </div>
  );
}
