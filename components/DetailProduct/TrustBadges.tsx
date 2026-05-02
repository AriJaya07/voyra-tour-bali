interface BadgeItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bg: string;
}

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const BoltIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default function TrustBadges() {
  const badges: BadgeItem[] = [
    {
      title: "Free Cancellation",
      subtitle: "Up to 24h before",
      icon: <ShieldIcon />,
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      title: "Instant Confirmation",
      subtitle: "Tickets in your inbox",
      icon: <BoltIcon />,
      bg: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      title: "Secure Payment",
      subtitle: "Midtrans · 3DS · SSL",
      icon: <LockIcon />,
      bg: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "24/7 Support",
      subtitle: "WhatsApp anytime",
      icon: <ChatIcon />,
      bg: "bg-rose-50 text-rose-700 border-rose-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6" aria-label="Booking guarantees">
      {badges.map((b) => (
        <div key={b.title} className={`flex items-center gap-3 px-3 py-3 rounded-xl border ${b.bg}`}>
          <div className="shrink-0">{b.icon}</div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">{b.title}</p>
            <p className="text-[11px] opacity-80 leading-tight mt-0.5">{b.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
