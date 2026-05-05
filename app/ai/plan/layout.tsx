import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "AI Trip Planner — Build your Bali itinerary",
  description:
    "Tell us your dates, budget, and interests. Our AI assembles a day-by-day Bali itinerary that mixes bookable tours with local tips. Free credits to start.",
  alternates: { canonical: `${SITE_URL}/ai/plan` },
  openGraph: {
    title: "AI Trip Planner — Build your Bali itinerary",
    description:
      "Generate a personalized Bali plan with bookable tours and local tips.",
    url: `${SITE_URL}/ai/plan`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Trip Planner — Build your Bali itinerary",
    description:
      "Generate a personalized Bali plan with bookable tours and local tips.",
  },
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
