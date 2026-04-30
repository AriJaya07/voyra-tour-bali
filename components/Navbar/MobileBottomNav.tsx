"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useWishlistStore } from "@/utils/hooks/useWishlist";
import SearchModal from "./SearchModal";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: string;
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5l9-7 9 7V20a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V9.5z" />
    </svg>
  );
}
function SearchIcn() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function HeartIcn({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function TripsIcn({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function PersonIcn({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const [searchOpen, setSearchOpen] = useState(false);

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/checkout") || pathname.startsWith("/payment")) {
    return null;
  }

  const profileHref = session ? "/profile" : "/login";
  const tripsHref = session ? "/profile#my-bookings" : "/login";

  const items: NavItem[] = [
    { href: "/", label: "Home", icon: <HomeIcon active={pathname === "/"} /> },
    { href: "/search", label: "Search", icon: <SearchIcn />, matchPrefix: "/search" },
    { href: "/wishlist", label: "Wishlist", icon: <HeartIcn active={pathname === "/wishlist"} />, matchPrefix: "/wishlist" },
    { href: tripsHref, label: "Trips", icon: <TripsIcn active={pathname === "/profile" && typeof window !== "undefined" && window.location.hash === "#my-bookings"} /> },
    { href: profileHref, label: "Account", icon: <PersonIcn active={pathname.startsWith("/profile") || pathname === "/login"} />, matchPrefix: "/profile" },
  ];

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Bottom navigation"
      >
        <div className="grid grid-cols-5 h-14">
          {items.map((it) => {
            const active = it.matchPrefix
              ? pathname.startsWith(it.matchPrefix)
              : pathname === it.href;

            if (it.label === "Search") {
              return (
                <button
                  key={it.label}
                  onClick={() => setSearchOpen(true)}
                  className={`flex flex-col items-center justify-center gap-0.5 transition ${
                    searchOpen ? "text-[#0071CE]" : "text-gray-500 hover:text-[#0071CE]"
                  }`}
                  aria-label="Search"
                >
                  <span className="relative">{it.icon}</span>
                  <span className="text-[10px] font-medium">{it.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={it.label}
                href={it.href}
                className={`flex flex-col items-center justify-center gap-0.5 transition ${
                  active ? "text-[#0071CE]" : "text-gray-500 hover:text-[#0071CE]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  {it.icon}
                  {it.label === "Wishlist" && wishlistCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Spacer so content isn't hidden behind the bar on mobile */}
      <div className="lg:hidden h-14" style={{ marginBottom: "env(safe-area-inset-bottom)" }} aria-hidden />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
