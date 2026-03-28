"use client";

import { useEffect, useRef } from "react";

interface ViatorWidgetProps {
  partnerId?: string;
  widgetRef?: string;
}

const WIDGET_SCRIPT_URL = "https://www.viator.com/orion/partner/widget.js";

export default function ViatorWidget({
  partnerId = "P00292613",
  widgetRef = "W-9e8cc7ca-f239-49bb-b5ee-e7da252f8311",
}: ViatorWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.setAttribute("data-vi-partner-id", partnerId);
    widgetDiv.setAttribute("data-vi-widget-ref", widgetRef);
    container.appendChild(widgetDiv);

    const existingScript = document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`);
    if (existingScript) existingScript.remove();

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [partnerId, widgetRef]);

  return (
    <div className="viator-widget-container w-full flex justify-center my-4">
      <div ref={containerRef} />
    </div>
  );
}
