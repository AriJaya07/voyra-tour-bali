"use client"

import { Package, Category, Destination, Image as PrismaImage } from "@prisma/client"
import WhatappIcon from "../../assets/sosmed/WhatappIcon"

// Types
type PackageWithRelations = Package & {
  images: PrismaImage[]
  category: Category | null
}

interface PackagesSectionProps {
  packages: PackageWithRelations[]
  destinationTitle: string
}

// WhatsApp number — change this to the real admin number
const WA_NUMBER = "6281234567890"

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

function buildWaUrl(pkgTitle: string, destTitle: string, price: number) {
  const lines = [
    `Halo Voyra Bali! 👋`,
    `Saya tertarik dengan paket berikut:`,
    ``,
    `📦 *Paket:* ${pkgTitle}`,
    `🏝 *Destinasi:* ${destTitle}`,
    `💰 *Harga:* ${fmtIDR(price)}`,
    ``,
    `Mohon informasi lebih lanjut, terima kasih! 🙏`,
  ]
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`
}

export default function PackagesSection({ packages, destinationTitle }: PackagesSectionProps) {
  if (!packages || packages.length === 0) return null

  return (
    <section className="pt-[72px] px-4 sm:px-0">
      {/* Section Header */}
      <div className="flex flex-row gap-3 items-center mb-8">
        <hr className="h-10 bg-[#02ACBE] w-[5px] border-0 rounded-full" />
        <div>
          <p className="text-[24px] font-bold leading-[28px] text-black sm:text-[28px]">Paket Wisata</p>
          <p className="text-sm text-gray-400 mt-0.5">Pilih paket yang sesuai dengan kebutuhan Anda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const mainImage =
            pkg.images.find((img) => img.isMain)?.url ||
            pkg.images[0]?.url ||
            null

          return (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl overflow-hidden border border-[#F0F0F0] shadow-sm hover:shadow-lg transition-shadow flex flex-col"
            >
              {/* Image */}
              {mainImage ? (
                <div className="h-[200px] overflow-hidden">
                  <img
                    src={mainImage}
                    alt={pkg.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                  />
                </div>
              ) : (
                <div className="h-[160px] bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center">
                  <span className="text-5xl">📦</span>
                </div>
              )}

              {/* Body */}
              <div className="p-5 flex flex-col gap-3 flex-1">
                {/* Category Badge */}
                {pkg.category && (
                  <span className="inline-flex w-fit items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {pkg.category.name}
                  </span>
                )}

                <h3 className="text-base font-bold text-gray-900 leading-snug">{pkg.title}</h3>

                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 flex-1">
                  {pkg.description}
                </p>

                {/* Price + CTA */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Mulai dari</p>
                    <p className="text-lg font-black text-gray-900">{fmtIDR(pkg.price)}</p>
                  </div>

                  <a
                    href={buildWaUrl(pkg.title, destinationTitle, pkg.price)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                  >
                    <WhatappIcon />
                    Pesan
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
