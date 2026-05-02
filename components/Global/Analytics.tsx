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
              window.gtag = gtag;
              gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                wait_for_update: 500,
              });
              try {
                var raw = window.localStorage.getItem('voyra_cookie_consent_v1');
                if (raw) {
                  var parsed = JSON.parse(raw);
                  if (parsed && parsed.choice === 'accepted') {
                    gtag('consent', 'update', {
                      ad_storage: 'granted',
                      ad_user_data: 'granted',
                      ad_personalization: 'granted',
                      analytics_storage: 'granted',
                    });
                  }
                }
              } catch (e) {}
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
