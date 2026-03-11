import { prisma } from "@/lib/prisma";
import Container from "../components/Container";
import BannerHome from "../components/Homepage/BannerHome";
import Destionation from "../components/Homepage/Destination";
import TrendingActivity from "../components/Homepage/TrendingActivity";

export default async function Home() {
  const categories = await prisma.category.findMany();
  const destinations = await prisma.destination.findMany({
    include: {
      images: true
    }
  });

  return (
    <div>
      <BannerHome />
      <hr className="bg-[#02ACBE] h-[13px]" />
      <Container className="">
        <Destionation categories={categories} destinations={destinations} />
        <TrendingActivity categories={categories} destinations={destinations} />
      </Container>
    </div>
  );
}


