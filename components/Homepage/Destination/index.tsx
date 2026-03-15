"use client"

import { useState, useMemo, useEffect, memo } from "react"
import { Category, Destination as PrismaDestination, Image as PrismaImage } from "@prisma/client"
import DotsIcon from "../../assets/Icon/DotsIcon"
import Image from "next/image"

type DestinationWithImages = PrismaDestination & { images: PrismaImage[] };

interface DestinationProps {
  categories: Category[];
  destinations: DestinationWithImages[];
}

/** Fisher-Yates shuffle */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const MenuItem = memo(function MenuItem({
  label,
  isActive,
  onClick,
  icon,
}: {
  label: string
  isActive: boolean
  icon: string
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
})

export default function Destination({ categories, destinations }: DestinationProps) {
  const defaultCategory = categories[0]?.name ?? "Liburan"
  const [activeTab, setActiveTab] = useState(defaultCategory)
  const [showAll, setShowAll] = useState(false)

  // Filter deterministically for SSR, then shuffle on client to avoid hydration mismatch
  const filtered = useMemo(() => {
    const activeCategoryObj = categories.find(c => c.name === activeTab)
    const activeCatId = activeCategoryObj?.id ?? null
    return destinations.filter(d => d.categoryId === activeCatId)
  }, [categories, destinations, activeTab])

  const [visibleDestinations, setVisibleDestinations] = useState(filtered)

  useEffect(() => {
    setVisibleDestinations(shuffleArray(filtered))
  }, [filtered])

  const displayedDestinations = useMemo(
    () => (showAll ? visibleDestinations : visibleDestinations.slice(0, 6)),
    [showAll, visibleDestinations]
  )
  const hasMore = visibleDestinations.length > 6

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
    setShowAll(false)
  }

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
                   const mainImage = item.images.find(img => img.isMain)?.url || item.images[0]?.url || "/images/destinations/gwk.png"

                   return (
                    <a href={`/detail/${item.slug}`} key={item.id} target="_self">
                      <div className="relative w-full h-[220px] rounded-md overflow-hidden">
                        <Image
                          src={mainImage}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform transform hover:scale-105"
                        />
                      </div>
                    </a>
                  )
                })}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors shadow-md"
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
