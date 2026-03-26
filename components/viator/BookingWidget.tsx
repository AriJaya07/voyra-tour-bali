"use client";

import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";

interface Traveler {
  ageBand: 'ADULT' | 'CHILD' | 'INFANT' | 'YOUTH' | 'SENIOR' | string;
  count: number;
  label: string;
  min: number;
  max: number;
}

export default function BookingWidget({ productCode, title, basePrice, currency, ageBands }: { productCode: string, title: string, basePrice: number, currency: string, ageBands?: any[] }) {
  const { data: session } = useSession();
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
    if (!session) {
      const currentUrl = typeof window !== "undefined" ? window.location.pathname : "/";
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }
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

  // WhatsApp booking inquiry
  const buildWaUrl = () => {
    const selectedDate = date
      ? date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const travelerLines = travelers
      .filter(t => t.count > 0)
      .map(t => `  ${t.label}: ${t.count} pax`)
      .join('\n');
    const lines = [
      `Hello Voyra Bali!`,
      `I would like to book the following tour:`,
      ``,
      `Tour: ${title}`,
      `Date: ${selectedDate}`,
      `Travelers:`,
      travelerLines || '  Not specified',
      ...(price ? [`Total: ${price.toLocaleString()} ${currency}`] : []),
      ``,
      `Please confirm, thank you!`,
    ];
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
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
            className="w-full bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold py-3.5 rounded-xl transition transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isBooking ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                Book Now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 my-3">
            <div className="h-px bg-gray-300 flex-1" />
            <span className="text-[10px] text-gray-400 font-medium uppercase">Or</span>
            <div className="h-px bg-gray-300 flex-1" />
          </div>

          <a
            href={buildWaUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a852] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2.5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Ask via WhatsApp
          </a>

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
