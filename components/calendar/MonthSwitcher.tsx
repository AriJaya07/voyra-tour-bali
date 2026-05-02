import ChevronLeftIcon from "@/components/assets/Icon/shared/ChevronLeftIcon";
import ChevronRightIcon from "@/components/assets/Icon/shared/ChevronRightIcon";

interface Props {
  cursor: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function MonthSwitcher({ cursor, onPrev, onNext, onToday }: Props) {
  const label = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous month"
        className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="font-bold text-gray-900 text-sm sm:text-base truncate">{label}</h2>
        <button
          type="button"
          onClick={onToday}
          className="px-2.5 py-1 text-[11px] font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-full border border-blue-100 transition"
        >
          Today
        </button>
      </div>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next month"
        className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
      >
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
