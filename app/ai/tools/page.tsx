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

export default function AiToolsPage() {
  const { status } = useSession();

  if (status === "unauthenticated") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-center">
        <BackLink href="/profile" />
        <h1 className="mt-6 text-xl font-bold text-slate-900">Sign in to use AI tools</h1>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </main>
    );
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

