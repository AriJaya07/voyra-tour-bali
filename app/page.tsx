import type { Metadata } from "next";
import { getCategories } from "@/lib/data";
import Container from "@/components/Container";
import BannerHome from "@/components/Homepage/BannerHome";
import Destionation from "@/components/Homepage/Destination";
import TrendingActivity from "@/components/Homepage/TrendingActivity";
import PromotionApp from "@/components/Homepage/PromotionApp";
import RecentlyViewedStrip from "@/components/common/RecentlyViewedStrip";
import ForYou from "@/components/Homepage/ForYou";
import NextTripWidget from "@/components/Homepage/NextTripWidget";
import TravelToolkit from "@/components/Homepage/TravelToolkit";
import AiShowcase from "@/components/Homepage/AiShowcase";
import { FEATURES } from "@/lib/config/features";

export const metadata: Metadata = {
  title: "Bali Tours, Activities & AI Trip Planner",
  description:
    "Plan your Bali trip with AI in minutes — day-by-day itineraries, the Balinese ceremony calendar, and bookable tours and activities, all in one place.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const categories = await getCategories();

  return (
    <div>
      <BannerHome />
      <hr className="bg-[#02ACBE] h-[13px]" />
      <Container className="">
        <NextTripWidget />
        <RecentlyViewedStrip minItems={2} title="Continue browsing" />
        <ForYou />
        <Destionation categories={categories} />
        <TrendingActivity categories={categories} />
        {(FEATURES.tripToolkit || FEATURES.aiMonetization) && (
          <div className="mt-10 sm:mt-14 pb-12 sm:pb-16 space-y-4">
            {FEATURES.tripToolkit && <TravelToolkit />}
            {FEATURES.aiMonetization && <AiShowcase />}
          </div>
        )}
        {FEATURES.appPromotion && <PromotionApp />}
      </Container>
    </div>
  );
}
