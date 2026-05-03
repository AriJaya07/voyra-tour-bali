import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "AI Subscription Plans — Voyra",
  description:
    "Pick the AI plan that fits your trip. Free, Explorer, Voyager, and Founder tiers — monthly credits, premium tools, family seats. Cancel anytime.",
  alternates: { canonical: `${SITE_URL}/plans` },
  openGraph: {
    title: "AI Subscription Plans — Voyra",
    description:
      "Compare Voyra AI plans: Free, Explorer, Voyager, Founder. Cancel anytime.",
    url: `${SITE_URL}/plans`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Subscription Plans — Voyra",
    description: "Compare Voyra AI plans. Free, Explorer, Voyager, Founder.",
  },
};

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
