"use client";

import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ViatorProductOption, ViatorLogistics, ViatorLanguageGuide } from "@/utils/hooks/useViator";
import { useViatorSchedules } from "@/utils/hooks/useViator";
import { useBookingStore, type AvailabilitySlot } from "@/utils/hooks/useBookingStore";
import { formatPrice, type CurrencyCode } from "@/utils/formatPrice";

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";

import WhatsAppIcon from "../assets/sosmed/WhatsAppIcon";
import VoryaIcon from "../assets/Icon/VoyraIcon";
import { SpinnerIcon, CloseIcon } from "../assets/Icon/shared";

// ── Types ──────────────────────────────────────────────────────────────

interface Traveler {
  ageBand: string;
  count: number;
  label: string;
  min: number;
  max: number;
}

interface BookingViatorWidgetProps {
  productCode: string;
  title: string;
  basePrice: number;
  currency: string;
  sourceCurrency: string;
  productImage?: string;
  cancellationPolicy?: string;
  ageBands?: Array<{
    ageBand: string;
    startAge: number;
    endAge: number;
    minTravelersPerBooking?: number;
    maxTravelersPerBooking?: number;
  }>;
  productOptions?: ViatorProductOption[];
  logistics?: ViatorLogistics;
  languageGuides?: ViatorLanguageGuide[];
  isMockMode?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export default function BookingViatorWidget({
  productCode,
  title,
  basePrice,
  currency,
  sourceCurrency,
  productImage,
  cancellationPolicy,
  logistics,
  languageGuides,
  ageBands,
  productOptions,
  isMockMode = false,
}: BookingViatorWidgetProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const setProductSelection = useBookingStore((s) => s.setProductSelection);

  // ── Pre-load availability schedule (gray out unavailable dates) ─────
  const { data: scheduleData } = useViatorSchedules(productCode, currency);
  const unavailableDateSet = new Set(scheduleData?.unavailableDates ?? []);

  const isDateUnavailable = ({ date }: { date: Date }) => {
    if (!scheduleData) return false;
    const iso = date.toISOString().split("T")[0];
    return unavailableDateSet.has(iso);
  };

  // ── Tour options ────────────────────────────────────────────────────
  const hasOptions = productOptions && productOptions.length > 0;
  const [selectedOptionCode, setSelectedOptionCode] = useState<string>(
    hasOptions ? productOptions![0].productOptionCode : ""
  );
  const [detailOption, setDetailOption] = useState<ViatorProductOption | null>(null);

  // ── Date & travelers ────────────────────────────────────────────────
  const [date, setDate] = useState<Date | null>(new Date());

  const initTravelers: Traveler[] =
    ageBands && ageBands.length > 0
      ? ageBands.map((ab) => ({
        ageBand: ab.ageBand,
        label: `${ab.ageBand.charAt(0) + ab.ageBand.slice(1).toLowerCase()} (${ab.startAge}-${ab.endAge} yrs)`,
        count: ab.ageBand === "ADULT" ? Math.max(1, ab.minTravelersPerBooking || 1) : 0,
        min: ab.minTravelersPerBooking || 0,
        max: ab.maxTravelersPerBooking || 15,
      }))
      : [
        { ageBand: "ADULT", label: "Adult (18+)", count: 1, min: 1, max: 15 },
        { ageBand: "CHILD", label: "Child (4-17)", count: 0, min: 0, max: 15 },
      ];

  const [travelers, setTravelers] = useState<Traveler[]>(initTravelers);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(-1);
  const [isChecking, setIsChecking] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [isMockBooking, setIsMockBooking] = useState(false);

  const totalTravelers = travelers.reduce((acc, t) => acc + t.count, 0);
  const selectedSlot = selectedSlotIdx >= 0 ? slots[selectedSlotIdx] : null;
  const displayPrice = selectedSlot?.totalPrice || null;
  const stepOffset = hasOptions ? 1 : 0;

  // ── Traveler update ─────────────────────────────────────────────────
  const updateTraveler = (index: number, delta: number) => {
    const updated = [...travelers];
    const target = updated[index];
    const newCount = target.count + delta;
    if (newCount >= target.min && newCount <= target.max) {
      target.count = newCount;
      setTravelers(updated);
      setSlots([]);
      setSelectedSlotIdx(-1);
      setAvailabilityChecked(false);
    }
  };

  const handleOptionChange = (code: string) => {
    setSelectedOptionCode(code);
    setSlots([]);
    setSelectedSlotIdx(-1);
    setAvailabilityChecked(false);
  };

  const resetAvailability = () => {
    setSlots([]);
    setSelectedSlotIdx(-1);
    setAvailabilityChecked(false);
  };

  // ── Check availability via Viator API ───────────────────────────────
  const handleCheckAvailability = async () => {
    if (!session) {
      const currentUrl = typeof window !== "undefined" ? window.location.pathname : "/";
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }
    if (!date || totalTravelers === 0) return;
    setIsChecking(true);

    const offset = date.getTimezoneOffset();
    const travelDateStr = new Date(date.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
    const paxMix = travelers
      .filter((t) => t.count > 0)
      .map((t) => ({ ageBand: t.ageBand, numberOfTravelers: t.count }));

    try {
      const res = await fetch("/api/viator/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode,
          ...(selectedOptionCode && { productOptionCode: selectedOptionCode }),
          travelDate: travelDateStr,
          paxMix,
          currency,
        }),
      });
      const data = await res.json();

      if (res.ok && data.available !== false) {
        const parsedSlots: AvailabilitySlot[] = data.slots ||
          (data.bookableItems || []).map((item: Record<string, unknown>) => ({
            productOptionCode: (item.productOptionCode as string) || selectedOptionCode,
            startTime: (item.startTime as string) || null,
            tourGradeCode: (item.tourGrade as Record<string, string>)?.gradeCode || null,
            available: true,
            totalPrice: (item.totalPrice as Record<string, Record<string, number>>)?.price?.recommendedRetailPrice || basePrice * totalTravelers,
            partnerNetPrice: (item.totalPrice as Record<string, Record<string, number>>)?.price?.partnerNetPrice || 0,
            currencyCode: (item.totalPrice as Record<string, Record<string, string>>)?.price?.currencyCode || currency,
          }));

        const availableSlots = parsedSlots.filter((s) => s.available);
        if (availableSlots.length === 0) {
          toast.warning("Not available for the selected date/travelers.");
          return;
        }

        setSlots(availableSlots);
        setSelectedSlotIdx(0);
        setAvailabilityChecked(true);
      } else {
        toast.warning("Not available for the selected date/travelers.");
        setSlots([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to check availability. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  // ── Book → store in Zustand → navigate to /checkout ─────────────────
  const handleBooking = async () => {
    if (!date || !selectedSlot) return;
    setIsBooking(true);

    const offset = date.getTimezoneOffset();
    const travelDateStr = new Date(date.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
    const paxMix = travelers
      .filter((t) => t.count > 0)
      .map((t) => ({ ageBand: t.ageBand, numberOfTravelers: t.count }));

    const rawLocations = logistics?.travelerPickup?.locations || logistics?.start || [];
    const pickupType = logistics?.travelerPickup?.pickupOptionType || "";
    const allowCustomPickup = logistics?.travelerPickup?.allowCustomTravelerPickup || false;

    let pickupLocations = rawLocations.map((loc) => ({
      ref: loc.location?.ref || "",
      name: loc.description || "",
      description: loc.description,
    }));

    const refsToResolve = rawLocations
      .map((loc) => loc.location?.ref)
      .filter((ref): ref is string => !!ref && !ref.startsWith("MEET_") && !ref.startsWith("CONTACT_"));

    if (refsToResolve.length > 0) {
      try {
        const res = await fetch("/api/viator/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refs: refsToResolve }),
        });
        const data = await res.json();
        const resolvedMap = new Map<string, { name: string; address: string }>();
        for (const loc of data.locations || []) {
          if (loc.name || loc.address) {
            resolvedMap.set(loc.ref, { name: loc.name, address: loc.address });
          }
        }
        pickupLocations = rawLocations.map((loc) => {
          const ref = loc.location?.ref || "";
          const resolved = resolvedMap.get(ref);
          const name = resolved
            ? [resolved.name, resolved.address].filter(Boolean).join(" — ")
            : loc.description || ref;
          return { ref, name, description: loc.description };
        });
      } catch {
        // Fallback
      }
    }

    const langGuides = (languageGuides || []).map((g) => ({
      type: g.type,
      language: g.language,
    }));
    const defaultLang = langGuides.find((g) => g.language.toLowerCase() === "english" || g.language.toLowerCase() === "en") || langGuides[0];
    const defaultLangValue = defaultLang
      ? `${defaultLang.language.charAt(0).toUpperCase() + defaultLang.language.slice(1)} (${defaultLang.type === "GUIDE" ? "Live Guide" : defaultLang.type === "AUDIO" ? "Audio Guide" : defaultLang.type === "WRITTEN" ? "Written Guide" : defaultLang.type})`
      : "";

    setProductSelection({
      source: "VIATOR",
      viatorUrl: "",
      productCode,
      productTitle: title,
      productImage: productImage || "",
      productOptionCode: selectedSlot.productOptionCode || selectedOptionCode,
      travelDate: travelDateStr,
      startTime: selectedSlot.startTime || "",
      tourGradeCode: selectedSlot.tourGradeCode || "",
      paxMix,
      totalPrice: selectedSlot.totalPrice,
      currency: selectedSlot.currencyCode || currency,
      cancellationPolicy: cancellationPolicy || "",
      availablePickupLocations: pickupLocations,
      availableLanguageGuides: langGuides,
      languageGuide: defaultLangValue,
      pickupType,
      allowCustomPickup,
      currentStep: 0,
    });

    setIsBooking(false);
    router.push("/checkout");
  };

  // ── WhatsApp fallback ───────────────────────────────────────────────
  const buildWaUrl = () => {
    const selectedDate = date
      ? date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : "—";
    const selectedOption = productOptions?.find((o) => o.productOptionCode === selectedOptionCode);
    const travelerLines = travelers
      .filter((t) => t.count > 0)
      .map((t) => `  ${t.label}: ${t.count} pax`)
      .join("\n");
    const lines = [
      "Hello Voyra Bali!",
      "I would like to book the following tour:",
      "",
      `Tour: ${title}`,
      `Product Code: ${productCode}`,
      ...(selectedOption ? [`Option: ${selectedOption.title}`] : []),
      `Date: ${selectedDate}`,
      isMockMode ? "Travelers: [X people]" : "Travelers:",
      ...(isMockMode ? [] : [travelerLines || "  Not specified"]),
      ...(isMockMode ? [] : (displayPrice ? [`Total: ${displayPrice.toLocaleString()} ${currency}`] : [`Total: starting from ${formatPrice(basePrice, currency as CurrencyCode, sourceCurrency as CurrencyCode)}`])),
      "",
      ...(session?.user?.name ? [`Name: ${session.user.name}`] : []),
      ...(session?.user?.email ? [`Email: ${session.user.email}`] : []),
      "",
      "Please confirm, thank you!",
    ];
    const cleanNumber = WA_NUMBER.replace(/\D/g, "");
    const finalNumber = cleanNumber.startsWith("0") ? `62${cleanNumber.slice(1)}` : cleanNumber;

    return `https://api.whatsapp.com/send?phone=${finalNumber}&text=${encodeURIComponent(lines.join("\n"))}`;
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className={`border border-[#E6E6E6] rounded-2xl p-5 sm:p-6 my-10 lg:my-0 shadow-sm bg-white w-full relative overflow-hidden transition-all duration-300`}>
      <h2 className="text-xl font-bold mb-4 text-black">Book this Tour</h2>

      {!session ? (
        /* Clean Flow Login Prompt */
        <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 h-[350px]">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <VoryaIcon className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">Login Required</h3>
          <p className="text-sm text-gray-500 mb-8 text-center italic max-w-[240px] mx-auto leading-relaxed">
            Please login to check availability, see prices, and book your tour.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full max-w-[260px] py-4 bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold rounded-xl transition shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
          >
            Login to Continue
          </button>
        </div>
      ) : (
        /* Full Authenticated Interaction Flow */
        <div className="space-y-6">
          {hasOptions && (
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-gray-700">1. Select Option</label>
              <div className="space-y-2">
                {productOptions!.map((opt) => {
                  const isSelected = selectedOptionCode === opt.productOptionCode;
                  return (
                    <button
                      key={opt.productOptionCode}
                      onClick={() => handleOptionChange(opt.productOptionCode)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition ${isSelected ? "border-[#0071CE] bg-blue-50/50" : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-[#0071CE]" : "border-gray-300"}`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#0071CE]" />}
                        </div>
                        <p className={`text-sm font-bold flex-1 min-w-0 truncate ${isSelected ? "text-[#0071CE]" : "text-gray-900"}`}>
                          {opt.title}
                        </p>
                        {opt.description && (
                          <span
                            onClick={(e) => { e.stopPropagation(); setDetailOption(opt); }}
                            className="text-[11px] font-semibold text-[#0071CE] hover:underline shrink-0"
                          >
                            Details
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700">{stepOffset + 1}. Select Date</label>
            <style>{`
              .viator-booking-cal { width: 100%; border: none !important; font-family: inherit; font-size: 13px; }
              .viator-booking-cal .react-calendar__tile--active { background: #0071CE !important; color: white !important; border-radius: 8px; }
              .viator-booking-cal .react-calendar__tile--now { background: #e0f0ff !important; border-radius: 8px; }
              .viator-booking-cal .react-calendar__tile:hover { background: #b3d9ff !important; border-radius: 8px; }
              .viator-booking-cal .react-calendar__navigation button:hover { background: #f0f7ff !important; border-radius: 8px; }
              .viator-booking-cal .react-calendar__navigation button { font-weight: 700; color: #1a1a1a; font-size: 14px; }
              .viator-booking-cal .react-calendar__tile:disabled { background: #f5f5f5; color: #c0c0c0; }
              .viator-booking-cal .react-calendar__tile { padding: 8px 4px; }
            `}</style>
            <div className="border border-[#E6E6E6] rounded-xl overflow-hidden p-2">
              <Calendar
                onChange={(val) => { setDate(val as Date); resetAvailability(); }}
                value={date}
                minDate={new Date()}
                tileDisabled={isDateUnavailable}
                className="viator-booking-cal"
              />
            </div>
          </div>

          {!isMockMode && (
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-gray-700">{stepOffset + 2}. Travelers</label>
              <div className="border border-[#E6E6E6] rounded-xl p-4 space-y-3">
                {travelers.map((t, idx) => (
                  <div key={t.ageBand} className="flex justify-between items-center">
                    <span className="text-gray-800 font-medium">{t.label}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateTraveler(idx, -1)}
                        disabled={t.count <= t.min}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="w-4 text-center text-gray-900 font-bold">{t.count}</span>
                      <button
                        onClick={() => updateTraveler(idx, 1)}
                        disabled={t.count >= t.max}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isMockMode ? (
            <div className="mt-4 space-y-4">
              <div className="p-5 bg-[#F8F8F8] rounded-xl border border-gray-200">
                <div className="flex flex-col mb-4">
                  <span className="font-bold text-gray-700 text-sm">Start from</span>
                  <span className="font-black text-xl text-gray-900">
                    {formatPrice(basePrice, currency as CurrencyCode, sourceCurrency as CurrencyCode)}
                  </span>
                </div>
                <div className="text-sm font-semibold text-green-600 mb-4 bg-green-50 px-3 py-2 rounded-lg text-center">
                  Reserve now, pay later
                </div>
                {/* Optional promo code input */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Promo code (optional)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition"
                  />
                </div>
                {!date && <div className="mb-2 text-[11px] font-semibold text-red-500 text-center animate-pulse tracking-wide uppercase">Please select a date first</div>}
                <button
                  disabled={!date || isMockBooking}
                  onClick={async () => {
                    if (!date) return;
                    setIsMockBooking(true);
                    try {
                      const res = await fetch("/api/viator/mock-booking", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          productCode,
                          productTitle: title,
                          productImage: productImage || null,
                          price: basePrice,
                          currency,
                          promoCode: promoCode || null,
                          productOptionCode: selectedOptionCode || null,
                          productOptionTitle: productOptions?.find(o => o.productOptionCode === selectedOptionCode)?.title || null,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed");
                      router.push(`/v/${data.slug}`);
                    } catch {
                      toast.error("Failed to start booking. Please try again.");
                      setIsMockBooking(false);
                    }
                  }}
                  className={`w-full h-12 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2.5 ${date && !isMockBooking ? "bg-[#0071CE] hover:bg-[#005ba6]" : "bg-gray-300 cursor-not-allowed"}`}
                >
                  {isMockBooking ? (
                    <>
                      <SpinnerIcon className="w-4 h-4" />
                      Loading...
                    </>
                  ) : (
                    "Booking Now"
                  )}
                </button>
              </div>
            </div>
          ) : !availabilityChecked ? (
            <button
              onClick={handleCheckAvailability}
              disabled={!date || totalTravelers === 0 || isChecking}
              className="w-full bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold py-3.5 rounded-xl disabled:bg-gray-300 transition active:scale-[0.98]"
            >
              {isChecking ? "Checking Availability..." : "Check Availability"}
            </button>
          ) : (
            <div className="mt-4 space-y-4">
              {slots.length > 1 && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{stepOffset + 3}. Select Time</label>
                  <div className="grid grid-cols-2 gap-2">
                    {slots.map((slot, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSlotIdx(idx)}
                        className={`p-3 rounded-xl border-2 text-sm font-semibold transition ${selectedSlotIdx === idx ? "border-[#0071CE] bg-blue-50 text-[#0071CE]" : "border-gray-200 text-gray-700 hover:border-gray-300"}`}
                      >
                        {slot.startTime || "Flexible"}
                        <span className="block text-xs font-normal mt-0.5">{slot.totalPrice.toLocaleString()} {slot.currencyCode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedSlot && (
                <div className="p-5 bg-[#F8F8F8] rounded-xl border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-gray-700">Total Price:</span>
                    <span className="font-black text-xl text-gray-900">{selectedSlot.totalPrice.toLocaleString()} {selectedSlot.currencyCode}</span>
                  </div>
                  <button
                    onClick={handleBooking}
                    disabled={isBooking}
                    className="w-full bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-[#0071CE]/70 text-white font-bold py-3.5 rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isBooking ? "Preparing..." : "Book Now"}
                  </button>
                  <div className="flex items-center gap-2 my-3">
                    <div className="h-px bg-gray-300 flex-1" /><span className="text-[10px] text-gray-400 font-medium uppercase">Or</span><div className="h-px bg-gray-300 flex-1" />
                  </div>
                  <a
                    href={buildWaUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2.5"
                  >
                    <WhatsAppIcon className="w-5 h-5" />
                    Ask via WhatsApp
                  </a>
                  <button onClick={resetAvailability} className="w-full text-center text-sm text-gray-500 mt-3 hover:underline">Change Date or Travelers</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {detailOption && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4" onClick={() => setDetailOption(null)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">{detailOption.title}</h3>
              <button onClick={() => setDetailOption(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto space-y-4">
              {detailOption.description && (<div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: detailOption.description }} />)}
              {detailOption.languageGuides && detailOption.languageGuides.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {detailOption.languageGuides.map((g, i) => (
                    <span key={i} className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{g.language.toUpperCase()} {g.type === "GUIDE" ? "Guide" : g.type}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <button onClick={() => { handleOptionChange(detailOption.productOptionCode); setDetailOption(null); }} className="w-full py-3 bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold rounded-xl transition text-sm">Select This Option</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
