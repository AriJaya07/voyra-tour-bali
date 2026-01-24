import Container from "@/components/Container";
import BannerHome from "@/components/Homepage/BannerHome";
import Destionation from "@/components/Homepage/Destination";
import TrendingActivity from "@/components/Homepage/TrendingActivity";

export default function Home() {
  return (
    <div>
      <BannerHome />
      <hr className="bg-[#02ACBE] h-[13px]" />
      <Container className="">
        <Destionation />
        <TrendingActivity />
      </Container>
    </div>
  );
}
