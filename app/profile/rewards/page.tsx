"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import BackLink from "@/components/common/BackLink";
import { useSession } from "next-auth/react";

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
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [personalCode, setPersonalCode] = useState<string>("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [redeemPts, setRedeemPts] = useState(1000);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ code: string; idrValue: number } | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
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

  const redeem = async () => {
    setRedeeming(true);
    setRedeemError(null);
    setRedeemResult(null);
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: redeemPts }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setRedeemError(d?.error || "Redemption failed");
        return;
      }
      const data = await res.json();
      setRedeemResult({ code: data.code, idrValue: data.idrValue });
      // Refresh loyalty
      const lr = await fetch("/api/loyalty", { cache: "no-store" });
      if (lr.ok) setLoyalty(await lr.json());
    } finally {
      setRedeeming(false);
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
        <div className="flex items-center gap-2 mb-2">
          <BackLink href="/profile" label="Back to profile" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Voyra Rewards</h1>
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

        {/* Redeem points */}
        {pts >= 1000 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-6">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Redeem points</h2>
            <p className="text-sm text-gray-500 mb-4">
              1,000 points = Rp 50,000 off. Get a one-time code to paste at checkout.
            </p>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="number"
                min={1000}
                max={Math.min(50000, pts)}
                step={1000}
                value={redeemPts}
                onChange={(e) => setRedeemPts(Math.max(1000, Math.min(50000, parseInt(e.target.value) || 1000)))}
                className="w-32 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
              />
              <span className="text-sm text-gray-500">pts → Rp {((redeemPts / 1000) * 50000).toLocaleString("id-ID")}</span>
              <button
                onClick={redeem}
                disabled={redeeming || redeemPts > pts}
                className="ml-auto px-5 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 text-white text-sm font-bold rounded-lg transition shadow-sm"
              >
                {redeeming ? "…" : "Redeem"}
              </button>
            </div>
            {redeemError && <p className="text-xs text-red-600">{redeemError}</p>}
            {redeemResult && (
              <div className="mt-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm">
                <p className="font-bold text-green-800">Code generated</p>
                <p className="font-mono text-base text-gray-900 my-1">{redeemResult.code}</p>
                <p className="text-xs text-green-700">
                  Saves Rp {redeemResult.idrValue.toLocaleString("id-ID")} — paste at checkout.
                </p>
                <button
                  onClick={() => copyCode(redeemResult.code)}
                  className="mt-2 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                >
                  Copy code
                </button>
              </div>
            )}
          </div>
        )}

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
