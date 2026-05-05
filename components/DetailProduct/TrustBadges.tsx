import { ShieldIcon, LockIcon, LightningIcon, ChatIcon } from "@/components/assets/Icon/shared";

interface BadgeItem {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bg: string;
}

export default function TrustBadges() {
  const badges: BadgeItem[] = [
    {
      title: "Free Cancellation",
      subtitle: "Up to 24h before",
      icon: <ShieldIcon className="w-5 h-5" />,
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      title: "Instant Confirmation",
      subtitle: "Tickets in your inbox",
      icon: <LightningIcon className="w-5 h-5" />,
      bg: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      title: "Secure Payment",
      subtitle: "Midtrans · 3DS · SSL",
      icon: <LockIcon className="w-5 h-5" />,
      bg: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "24/7 Support",
      subtitle: "WhatsApp anytime",
      icon: <ChatIcon className="w-5 h-5" />,
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
