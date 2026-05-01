"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import VoryaIcon from "../assets/Icon/VoyraIcon"
import SearchModal from "./SearchModal"
import SearchIcon from "../assets/Icon/SearchIcon"
import { ProfileIcon, DashboardIcon, HomeIcon, SignOutIcon, ChevronDownIcon } from "../assets/Icon/NavIcons"
import CurrencyDropdown from "@/components/common/CurrencyDropdown"
import { useWishlistStore } from "@/utils/hooks/useWishlist"

const NAV_ITEMS = [
  { label: "Home", id: "home" },
  { label: "Destinations", id: "destinasi" },
  { label: "Travel Packages", id: "paket" },
  { label: "About Us", id: "tentang", href: "/about" },
]

const NAVBAR_HEIGHT = 64

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const isHomePage = pathname === "/"
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("home")
  const [scrolled, setScrolled] = useState(false)
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const userImage = (session?.user as any)?.image || "/images/people.png"
  const userRole = (session?.user as any)?.role as string | undefined

  // Track scroll position for active section + navbar style
  useEffect(() => {
    if (!isHomePage) return

    const sectionIds = NAV_ITEMS.map((item) => item.id)

    const handleScroll = () => {
      setScrolled(window.scrollY > 20)

      // Find which section is currently in view
      let current = "home"
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el) {
          const top = el.getBoundingClientRect().top
          if (top <= NAVBAR_HEIGHT + 80) {
            current = id
          }
        }
      }
      setActiveSection(current)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isHomePage])

  // Smooth scroll to section
  const scrollToSection = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (!isHomePage) return // Let normal navigation happen on other pages

      e.preventDefault()
      const el = document.getElementById(id)
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT
        window.scrollTo({ top, behavior: "smooth" })
      }
    },
    [isHomePage]
  )

  return (
    <>
      {/* NAVBAR */}
      <header className={`w-full fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm"
          : "bg-white border-b border-gray-200"
      }`}>
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 min-w-0">
          {/* Logo */}
          <Link href="/" target="_self" className="flex-shrink-0">
            <VoryaIcon className="h-[40px] sm:h-[50px] w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 min-w-0">
            {NAV_ITEMS.map((item) => {
              const hasPage = "href" in item && item.href
              const isActive = hasPage
                ? pathname === item.href
                : isHomePage && activeSection === item.id

              return hasPage ? (
                <Link
                  href={item.href!}
                  key={item.label}
                  className="relative pb-1 group"
                >
                  <span
                    className={`cursor-pointer text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? "text-[#0071CE] font-semibold"
                        : "text-gray-700 group-hover:text-[#0071CE]"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-[2px] bg-[#0071CE] rounded-full transition-all duration-300 ${
                      isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                    }`}
                  />
                </Link>
              ) : (
                <a
                  href={`/#${item.id}`}
                  key={item.label}
                  onClick={(e) => scrollToSection(e, item.id)}
                  className="relative pb-1 group"
                >
                  <span
                    className={`cursor-pointer text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? "text-[#0071CE] font-semibold"
                        : "text-gray-700 group-hover:text-[#0071CE]"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-[2px] bg-[#0071CE] rounded-full transition-all duration-300 ${
                      isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                    }`}
                  />
                </a>
              )
            })}

            {/* Search Icon Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
              className="h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 hover:text-[#0071CE] cursor-pointer"
            >
              <SearchIcon />
            </button>

            {/* Wishlist link */}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 hover:text-pink-500"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* Currency – Desktop */}
            <CurrencyDropdown variant="desktop" />

            {session ? (
              <div className="relative">
                {/* Avatar button */}
                <button
                  onClick={() => setIsProfileOpen((p) => !p)}
                  className="flex items-center gap-2 cursor-pointer group"
                  aria-label="My profile"
                >
                  <img
                    src={userImage}
                    alt={session.user?.name || "User"}
                    className="h-10 w-10 rounded-full object-cover border-2 border-[#0071CE] shadow-sm group-hover:border-[#005ba6] transition"
                  />
                  <ChevronDownIcon className={`w-3 h-3 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown popup */}
                {isProfileOpen && (
                  <>
                    {/* click-away overlay */}
                    <div className="fixed inset-0 z-30" onClick={() => setIsProfileOpen(false)} />
                    <div className="absolute right-0 top-14 z-40 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-[#0071CE] to-[#005ba6] p-5 flex items-center gap-4">
                        <img
                          src={userImage}
                          alt={session.user?.name || "User"}
                          className="h-14 w-14 rounded-full object-cover border-2 border-white shadow"
                        />
                        <div className="min-w-0">
                          <p className="text-white font-bold text-base truncate">{session.user?.name || "My Account"}</p>
                          <p className="text-blue-100 text-xs truncate">{session.user?.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-bold bg-white/20 text-white rounded-full">
                            {userRole || 'USER'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-3 flex flex-col gap-1">
                        {userRole === 'ADMIN' && (
                          <a
                            href="/dashboard"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition"
                          >
                            <DashboardIcon className="w-4 h-4 text-gray-400" />
                            Dashboard Admin
                          </a>
                        )}
                        <a
                          href="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition"
                        >
                          <ProfileIcon className="w-4 h-4 text-gray-400" />
                          My Profile
                        </a>
                        <a
                          href="/"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition"
                        >
                          <HomeIcon className="w-4 h-4 text-gray-400" />
                          Home
                        </a>

                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={() => { setIsProfileOpen(false); signOut({ callbackUrl: '/' }) }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition"
                          >
                            <SignOutIcon className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-bold text-gray-700 hover:text-[#0071CE] transition">
                  Sign In
                </Link>
                <Link href="/register" className="px-5 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-full transition shadow-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: Currency + Avatar (or Sign In). Primary nav lives in MobileBottomNav. */}
          <div className="flex lg:hidden items-center gap-2 flex-shrink-0">
            <CurrencyDropdown variant="mobile" />

            {session ? (
              <div className="relative">
                <button
                  onClick={() => setIsMobileProfileOpen((p) => !p)}
                  className="flex items-center cursor-pointer"
                  aria-label="Account menu"
                  aria-expanded={isMobileProfileOpen}
                >
                  <img
                    src={userImage}
                    alt={session.user?.name || "User"}
                    className="h-9 w-9 rounded-full object-cover border-2 border-[#0071CE] shadow-sm"
                  />
                </button>

                {isMobileProfileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsMobileProfileOpen(false)}
                    />
                    <div className="absolute right-0 top-12 z-40 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                      <div className="bg-gradient-to-r from-[#0071CE] to-[#005ba6] p-4 flex items-center gap-3">
                        <img
                          src={userImage}
                          alt={session.user?.name || "User"}
                          className="h-11 w-11 rounded-full object-cover border-2 border-white shadow"
                        />
                        <div className="min-w-0">
                          <p className="text-white font-bold text-sm truncate">
                            {session.user?.name || "My Account"}
                          </p>
                          <p className="text-blue-100 text-[11px] truncate">
                            {session.user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="p-2">
                        {userRole === "ADMIN" && (
                          <Link
                            href="/dashboard"
                            onClick={() => setIsMobileProfileOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition"
                          >
                            <DashboardIcon className="w-4 h-4 text-gray-400" />
                            Dashboard Admin
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            setIsMobileProfileOpen(false)
                            signOut({ callbackUrl: "/" })
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                        >
                          <SignOutIcon className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="px-3 py-2 text-xs font-bold text-[#0071CE] hover:bg-blue-50 rounded-full transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-2 text-xs font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-full transition shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
