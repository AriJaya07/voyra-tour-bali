"use client"

import { memo } from "react"

interface TabButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
}

export const TabButton = memo(function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        h-[40px] sm:h-[44px]
        px-4 sm:px-5
        rounded-full
        text-xs sm:text-sm
        font-semibold
        transition-all duration-200
        cursor-pointer
        whitespace-nowrap
        shrink-0
        ${isActive
          ? "bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"
          : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-900"
        }
      `}
      title={label}
    >
      {label}
    </button>
  )
})
