"use client"

import { Location, Image as PrismaImage } from "@prisma/client"
import OptimizedImage from "@/components/common/OptimizedImage"
import { MapPinIcon } from "@/components/assets/Icon/shared"

type LocationWithImages = Location & { images: PrismaImage[] }

interface LocationSectionProps {
  locations: LocationWithImages[]
}

export default function LocationSection({ locations }: LocationSectionProps) {
  if (!locations || locations.length === 0) return null

  return (
    <section className="pt-[72px] px-4 sm:px-0">
      {/* Section Header */}
      <div className="flex flex-row gap-3 items-center mb-8">
        <hr className="h-10 bg-[#02ACBE] w-[5px] border-0 rounded-full" />
        <p className="text-[24px] font-bold leading-[28px] text-black sm:text-[28px]">Locations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {locations.map((location) => {
          const mainImage =
            location.images.find((img) => img.isMain)?.url ||
            location.images[0]?.url ||
            null

          return (
            <div
              key={location.id}
              className="flex flex-col sm:flex-row gap-0 bg-white rounded-2xl overflow-hidden border border-[#F0F0F0] shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="relative h-[180px] sm:h-auto sm:w-[200px] flex-shrink-0">
                {mainImage ? (
                  <OptimizedImage
                    src={mainImage}
                    alt={location.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 200px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-[180px] sm:h-full bg-gradient-to-br from-teal-50 to-sky-100 flex items-center justify-center">
                    <span className="text-5xl">📍</span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col gap-3 flex-1 justify-between">
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">{location.title}</h3>
                  {location.description && (
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                      {location.description}
                    </p>
                  )}
                </div>

                {/* Map Link */}
                {location.hrefLink && (
                  <a
                    href={location.hrefLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#02ACBE] hover:bg-[#018fa0] text-white text-sm font-semibold rounded-xl transition-colors w-fit"
                  >
                    <MapPinIcon className="w-4 h-4" />
                    Open Maps
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
