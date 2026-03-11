"use client"

import { useState, useEffect } from "react"
import { Category, Destination as PrismaDestination, Image as PrismaImage } from "@prisma/client"
import DotsIcon from "../../assets/Icon/DotsIcon"

type DestinationWithImages = PrismaDestination & { images: PrismaImage[] };

interface DestinationProps {
  categories: Category[];
  destinations: DestinationWithImages[];
}

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

export default function Destination({ categories, destinations }: DestinationProps) {
  // If categories are empty, fallback to an empty string. The first category is usually the default.
  const defaultCategory = categories.length > 0 ? categories[0].name : "Liburan"
  const [activeTab, setActiveTab] = useState(defaultCategory)
  const [visibleDestinations, setVisibleDestinations] = useState<DestinationWithImages[]>([])

  useEffect(() => {
    // Determine the ID of the initially active category
    const activeCategoryObj = categories.find(c => c.name === activeTab)
    const activeCatId = activeCategoryObj ? activeCategoryObj.id : null

    // Filter destinations by that category ID
    const filtered = destinations.filter(d => d.categoryId === activeCatId)
    
    // Shuffle the filtered destinations after the component mounts
    setVisibleDestinations(shuffleArray(filtered))
  }, [categories, destinations, activeTab])

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
  }

  return (
    <section id="destinasi" className="pt-10 md:pt-[72px] px-4 md:px-0">
      {/* Menu */}
      <div className="flex gap-6 md:gap-[72px] pb-5 overflow-x-auto scrollbar-hide">
        {categories.map((item) => (
          <MenuItem
            key={item.id}
            label={item.name}
            isActive={activeTab === item.name}
            onClick={() => handleTabClick(item.name)}
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
          {visibleDestinations.map((item) => {
             // Find the main image or just fallback to the first one available
             const mainImage = item.images.find(img => img.isMain)?.url || item.images[0]?.url || "/images/destinations/gwk.png"

             return (
              <a href={`/detail/${item.slug}`} key={item.id} target="_self">
                  <img
                    src={mainImage}
                    alt={item.title}
                    className="w-full h-[220px] object-cover rounded-md"
                  />
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
