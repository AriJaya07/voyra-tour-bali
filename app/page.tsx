"use client"

import Container from "@/components/Container";
import Footer from "@/components/Footer";
import BannerHome from "@/components/Homepage/BannerHome";
import Destionation from "@/components/Homepage/Destination";
import Navbar from "@/components/Navbar";
import TrendingActivity from "@/components/Homepage/TrendingActivity";

export default function Home() {
  return (
    <div>
      <Navbar />
      <BannerHome />
      <hr className="bg-[#02ACBE] h-[13px]" />
      <Container className="">
        <Destionation />
        <TrendingActivity />
      </Container>
      <Footer />
    </div>
  );
}
