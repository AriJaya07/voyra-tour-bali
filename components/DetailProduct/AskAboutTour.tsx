"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useProductQaMutation } from "@/utils/hooks/useAiWallet";

const SUGGESTED = [
  "Is this good for young kids?",
  "How much walking is involved?",
  "What should I bring?",
  "Is hotel pickup included?",
];

interface QA {
  q: string;
  a: string;
}

export default function AskAboutTour({
  destinationId,
  productTitle,
}: {
  destinationId: number;
  productTitle: string;
}) {
  const { status } = useSession();
  const qa = useProductQaMutation();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QA[]>([]);

  const ask = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    if (status !== "authenticated") {
      toast.message("Sign in to ask", {
        description: "Log in to ask AI about this tour.",
        action: { label: "Sign in", onClick: () => (window.location.href = "/login?callbackUrl=" + encodeURIComponent(window.location.pathname)) },
      });
      return;
    }
    try {
      const res = await qa.mutateAsync({ destinationId, question: q });
      setHistory((h) => [...h, { q, a: res.reply || "The listing doesn't specify — check availability or contact support." }]);
      setQuestion("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Assistant unavailable";
      const lowCredits = /credit/i.test(msg);
      toast.error(msg, {
        description: lowCredits ? "Top up to keep asking." : undefined,
        action: lowCredits ? { label: "Get credits", onClick: () => (window.location.href = "/ai/pricing") } : undefined,
      });
    }
  };

  return (
    <section className="my-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>💬</span>
        <h2 className="text-base font-bold text-gray-900">Ask about this tour</h2>
        <span className="ml-auto text-[11px] font-semibold text-gray-400">AI · 2 credits</span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Answers come from this listing&apos;s details. It won&apos;t guess prices or pickup.
      </p>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-4 space-y-3">
          {history.map((item, i) => (
            <div key={i} className="space-y-1.5">
              <p className="text-sm font-semibold text-gray-800">{item.q}</p>
              <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{item.a}</p>
            </div>
          ))}
        </div>
      )}

      {/* Suggested chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={qa.isPending}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#0071CE] hover:text-[#0071CE] disabled:opacity-60"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask anything about ${productTitle.slice(0, 40)}…`}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#0071CE] focus:outline-none"
        />
        <button
          type="submit"
          disabled={qa.isPending || !question.trim()}
          className="shrink-0 rounded-lg bg-[#0071CE] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#005ba6] disabled:opacity-60"
        >
          {qa.isPending ? "Thinking…" : "Ask"}
        </button>
      </form>
    </section>
  );
}
