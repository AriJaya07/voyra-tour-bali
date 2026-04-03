import { Metadata } from "next";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "About Us",
  description:
    `Learn about ${SITE_NAME} — your trusted Bali travel agency for curated tour packages, authentic cultural experiences, and secure online booking across all of Bali.`,
  openGraph: {
    title: `About ${SITE_NAME} — Your Trusted Bali Tour Agency`,
    description:
      `Discover Bali with ${SITE_NAME} — curated destinations, expert local guides, secure booking, and personalized Bali travel experiences.`,
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
