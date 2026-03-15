"use client"

import { useState, useEffect } from "react"
import { Category, Destination as PrismaDestination, Image as PrismaImage } from "@prisma/client"
import axios from "axios"

type DestinationWithImages = PrismaDestination & { images: PrismaImage[] };

interface TrendingActivityProps {
  categories: Category[];
  // keeping destinations prop for backward compatibility in parent component, though we will fetch Viator data
  destinations?: DestinationWithImages[]; 
}

interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  pricing: { summary: { fromPrice: number } };
  images: { variants: { url: string }[] }[];
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
      className={`
        md:h-[48px] h-[40px]
        px-6
        rounded-full
        text-sm md:text-base
        font-semibold
        transition-all duration-200
        cursor-pointer
        whitespace-nowrap
        ${
          isActive
            ? "bg-blue-50 text-blue-600 shadow-md"
            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900"
        }
      `}
    >
      {label}
    </button>
  )
}

export default function TrendingActivity({ categories }: TrendingActivityProps) {
  const defaultCategory = categories.length > 0 ? categories[0].name : "Liburan"
  const [activeTab, setActiveTab] = useState(defaultCategory)
  
  // Store a shuffled subset of categories to make this section unique
  const [randomCategories, setRandomCategories] = useState<Category[]>([])
  
  // Local state for Viator Products
  const [products, setProducts] = useState<ViatorProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
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

  // Fetch Viator API products whenever the active tab changes
  useEffect(() => {
    const fetchViatorProducts = async () => {
      setIsLoading(true);
      try {
        const activeCategoryObj = categories.find(c => c.name === activeTab)
        const categoryId = activeCategoryObj ? activeCategoryObj.id : null

        // Fetch using our Next.js proxy route
        const response = await axios.get('/api/viator', {
          params: {
            action: 'products',
            categoryId: categoryId
          }
        });

        // Store fetched products
        if (response.data && response.data.data) {
          setProducts(shuffle(response.data.data)); // Shuffling visual mock data
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error("Failed to fetch Viator products:", error);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchViatorProducts();
    setShowAll(false);
  }, [activeTab, categories])

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
  }

  // Determine which destinations to display based on the showAll state (max 5 initially)
  const displayedProducts = showAll ? products : products.slice(0, 5)
  const hasMore = products.length > 5

  return (
    <section id="paket" className="pt-20 px-4 mb-20">
      {/* Title */}
      <h2 className="text-2xl sm:text-3xl font-bold text-black text-center sm:text-left">
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
        {isLoading ? (
          <div className="w-full h-[220px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50/50">
            <p className="text-gray-500 font-medium animate-pulse text-center px-4">
              Loading latest activities for &quot;<span className="font-bold text-gray-700">{activeTab}</span>&quot;...
            </p>
          </div>
        ) : displayedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {displayedProducts.map((prod) => {
                const mainImage = prod.images?.[0]?.variants?.[0]?.url || "/images/activity/melasti.png"
                return (
                  <a href={`/detail/${prod.productCode}`} target="_self" key={prod.productCode}>
                    <img
                      src={mainImage}
                      alt={prod.title}
                      className="w-full h-[220px] rounded-lg object-cover transition-transform transform hover:scale-105"
                      title={prod.title}
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
