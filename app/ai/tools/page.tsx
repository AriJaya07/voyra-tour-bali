"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import BackLink from "@/components/common/BackLink";
import {
  useCulturalMutation,
  useDayOfTripMutation,
} from "@/utils/hooks/useAiWallet";
import type { AiCulturalEvent } from "@/utils/service/ai.service";

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

const TOOL_PREVIEWS = [
  {
    icon: "🛕",
    title: "Cultural co-pilot",
    description:
      "Ask about ceremonies, temple etiquette, and festivals — grounded in our real Bali ceremony calendar, including Nyepi and Galungan travel impact.",
    example: "“What ceremony is happening near my dates?”",
  },
  {
    icon: "🌧️",
    title: "Day-of-Trip helper",
    description:
      "On-the-ground help while you travel: rain pivots, indoor plans, transport tips near you. Free for confirmed travelers during their trip window.",
    example: "“Indoor things to do near Ubud right now?”",
  },
] as const;

function SignedOutView() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-row items-center gap-4 flex-wrap">
        <BackLink href="/ai" label="Back to AI hub" />
        <h1 className="text-2xl font-bold text-slate-900">AI Tools</h1>
      </div>

      {/* Hero */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-[#0071CE] via-[#005bb5] to-[#003d80] p-6 sm:p-10 text-center text-white shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-2xl">
          ✨
        </div>
        <h2 className="mt-4 text-xl sm:text-2xl font-bold">
          Your pocket local guide for Bali
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-blue-100 leading-relaxed">
          Sign in to ask the Cultural co-pilot and Day-of-Trip helper anything.
          New accounts get free welcome AI credits — no plan required.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent("/ai/tools")}`}
            className="w-full sm:w-auto rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#0071CE] shadow-md transition hover:bg-blue-50 active:scale-[0.98]"
          >
            Sign in to continue
          </Link>
          <Link
            href={`/register?callbackUrl=${encodeURIComponent("/ai/tools")}`}
            className="w-full sm:w-auto rounded-xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
          >
            Create free account
          </Link>
        </div>
      </section>

      {/* Tool previews */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {TOOL_PREVIEWS.map((tool) => (
          <section
            key={tool.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{tool.icon}</span>
              <h3 className="text-base font-semibold text-slate-900">{tool.title}</h3>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Sign in
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{tool.description}</p>
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs italic text-slate-500">
              {tool.example}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Tools charge AI credits only — no subscription needed. See{" "}
        <Link href="/ai/pricing" className="font-semibold text-[#0071CE] hover:underline">
          plans &amp; credits
        </Link>
        .
      </p>
    </main>
  );
}

function LoadingView() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-6 grid gap-4">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </main>
  );
}

export default function AiToolsPage() {
  const { status } = useSession();

  if (status === "loading") {
    return <LoadingView />;
  }

  if (status === "unauthenticated") {
    return <SignedOutView />;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-row items-center gap-4 flex-wrap">
        <BackLink href="/ai" label="Back to AI hub" />
        <h1 className="text-2xl font-bold text-slate-900">AI Tools</h1>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Premium assistants powered by Voyra AI. Every tool charges credits only — no plan upgrade required.
      </p>

      <div className="mt-6 grid gap-4">
        <CulturalCard />
        <DayOfTripCard />
      </div>
    </main>
  );
}

function CulturalCard() {
  const mut = useCulturalMutation();
  const [q, setQ] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [reply, setReply] = useState("");
  const [events, setEvents] = useState<AiCulturalEvent[]>([]);

  async function ask() {
    if (!q.trim()) return;
    try {
      const res = await mut.mutateAsync({ userMessage: q, date });
      setReply(res.reply);
      setEvents(res.events);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cultural assistant failed");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">🛕 Cultural co-pilot</h2>
      <p className="mt-1 text-xs text-slate-500">
        2 credits per question · grounded in our Bali ceremony calendar.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="What ceremony is happening near my dates?"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={ask}
          disabled={mut.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {mut.isPending ? "Asking…" : "Ask"}
        </button>
      </div>

      {reply ? (
        <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{reply}</div>
      ) : null}
      {events.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {events.slice(0, 5).map((e) => (
            <li key={e.slug} className="flex justify-between gap-3">
              <span>
                <span className="font-medium text-slate-800">{e.name}</span>
                {e.region ? <span className="ml-1 text-slate-500">[{e.region}]</span> : null}
              </span>
              <span className="text-slate-500">
                {fmtDate(e.date)}
                {e.endDate ? ` → ${fmtDate(e.endDate)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function DayOfTripCard() {
  const mut = useDayOfTripMutation();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [weather, setWeather] = useState("");
  const [reply, setReply] = useState("");
  const [free, setFree] = useState<boolean | null>(null);

  async function ask() {
    if (!q.trim()) return;
    try {
      const res = await mut.mutateAsync({
        userMessage: q,
        region: region || undefined,
        weather: weather || undefined,
      });
      setReply(res.reply);
      setFree(res.free);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Day-of-trip failed");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">🌧️ Day-of-Trip helper</h2>
      <p className="mt-1 text-xs text-slate-500">
        Free for confirmed travelers in trip window · 3 credits otherwise.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Region (e.g. Ubud)"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={weather}
          onChange={(e) => setWeather(e.target.value)}
          placeholder="Weather (e.g. heavy rain)"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Indoor things to do near me right now?"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={ask}
          disabled={mut.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {mut.isPending ? "Asking…" : "Ask"}
        </button>
      </div>

      {reply ? (
        <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
          {free ? (
            <div className="mb-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
              Free for travelers
            </div>
          ) : null}
          {reply}
        </div>
      ) : null}
    </section>
  );
}

