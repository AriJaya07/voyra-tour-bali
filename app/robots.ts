import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/profile/",
          "/checkout",
          "/checkout/",
          "/payment",
          "/payment/",
          "/booking-success",
          "/forgot-password",
          "/reset-password",
          "/unsubscribe",
          "/ticket/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
