"use client"

import { useState } from "react"

const TABS = ["Beach", "Tour", "Museum"]

const ACTIVITY_IMAGES = [
  "/images/activity/melasti.png",
  "/images/activity/lovina.png",
  "/images/activity/tanahLot.png",
  "/images/activity/pandawa.png",
]

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
      className={`h-[55px] w-[160px] rounded-full text-lg font-bold transition cursor-pointer
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

export default function TrendingActivity() {
  const [activeTab, setActiveTab] = useState("Beach")
  const [images, setImages] = useState(shuffle(ACTIVITY_IMAGES))

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
    setImages(shuffle(ACTIVITY_IMAGES))
  }

  return (
    <section className="pt-20 px-4">
      {/* Title */}
      <h2 className="text-3xl md:text-4xl font-bold text-black">
        Trending Activity
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 pt-7 pb-9">
        {TABS.map((tab) => (
          <TabButton
            key={tab}
            label={tab}
            isActive={activeTab === tab}
            onClick={() => handleTabClick(tab)}
          />
        ))}
      </div>

      {/* Images */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {images.map((src) => (
          <img
            key={src}
            src={src}
            alt="Activity"
            className="w-full rounded-lg object-cover"
          />
        ))}
      </div>

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
