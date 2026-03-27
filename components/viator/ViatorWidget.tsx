"use client";

import Script from "next/script";

interface ViatorWidgetProps {
  partnerId?: string;
  widgetRef?: string;
}

export default function ViatorWidget({
  partnerId = "P00292613",
  widgetRef = "W-9e8cc7ca-f239-49bb-b5ee-e7da252f8311",
}: ViatorWidgetProps) {
  return (
    <div className="viator-widget-container w-full flex justify-center my-4">
      <div
        data-vi-partner-id={partnerId}
        data-vi-widget-ref={widgetRef}
      />
      <Script
        id={`viator-widget-script-${widgetRef}`}
        src="https://www.viator.com/orion/partner/widget.js"
        strategy="lazyOnload"
      />
    </div>
  );
}
