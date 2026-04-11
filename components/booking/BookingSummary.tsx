"use client";

import { ClipboardIcon, CalendarIcon, ClockIcon, PeopleIcon, CheckmarkIcon, ShieldIcon, LightningIcon, StarIcon } from "@/components/assets/Icon/shared";

interface BookingSummaryProps {
  productTitle: string;
  productImage?: string;
  travelDate: string;
  startTime?: string;
  paxMix: Array<{ ageBand: string; numberOfTravelers: number }>;
  totalPrice: number;
  currency: string;
  cancellationPolicy?: string;
}

export default function BookingSummary({
  productTitle,
  productImage,
  travelDate,
  startTime,
  paxMix,
  totalPrice,
  currency,
  cancellationPolicy,
}: BookingSummaryProps) {
  const totalTravelers = paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);

  return (
    <div className="lg:sticky lg:top-28 space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-hidden">
        <div className="bg-[#0071CE] px-5 sm:px-6 py-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ClipboardIcon className="w-5 h-5" />
            Booking Summary
          </h2>
        </div>
        <div className="p-5 sm:p-6">
          {productImage && (
            <div className="mb-4 rounded-xl overflow-hidden">
              <img src={productImage} alt={productTitle} className="w-full h-32 object-cover" />
            </div>
          )}

          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
            <p className="text-sm font-bold text-gray-900 leading-snug">{productTitle}</p>
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Date
              </span>
              <span className="text-sm font-bold text-gray-900">{travelDate || "Not selected"}</span>
            </div>
            {startTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Time
                </span>
                <span className="text-sm font-bold text-gray-900">{startTime}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <PeopleIcon className="w-4 h-4" />
                Travelers
              </span>
              <span className="text-sm font-bold text-gray-900">{totalTravelers} pax</span>
            </div>
            {paxMix.map((p, i) => (
              <div key={i} className="flex items-center justify-between pl-6">
                <span className="text-xs text-gray-400">{p.ageBand}</span>
                <span className="text-xs text-gray-600">x{p.numberOfTravelers}</span>
              </div>
            ))}
          </div>

          {cancellationPolicy && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cancellation</p>
              <p className="text-xs text-gray-600">{cancellationPolicy}</p>
            </div>
          )}

          <div className="bg-[#F8F8F8] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">Total</span>
              <span className="text-xl sm:text-2xl font-black text-[#0071CE]">
                {totalPrice.toLocaleString()} {currency}
              </span>
            </div>
            <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
              <CheckmarkIcon className="w-3.5 h-3.5" />
              No hidden fees. Taxes included.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
              <ShieldIcon className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-gray-600">Secure</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
              <LightningIcon className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-gray-600">Instant</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
              <StarIcon className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-gray-600">Top Rated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
