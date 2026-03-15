"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import BurgerIcon from "../assets/Icon/BurgerIcon"
import VoryaIcon from "../assets/Icon/VoyraIcon"
import SearchModal from "./SearchModal"

const NAV_ITEMS = [
  { label: "Home", id: "home" },
  { label: "Destinations", id: "destinasi" },
  { label: "Travel Packages", id: "paket" },
  { label: "About Us", id: "tentang" },
]

export default function Navbar() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const userImage = (session?.user as any)?.image || "/images/people.png"
  const userRole = (session?.user as any)?.role as string | undefined

  // Lock scroll when menu open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto"
  }, [isOpen])

  return (
    <>
      {/* NAVBAR */}
      <header className="w-full border-b border-gray-200 bg-white fixed top-0 z-40">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <a href="/" target="_self">
            <VoryaIcon className="h-[50px] w-auto" />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <a
                href={`/#${item.id}`} // Linking to section by ID
                key={item.label}
                className=""
              >
                <p
                  className="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  {item.label}
                </p>
              </a>
            ))}

            {/* Search Icon Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 hover:text-[#0071CE] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
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
                  <svg className={`w-3 h-3 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
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
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            Dashboard Admin
                          </a>
                        )}
                        <a
                          href="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          My Profile
                        </a>
                        <a
                          href="/"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Home
                        </a>

                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={() => { setIsProfileOpen(false); signOut({ callbackUrl: '/' }) }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
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

          {/* Mobile Burger */}
          <button
            onClick={() => setIsOpen(true)}
            className="md:hidden cursor-pointer"
            aria-label="Open menu"
          >
            <BurgerIcon className="w-[40px] h-[40px]" />
          </button>
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
          fixed top-0 right-0 z-50 h-full w-[80%] max-w-[320px]
          bg-white shadow-lg
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
          {NAV_ITEMS.map((item) => (
            <a
              href={`/#${item.id}`} // Linking to section by ID
              key={item.label}
              className=""
            >
              <p
                onClick={() => setIsOpen(false)}
                className="text-base font-medium text-gray-700 hover:text-blue-600 transition cursor-pointer"
              >
                {item.label}
              </p>
            </a>
          ))}

          {/* Divider */}
          <hr />

          {/* Search Icon Button – Mobile */}
          <button
            onClick={() => { setIsSearchOpen(true); setIsOpen(false); }}
            aria-label="Search"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:text-[#0071CE] hover:bg-gray-50 rounded-xl transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
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
                  className="w-full text-left px-4 py-3 text-sm font-medium text-[#0071CE] hover:bg-blue-50 rounded-xl transition"
                >
                  My Profile
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-xl mt-1"
                >
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
