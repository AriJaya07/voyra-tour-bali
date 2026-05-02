import Link from "next/link";
import ChevronLeftIcon from "@/components/assets/Icon/shared/ChevronLeftIcon";

interface Props {
  href: string;
  label?: string;
  className?: string;
}

export default function BackLink({ href, label = "Back", className = "" }: Props) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:border-[#0071CE] hover:text-[#0071CE] rounded-full transition shadow-sm ${className}`}
      aria-label={label}
    >
      <ChevronLeftIcon className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
      <span>{label}</span>
    </Link>
  );
}
