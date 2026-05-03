"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

const STORAGE_KEY = "voyra_exit_intent_dismissed_at";
const COOLDOWN_DAYS = 14;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

const SUPPRESSED_PATHS = ["/checkout", "/payment", "/booking-success", "/login", "/register", "/dashboard", "/profile"];

export default function ExitIntentModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const armed = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (SUPPRESSED_PATHS.some((p) => pathname.startsWith(p))) return;

    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < COOLDOWN_MS) return;

    let mobileTimer: ReturnType<typeof setTimeout> | null = null;
    let mobileDeepScroll = false;

    const trigger = () => {
      if (armed.current) return;
      armed.current = true;
      setOpen(true);
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;

    if (isMobile) {
      // On mobile, use deep-scroll + dwell as a proxy for exit intent
      const onScroll = () => {
        const ratio = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
        if (!mobileDeepScroll && ratio > 0.6) {
          mobileDeepScroll = true;
          mobileTimer = setTimeout(trigger, 12000);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onScroll);
        if (mobileTimer) clearTimeout(mobileTimer);
      };
    } else {
      document.addEventListener("mouseleave", onMouseLeave);
      return () => document.removeEventListener("mouseleave", onMouseLeave);
    }
  }, [pathname]);

  const close = () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "EXIT_INTENT_AI_CREDITS" }),
      });
      if (!res.ok && res.status !== 409) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Subscription failed");
      }
      setDone(true);
      toast.success("Reserved! Sign up with this email to unlock your AI credits.");
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Subscription failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="relative bg-gradient-to-br from-[#0071CE] to-[#005ba6] p-6 text-white">
          <button
            onClick={close}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
          >
            ✕
          </button>
          <div className="text-4xl mb-2">✨</div>
          <h2 id="exit-modal-title" className="text-2xl font-black leading-tight">
            Plan Bali smarter — free AI credits inside
          </h2>
          <p className="text-blue-100 text-sm mt-2">
            Drop your email. We&apos;ll reserve 50 bonus AI credits so your first itinerary is on us.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/15 border border-white/25 px-2.5 py-0.5 text-[11px] font-semibold">
              ≈ 6 itineraries
            </span>
            <span className="rounded-full bg-white/15 border border-white/25 px-2.5 py-0.5 text-[11px] font-semibold">
              25 chats
            </span>
            <span className="rounded-full bg-white/15 border border-white/25 px-2.5 py-0.5 text-[11px] font-semibold">
              8 day-tweaks
            </span>
          </div>
        </div>
        <div className="p-6">
          {done ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🎁</div>
              <p className="font-bold text-gray-900 mb-1">50 credits reserved!</p>
              <p className="text-sm text-gray-500 mb-4">
                Sign up with <span className="font-semibold text-gray-700">{email}</span> to unlock them and start planning.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href="/register"
                  onClick={close}
                  className="px-5 py-2.5 bg-[#0071CE] text-white font-bold rounded-xl hover:bg-[#005ba6] transition"
                >
                  Claim my credits →
                </Link>
                <button
                  onClick={close}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Keep browsing
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <label htmlFor="exit-email" className="block text-xs font-bold text-gray-700">
                Where should we send your AI credits?
              </label>
              <input
                id="exit-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE]"
                autoFocus
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 text-white font-bold rounded-xl transition shadow-sm"
              >
                {submitting ? "Reserving…" : "Reserve my 50 AI credits"}
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition"
              >
                No thanks, I&apos;ll plan manually
              </button>
              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                Credits unlock when you create a free Voyra account. No spam, unsubscribe in one click.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
