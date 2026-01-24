"use client"

import { useState, useEffect } from "react"
import BurgerIcon from "@/public/Icon/BurgerIcon"
import VoryaIcon from "@/public/Icon/VoyraIcon"

const NAV_ITEMS = [
  "Halaman Utama",
  "Destinasi",
  "Paket Travel",
  "Tentang Kami",
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

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
              <p
                key={item}
                className="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600 transition"
              >
                {item}
              </p>
            ))}

            <input
              type="text"
              placeholder="Search"
              className="h-9 w-48 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <img
              src="/images/people.png"
              alt="User"
              className="h-10 w-10 rounded-full object-cover"
            />
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
            <p
              key={item}
              onClick={() => setIsOpen(false)}
              className="text-base font-medium text-gray-700 hover:text-blue-600 transition cursor-pointer"
            >
              {item}
            </p>
          ))}

          {/* Divider */}
          <hr />

          {/* Search */}
          <input
            type="text"
            placeholder="Search"
            className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Profile */}
          <div className="flex items-center gap-3 pt-4">
            <img
              src="/images/people.png"
              alt="User"
              className="h-10 w-10 rounded-full object-cover"
            />
            <p className="text-sm font-medium">My Account</p>
          </div>
        </div>
      </aside>
    </>
  )
}
