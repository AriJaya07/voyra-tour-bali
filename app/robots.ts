import { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXTAUTH_URL || "https://voyra-tour-bali.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/profile/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
