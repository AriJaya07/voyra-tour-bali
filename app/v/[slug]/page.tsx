import { prisma } from "@/lib/prisma";
import MockCheckoutClient from "@/components/checkout/MockCheckoutClient";
import SlugNotFound from "@/components/mock-booking/SlugNotFound";

export const metadata = {
  title: "Complete Your Booking — Voyra Bali",
  description: "Reserve your Bali tour experience. Fill in your details and our team will confirm via WhatsApp.",
  robots: "noindex, nofollow",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MockBookingPage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch MockBooking by slug — show friendly UI on miss, not a crash
  let mockBooking = null;
  try {
    mockBooking = await prisma.mockBooking.findUnique({
      where: { slug },
    });
  } catch {
    // DB error — still show the not-found UI gracefully
  }

  if (!mockBooking) {
    return (
      <div className="">
        <SlugNotFound slug={slug} />
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAFA] min-h-screen pb-20">
      <div className="pt-24 sm:pt-28">
        <MockCheckoutClient
          initialProductCode={mockBooking.productCode}
          overrideTitle={mockBooking.productTitle}
          overridePrice={mockBooking.price}
          overrideCurrency={mockBooking.currency}
        />
      </div>
    </div>
  );
}

