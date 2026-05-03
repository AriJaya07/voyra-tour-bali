import React from "react";
import Script from "next/script";
import { GtmBodyNoScript, GtmHead } from "@/components/Global/Gtm";
import {
  GA_MEASUREMENT_ID,
  SITE_NAME,
  SITE_URL,
  buildOrganizationJsonLd,
} from "@/lib/config";

/** WebSite JSON-LD with sitelinks SearchAction (Google sitelink search box). */
function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * AnalyticsHead: Handles all <head> script components,
 * including GTM, GA4, and JSON-LD.
 */
export function AnalyticsHead() {
  const orgJsonLd = buildOrganizationJsonLd();
  const websiteJsonLd = buildWebSiteJsonLd();

  return (
    <>
      {/* Google Tag Manager (GTM) */}
      <GtmHead />

      {/* Google Analytics 4 */}
      {GA_MEASUREMENT_ID && (
        <>
          {/*
           * Consent Mode v2 must initialize BEFORE gtag.js loads, so the
           * default-denied state is applied to the very first hit. Inline
           * snippet runs synchronously (no strategy override) — the heavier
           * gtag.js library loads afterInteractive to keep LCP fast.
           */}
          <Script id="google-analytics-consent" strategy="beforeInteractive">
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
            `}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics-config" strategy="afterInteractive">
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

      {/* JSON-LD: Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      {/* JSON-LD: WebSite + SearchAction (sitelinks search box) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
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
