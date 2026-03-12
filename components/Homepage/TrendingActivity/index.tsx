"use client"

import { useState, useEffect } from "react"
import { Category, Destination as PrismaDestination, Image as PrismaImage } from "@prisma/client"

type DestinationWithImages = PrismaDestination & { images: PrismaImage[] };

interface TrendingActivityProps {
  categories: Category[];
  destinations: DestinationWithImages[];
}

function shuffle<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5)
}

function TabButton({
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
      className={`md:h-[55px] h-[40px] px-6 rounded-full md:text-lg text-md font-bold transition cursor-pointer
        ${
          isActive
            ? "bg-[#0071CE] text-white"
            : "bg-transparent text-black border border-gray-300"
        }
      `}
    >
      {label}
    </button>
  )
}

export default function TrendingActivity({ categories, destinations }: TrendingActivityProps) {
  const defaultCategory = categories.length > 0 ? categories[0].name : "Liburan"
  const [activeTab, setActiveTab] = useState(defaultCategory)
  
  // We'll store visible destinations here
  const [visibleDestinations, setVisibleDestinations] = useState<DestinationWithImages[]>([])

  useEffect(() => {
    // Note: this logic is similar to Destination component. We can filter destinations by active categories.
    // If the DB has separated "Packages" or "Trending Activities", we could fetch those instead.
    const activeCategoryObj = categories.find(c => c.name === activeTab)
    const activeCatId = activeCategoryObj ? activeCategoryObj.id : null

    // For variety, let's show destinations from the selected category, but maybe shuffled/limited
    const filtered = destinations.filter(d => d.categoryId === activeCatId)
    
    // Set up to 5 shuffled items for the trending section
    setVisibleDestinations(shuffle(filtered).slice(0, 5))
  }, [categories, destinations, activeTab])

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
  }

  return (
    <section id="paket" className="pt-20 px-4 mb-20">
      {/* Title */}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black">
        Trending Activity
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 pt-7 pb-9 justify-center sm:justify-start">
        {categories.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.name}
            isActive={activeTab === tab.name}
            onClick={() => handleTabClick(tab.name)}
          />
        ))}
      </div>

      {/* Images */}
      {visibleDestinations.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {visibleDestinations.map((dest) => {
            const mainImage = dest.images.find(img => img.isMain)?.url || dest.images[0]?.url || "/images/activity/melasti.png"
            return (
              <a href={`/detail/${dest.slug}`} target="_self" key={dest.id}>
                <img
                  src={mainImage}
                  alt={dest.title}
                  className="w-full h-[220px] rounded-lg object-cover transition-transform transform hover:scale-105"
                />
              </a>
            )
          })}
        </div>
      ) : (
        <div className="text-gray-500 py-10">No trending activities found for this category.</div>
      )}

      {/* See all */}
      <div className="pt-5 pb-7 flex justify-center">
        <button className="text-[#229ED9] font-bold text-sm hover:underline cursor-pointer">
          See All &gt;
        </button>
      </div>

      {/* Banner */}
      <div className="flex justify-center">
        <img
          src="/images/iklan/tolak-angin.png"
          alt="Advertisement"
          className="w-full max-w-[700px]"
        />
      </div>
    </section>
  )
}

