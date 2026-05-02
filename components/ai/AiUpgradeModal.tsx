"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { HiSparkles } from "react-icons/hi2";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Free guest hits → render different copy. */
  variant?: "user_quota" | "guest_quota";
  balance?: number;
  reason?: string;
}

/**
 * Shown when an AI route returns HTTP 402. Steers users to /plans (subscribe)
 * or /profile/ai (top-up). Guests see a sign-up CTA.
 */
export default function AiUpgradeModal({ open, onClose, variant = "user_quota", balance = 0, reason }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <IoClose className="h-5 w-5" />
            </button>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <HiSparkles className="h-3.5 w-3.5" /> AI credits
            </div>

            {variant === "guest_quota" ? (
              <>
                <h3 className="text-lg font-bold text-slate-900">
                  You&apos;ve hit the free guest limit
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Sign up free to continue chatting with our Bali AI. Authenticated
                  users get a starting allowance and unlock the AI itinerary planner.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Create free account
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    I already have an account
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-900">
                  Out of AI credits
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  You have <span className="font-semibold">{balance.toLocaleString()}</span>{" "}
                  credits left. Top up instantly or subscribe for monthly credits + premium AI features.
                  {reason ? (
                    <span className="ml-1 block text-xs text-slate-400">Reason: {reason}</span>
                  ) : null}
                </p>
                <div className="mt-5 grid gap-2">
                  <Link
                    href="/plans"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    See subscription plans
                  </Link>
                  <Link
                    href="/profile/ai"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Top up credits
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
