"use client"

import { useState, useEffect } from "react"
import { Category, Destination as PrismaDestination, Image as PrismaImage } from "@prisma/client"
import DotsIcon from "../../assets/Icon/DotsIcon"
import Image from "next/image";

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
  icon,
}: {
  label: string
  isActive: boolean
  icon: any
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 min-w-[120px] items-center justify-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap
      ${
        isActive
          ? "bg-blue-50 text-blue-600"
          : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      }`}
    >
      {icon ? (
        <Image
          src={icon}
          alt={label}
          width={20}
          height={20}
          className={`w-[20px] h-[20px] transition-opacity ${
            isActive ? "opacity-100" : "opacity-60"
          }`}
        />
      ) : (
        <DotsIcon
          className="w-[20px] h-[20px]"
          isActive={isActive}
        />
      )}

      <span className="text-sm md:text-base font-semibold">
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

  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    // Determine the ID of the initially active category
    const activeCategoryObj = categories.find(c => c.name === activeTab)
    const activeCatId = activeCategoryObj ? activeCategoryObj.id : null

    // Filter destinations by that category ID
    const filtered = destinations.filter(d => d.categoryId === activeCatId)
    
    // Shuffle the filtered destinations after the component mounts
    setVisibleDestinations(shuffleArray(filtered))
    // Reset showAll when tab changes
    setShowAll(false)
  }, [categories, destinations, activeTab])

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
  }

  // Determine which destinations to display based on the showAll state
  const displayedDestinations = showAll ? visibleDestinations : visibleDestinations.slice(0, 6)
  const hasMore = visibleDestinations.length > 6

  return (
    <section id="destinasi" className="pt-10 md:pt-[72px] px-4 md:px-0">
      {/* Menu */}
      <div className="flex w-full gap-6 md:gap-2 pb-5 overflow-x-auto scrollbar-hide">
        {categories.map((item) => (
          <MenuItem
            key={item.id}
            label={item.name}
            isActive={activeTab === item.name}
            icon={item.image ?? ""}
            onClick={() => handleTabClick(item.name)}
          />
        ))}
      </div>

      <hr className="border-[#C0C0C0]" />

      {/* Content */}
      <div className="pt-10 md:pt-[77px]">
        <h1 className="pb-6 text-2xl sm:text-3xl font-bold text-[#434343]">
          {activeTab}
        </h1>

        <div className="min-h-[220px]">
          {displayedDestinations.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedDestinations.map((item) => {
                   // Find the main image or just fallback to the first one available
                   const mainImage = item.images.find(img => img.isMain)?.url || item.images[0]?.url || "/images/destinations/gwk.png"

                   return (
                    <a href={`/detail/${item.slug}`} key={item.id} target="_self">
                        <img
                          src={mainImage}
                          alt={item.title}
                          className="w-full h-[220px] object-cover rounded-md transition-transform transform hover:scale-105"
                        />
                    </a>
                  )
                })}
              </div>
              
              {/* Show More Button */}
              {hasMore && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-8 py-3 bg-[#0071CE] text-white font-bold rounded-full hover:bg-blue-700 transition-colors shadow-md"
                  >
                    {showAll ? "Show Less" : "Show More"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-[220px] rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
              <p className="text-gray-500 font-medium text-center px-4">
                No destinations available for &quot;<span className="font-bold text-gray-700">{activeTab}</span>&quot; at the moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
