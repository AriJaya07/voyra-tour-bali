import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Voyra Tourism — your trusted Bali travel companion for curated destinations, tour packages, and authentic cultural experiences.",
  openGraph: {
    title: "About Voyra Tourism",
    description:
      "Discover Bali with Voyra — curated destinations, secure booking, and local expertise.",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
