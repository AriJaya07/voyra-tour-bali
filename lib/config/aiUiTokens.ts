/**
 * Single source of truth for AI subsystem visual tokens.
 *
 * Edit values here once — every AI component picks up the change. Keeps
 * BucketBreakdown, PlanCard, Navbar badge, and dashboard tiles in lockstep.
 */

import type { GrantSource } from "@/lib/services/aiCreditService";
import type { AiPlanKey } from "@/lib/config/aiPlans";

// Tailwind classes — kept full strings so JIT picks them up.
export interface BucketTokens {
  labelShort: string;
  emoji: string;
  ringClass: string;
  textClass: string;
  pillClass: string;
  barClass: string; // for stacked progress bar segments
  iconBgClass: string;
}

export const BUCKET_TOKENS: Record<GrantSource, BucketTokens> = {
  WELCOME: {
    labelShort: "Welcome",
    emoji: "🎁",
    ringClass: "ring-amber-200",
    textClass: "text-amber-800",
    pillClass: "bg-amber-50 text-amber-700 border-amber-200",
    barClass: "bg-amber-400",
    iconBgClass: "bg-amber-100 text-amber-700",
  },
  SUBSCRIPTION: {
    labelShort: "Subscription",
    emoji: "📅",
    ringClass: "ring-blue-200",
    textClass: "text-blue-800",
    pillClass: "bg-blue-50 text-blue-700 border-blue-200",
    barClass: "bg-blue-500",
    iconBgClass: "bg-blue-100 text-blue-700",
  },
  TOPUP: {
    labelShort: "Top-up",
    emoji: "🛒",
    ringClass: "ring-emerald-200",
    textClass: "text-emerald-800",
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    barClass: "bg-emerald-500",
    iconBgClass: "bg-emerald-100 text-emerald-700",
  },
  PROMO: {
    labelShort: "Promo",
    emoji: "🎉",
    ringClass: "ring-violet-200",
    textClass: "text-violet-800",
    pillClass: "bg-violet-50 text-violet-700 border-violet-200",
    barClass: "bg-violet-500",
    iconBgClass: "bg-violet-100 text-violet-700",
  },
  REFERRAL: {
    labelShort: "Referral",
    emoji: "🤝",
    ringClass: "ring-pink-200",
    textClass: "text-pink-800",
    pillClass: "bg-pink-50 text-pink-700 border-pink-200",
    barClass: "bg-pink-500",
    iconBgClass: "bg-pink-100 text-pink-700",
  },
  LOYALTY_REDEEM: {
    labelShort: "Loyalty",
    emoji: "⭐",
    ringClass: "ring-yellow-200",
    textClass: "text-yellow-800",
    pillClass: "bg-yellow-50 text-yellow-800 border-yellow-200",
    barClass: "bg-yellow-500",
    iconBgClass: "bg-yellow-100 text-yellow-800",
  },
  REFUND: {
    labelShort: "Refund",
    emoji: "↩️",
    ringClass: "ring-slate-200",
    textClass: "text-slate-700",
    pillClass: "bg-slate-100 text-slate-700 border-slate-200",
    barClass: "bg-slate-400",
    iconBgClass: "bg-slate-100 text-slate-700",
  },
  ADJUST: {
    labelShort: "Adjust",
    emoji: "🛠️",
    ringClass: "ring-slate-200",
    textClass: "text-slate-700",
    pillClass: "bg-slate-100 text-slate-700 border-slate-200",
    barClass: "bg-slate-500",
    iconBgClass: "bg-slate-100 text-slate-700",
  },
  BACKFILL: {
    labelShort: "Launch bonus",
    emoji: "🎈",
    ringClass: "ring-teal-200",
    textClass: "text-teal-800",
    pillClass: "bg-teal-50 text-teal-700 border-teal-200",
    barClass: "bg-teal-500",
    iconBgClass: "bg-teal-100 text-teal-700",
  },
};

export interface PlanTokens {
  badgeClass: string;
  ringClass: string;
  accentClass: string;
}

export const PLAN_TOKENS: Record<AiPlanKey, PlanTokens> = {
  FREE: {
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    ringClass: "ring-slate-200",
    accentClass: "text-slate-600",
  },
  EXPLORER: {
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ringClass: "ring-emerald-200",
    accentClass: "text-emerald-600",
  },
  VOYAGER: {
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    ringClass: "ring-blue-200",
    accentClass: "text-blue-600",
  },
  FOUNDER: {
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    ringClass: "ring-amber-200",
    accentClass: "text-amber-600",
  },
};
