import Link from "next/link";

interface Props {
  region: string | null;
  tags: string[];
  title: string;
}

export default function AiPlanHandoff({ region, tags, title }: Props) {
  const params = new URLSearchParams();
  if (region) params.set("region", region);
  if (tags.length > 0) params.set("interests", tags.slice(0, 4).join(","));
  params.set("from", "guides");
  const href = `/ai/plan?${params.toString()}`;

  return (
    <div className="mt-12 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0071CE] via-[#005bb5] to-[#003d80] p-7 sm:p-9 text-white shadow-md">
      <p className="text-[11px] font-bold uppercase tracking-widest text-blue-100">Skip the reading</p>
      <h2 className="text-xl sm:text-2xl font-black leading-tight mt-1 mb-2">
        Turn this into a day-by-day plan
      </h2>
      <p className="text-sm text-blue-50/95 max-w-xl leading-relaxed mb-5">
        We&apos;ll prefill the AI planner with{" "}
        {region && <span className="font-bold text-amber-200">{region}</span>}
        {region && tags.length > 0 && " and "}
        {tags.length > 0 && (
          <span className="font-bold text-amber-200">{tags.slice(0, 3).join(", ")}</span>
        )}
        {!region && tags.length === 0 && <span>the themes from &ldquo;{title}&rdquo;</span>} — adjust days,
        budget and party size, then save the itinerary.
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-300 text-blue-900 text-sm font-bold rounded-xl hover:bg-amber-200 transition shadow-sm"
      >
        ✨ Plan with AI
      </Link>
    </div>
  );
}
