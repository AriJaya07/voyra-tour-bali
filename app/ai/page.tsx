import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import Container from "@/components/Container";
import BackLink from "@/components/common/BackLink";
import {
  AiGuideHero,
  AiGuideSteps,
  AiToolMatrix,
  AiAccuracyTips,
  AiGuideFAQ,
  AiGuideCTA,
} from "@/components/AiGuide";

export const metadata: Metadata = {
  title: "How Voyra AI works · Plan Bali smarter",
  description:
    "A step-by-step guide to Voyra's Bali AI tools — what each one does, how credits work, and how to ask questions you can act on with confidence.",
  openGraph: {
    title: "How Voyra AI works · Plan Bali smarter",
    description:
      "Step-by-step guide to Voyra's Bali AI tools, credit costs, and accuracy best-practices.",
    images: ["/images/banner-ai.png"],
    type: "article",
  },
};

export default async function AiGuidePage() {
  const session = await getServerSession(authOptions);
  const authed = !!session?.user?.id;

  return (
    <Container className="">
      <div className="pt-4 sm:pt-6">
        <BackLink href="/" label="Back to home" />
      </div>

      <div className="mt-4 space-y-2">
        <AiGuideHero authed={authed} />
        <AiGuideSteps />
        <AiToolMatrix />
        <AiAccuracyTips />
        <AiGuideFAQ />
        <AiGuideCTA authed={authed} />
      </div>
    </Container>
  );
}
