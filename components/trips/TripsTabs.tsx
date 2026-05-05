"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: "/trips", label: "Saved Plans", match: (p) => p === "/trips" },
  { href: "/trips/calendar", label: "Trip Calendar", match: (p) => p.startsWith("/trips/calendar") },
];

export default function TripsTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="mb-6 border-b border-gray-200">
      <ul className="flex flex-wrap gap-1 -mb-px">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`inline-block px-4 py-2.5 text-sm font-bold border-b-2 transition ${
                  active
                    ? "border-[#0071CE] text-[#0071CE]"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
