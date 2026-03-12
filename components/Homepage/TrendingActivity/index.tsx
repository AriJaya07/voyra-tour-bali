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
  
  // Store a shuffled subset of categories to make this section unique
  const [randomCategories, setRandomCategories] = useState<Category[]>([])
  const [visibleDestinations, setVisibleDestinations] = useState<DestinationWithImages[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    // Pick 6 random categories on mount
    if (categories.length > 0 && randomCategories.length === 0) {
      const shuffled = shuffle(categories).slice(0, 6)
      setRandomCategories(shuffled)
      if (!shuffled.find(c => c.name === activeTab)) {
        setActiveTab(shuffled[0].name)
      }
    }
  }, [categories, randomCategories.length, activeTab])

  useEffect(() => {
    // Note: this logic is similar to Destination component. We can filter destinations by active categories.
    // If the DB has separated "Packages" or "Trending Activities", we could fetch those instead.
    const activeCategoryObj = categories.find(c => c.name === activeTab)
    const activeCatId = activeCategoryObj ? activeCategoryObj.id : null

    // For variety, let's show destinations from the selected category, but maybe shuffled/limited
    const filtered = destinations.filter(d => d.categoryId === activeCatId)
    
    // Set ALL shuffled items for the trending section to support the Show More
    setVisibleDestinations(shuffle(filtered))
    setShowAll(false)
  }, [categories, destinations, activeTab])

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
  }

  // Determine which destinations to display based on the showAll state (max 5 initially)
  const displayedDestinations = showAll ? visibleDestinations : visibleDestinations.slice(0, 5)
  const hasMore = visibleDestinations.length > 5

  return (
    <section id="paket" className="pt-20 px-4 mb-20">
      {/* Title */}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black text-center sm:text-left">
        Trending Activity
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 pt-7 pb-9 justify-center sm:justify-start">
        {randomCategories.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.name}
            isActive={activeTab === tab.name}
            onClick={() => handleTabClick(tab.name)}
          />
        ))}
      </div>

      {/* Images container with min-height to prevent layout shift */}
      <div className="min-h-[220px]">
        {displayedDestinations.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {displayedDestinations.map((dest) => {
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
            
            {/* Show More Button */}
            {hasMore && (
              <div className="pt-8 pb-4 flex justify-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="px-8 py-2.5 bg-white border-2 border-[#229ED9] text-[#229ED9] font-bold rounded-full hover:bg-[#229ED9] hover:text-white transition-all shadow-sm"
                >
                  {showAll ? "Show Less" : "See All Activity"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-[220px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
            <p className="text-gray-500 font-medium text-center px-4">
              No trending activities available for &quot;<span className="font-bold text-gray-700">{activeTab}</span>&quot; at the moment.
            </p>
          </div>
        )}
      </div>

      {/* Banner */}
      <div className="flex justify-center mt-12">
        <img
          src="/images/iklan/tolak-angin.png"
          alt="Advertisement"
          className="w-full max-w-[700px]"
        />
      </div>
    </section>
  )
}

