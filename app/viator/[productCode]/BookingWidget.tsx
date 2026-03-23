"use client";

import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Traveler {
  ageBand: 'ADULT' | 'CHILD' | 'INFANT' | 'YOUTH' | 'SENIOR' | string;
  count: number;
  label: string;
  min: number;
  max: number;
}

export default function BookingWidget({ productCode, title, basePrice, currency, ageBands }: { productCode: string, title: string, basePrice: number, currency: string, ageBands?: any[] }) {
  const router = useRouter();
  const [date, setDate] = useState<Date | null>(null);
  
  // Use dynamic age bands if available, otherwise fallback
  const initTravelers = ageBands && ageBands.length > 0 ? ageBands.map((ab: any) => ({
    ageBand: ab.ageBand,
    label: `${ab.ageBand.charAt(0) + ab.ageBand.slice(1).toLowerCase()} (${ab.startAge}-${ab.endAge} yrs)`,
    count: ab.ageBand === 'ADULT' ? Math.max(1, ab.minTravelersPerBooking || 1) : 0,
    min: ab.minTravelersPerBooking || 0,
    max: ab.maxTravelersPerBooking || 15
  })) : [
    { ageBand: 'ADULT', label: 'Adult (18+)', count: 1, min: 1, max: 15 },
    { ageBand: 'CHILD', label: 'Child (4-17)', count: 0, min: 0, max: 15 },
  ];

  const [travelers, setTravelers] = useState<Traveler[]>(initTravelers);
  const [price, setPrice] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const totalTravelers = travelers.reduce((acc, t) => acc + t.count, 0);

  // Update traveler counts considering min/max per age band
  const updateTraveler = (index: number, delta: number) => {
    const newTravelers = [...travelers];
    const target = newTravelers[index];
    const newCount = target.count + delta;
    if (newCount >= target.min && newCount <= target.max) {
      target.count = newCount;
      setTravelers(newTravelers);
      setPrice(null); 
    }
  };

  // 1. Availability API Call
  const handleCheckAvailability = async () => {
    if (!date || totalTravelers === 0) return;
    setIsChecking(true);

    // format date as YYYY-MM-DD local time adjusted
    const offset = date.getTimezoneOffset()
    const travelDateStr = new Date(date.getTime() - (offset*60*1000)).toISOString().split('T')[0]

    const paxMix = travelers.filter(t => t.count > 0).map(t => ({
      ageBand: t.ageBand,
      numberOfTravelers: t.count
    }));

    try {
      const res = await fetch('/api/viator/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode, travelDate: travelDateStr, paxMix, currency }),
      });
      const data = await res.json();

      if (res.ok && data.available !== false) {
        // Parse the total price from the first bookable item, or use fallback
        const apiPrice = data.bookableItems?.[0]?.totalPrice?.price?.recommendedRetailPrice;
        setPrice(apiPrice || (basePrice * totalTravelers));
      } else {
        toast.warning("Not available for the selected date/travelers.");
        setPrice(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to check availability. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  // 2. Booking API Call - Redirect to Checkout
  const handleBooking = async () => {
    if (!date || !price) return;

    const offset = date.getTimezoneOffset()
    const travelDateStr = new Date(date.getTime() - (offset*60*1000)).toISOString().split('T')[0]

    const paxMix = travelers.filter(t => t.count > 0).map(t => ({
      ageBand: t.ageBand,
      numberOfTravelers: t.count
    }));

    const queryParams = new URLSearchParams({
      productCode,
      title,
      date: travelDateStr,
      paxMix: JSON.stringify(paxMix),
      total: price.toString(),
      currency,
    });
    router.push(`/checkout?${queryParams.toString()}`);
  };

  return (
    <div className="border border-[#E6E6E6] rounded-2xl p-5 sm:p-6 my-10 lg:my-0 shadow-sm bg-white w-full">
      <h2 className="text-xl font-bold mb-4 text-black">Book this Tour</h2>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2 text-gray-700">1. Select Date</label>
        <style>{`
          .booking-cal { width: 100%; border: none !important; font-family: inherit; font-size: 13px; }
          .booking-cal .react-calendar__tile--active { background: #0071CE !important; color: white !important; border-radius: 8px; }
          .booking-cal .react-calendar__tile--now { background: #e0f0ff !important; border-radius: 8px; }
          .booking-cal .react-calendar__tile:hover { background: #b3d9ff !important; border-radius: 8px; }
          .booking-cal .react-calendar__navigation button:hover { background: #f0f7ff !important; border-radius: 8px; }
          .booking-cal .react-calendar__navigation button { font-weight: 700; color: #1a1a1a; font-size: 14px; }
          .booking-cal .react-calendar__tile:disabled { background: #f5f5f5; color: #c0c0c0; }
          .booking-cal .react-calendar__tile { padding: 8px 4px; }
        `}</style>
        <div className="border border-[#E6E6E6] rounded-xl overflow-hidden p-2">
          <Calendar onChange={(val) => { setDate(val as Date); setPrice(null); }} value={date} minDate={new Date()} className="booking-cal" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2 text-gray-700">2. Travelers</label>
        <div className="border border-[#E6E6E6] rounded-xl p-4 space-y-3">
          {travelers.map((t, idx) => (
            <div key={t.ageBand} className="flex justify-between items-center">
              <span className="text-gray-800 font-medium">{t.label}</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => updateTraveler(idx, -1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 font-bold text-gray-700 hover:bg-gray-200"
                  disabled={t.count === 0}
                >-</button>
                <span className="w-4 text-center text-gray-900 font-bold">{t.count}</span>
                <button 
                  onClick={() => updateTraveler(idx, 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold hover:bg-blue-100"
                >+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!price ? (
        <button 
          onClick={handleCheckAvailability}
          disabled={!date || totalTravelers === 0 || isChecking}
          className="w-full bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold py-3.5 rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed transition transform active:scale-[0.98]"
        >
          {isChecking ? "Checking Availability..." : "Check Availability"}
        </button>
      ) : (
        <div className="mt-4 p-5 bg-[#F8F8F8] rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-gray-700">Total Price:</span>
            <span className="font-black text-xl text-gray-900">{price.toLocaleString()} {currency}</span>
          </div>
          <button 
            onClick={handleBooking}
            disabled={isBooking}
            className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-3.5 rounded-xl transition transform active:scale-[0.98]"
          >
            {isBooking ? "Booking in progress..." : "Book Now"}
          </button>
          
          <button 
            onClick={() => setPrice(null)}
            className="w-full text-center text-sm text-gray-500 mt-3 hover:underline"
          >
            Change Date or Travelers
          </button>
        </div>
      )}
    </div>
  );
}
