import Link from "next/link";

interface Props {
  authed: boolean;
  loyaltyPoints: number;
  loyaltyTier?: string | null;
}

export default function ToolkitFooterCTA({ authed, loyaltyPoints, loyaltyTier }: Props) {
  if (authed) {
    return (
      <Link
        href="/profile/rewards"
        data-toolkit-tile="footer-rewards"
        className="group relative block rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 sm:p-6 hover:from-gray-800 hover:to-gray-700 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[url('/images/banner-reward.png')] bg-cover bg-center pointer-events-none transition group-hover:scale-105 motion-reduce:group-hover:scale-100"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/45 to-gray-900/15 pointer-events-none"
        />
        <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300">
              Voyra Rewards
            </p>
            <p className="text-base sm:text-lg font-black mt-0.5 truncate">
              {loyaltyPoints > 0
                ? `${loyaltyPoints.toLocaleString()} points · ${loyaltyTier || "BRONZE"} tier`
                : "Earn points on every booking"}
            </p>
            <p className="text-xs text-gray-300 mt-0.5">
              Redeem for tour discounts and Voyra perks.
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-white">
            View rewards <span aria-hidden>→</span>
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 sm:p-6 shadow-sm">
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/images/banner-reward.png')] bg-cover bg-center pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/45 to-gray-900/15 pointer-events-none"
      />
      <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300">
            Free Voyra account
          </p>
          <p className="text-base sm:text-lg font-black mt-0.5">
            Track your trip from booking to memories
          </p>
          <p className="text-xs text-gray-300 mt-0.5 max-w-md leading-relaxed">
            AI plans, calendar, wishlist, notes, rewards — all synced across your devices.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/register"
            className="inline-flex items-center gap-1 px-5 py-2.5 bg-white text-gray-900 font-bold text-sm rounded-full hover:bg-gray-100 transition shadow-sm"
          >
            Sign up free
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 px-4 py-2.5 text-white font-bold text-sm rounded-full border border-white/30 hover:bg-white/10 transition"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
