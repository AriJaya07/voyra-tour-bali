import { FAQ_ITEMS } from "@/lib/config/aiCopy";

/**
 * AI guide FAQ — pulls items from the central `aiCopy` source so wording stays
 * consistent with the /plans FAQ. Native <details> for zero-JS accessibility.
 */
export default function AiGuideFAQ() {
  return (
    <section
      aria-labelledby="ai-guide-faq-heading"
      className="my-10 sm:my-14"
    >
      <div className="mb-6 max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#0071CE]">
          Frequently asked
        </p>
        <h2
          id="ai-guide-faq-heading"
          className="text-xl sm:text-2xl font-black tracking-tight text-gray-900"
        >
          Common questions about Voyra AI
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm sm:text-base font-bold text-gray-900">
              <span>{item.q}</span>
              <span
                aria-hidden
                className="text-lg text-gray-400 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
