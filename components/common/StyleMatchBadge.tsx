"use client";

import { useSession } from "next-auth/react";
import { matchesStyle, usePrefsStore } from "@/utils/hooks/useUserPreferences";

interface Props {
  text: string | undefined | null;
  className?: string;
}

const TAG_LABEL: Record<string, string> = {
  adventure: "Matches your adventure style",
  culture: "Matches your culture style",
  food: "Matches your food style",
  wellness: "Matches your wellness style",
  family: "Family friendly",
  luxury: "Matches your luxury style",
  budget: "Budget friendly",
  nightlife: "Matches your nightlife style",
  nature: "Matches your nature style",
  beach: "Matches your beach style",
  diving: "Matches your diving style",
  surf: "Matches your surf style",
};

export default function StyleMatchBadge({ text, className = "" }: Props) {
  const { status } = useSession();
  const styleTags = usePrefsStore((s) => s.prefs.styleTags);
  const loaded = usePrefsStore((s) => s.loaded);

  if (status !== "authenticated" || !loaded) return null;
  if (!styleTags.length) return null;

  const { matched, tag } = matchesStyle(text, styleTags);
  if (!matched || !tag) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold ${className}`}
      title={TAG_LABEL[tag] || `Matches your ${tag} style`}
    >
      <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-current" aria-hidden>
        <path d="M8 0L9.8 5.5H16l-5.1 3.7L12.7 16 8 12.3 3.3 16l1.8-6.8L0 5.5h6.2z" />
      </svg>
      Matches your style
    </span>
  );
}
