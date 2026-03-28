"use client";

interface LoaderProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "w-4 h-4 border-2",
  md: "w-5 h-5 border-2",
  lg: "w-8 h-8 border-[3px]",
};

export default function Loader({ text, size = "md" }: LoaderProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <div
        className={`${SIZES[size]} animate-spin rounded-full border-[#0071CE] border-t-transparent`}
      />
      {text && <span className="text-sm text-gray-500">{text}</span>}
    </div>
  );
}
