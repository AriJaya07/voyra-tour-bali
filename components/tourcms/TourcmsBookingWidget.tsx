"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useTourcmsAvailability } from "@/utils/hooks/useTourcms";
import type {
  TourcmsAvailabilitySlot,
  TourcmsPaxMixEntry,
  TourcmsProductDetail,
} from "@/types/tourcms";

interface Props {
  product: TourcmsProductDetail;
}

function todayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function TourcmsBookingWidget({ product }: Props) {
  const router = useRouter();
  const [travelDate, setTravelDate] = useState<string>(todayIsoDate());
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const paxMix: TourcmsPaxMixEntry[] = useMemo(() => {
    const mix: TourcmsPaxMixEntry[] = [
      { ageBand: "ADULT", numberOfTravelers: adults },
    ];
    if (children > 0) {
      mix.push({ ageBand: "CHILD", numberOfTravelers: children });
    }
    return mix;
  }, [adults, children]);

  const { data, isLoading, isError } = useTourcmsAvailability({
    productCode: product.productCode,
    travelDate,
    paxMix,
  });

  const slots = useMemo(() => data?.slots ?? [], [data]);
  const currentSlot = useMemo<TourcmsAvailabilitySlot | undefined>(
    () => slots.find((s) => s.componentKey === selectedOption) || slots[0],
    [slots, selectedOption]
  );

  const totalSource = currentSlot?.totalPrice ?? 0;
  const currency = currentSlot?.currencyCode || data?.currencyCode || "USD";

  function proceed() {
    if (!currentSlot || !currentSlot.componentKey) return;
    const params = new URLSearchParams({
      productCode: product.productCode,
      componentKey: currentSlot.componentKey,
      productTitle: product.title,
      travelDate,
      travelTime: currentSlot.startTime || "",
      adults: String(adults),
      children: String(children),
      totalPriceSource: String(totalSource),
      currencySource: currency,
    });
    if (currentSlot.rateId) params.set("rateId", currentSlot.rateId);
    if (product.imageUrl) params.set("productImage", product.imageUrl);
    router.push(`/tourcms/checkout?${params.toString()}`);
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white sticky top-4">
      <h3 className="text-base font-bold mb-3">Book this tour</h3>

      <label className="block text-xs text-gray-600 mb-1">Travel date</label>
      <input
        type="date"
        value={travelDate}
        min={todayIsoDate()}
        onChange={(e) => setTravelDate(e.target.value)}
        className="w-full mb-3 px-3 py-2 border rounded-lg text-sm"
      />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Adults</label>
          <input
            type="number"
            min={1}
            max={20}
            value={adults}
            onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Children</label>
          <input
            type="number"
            min={0}
            max={20}
            value={children}
            onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">Departure</label>
        {isLoading && (
          <div className="h-9 bg-gray-100 animate-pulse rounded" />
        )}
        {isError && (
          <div className="text-xs text-red-600">
            Could not load availability. Try a different date.
          </div>
        )}
        {!isLoading && !isError && slots.length === 0 && (
          <div className="text-xs text-gray-500">No slots for that date.</div>
        )}
        {!isLoading && !isError && slots.length > 0 && (
          <select
            value={selectedOption ?? slots[0].componentKey}
            onChange={(e) => setSelectedOption(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            {slots.map((s) => (
              <option key={s.componentKey} value={s.componentKey}>
                {s.startTime || "Anytime"}
                {s.rateName ? ` — ${s.rateName}` : ""}
                {!s.available ? " (sold out)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-gray-600">Estimated total</span>
        <span className="font-bold text-[#0071CE]">
          {totalSource ? `${currency} ${totalSource.toLocaleString()}` : "—"}
        </span>
      </div>

      <button
        onClick={proceed}
        disabled={!currentSlot || !currentSlot.available}
        className="w-full py-2.5 bg-[#0071CE] text-white rounded-lg font-bold disabled:bg-gray-300"
      >
        Continue to checkout
      </button>
    </div>
  );
}
