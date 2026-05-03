import { AI_ENDPOINT_COST, type AiEndpoint } from "@/lib/config/aiCosts";

interface ToolRow {
  endpoint: AiEndpoint;
  name: string;
  blurb: string;
  costNote: string;
  bestFor: string;
}

const TOOLS: ToolRow[] = [
  {
    endpoint: "chat",
    name: "Quick chat",
    blurb:
      "Open-ended Bali questions answered with bookable tour cards and local context.",
    costNote: `${AI_ENDPOINT_COST.chat} credits / turn`,
    bestFor: "Spot questions, comparisons, fast research.",
  },
  {
    endpoint: "plan",
    name: "AI Itinerary Planner",
    blurb:
      "Generates a multi-day Bali plan with bookable Viator tours, free tips and pacing rules baked in.",
    costNote: `${AI_ENDPOINT_COST.plan} cr (≤7 days) · 12 cr (8–14 days)`,
    bestFor: "First-time visitors who want a whole trip in one shot.",
  },
  {
    endpoint: "plan_refine",
    name: "Plan Refine",
    blurb:
      "Edit a single day of an existing itinerary without regenerating the whole plan.",
    costNote: `${AI_ENDPOINT_COST.plan_refine} credits / day`,
    bestFor: "Swap out a rainy day, lighten the pace, add a cooking class.",
  },
  {
    endpoint: "concierge",
    name: "AI Concierge",
    blurb:
      "Multi-turn chat with persistent memory. Remembers preferences, dates and constraints across sessions.",
    costNote: `${AI_ENDPOINT_COST.concierge} credits / turn`,
    bestFor: "Returning travellers who want continuity without re-typing context.",
  },
  {
    endpoint: "cultural",
    name: "Cultural Co-Pilot",
    blurb:
      "Grounded in our Balinese ceremony database — Galungan, Kuningan, Nyepi, full-moon temple days.",
    costNote: `${AI_ENDPOINT_COST.cultural} credits / question`,
    bestFor: "Avoiding closures, scheduling around ceremonies, etiquette tips.",
  },
  {
    endpoint: "day_of_trip",
    name: "Day-of-Trip Helper",
    blurb:
      "Practical advice while you're on the ground: rain pivot, what's open near me, transport.",
    costNote: `${AI_ENDPOINT_COST.day_of_trip} credits — free with a confirmed booking in window`,
    bestFor: "Live use during your trip when plans need to change fast.",
  },
  {
    endpoint: "voucher_read",
    name: "Voucher Reader",
    blurb:
      "Drop in a screenshot of an external booking voucher; the AI extracts date, time and meeting point.",
    costNote: `${AI_ENDPOINT_COST.voucher_read} credits / scan`,
    bestFor: "Importing tours booked elsewhere into your Voyra calendar.",
  },
];

/**
 * Side-by-side reference of every AI tool, what it costs, and what it's for.
 * Cost numbers come from `lib/config/aiCosts.ts` so this card never drifts
 * from the actual billing logic.
 */
export default function AiToolMatrix() {
  return (
    <section
      aria-labelledby="ai-tool-matrix-heading"
      className="my-10 sm:my-14"
    >
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE]">
          The toolbox
        </p>
        <h2
          id="ai-tool-matrix-heading"
          className="text-xl sm:text-2xl font-black tracking-tight text-gray-900"
        >
          Every AI tool, what it costs, what it&apos;s good at
        </h2>
        <p className="mt-1 text-sm text-gray-600 max-w-2xl">
          Pick the right one and you&apos;ll spend a fraction of the credits you would
          piecing the same answer together with the chatbot.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {TOOLS.map((t) => (
          <article
            key={t.endpoint}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-bold text-gray-900">{t.name}</h3>
              <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
                {t.costNote}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{t.blurb}</p>
            <p className="mt-3 text-[12px] text-gray-500">
              <span className="font-bold text-gray-700">Best for: </span>
              {t.bestFor}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
