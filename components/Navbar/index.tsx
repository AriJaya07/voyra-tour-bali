"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import BurgerIcon from "../assets/Icon/BurgerIcon"
import VoryaIcon from "../assets/Icon/VoyraIcon"
import SearchModal from "./SearchModal"
import SearchIcon from "../assets/Icon/SearchIcon"
import { ProfileIcon, DashboardIcon, HomeIcon, SignOutIcon, ChevronDownIcon, CurrencyIcon, SearchNavIcon } from "../assets/Icon/NavIcons"
import { useCurrency } from "@/utils/hooks/useCurrency"

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
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("home")
  const [scrolled, setScrolled] = useState(false)
  const { currency, toggle: toggleCurrency } = useCurrency()
  const userImage = (session?.user as any)?.image || "/images/people.png"
  const userRole = (session?.user as any)?.role as string | undefined

  // Lock scroll when menu open + cleanup on unmount
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

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
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 hover:text-[#0071CE] cursor-pointer"
            >
              <SearchIcon />
            </button>

            {/* Currency Toggle – Desktop */}
            <button
              onClick={toggleCurrency}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-gray-200 hover:border-[#0071CE] transition text-xs font-medium cursor-pointer shrink-0"
              aria-label="Toggle currency"
            >
              <span className={`${currency === "USD" ? "text-[#0071CE] font-bold" : "text-gray-400"}`}>USD</span>
              <div className="relative w-7 h-3.5 rounded-full bg-gray-200">
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-[#0071CE] transition-all duration-200 ${currency === "IDR" ? "left-3.5" : "left-0.5"}`} />
              </div>
              <span className={`${currency === "IDR" ? "text-[#0071CE] font-bold" : "text-gray-400"}`}>IDR</span>
            </button>

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

          {/* Mobile: Currency Toggle + Burger */}
          <div className="flex lg:hidden items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleCurrency}
              className="flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 text-xs font-medium cursor-pointer"
              aria-label="Toggle currency"
            >
              <span className={currency === "USD" ? "text-[#0071CE] font-bold" : "text-gray-400"}>$</span>
              <div className="relative w-6 h-3 rounded-full bg-gray-200">
                <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-[#0071CE] transition-all duration-200 ${currency === "IDR" ? "left-3" : "left-0.5"}`} />
              </div>
              <span className={currency === "IDR" ? "text-[#0071CE] font-bold" : "text-gray-400"}>Rp</span>
            </button>
            <button
              onClick={() => setIsOpen(true)}
              className="cursor-pointer"
              aria-label="Open menu"
            >
              <BurgerIcon className="w-[40px] h-[40px]" />
            </button>
          </div>
        </nav>
      </header>

      {/* OVERLAY */}
      <div
        onClick={() => setIsOpen(false)}
        className={`
          fixed inset-0 z-40 bg-black/40
          transition-opacity duration-300
          ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"}
        `}
      />

      {/* MOBILE SLIDE MENU */}
      <aside
        className={`
          fixed top-0 right-0 z-50 h-[100dvh] w-[80%] max-w-[320px]
          bg-white shadow-lg overflow-y-auto overscroll-contain
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b">
          <VoryaIcon className="h-[50px] max-w-[50px]" />
          <button
            onClick={() => setIsOpen(false)}
            className="text-xl font-bold cursor-pointer"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col px-5 py-6 gap-5">
          {NAV_ITEMS.map((item) => {
            const hasPage = "href" in item && item.href
            const isActive = hasPage
              ? pathname === item.href
              : isHomePage && activeSection === item.id

            const cls = `flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer ${
              isActive
                ? "bg-blue-50 text-[#0071CE] font-semibold"
                : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
            }`

            return hasPage ? (
              <Link
                href={item.href!}
                key={item.label}
                onClick={() => setIsOpen(false)}
                className={cls}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#0071CE]" />}
                <span className="text-base font-medium">{item.label}</span>
              </Link>
            ) : (
              <a
                href={`/#${item.id}`}
                key={item.label}
                onClick={(e) => {
                  setIsOpen(false)
                  scrollToSection(e, item.id)
                }}
                className={cls}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#0071CE]" />}
                <span className="text-base font-medium">{item.label}</span>
              </a>
            )
          })}

          {/* Currency Toggle – Mobile Slide Menu */}
          <button
            onClick={toggleCurrency}
            className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition"
          >
            <div className="flex items-center gap-2">
              <CurrencyIcon className="w-4 h-4 text-gray-400" />
              <span>Currency</span>
            </div>
            <span className="flex items-center gap-1.5">
              <span className={`text-xs ${currency === "USD" ? "text-[#0071CE] font-bold" : "text-gray-400"}`}>USD</span>
              <div className="relative w-8 h-4 rounded-full bg-gray-200">
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-[#0071CE] transition-all duration-200 ${currency === "IDR" ? "left-4" : "left-0.5"}`} />
              </div>
              <span className={`text-xs ${currency === "IDR" ? "text-[#0071CE] font-bold" : "text-gray-400"}`}>IDR</span>
            </span>
          </button>

          {/* Divider */}
          <hr />

          {/* Search Icon Button – Mobile */}
          <button
            onClick={() => { setIsSearchOpen(true); setIsOpen(false); }}
            aria-label="Search"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:text-[#0071CE] hover:bg-gray-50 rounded-xl transition"
          >
            <SearchNavIcon className="w-5 h-5" />
            Search destinations...
          </button>

          {/* Profile */}
          <div className="flex flex-col gap-4 pt-4">
            {session ? (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src={userImage}
                    alt={session.user?.name || "User"}
                    className="h-12 w-12 rounded-full object-cover border-2 border-[#0071CE]"
                  />
                  <div>
                    <p className="text-base font-bold text-gray-900">{session.user?.name || "My Account"}</p>
                    <p className="text-xs text-gray-500">{session.user?.email}</p>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#0071CE] hover:bg-blue-50 rounded-xl transition"
                >
                  <ProfileIcon className="w-4 h-4" />
                  My Profile
                </Link>
                {userRole === "ADMIN" && (
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition"
                  >
                    <DashboardIcon className="w-4 h-4 text-gray-400" />
                    Dashboard Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl mt-1 transition"
                >
                  <SignOutIcon className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <Link onClick={() => setIsOpen(false)} href="/login" className="w-full text-center px-4 py-3 text-sm font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-xl transition">
                  Sign In with Email
                </Link>
                <Link onClick={() => setIsOpen(false)} href="/register" className="w-full text-center px-4 py-3 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-xl transition shadow-sm">
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
