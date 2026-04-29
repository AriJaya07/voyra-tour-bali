import type { ReactNode } from "react";

import EmptyTourIcon from "@/components/assets/Icon/EmptyTourIcon";
import SadCloudIcon from "@/components/assets/Icon/SadCloudIcon";
import SearchOffIcon from "@/components/assets/Icon/SearchOffIcon";

type Variant = "no-data" | "no-results" | "error";

interface TourcmsEmptyStateProps {
  variant: Variant;
  title?: string;
  description?: string;
  action?: ReactNode;
}

const PRESETS: Record<
  Variant,
  { icon: ReactNode; title: string; description: string; tone: string }
> = {
  "no-data": {
    icon: <EmptyTourIcon className="w-20 h-20" />,
    title: "No tours available yet",
    description:
      "Our partner catalogue is still being populated for this region. New tours will appear here as soon as our operators publish them.",
    tone: "text-[#02ACBE]",
  },
  "no-results": {
    icon: <SearchOffIcon className="w-20 h-20" />,
    title: "No tours match your filters",
    description:
      "Try a different price band, sort order, or clear the search keyword to see more results.",
    tone: "text-gray-400",
  },
  error: {
    icon: <SadCloudIcon className="w-20 h-20" />,
    title: "Could not load tours",
    description:
      "Our partner data feed is temporarily unavailable. Please try again in a moment.",
    tone: "text-red-400",
  },
};

export default function TourcmsEmptyState({
  variant,
  title,
  description,
  action,
}: TourcmsEmptyStateProps) {
  const preset = PRESETS[variant];

  return (
    <div className="py-16 sm:py-24 px-4 flex flex-col items-center text-center">
      <div
        className={`mb-5 grid place-items-center w-28 h-28 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 ${preset.tone}`}
      >
        {preset.icon}
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-gray-800">
        {title ?? preset.title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-gray-500 leading-6">
        {description ?? preset.description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
