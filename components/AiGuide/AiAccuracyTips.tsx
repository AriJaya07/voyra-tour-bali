interface Tip {
  title: string;
  body: string;
  tone: "do" | "dont";
}

const TIPS: Tip[] = [
  {
    tone: "do",
    title: "Do — share the constraints up front",
    body:
      "Dates, region, party (adults / kids / seniors), dietary, mobility. The planner reads your profile too — keep it current under Profile → Preferences.",
  },
  {
    tone: "do",
    title: "Do — verify prices on the linked tour page",
    body:
      "Operator pricing changes daily. The AI shows a starting price; the tour page is the source of truth before you commit.",
  },
  {
    tone: "do",
    title: "Do — use the Cultural co-pilot for ceremony dates",
    body:
      "Cultural co-pilot is grounded in our event database, so it cites real Galungan, Kuningan, Nyepi and full-moon dates for the year. The general chat may guess.",
  },
  {
    tone: "do",
    title: "Do — refine a day instead of regenerating",
    body:
      "Plan Refine costs 6 credits per day; a fresh full plan is 8–12. Surgical edits are almost always cheaper.",
  },
  {
    tone: "dont",
    title: "Don't — trust the AI on closures or ferry times",
    body:
      "Schedules change. For Nusa Penida boats, Mt Batur trail conditions, or temple closures on a specific day, call the operator or check the official source.",
  },
  {
    tone: "dont",
    title: "Don't — paste personal data into the chat",
    body:
      "No passport numbers, payment IDs, passwords or full addresses. The AI doesn't need them and we don't want them in the chat history.",
  },
  {
    tone: "dont",
    title: "Don't — ask the AI to confirm a booking",
    body:
      "Booking always happens through the tour page or your Voyra checkout. AI suggests; you confirm.",
  },
  {
    tone: "dont",
    title: "Don't — assume the voucher reader is perfect",
    body:
      "OCR on screenshots is good, not flawless. Re-read the date, time and meeting point before you save it to your calendar.",
  },
];

const TONE_STYLE: Record<Tip["tone"], { ring: string; pill: string; pillText: string }> = {
  do: {
    ring: "ring-emerald-100",
    pill: "bg-emerald-50",
    pillText: "text-emerald-700",
  },
  dont: {
    ring: "ring-rose-100",
    pill: "bg-rose-50",
    pillText: "text-rose-700",
  },
};

/**
 * Best-practice card stack — what the AI is good at vs where the user has to
 * stay sharp. Two visual lanes (do / don't) so a reader scanning the page can
 * find the warning they need.
 */
export default function AiAccuracyTips() {
  return (
    <section
      aria-labelledby="ai-accuracy-heading"
      className="my-10 sm:my-14 rounded-3xl bg-gradient-to-br from-slate-50 to-white p-6 sm:p-8 ring-1 ring-gray-100"
    >
      <div className="mb-6 max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE]">
          Use it wisely
        </p>
        <h2
          id="ai-accuracy-heading"
          className="text-xl sm:text-2xl font-black tracking-tight text-gray-900"
        >
          How to get accurate, actionable answers
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Voyra AI is a planner, not a booking system. Here&apos;s how to get the most
          out of it — and where you still need to verify yourself.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {TIPS.map((t) => {
          const style = TONE_STYLE[t.tone];
          return (
            <article
              key={t.title}
              className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ${style.ring}`}
            >
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${style.pill} ${style.pillText}`}
              >
                {t.tone === "do" ? "Do" : "Don't"}
              </span>
              <h3 className="mt-2 text-sm sm:text-base font-bold text-gray-900 leading-snug">
                {t.title.replace(/^(Do|Don't) — /, "")}
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{t.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
