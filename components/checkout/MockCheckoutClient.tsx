"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Container from "@/components/Container";
import WhatsAppIcon from "../assets/sosmed/WhatsAppIcon";

// ── Config ─────────────────────────────────────────────────────────────────

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";
const STEPS = ["Contact", "Travelers", "Logistics", "Notes", "Confirm"];

// ── Types ───────────────────────────────────────────────────────────────────

interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
  phone: string;
}

interface TravelerInfo {
  ageBand: string;
  firstName: string;
  lastName: string;
}

interface PaxMixItem {
  ageBand: string;
  numberOfTravelers: number;
  label: string;
}

const DEFAULT_PAX: PaxMixItem[] = [
  { ageBand: "ADULT", label: "Adult (18+)", numberOfTravelers: 1 },
  { ageBand: "CHILD", label: "Child (4-17)", numberOfTravelers: 0 },
];

// ── Pure helpers (outside component = no re-creation on render) ─────────────

const inputCls = (hasError: boolean) =>
  `w-full border ${hasError ? "border-red-400" : "border-gray-200"} rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition`;

function buildWaUrl(
  productTitle: string,
  productCode: string,
  travelDate: Date,
  paxMix: PaxMixItem[],
  contact: ContactInfo,
  specialRequest: string,
  wantsPickup: boolean,
  pickupLocation: string
): string {
  const dateStr = travelDate.toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const travelerLines = paxMix
    .filter((p) => p.numberOfTravelers > 0)
    .map((p) => `  ${p.label}: ${p.numberOfTravelers} pax`)
    .join("\n");
  const lines = [
    "Hello Voyra Bali!",
    "I would like to confirm my booking:",
    "",
    `Tour: ${productTitle}`,
    `Product Code: ${productCode}`,
    `Date: ${dateStr}`,
    `Travelers:\n${travelerLines}`,
    `Lead Traveler: ${contact.firstName} ${contact.lastName}`,
    `Phone: ${contact.phone}`,
    `Email: ${contact.email}`,
    ...(wantsPickup && pickupLocation ? [`Pickup Location: ${pickupLocation}`] : []),
    ...(specialRequest ? [`Notes: ${specialRequest}`] : []),
    "",
    "Please confirm my booking, thank you!",
  ];
  const clean = WA_NUMBER.replace(/\D/g, "");
  const num = clean.startsWith("0") ? `62${clean.slice(1)}` : clean;
  return `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(lines.join("\n"))}`;
}

const SectionHeader = memo(function SectionHeader({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <h2 className="text-base sm:text-lg font-bold text-gray-900">{title}</h2>
    </div>
  );
});

// ── Step Indicator ─────────────────────────────────────────────────────────

const StepIndicator = memo(function StepIndicator({
  current,
  steps,
}: {
  current: number;
  steps: string[];
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 mt-4 text-xs font-medium" role="list" aria-label="Progress">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-1 sm:gap-2" role="listitem">
          {i > 0 && <div className="h-px bg-gray-300 w-4 sm:w-10" aria-hidden />}
          <span className="flex items-center gap-1.5">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${i < current ? "bg-green-500 text-white" : i === current ? "bg-[#0071CE] text-white" : "bg-gray-200 text-gray-500"
                }`}
              aria-current={i === current ? "step" : undefined}
            >
              {i < current ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={`hidden sm:inline ${i === current ? "text-[#0071CE] font-semibold" : "text-gray-400"}`}>
              {label}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
});

// ── Step 0: Contact ────────────────────────────────────────────────────────

function StepContact({
  onNext,
  contact,
  setContact,
}: {
  onNext: () => void;
  contact: ContactInfo;
  setContact: (c: ContactInfo) => void;
}) {
  const [form, setForm] = useState(contact);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof ContactInfo, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (form.email !== form.confirmEmail) e.confirmEmail = "Emails don't match";
    if (!form.phone.trim()) e.phone = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setContact(form);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <SectionHeader
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          title="Contact Information"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["firstName", "lastName"] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {field === "firstName" ? "First Name" : "Last Name"} *
              </label>
              <input
                type="text"
                placeholder={field === "firstName" ? "First name" : "Last name"}
                className={inputCls(!!errors[field])}
                value={form[field]}
                onChange={(e) => updateField(field, e.target.value)}
                autoComplete={field === "firstName" ? "given-name" : "family-name"}
              />
              {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
            <input
              type="email"
              placeholder="you@example.com"
              className={inputCls(!!errors.email)}
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              autoComplete="email"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Email *</label>
            <input
              type="email"
              placeholder="Confirm email"
              className={inputCls(!!errors.confirmEmail)}
              value={form.confirmEmail}
              onChange={(e) => updateField("confirmEmail", e.target.value)}
              autoComplete="email"
            />
            {errors.confirmEmail && <p className="text-xs text-red-500 mt-1">{errors.confirmEmail}</p>}
            {!errors.confirmEmail && form.confirmEmail && form.email === form.confirmEmail && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Emails match
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone *</label>
            <input
              type="tel"
              placeholder="+62 812 3456 7890"
              className={inputCls(!!errors.phone)}
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              autoComplete="tel"
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>
        </div>
      </div>
      <button type="submit" className="w-full bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]">
        Continue to Travelers
      </button>
    </form>
  );
}

// ── Step 1: Travelers & Date ───────────────────────────────────────────────

function StepTravelers({
  onNext,
  onBack,
  paxMix,
  setPaxMix,
  travelers,
  setTravelers,
  travelDate,
  setTravelDate,
  contact,
}: {
  onNext: () => void;
  onBack: () => void;
  paxMix: PaxMixItem[];
  setPaxMix: (p: PaxMixItem[]) => void;
  travelers: TravelerInfo[];
  setTravelers: (t: TravelerInfo[]) => void;
  travelDate: Date;
  setTravelDate: (d: Date) => void;
  contact: ContactInfo;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const totalPax = paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);

  const updatePax = (idx: number, delta: number) => {
    const updated = [...paxMix];
    const min = idx === 0 ? 1 : 0;
    updated[idx] = { ...updated[idx], numberOfTravelers: Math.max(min, Math.min(20, updated[idx].numberOfTravelers + delta)) };
    setPaxMix(updated);
  };

  const buildTravelers = useCallback((): TravelerInfo[] => {
    const list: TravelerInfo[] = [];
    for (const pax of paxMix) {
      for (let i = 0; i < pax.numberOfTravelers; i++) {
        list.push(travelers[list.length] || {
          ageBand: pax.ageBand,
          firstName: list.length === 0 ? contact.firstName : "",
          lastName: list.length === 0 ? contact.lastName : "",
        });
      }
    }
    return list;
  }, [paxMix, travelers, contact]);

  const [localTravelers, setLocalTravelers] = useState<TravelerInfo[]>(buildTravelers);

  useEffect(() => {
    setLocalTravelers(buildTravelers());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paxMix]);

  const updateTraveler = (idx: number, field: keyof TravelerInfo, value: string) => {
    const updated = [...localTravelers];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocalTravelers(updated);
    setErrors((prev) => { const n = { ...prev }; delete n[`${idx}-${field}`]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (totalPax === 0) e.pax = "At least 1 traveler required";
    localTravelers.forEach((t, i) => {
      if (!t.firstName.trim()) e[`${i}-firstName`] = "Required";
      if (!t.lastName.trim()) e[`${i}-lastName`] = "Required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setTravelers(localTravelers);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Date Picker */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <SectionHeader
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          title="Travel Date"
        />
        <style>{`
          .mock-cal { width: 100%; border: none !important; font-family: inherit; font-size: 13px; }
          .mock-cal .react-calendar__tile--active { background: #0071CE !important; color: white !important; border-radius: 8px; }
          .mock-cal .react-calendar__tile--now { background: #e0f0ff !important; border-radius: 8px; }
          .mock-cal .react-calendar__tile:hover:not(:disabled) { background: #b3d9ff !important; border-radius: 8px; }
          .mock-cal .react-calendar__navigation button { font-weight: 700; font-size: 14px; }
          .mock-cal .react-calendar__tile { padding: 8px 4px; }
        `}</style>
        <div className="border border-[#E6E6E6] rounded-xl overflow-hidden p-2">
          <Calendar
            onChange={(val) => setTravelDate(val as Date)}
            value={travelDate}
            minDate={new Date()}
            className="mock-cal"
          />
        </div>
        <p className="text-sm font-semibold text-[#0071CE] mt-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {travelDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Pax Mix */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <SectionHeader
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          title="Number of Travelers"
        />
        <div className="space-y-4">
          {paxMix.map((pax, idx) => (
            <div key={pax.ageBand} className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-800">{pax.label}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updatePax(idx, -1)}
                  disabled={pax.numberOfTravelers <= (idx === 0 ? 1 : 0)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 disabled:text-gray-300 disabled:cursor-not-allowed text-lg"
                  aria-label={`Remove ${pax.ageBand}`}
                >−</button>
                <span className="w-6 text-center text-gray-900 font-bold">{pax.numberOfTravelers}</span>
                <button
                  type="button"
                  onClick={() => updatePax(idx, 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 text-lg"
                  aria-label={`Add ${pax.ageBand}`}
                >+</button>
              </div>
            </div>
          ))}
        </div>
        {errors.pax && <p className="text-xs text-red-500 mt-2">{errors.pax}</p>}
      </div>

      {/* Traveler Names */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <SectionHeader
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          title="Traveler Details"
        />
        <div className="space-y-6">
          {localTravelers.map((t, idx) => (
            <div key={idx} className={idx > 0 ? "pt-5 border-t border-gray-100" : ""}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-gray-800">Traveler {idx + 1}</span>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.ageBand}</span>
                {idx === 0 && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Lead</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="First name"
                    className={inputCls(!!errors[`${idx}-firstName`])}
                    value={t.firstName}
                    onChange={(e) => updateTraveler(idx, "firstName", e.target.value)}
                  />
                  {errors[`${idx}-firstName`] && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Last name"
                    className={inputCls(!!errors[`${idx}-lastName`])}
                    value={t.lastName}
                    onChange={(e) => updateTraveler(idx, "lastName", e.target.value)}
                  />
                  {errors[`${idx}-lastName`] && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">Back</button>
        <button type="submit" className="flex-[2] bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]">Continue</button>
      </div>
    </form>
  );
}

// ── Step 2: Logistics ──────────────────────────────────────────────────────

function StepLogistics({
  onNext,
  onBack,
  wantsPickup,
  setWantsPickup,
  pickupLocation,
  setPickupLocation,
  productCode,
}: {
  onNext: () => void;
  onBack: () => void;
  wantsPickup: boolean;
  setWantsPickup: (v: boolean) => void;
  pickupLocation: string;
  setPickupLocation: (v: string) => void;
  productCode: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (!wantsPickup) {
      setPickupLocation("");
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [wantsPickup, setPickupLocation]);

  useEffect(() => {
    // Only search automatically if they want pickup
    if (!wantsPickup) return;

    // Debounce the search
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const urlParams = new URLSearchParams({
          query: query,
          productCode: productCode
        });
        const res = await fetch(`/api/viator/logistics/location/search?${urlParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.locations || []);
        }
      } catch (e) {
        toast.error("Failed to fetch locations");
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms delay

    return () => clearTimeout(timer);
  }, [query, wantsPickup]);

  const validate = () => {
    if (wantsPickup && !pickupLocation) {
      toast.error("Please select a pickup location");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    onNext();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <SectionHeader
          icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"
          title="Pickup point"
        />
        <p className="text-gray-600 text-sm mb-5 leading-relaxed">
          Tell us where you’d like to be picked up from. If you're not sure, you can decide later.
        </p>
        
        <div className="space-y-3 mb-2">
          <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${wantsPickup ? 'border-[#0071CE] bg-blue-50/30' : 'border-gray-200 hover:border-[#0071CE]/30'}`}>
            <input 
              type="radio"
              name="pickupChoice"
              checked={wantsPickup === true}
              onChange={() => setWantsPickup(true)}
              className="w-5 h-5 border-gray-300 text-[#0071CE] focus:ring-[#0071CE]"
            />
            <span className="text-sm font-bold text-gray-900">I'd like to be picked up</span>
          </label>

          <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${!wantsPickup ? 'border-[#0071CE] bg-blue-50/30' : 'border-gray-200 hover:border-[#0071CE]/30'}`}>
            <input 
              type="radio"
              name="pickupChoice"
              checked={wantsPickup === false}
              onChange={() => setWantsPickup(false)}
              className="w-5 h-5 border-gray-300 text-[#0071CE] focus:ring-[#0071CE]"
            />
            <span className="text-sm font-bold text-gray-900">I'll decide later</span>
          </label>
        </div>

        {wantsPickup && (
          <div className="space-y-4 pt-4 mt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Search Location / Hotel *</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  // We delay setting focused to false so clicks on the dropdown list can register first
                  onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                  placeholder="e.g. Seminyak, St. Regis..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition"
                />
                {loading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-[2px] border-gray-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {searched && !loading && results.length === 0 && (
              <p className="text-sm text-gray-500 italic px-2">No locations found.</p>
            )}

            {isInputFocused && results.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-sm">
                {results.map((loc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setPickupLocation(loc);
                      setQuery(loc); // Auto-fill the input with the selected location name
                    }}
                    className={`block w-full text-left px-4 py-3 text-sm transition ${pickupLocation === loc ? 'bg-blue-50 text-[#0071CE] font-bold' : 'hover:bg-gray-50 text-gray-700 border-b border-gray-100 last:border-0'}`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
            
            {pickupLocation && !isInputFocused && (
              <div className="p-3 bg-green-50 text-green-800 rounded-xl text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Selected: {pickupLocation}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">Back</button>
        <button type="button" onClick={handleNext} className="flex-[2] bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]">Continue</button>
      </div>
    </div>
  );
}

// ── Step 3: Notes ──────────────────────────────────────────────────────────

function StepDetails({
  onNext,
  onBack,
  specialRequest,
  setSpecialRequest,
}: {
  onNext: () => void;
  onBack: () => void;
  specialRequest: string;
  setSpecialRequest: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <SectionHeader
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          title="Additional Notes"
        />
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
          Special Requests <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          placeholder="e.g. dietary requirements, preferred pickup time, accessibility needs..."
          rows={4}
          value={specialRequest}
          onChange={(e) => setSpecialRequest(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition resize-none"
        />
        <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-bold text-blue-800 mb-0.5">How this works</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              After confirming, your booking details are saved and WhatsApp opens automatically to connect you with our team.
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">Back</button>
        <button type="button" onClick={onNext} className="flex-[2] bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]">Review Booking</button>
      </div>
    </div>
  );
}

// ── Step 4: Confirm ────────────────────────────────────────────────────────

function StepConfirm({
  onBack,
  productCode,
  productTitle,
  productImage,
  overridePrice,
  overrideCurrency,
  contact,
  travelers,
  paxMix,
  travelDate,
  specialRequest,
  wantsPickup,
  pickupLocation,
  promoCode,
}: {
  onBack: () => void;
  productCode: string;
  productTitle: string;
  productImage?: string | null;
  overridePrice?: number | null;
  overrideCurrency?: string;
  contact: ContactInfo;
  travelers: TravelerInfo[];
  paxMix: PaxMixItem[];
  travelDate: Date;
  specialRequest: string;
  wantsPickup: boolean;
  pickupLocation: string;
  promoCode?: string | null;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSaved, setBookingSaved] = useState(false);
  const [waUrl, setWaUrl] = useState("");

  const totalPax = paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);
  const dateStr = travelDate.toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  /**
   * Flow:
   * 1. Show loading spinner while /api/bookings/mock is in progress.
   * 2. On success → try to open WhatsApp automatically.
   * 3. If a popup blocker prevents it, the fallback UI displays a big green WhatsApp button.
   */
  const handleConfirm = async () => {
    if (!termsAccepted) { toast.warning("Please accept the terms to continue."); return; }
    if (!session?.user?.id) { toast.error("Please login to continue."); return; }

    setIsSubmitting(true);
    try {
      const offset = travelDate.getTimezoneOffset();
      const isoDate = new Date(travelDate.getTime() - offset * 60 * 1000).toISOString().split("T")[0];

      const res = await fetch("/api/bookings/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode,
          productTitle,
          productImage,
          travelDate: isoDate,
          paxMix: paxMix.filter((p) => p.numberOfTravelers > 0).map((p) => ({
            ageBand: p.ageBand,
            numberOfTravelers: p.numberOfTravelers,
          })),
          travelers,
          leadTraveler: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
          },
          totalPrice: overridePrice || 0,
          currency: overrideCurrency || "IDR",
          bookingQuestionAnswers: [
            ...(specialRequest ? [{ questionId: "specialRequest", answer: specialRequest }] : []),
            ...(wantsPickup && pickupLocation ? [{ questionId: "pickupLocation", answer: pickupLocation }] : [])
          ],
          promoCode: promoCode || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save booking");
      }

      // ── Booking saved ── attempt to open WhatsApp ──────────
      const url = buildWaUrl(productTitle, productCode, travelDate, paxMix, contact, specialRequest, wantsPickup, pickupLocation);
      setWaUrl(url);

      // Attempt to open immediately; if blocked, the fallback UI handles it gracefully
      window.open(url, "_blank", "noopener,noreferrer");

      setBookingSaved(true);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────
  if (isSubmitting) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-[#F0F0F0] shadow-sm flex flex-col items-center gap-5 text-center">
        <div className="w-14 h-14 border-[3px] border-[#0071CE] border-t-transparent rounded-full animate-spin" />
        <div>
          <p className="text-base font-bold text-gray-900">Saving your booking…</p>
          <p className="text-sm text-gray-500 mt-1">Please wait, WhatsApp will open automatically once done.</p>
        </div>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (bookingSaved) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">Booking saved — WhatsApp opened!</p>
            <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
              Our team will confirm your reservation shortly. If WhatsApp didn&apos;t open, tap the button below.
            </p>
          </div>
        </div>

        {/* Fallback button in case popup was blocked */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-14 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold rounded-xl transition-all shadow-md shadow-green-200 flex items-center justify-center gap-2.5 text-base"
        >
          <WhatsAppIcon className="w-6 h-6" />
          Open WhatsApp
        </a>

        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="w-full py-3 border border-gray-200 text-gray-500 font-medium rounded-xl hover:bg-gray-50 transition text-sm"
        >
          View My Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Booking summary */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <SectionHeader
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          title="Review Your Booking"
        />
        <div className="space-y-4 text-sm">
          <Row label="Experience" value={productTitle} bold />
          <Row label="Travel Date" value={dateStr} bold />
          {wantsPickup && pickupLocation && <Row label="Pickup" value={pickupLocation} />}
          <Row label="Contact" value={`${contact.firstName} ${contact.lastName} · ${contact.phone}`} />
          <div className="py-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Travelers ({totalPax})
            </p>
            <div className="space-y-1.5">
              {travelers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-700">
                  <span className="font-medium">{t.firstName} {t.lastName}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.ageBand}</span>
                </div>
              ))}
            </div>
          </div>
          {specialRequest && <Row label="Notes" value={specialRequest} />}
        </div>
      </div>

      {/* Reserve now banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
        <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-700 font-medium">
          Reserve now — price will be confirmed by our team via WhatsApp.
        </p>
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-[#F0F0F0] shadow-sm cursor-pointer hover:border-[#0071CE]/30 transition">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[#0071CE] focus:ring-[#0071CE] shrink-0"
        />
        <span className="text-sm text-gray-600 leading-relaxed">
          I agree to be contacted by Voyra Bali to finalize this booking and understand that payment will be arranged via WhatsApp.
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!termsAccepted}
          className="flex-[2] bg-[#25D366] hover:bg-[#1ebe5d] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-green-200 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <WhatsAppIcon className="w-5 h-5" />
          Confirm &amp; Contact via WhatsApp
        </button>
      </div>
    </div>
  );
}

// ── Inline row helper (local to this file) ─────────────────────────────────

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="py-3 border-t border-gray-100 first:border-0 first:pt-0">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-gray-900 ${bold ? "font-bold" : ""}`}>{value}</p>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────

const MockBookingSidebar = memo(function MockBookingSidebar({
  productTitle,
  productImage,
  travelDate,
  paxMix,
}: {
  productTitle: string;
  productImage?: string | null;
  travelDate: Date;
  paxMix: PaxMixItem[];
}) {
  const totalPax = paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);

  return (
    <div className="lg:sticky lg:top-28 space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-hidden">
        <div className="bg-[#0071CE] px-5 py-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Booking Summary
          </h2>
        </div>
        <div className="p-5">
          {productImage && (
            <div className="mb-4 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImage} alt={productTitle} className="w-full h-32 object-cover" loading="lazy" />
            </div>
          )}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
          <p className="text-sm font-bold text-gray-900 leading-snug mb-4 pb-4 border-b border-gray-100">{productTitle}</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date
              </span>
              <span className="font-bold text-gray-900">
                {travelDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            {totalPax > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Travelers
                </span>
                <span className="font-bold text-gray-900">{totalPax} pax</span>
              </div>
            )}
          </div>

          <div className="mt-4 bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs font-bold text-green-700">Reserve Now, Pay Later</p>
            <p className="text-[11px] text-green-600 mt-0.5">Price confirmed by our team</p>
          </div>
        </div>
      </div>

      {/* Trust signals */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Secure", color: "green" },
            { d: "M13 10V3L4 14h7v7l9-11h-7z", label: "Fast", color: "blue" },
            { d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", label: "WhatsApp", color: "green" },
          ].map(({ d, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full bg-${color}-50 flex items-center justify-center`}>
                <svg className={`w-4 h-4 text-${color}-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
                </svg>
              </div>
              <span className="text-[10px] font-medium text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ── Main Component ─────────────────────────────────────────────────────────

export default function MockCheckoutClient({
  initialProductCode,
  overrideTitle,
  overridePrice,
  overrideCurrency,
  promoCode,
}: {
  initialProductCode: string;
  overrideTitle?: string | null;
  overridePrice?: number | null;
  overrideCurrency?: string | null;
  promoCode?: string | null;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [contact, setContact] = useState<ContactInfo>({
    firstName: "", lastName: "", email: "", confirmEmail: "", phone: "",
  });
  const [paxMix, setPaxMix] = useState<PaxMixItem[]>(DEFAULT_PAX);
  const [travelers, setTravelers] = useState<TravelerInfo[]>([]);
  // Default to today — lazy initializer avoids re-creating Date on each render
  const [travelDate, setTravelDate] = useState<Date>(() => new Date());
  const [wantsPickup, setWantsPickup] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");

  const productTitle = overrideTitle || initialProductCode;

  // Auto-fill contact from session/profile
  useEffect(() => {
    if (!session?.user || contact.firstName || contact.email) return;
    let cancelled = false;

    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((profile) => {
        if (cancelled) return;
        setContact({
          firstName: profile.name?.split(" ")[0] || "",
          lastName: profile.name?.split(" ").slice(1).join(" ") || "",
          email: profile.email || "",
          confirmEmail: profile.email || "",
          phone: profile.phone || "",
        });
      })
      .catch(() => {
        if (cancelled) return;
        const name = session.user.name || "";
        setContact((prev) => ({
          ...prev,
          firstName: name.split(" ")[0] || "",
          lastName: name.split(" ").slice(1).join(" ") || "",
          email: session.user.email || "",
          confirmEmail: session.user.email || "",
        }));
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Not logged in
  if (!session?.user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#0071CE]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
          <p className="text-sm text-gray-500 mb-6">Please login to complete your booking.</p>
          <button
            onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)}
            className="bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold px-8 py-3 rounded-xl transition shadow-md"
          >
            Login to Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pt-4 pb-12 sm:pb-16">
      <Container>
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
              <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reserve Your Spot</h1>
              <p className="text-sm text-gray-500 hidden sm:block">Complete your details — our team will confirm via WhatsApp</p>
            </div>
          </div>
          <StepIndicator current={step} steps={STEPS} />
        </div>

        <div className="max-w-5xl mx-auto flex flex-col lg:grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Left: form steps */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            {step === 0 && (
              <StepContact
                onNext={() => setStep(1)}
                contact={contact}
                setContact={setContact}
              />
            )}
            {step === 1 && (
              <StepTravelers
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
                paxMix={paxMix}
                setPaxMix={setPaxMix}
                travelers={travelers}
                setTravelers={setTravelers}
                travelDate={travelDate}
                setTravelDate={setTravelDate}
                contact={contact}
              />
            )}
            {step === 2 && (
              <StepLogistics
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
                wantsPickup={wantsPickup}
                setWantsPickup={setWantsPickup}
                pickupLocation={pickupLocation}
                setPickupLocation={setPickupLocation}
                productCode={initialProductCode}
              />
            )}
            {step === 3 && (
              <StepDetails
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
                specialRequest={specialRequest}
                setSpecialRequest={setSpecialRequest}
              />
            )}
            {step === 4 && (
              <StepConfirm
                onBack={() => setStep(3)}
                productCode={initialProductCode}
                productTitle={productTitle}
                overridePrice={overridePrice}
                overrideCurrency={overrideCurrency || "IDR"}
                contact={contact}
                travelers={travelers}
                paxMix={paxMix}
                travelDate={travelDate}
                specialRequest={specialRequest}
                wantsPickup={wantsPickup}
                pickupLocation={pickupLocation}
                promoCode={promoCode}
              />
            )}
          </div>

          {/* Right: sticky sidebar */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <MockBookingSidebar
              productTitle={productTitle}
              travelDate={travelDate}
              paxMix={paxMix}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
