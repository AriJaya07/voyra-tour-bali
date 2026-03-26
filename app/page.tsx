import { getCategories } from "@/lib/data";
import Container from "@/components/Container";
import BannerHome from "@/components/Homepage/BannerHome";
import Destionation from "@/components/Homepage/Destination";
import TrendingActivity from "@/components/Homepage/TrendingActivity";
import PromotionApp from "@/components/Homepage/PromotionApp";

export default async function Home() {
  const categories = await getCategories();

  return (
    <div>
      <BannerHome />
      <hr className="bg-[#02ACBE] h-[13px]" />
      <Container className="">
        <Destionation categories={categories} />
        <TrendingActivity categories={categories} />
        <PromotionApp />
      </Container>
    </div>
  );
}
