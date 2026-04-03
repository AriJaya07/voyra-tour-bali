import React from "react";
import Script from "next/script";
import { GtmBodyNoScript, GtmHead } from "@/components/Global/Gtm";
import { GA_MEASUREMENT_ID, buildOrganizationJsonLd } from "@/lib/config";

/**
 * AnalyticsHead: Handles all <head> script components,
 * including GTM, GA4, and JSON-LD.
 */
export function AnalyticsHead() {
  const jsonLd = buildOrganizationJsonLd();

  return (
    <>
      {/* Google Tag Manager (GTM) */}
      <GtmHead />

      {/* Google Analytics 4 */}
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="beforeInteractive"
          />
          <Script id="google-analytics" strategy="beforeInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                send_page_view: true,
              });
            `}
          </Script>
        </>
      )}

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}

/**
 * AnalyticsBody: Handles all <body> script components,
 * such as GTM noscript iframe.
 */
export function AnalyticsBody() {
  return <GtmBodyNoScript />;
}
