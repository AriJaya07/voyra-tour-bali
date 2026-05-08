"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import BackLink from "@/components/common/BackLink";
import { useSession } from "next-auth/react";
import LoyaltyRedeemCard from "@/components/ai/LoyaltyRedeemCard";
import { formatPrice } from "@/utils/formatPrice";
import { useCurrency } from "@/utils/hooks/useCurrency";

interface Loyalty {
  pointsBalance: number;
  tier: "BRONZE" | "SILVER" | "GOLD";
  lifetimeSpend: number;
  ledger: { id: number; delta: number; reason: string; createdAt: string }[];
  tierThresholds: { name: string; min: number }[];
}

interface Referral {
  id: number;
  inviteeEmail: string;
  code: string;
  status: "PENDING" | "SIGNED_UP" | "CONVERTED";
  rewardGiven: boolean;
  createdAt: string;
}

const fmtIDR = (n: number) =>
  `Rp ${Math.round(n).toLocaleString("id-ID")}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

const TIER_COLOR: Record<string, string> = {
  BRONZE: "from-amber-700 to-amber-900",
  SILVER: "from-gray-400 to-gray-600",
  GOLD: "from-yellow-400 to-yellow-600",
};

const TIER_PERKS: Record<string, string[]> = {
  BRONZE: ["Earn 1pt per Rp 1,000 spent", "Newsletter access"],
  SILVER: ["Earn 1.5pt per Rp 1,000 spent", "Priority WhatsApp support", "Free 1 reschedule per booking"],
  GOLD: ["Earn 2pt per Rp 1,000 spent", "Priority everything", "Free reschedule unlimited", "Early access to new tours"],
};

export default function RewardsPage() {
  const { status } = useSession();
  const { currency, exchangeRates } = useCurrency();
  const rateNote =
    currency !== "IDR"
      ? `Rp 1,000 ≈ ${formatPrice(1000, currency, "IDR", exchangeRates)} · Rp 100,000 ≈ ${formatPrice(100000, currency, "IDR", exchangeRates)}`
      : null;
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [personalCode, setPersonalCode] = useState<string>("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") return;
    (async () => {
      try {
        const [l, r] = await Promise.all([
          fetch("/api/loyalty", { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)),
          fetch("/api/referrals", { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)),
        ]);
        if (l) setLoyalty(l);
        if (r) {
          setPersonalCode(r.personalCode || "");
          setReferrals(r.referrals || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteeEmail: inviteEmail.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setInviteMsg(d?.error || "Failed");
        return;
      }
      const created = await res.json();
      setReferrals((s) => [created, ...s]);
      setInviteEmail("");
      setInviteMsg("Invite saved. Share the code below with your friend.");
    } finally {
      setInviting(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Reward code copied", {
        description: code,
      });
    } catch {
      toast(code, {
        description: "Long-press to copy this reward code.",
        duration: 8000,
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in to see rewards</h1>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-full hover:bg-[#005ba6] transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const pts = loyalty?.pointsBalance ?? 0;
  const tier = (loyalty?.tier ?? "BRONZE") as keyof typeof TIER_COLOR;
  const lifetime = loyalty?.lifetimeSpend ?? 0;
  const next = loyalty?.tierThresholds.find((t) => t.min > lifetime);
  const progressTo = next ? Math.min(100, Math.round((lifetime / next.min) * 100)) : 100;

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-row items-center gap-4 mb-2 flex-wrap">
          <BackLink href="/profile" label="Back to profile" />
          <h1 className="text-2xl font-bold text-gray-900">Voyra Rewards</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Earn points on every booking, climb tiers, refer friends.
        </p>

        {/* Tier card */}
        <div
          className={`rounded-2xl p-6 sm:p-8 text-white shadow-lg bg-gradient-to-br ${TIER_COLOR[tier]} mb-6`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              {tier} Tier
            </span>
            <span className="text-2xl font-black">{pts}</span>
          </div>
          <p className="text-3xl font-black mb-1">Points balance</p>
          <p className="text-xs opacity-80">Lifetime spend: {fmtIDR(lifetime)}</p>

          {next && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="opacity-90">{tier} → {next.name}</span>
                <span className="opacity-90">{progressTo}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${progressTo}%` }} />
              </div>
              <p className="text-[11px] opacity-80 mt-1">
                {fmtIDR(Math.max(0, next.min - lifetime))} more spend to {next.name}
              </p>
            </div>
          )}
        </div>

        {/* Trip rewards explainer — replaces booking-points accrual messaging */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-900 text-lg mb-1">Trip rewards</h2>
          <p className="text-sm text-gray-500 mb-3">
            Every confirmed booking earns AI credits — automatically deposited in your AI Wallet.
          </p>
          <ul className="text-sm text-gray-700 space-y-1 mb-3">
            <li>• 5 AI credits per Rp 100,000 spent (×{tier === "GOLD" ? "2" : tier === "SILVER" ? "1.5" : "1"} on your current {tier.toLowerCase()} tier)</li>
            <li>• Capped at 500 credits per booking; valid 365 days</li>
          </ul>
          {rateNote ? (
            <p className="text-[11px] text-gray-500 italic mb-3">
              Rates anchored in IDR. {rateNote}.
            </p>
          ) : null}
          <Link
            href="/ai/wallet"
            className="text-xs font-bold text-[#0071CE] hover:underline"
          >
            See balance + bucket breakdown in AI Wallet →
          </Link>
        </div>

        {/* Refer-a-friend earner explainer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-900 text-lg mb-1">Earn from referrals</h2>
          <p className="text-sm text-gray-500 mb-3">
            Share your code below — when a friend confirms a booking, we pay you AI credits. Every booking, not just the first.
          </p>
          <ol className="text-sm text-gray-700 space-y-1 mb-3 list-decimal list-inside">
            <li>Friend signs up — they get a 50-credit welcome bonus.</li>
            <li>Friend books a tour — you earn 10 credits per Rp 100,000 (capped 200 per booking).</li>
            <li>Their first confirmed booking unlocks an extra 50 thank-you credits for them.</li>
          </ol>
          <p className="text-[11px] text-gray-500">
            Real travel only — no payouts on signup alone. Credits valid 365 days.
          </p>
        </div>

        {/* Legacy points → AI credits */}
        {pts > 0 ? (
          <div className="mb-6">
            <LoyaltyRedeemCard
              pointsBalance={pts}
              onRedeemed={() => {
                fetch("/api/loyalty", { cache: "no-store" })
                  .then((res) => (res.ok ? res.json() : null))
                  .then((d) => d && setLoyalty(d))
                  .catch(() => {});
              }}
            />
            <p className="mt-2 text-[11px] text-gray-500">
              Bookings now earn AI credits directly — your existing point balance is a one-time stock you can convert here.
            </p>
          </div>
        ) : null}

        {/* Tier perks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {(["BRONZE", "SILVER", "GOLD"] as const).map((t) => (
            <div
              key={t}
              className={`bg-white border rounded-2xl p-4 ${
                t === tier ? "border-[#0071CE]/40 ring-2 ring-[#0071CE]/20" : "border-gray-100"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{t}</p>
              <ul className="space-y-1">
                {TIER_PERKS[t].map((p) => (
                  <li key={p} className="text-xs text-gray-700 flex gap-1.5">
                    <span className="text-green-500">✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Referral */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-900 text-lg mb-1">Refer a friend</h2>
          <p className="text-sm text-gray-500 mb-4">
            Share your code. Your friend gets a discount; you get points after their first booking.
          </p>

          {personalCode && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
                  Your code
                </p>
                <p className="font-mono text-lg font-black text-gray-900">{personalCode}</p>
              </div>
              <button
                onClick={() => copyCode(personalCode)}
                className="px-4 py-2 text-sm font-bold text-[#0071CE] bg-white hover:bg-blue-50 rounded-lg border border-blue-100 transition"
              >
                Copy
              </button>
            </div>
          )}

          <form onSubmit={sendInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@email.com"
              required
              className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-5 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 text-white text-sm font-bold rounded-lg transition shadow-sm"
            >
              {inviting ? "…" : "Invite"}
            </button>
          </form>
          {inviteMsg && (
            <p className="text-xs mt-2 text-gray-600">{inviteMsg}</p>
          )}

          {referrals.filter((r) => r.inviteeEmail).length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                Sent invites
              </p>
              <ul className="space-y-2">
                {referrals
                  .filter((r) => r.inviteeEmail)
                  .map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 rounded-lg text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{r.inviteeEmail}</p>
                        <p className="text-gray-500">
                          Code <span className="font-mono">{r.code}</span> · {fmtDate(r.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === "CONVERTED"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : r.status === "SIGNED_UP"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {r.status === "CONVERTED" ? "Booked ✓" : r.status === "SIGNED_UP" ? "Signed up" : "Pending"}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        {/* Ledger */}
        {loyalty && loyalty.ledger.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-4">Recent activity</h2>
            <ul className="divide-y divide-gray-100">
              {loyalty.ledger.map((l) => (
                <li key={l.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-gray-900">{l.reason}</p>
                    <p className="text-[11px] text-gray-400">{fmtDate(l.createdAt)}</p>
                  </div>
                  <span
                    className={`font-bold ${l.delta >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {l.delta >= 0 ? "+" : ""}
                    {l.delta} pts
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
