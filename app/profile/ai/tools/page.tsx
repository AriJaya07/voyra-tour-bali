"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import BackLink from "@/components/common/BackLink";
import {
  useCulturalMutation,
  useDayOfTripMutation,
  useVoucherReadMutation,
} from "@/utils/hooks/useAiWallet";
import type { AiCulturalEvent, AiVoucherExtracted } from "@/utils/service/ai.service";

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
      <BackLink href="/profile/ai" label="Back to AI Wallet" />
      <h1 className="mt-6 text-2xl font-bold text-slate-900">AI Tools</h1>
      <p className="mt-1 text-sm text-slate-600">
        Premium assistants powered by Voyra AI. Each tool checks your plan + balance before charging.
      </p>

      <div className="mt-6 grid gap-4">
        <CulturalCard />
        <DayOfTripCard />
        <VoucherReadCard />
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
        Explorer+ · 2 credits/turn. Grounded in `BaliEvent` data around your focus date.
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
        Free for confirmed travelers in trip window · Voyager+ otherwise (3 credits/turn).
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

function VoucherReadCard() {
  const mut = useVoucherReadMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [extracted, setExtracted] = useState<AiVoucherExtracted | null>(null);
  const [addToTrips, setAddToTrips] = useState(true);
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [created, setCreated] = useState<{ trip: number | null; calendar: number | null }>({
    trip: null,
    calendar: null,
  });

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await mut.mutateAsync({ file, opts: { addToTrips, addToCalendar } });
      setExtracted(res.extracted);
      setCreated({ trip: res.createdImportedTripId, calendar: res.createdCalendarEventId });
      toast.success("Voucher extracted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Voucher reader failed";
      toast.error(msg);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">📷 Voucher reader (vision)</h2>
      <p className="mt-1 text-xs text-slate-500">
        Voyager+ · 5 credits/upload. JPG / PNG / WEBP, max 8 MB. Returns 503 if vision is not enabled on this deployment.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={addToTrips}
            onChange={(e) => setAddToTrips(e.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
          Add to my Imported Trips
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={addToCalendar}
            onChange={(e) => setAddToCalendar(e.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
          Add to Trip Calendar
        </label>
      </div>

      <div className="mt-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onUpload}
          disabled={mut.isPending}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:hover:bg-blue-700 disabled:opacity-60"
        />
      </div>

      {extracted ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          <h3 className="font-semibold text-slate-900">Extracted</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            <li><strong>Title:</strong> {extracted.productTitle ?? "—"}</li>
            <li><strong>Date:</strong> {extracted.travelDate ?? "—"} {extracted.travelTime ?? ""}</li>
            <li><strong>Vendor:</strong> {extracted.vendor ?? "—"}</li>
            <li><strong>Booking ref:</strong> {extracted.bookingRef ?? "—"}</li>
            <li><strong>Lead:</strong> {extracted.leadName ?? "—"}</li>
            <li><strong>Pax:</strong> {extracted.pax ?? "—"}</li>
            <li><strong>Meeting:</strong> {extracted.meetingPoint ?? "—"}</li>
            <li><strong>Total:</strong> {extracted.totalPrice ?? "—"}</li>
            {extracted.notes ? <li><strong>Notes:</strong> {extracted.notes}</li> : null}
          </ul>
          {created.trip ? (
            <p className="mt-3 text-xs text-emerald-700">
              ✓ Saved to <Link href="/profile/itineraries" className="underline">Imported Trips</Link>{" "}
              (#{created.trip})
            </p>
          ) : null}
          {created.calendar ? (
            <p className="mt-1 text-xs text-emerald-700">
              ✓ Added to <Link href="/profile/calendar" className="underline">Trip Calendar</Link>{" "}
              (#{created.calendar})
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
