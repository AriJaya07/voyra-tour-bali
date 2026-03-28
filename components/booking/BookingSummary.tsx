"use client";

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
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date
              </span>
              <span className="text-sm font-bold text-gray-900">{travelDate || "Not selected"}</span>
            </div>
            {startTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Time
                </span>
                <span className="text-sm font-bold text-gray-900">{startTime}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
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
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
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
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-gray-600">Secure</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-gray-600">Instant</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-gray-600">Top Rated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
