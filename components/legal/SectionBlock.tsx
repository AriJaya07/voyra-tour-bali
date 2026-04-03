interface SectionBlockProps {
  number?: string | number;
  title: string;
  children: React.ReactNode;
}

export default function SectionBlock({ number, title, children }: SectionBlockProps) {
  return (
    <div className="mb-10 scroll-mt-24" id={`section-${number}`}>
      <div className="flex items-start gap-4 mb-3">
        {number && (
          <span className="shrink-0 w-9 h-9 rounded-full bg-[#0071CE]/10 text-[#0071CE] text-sm font-black flex items-center justify-center">
            {number}
          </span>
        )}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug pt-0.5">
          {title}
        </h2>
      </div>
      <div className={`text-gray-600 leading-relaxed space-y-3 text-sm sm:text-base ${number ? "pl-13" : ""}`}>
        {children}
      </div>
    </div>
  );
}
