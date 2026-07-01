import type { Metadata } from "next";
import BackLink from "@/components/common/BackLink";
import GroupConsensusPlanner from "@/components/ai/GroupConsensusPlanner";

export const metadata: Metadata = {
  title: "Group Trip Planner (AI) | Bali Travel Now",
  description:
    "Planning Bali with friends or family? Add everyone's preferences and let AI reconcile them into one balanced, bookable itinerary.",
};

export default function GroupPlannerPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-4">
          <BackLink href="/ai" label="AI Tools" showLabel />
        </div>

        <header className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Plan Bali as a group</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
            Everyone wants something different — adventure vs. wellness, budget vs. splurge. Add each
            traveller&apos;s preferences and AI builds one balanced plan, then explains the trade-offs. It
            saves to your trips so you can refine, budget, and book it.
          </p>
        </header>

        <GroupConsensusPlanner />
      </div>
    </main>
  );
}
