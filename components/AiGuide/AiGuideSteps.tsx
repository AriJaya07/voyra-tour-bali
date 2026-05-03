interface Step {
  num: number;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}

const STEPS: Step[] = [
  {
    num: 1,
    title: "Sign up — claim 50 free credits",
    body:
      "New accounts get a 7-day welcome bonus. Enough to test the planner, the cultural co-pilot and a couple of concierge chats before you decide on a plan.",
    cta: { href: "/register", label: "Create free account" },
  },
  {
    num: 2,
    title: "Pick the right tool for your question",
    body:
      "Quick chat for general questions, the Planner for full itineraries, the Cultural co-pilot for ceremony dates, the Day-of-trip helper while you're already in Bali, and the Voucher reader to import bookings from screenshots.",
  },
  {
    num: 3,
    title: "Be specific — accuracy follows detail",
    body:
      "Mention dates, region (Ubud / Uluwatu / Canggu), party size, dietary or mobility needs. The more context you give, the fewer credits you waste re-asking.",
  },
  {
    num: 4,
    title: "Read the cost pill before you submit",
    body:
      "Every AI button shows the credit cost and your wallet balance. No surprise spending — you only commit when you click.",
  },
  {
    num: 5,
    title: "Verify what matters before you book",
    body:
      "Treat AI suggestions as a draft, not a contract. Confirm prices, opening hours and availability on the actual tour page (we link them) before you pay.",
  },
  {
    num: 6,
    title: "Refine and save",
    body:
      "Use Plan Refine to edit a single day instead of regenerating the whole trip. Save the itinerary so you can come back to it — or share with the people travelling with you.",
    cta: { href: "/plan", label: "Build my itinerary" },
  },
];

export default function AiGuideSteps() {
  return (
    <section
      aria-labelledby="ai-guide-steps-heading"
      className="my-10 sm:my-14 motion-safe:animate-in motion-safe:fade-in"
    >
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE]">
          Step by step
        </p>
        <h2
          id="ai-guide-steps-heading"
          className="text-xl sm:text-2xl font-black tracking-tight text-gray-900"
        >
          Get useful answers from Voyra AI in six steps
        </h2>
        <p className="mt-1 text-sm text-gray-600 max-w-2xl">
          Built for travellers who want a planner, not a chatbot maze. Follow the steps
          below and the AI will save you hours instead of generating noise.
        </p>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {STEPS.map((s) => (
          <li
            key={s.num}
            className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0071CE] text-sm font-black text-white shadow-sm"
              >
                {s.num}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                {s.title}
              </h3>
            </div>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{s.body}</p>
            {s.cta ? (
              <a
                href={s.cta.href}
                className="mt-4 inline-flex w-fit items-center gap-1 text-[12px] font-bold text-[#0071CE] hover:underline"
              >
                {s.cta.label} <span aria-hidden>→</span>
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
