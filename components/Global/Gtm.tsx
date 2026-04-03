import Script from "next/script";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";

function buildGtmInlineScript(id: string) {
  // Standard Google Tag Manager bootstrap snippet.
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');`;
}

export function GtmHead() {
  if (!GTM_ID) return null;

  return (
    <Script
      id="gtm-head"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: buildGtmInlineScript(GTM_ID),
      }}
    />
  );
}

export function GtmBodyNoScript() {
  if (!GTM_ID) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}

