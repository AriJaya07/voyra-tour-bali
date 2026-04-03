interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export default function SectionHeader({ title, subtitle, centered = true }: SectionHeaderProps) {
  return (
    <div 
      className={`relative min-h-[300px] md:min-h-[400px] flex items-center justify-center bg-cover bg-center md:rounded-3xl overflow-hidden`}
      style={{ backgroundImage: "url('/images/blog/blog-banner.png')" }}
    >
      <div className="absolute inset-0 bg-black/50 sm:bg-black/40 md:bg-black/40" />

      <div className={`relative z-10 w-full px-4 sm:px-8 md:px-16 lg:px-[147px] py-12 ${centered ? "text-center" : ""}`}>
        <div className={`max-w-4xl space-y-4 drop-shadow-lg ${centered ? "mx-auto" : ""}`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-base md:text-lg text-white/90 mt-4">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
