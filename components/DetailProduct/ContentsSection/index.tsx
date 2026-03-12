"use client"

import { Content, Image as PrismaImage } from "@prisma/client"

type ContentWithImages = Content & { images: PrismaImage[] }

interface ContentsSectionProps {
  contents: ContentWithImages[]
}

function AvailabilityBadge({ isAvailable, dateAvailable }: { isAvailable: boolean; dateAvailable: Date | string }) {
  const date = new Date(dateAvailable)
  const formatted = date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
        isAvailable
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-green-500" : "bg-gray-400"}`} />
      {isAvailable ? `Tersedia · ${formatted}` : `Tidak tersedia`}
    </span>
  )
}

export default function ContentsSection({ contents }: ContentsSectionProps) {
  if (!contents || contents.length === 0) return null

  return (
    <section className="pt-[72px] px-4 sm:px-0">
      {/* Section Header */}
      <div className="flex flex-row gap-3 items-center mb-8">
        <hr className="h-10 bg-[#02ACBE] w-[5px] border-0 rounded-full" />
        <p className="text-[24px] font-bold leading-[28px] text-black sm:text-[28px]">Konten &amp; Highlight</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {contents.map((content) => {
          const mainImage =
            content.images.find((img) => img.isMain)?.url ||
            content.images[0]?.url ||
            null

          return (
            <div
              key={content.id}
              className="bg-white rounded-2xl overflow-hidden border border-[#F0F0F0] shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image */}
              {mainImage ? (
                <div className="relative h-[200px] overflow-hidden">
                  <img
                    src={mainImage}
                    alt={content.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                  />
                </div>
              ) : (
                <div className="h-[180px] bg-gradient-to-br from-sky-50 to-teal-100 flex items-center justify-center">
                  <span className="text-4xl">🏝</span>
                </div>
              )}

              {/* Body */}
              <div className="p-5 flex flex-col gap-3">
                <AvailabilityBadge isAvailable={content.isAvailable} dateAvailable={content.dateAvailable} />

                <h3 className="text-base font-bold text-gray-900 leading-snug">{content.title}</h3>

                {content.subTitle && (
                  <p className="text-sm font-medium text-[#02ACBE]">{content.subTitle}</p>
                )}

                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                  {content.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
