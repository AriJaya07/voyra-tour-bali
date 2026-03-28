"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { checkAvailability } from "@/lib/api/viator-client";
import type { AvailabilitySlot } from "@/utils/hooks/useBookingStore";

interface AvailabilitySelectorProps {
  productCode: string;
  productOptionCode?: string;
  paxMix: Array<{ ageBand: string; numberOfTravelers: number }>;
  currency: string;
  selectedDate: string;
  selectedTime?: string;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: AvailabilitySlot) => void;
}

export default function AvailabilitySelector({
  productCode,
  productOptionCode,
  paxMix,
  currency,
  selectedDate,
  selectedTime,
  onDateChange,
  onSlotSelect,
}: AvailabilitySelectorProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate || !productCode || paxMix.length === 0) return;

    const fetchAvailability = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await checkAvailability({
          productCode,
          productOptionCode,
          travelDate: selectedDate,
          paxMix,
          currency,
        });

        const available: AvailabilitySlot[] =
          data.bookableItems?.map((item: Record<string, unknown>) => ({
            productOptionCode: (item.productOptionCode as string) || productOptionCode || "",
            startTime: item.startTime as string | undefined,
            tourGradeCode: item.tourGradeCode as string | undefined,
            available: true,
            totalPrice: (item.totalPrice as number) || 0,
            partnerNetPrice: item.partnerNetPrice as number | undefined,
            currencyCode: (item.currencyCode as string) || currency,
          })) || [];

        setSlots(available);
      } catch {
        setError("Could not load availability. Please try another date.");
        setSlots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, productCode, productOptionCode, paxMix, currency]);

  const handleDateChange = (value: unknown) => {
    if (value instanceof Date) {
      const iso = value.toISOString().split("T")[0];
      onDateChange(iso);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="space-y-5">
      {/* Date Picker */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Select Date</h2>
        </div>

        <div className="flex justify-center">
          <Calendar
            onChange={handleDateChange}
            value={selectedDate ? new Date(selectedDate + "T00:00:00") : null}
            minDate={tomorrow}
            className="!border-0 !w-full"
          />
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Available Times</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0071CE] border-t-transparent" />
              <span className="text-sm text-gray-500">Checking availability...</span>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No available slots for this date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slots.map((slot, idx) => {
                const isSelected = selectedTime === slot.startTime;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSlotSelect(slot)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      isSelected
                        ? "border-[#0071CE] bg-[#0071CE]/5 ring-2 ring-[#0071CE]/20"
                        : "border-gray-200 hover:border-[#0071CE]/40"
                    }`}
                  >
                    <p className={`text-sm font-bold ${isSelected ? "text-[#0071CE]" : "text-gray-900"}`}>
                      {slot.startTime || "Flexible"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {slot.totalPrice.toLocaleString()} {slot.currencyCode}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
