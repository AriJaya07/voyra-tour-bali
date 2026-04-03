interface PageHeroProps {
  badge: string;
  title: string;
  subtitle: string;
  lastUpdated?: string;
}

export default function PageHero({ badge, title, subtitle, lastUpdated }: PageHeroProps) {
  return (
    <section className="relative bg-gradient-to-br from-[#0071CE] via-[#005bb5] to-[#003d80] text-white overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-cyan-300 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <span className="inline-block bg-white/15 border border-white/25 text-blue-100 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
          {badge}
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-4">
          {title}
        </h1>
        <p className="text-base sm:text-lg text-blue-100 max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
        {lastUpdated && (
          <p className="mt-4 text-xs text-blue-200 opacity-70">
            Last updated: {lastUpdated}
          </p>
        )}
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 40L1440 40L1440 10C1200 35 960 40 720 30C480 20 240 0 0 10L0 40Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
