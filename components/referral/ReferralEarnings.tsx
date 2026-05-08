"use client";

interface EarningsProps {
  total: number;
  last30Days: number;
  pendingFriends: number;
}

export default function ReferralEarnings({ total, last30Days, pendingFriends }: EarningsProps) {
  return (
    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5 shadow-md">
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">
        Referral earnings
      </p>
      <p className="text-3xl font-black leading-none">{total}</p>
      <p className="text-xs opacity-80 mt-1">total AI credits earned from friends</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
          <p className="opacity-80">Last 30 days</p>
          <p className="font-bold text-base">+{last30Days}</p>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
          <p className="opacity-80">Friends pending booking</p>
          <p className="font-bold text-base">{pendingFriends}</p>
        </div>
      </div>
    </div>
  );
}
