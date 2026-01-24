"use client"

import { useState, useEffect } from "react"
import DotsIcon from "../../assets/Icon/DotsIcon"

const MENU_ITEMS = [
  "Beranda",
  "Liburan",
  "Study Tour",
  "Honeymoon",
]

const DESTINATIONS = [
  { src: "/images/destinations/gwk.png", alt: "GWK" },
  { src: "/images/destinations/uluwatu.png", alt: "Uluwatu" },
  { src: "/images/destinations/pererenan.png", alt: "Pererenan" },
  { src: "/images/destinations/tirta-gangga.png", alt: "Tirta Gangga" },
  { src: "/images/destinations/danau-bratan.png", alt: "Danau Bratan" },
  { src: "/images/destinations/panglipuran.png", alt: "Panglipuran" },
]

/* --- utils --- */
function shuffleArray<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5)
}

/* --- Menu Item --- */
function MenuItem({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
    >
      <DotsIcon className="md:w-[42px] w-[20px] h-[35px] h-[20px]" isActive={isActive} />

      <span
        className={`text-base sm:text-lg md:text-2xl font-bold ${
          isActive ? "text-blue-600" : "text-[#979797]"
        }`}
      >
        {label}
      </span>
    </button>
  )
}

export default function Destination() {
  const [activeTab, setActiveTab] = useState("Liburan")
  const [visibleDestinations, setVisibleDestinations] = useState(DESTINATIONS)

  useEffect(() => {
    // Shuffle the destinations after the component mounts
    setVisibleDestinations(shuffleArray(DESTINATIONS))
  }, []) // Empty dependency array ensures this only runs once after the component mounts

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
    setVisibleDestinations(shuffleArray(DESTINATIONS))
  }

  return (
    <section className="pt-10 md:pt-[72px] px-4 md:px-0">
      {/* Menu */}
      <div className="flex gap-6 md:gap-[72px] pb-5 overflow-x-auto scrollbar-hide">
        {MENU_ITEMS.map((item) => (
          <MenuItem
            key={item}
            label={item}
            isActive={activeTab === item}
            onClick={() => handleTabClick(item)}
          />
        ))}
      </div>

      <hr className="border-[#C0C0C0]" />

      {/* Content */}
      <div className="pt-10 md:pt-[77px]">
        <h1 className="pb-6 text-2xl sm:text-3xl md:text-5xl font-bold text-[#434343]">
          {activeTab}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleDestinations.map((item, index) => (
            <a href={`/detail/${index}`} key={item.src} target="_self">
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full h-[220px] h-auto object-cover rounded-md"
                />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
