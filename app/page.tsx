import { getCategories } from "@/lib/data";
import Container from "@/components/Container";
import BannerHome from "@/components/Homepage/BannerHome";
import Destionation from "@/components/Homepage/Destination";
import TrendingActivity from "@/components/Homepage/TrendingActivity";
import PromotionApp from "@/components/Homepage/PromotionApp";
import RecentlyViewedStrip from "@/components/common/RecentlyViewedStrip";
import NextTripWidget from "@/components/Homepage/NextTripWidget";

export default async function Home() {
  const categories = await getCategories();

  return (
    <div>
      <BannerHome />
      <hr className="bg-[#02ACBE] h-[13px]" />
      <Container className="">
        <NextTripWidget />
        <RecentlyViewedStrip minItems={2} title="Continue browsing" />
        <Destionation categories={categories} />
        <TrendingActivity categories={categories} />
        <PromotionApp />
      </Container>
    </div>
  );
}
