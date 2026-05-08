"use client";

interface FunnelProps {
  invited: number;
  signedUp: number;
  booked: number;
  signupConversion: number;
  bookConversion: number;
}

export default function ReferralFunnel({
  invited,
  signedUp,
  booked,
  signupConversion,
  bookConversion,
}: FunnelProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label="Invited" value={invited} sub="Total invites sent" />
      <Stat
        label="Signed up"
        value={signedUp}
        sub={invited > 0 ? `${signupConversion}% conversion` : "—"}
        accent="text-blue-700"
      />
      <Stat
        label="Booked"
        value={booked}
        sub={signedUp > 0 ? `${bookConversion}% conversion` : "—"}
        accent="text-emerald-700"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent = "text-gray-900",
}: {
  label: string;
  value: number;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-black leading-none ${accent}`}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-1.5">{sub}</p>
    </div>
  );
}
