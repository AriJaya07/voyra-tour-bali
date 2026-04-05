"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Container from "@/components/Container";

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";

const STEPS = ["Contact", "Travelers", "Details", "Confirm"];

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const inputCls = (hasError: boolean) =>
  `w-full border ${
    hasError ? "border-red-400" : "border-gray-200"
  } rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition`;

// ── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 mt-4 text-xs font-medium">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1 sm:gap-2">
          {i > 0 && <div className="flex-1 h-px bg-gray-300 w-4 sm:w-10" />}
          <span className="flex items-center gap-1.5">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                i < current
                  ? "bg-green-500 text-white"
                  : i === current
                  ? "bg-[#0071CE] text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < current ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={`hidden sm:inline ${i === current ? "text-[#0071CE]" : "text-gray-400"}`}>
              {label}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Step 0: Contact Info ──────────────────────────────────────────────────

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

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = "Required";
    if (!form.lastName.trim()) errs.lastName = "Required";
    if (!form.email.trim()) errs.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    if (!form.confirmEmail.trim()) errs.confirmEmail = "Required";
    else if (form.email !== form.confirmEmail) errs.confirmEmail = "Emails don't match";
    if (!form.phone.trim()) errs.phone = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
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
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Contact Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">First Name *</label>
            <input type="text" placeholder="First name" className={inputCls(!!errors.firstName)} value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
            {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Last Name *</label>
            <input type="text" placeholder="Last name" className={inputCls(!!errors.lastName)} value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
            {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address *</label>
            <input type="email" placeholder="you@example.com" className={inputCls(!!errors.email)} value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Email *</label>
            <input type="email" placeholder="Confirm email" className={inputCls(!!errors.confirmEmail)} value={form.confirmEmail} onChange={(e) => updateField("confirmEmail", e.target.value)} />
            {errors.confirmEmail && <p className="text-xs text-red-500 mt-1">{errors.confirmEmail}</p>}
            {!errors.confirmEmail && form.confirmEmail && form.email === form.confirmEmail && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Emails match
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number *</label>
            <input type="tel" placeholder="+62 812 3456 7890" className={inputCls(!!errors.phone)} value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
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

// ── Step 1: Travelers & Date ────────────────────────────────────────────────

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
  travelDate: Date | null;
  setTravelDate: (d: Date | null) => void;
  contact: ContactInfo;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalPax = paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);

  const updatePax = (idx: number, delta: number) => {
    const updated = [...paxMix];
    const min = idx === 0 ? 1 : 0;
    const newCount = Math.max(min, Math.min(20, updated[idx].numberOfTravelers + delta));
    updated[idx] = { ...updated[idx], numberOfTravelers: newCount };
    setPaxMix(updated);
  };

  // Build travelers list from paxMix
  const buildTravelers = useCallback((): TravelerInfo[] => {
    const list: TravelerInfo[] = [];
    for (const pax of paxMix) {
      for (let i = 0; i < pax.numberOfTravelers; i++) {
        list.push(
          travelers[list.length] || {
            ageBand: pax.ageBand,
            firstName: list.length === 0 ? contact.firstName : "",
            lastName: list.length === 0 ? contact.lastName : "",
          }
        );
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
    const errKey = `${idx}-${field}`;
    if (errors[errKey]) setErrors((prev) => { const n = { ...prev }; delete n[errKey]; return n; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!travelDate) errs.date = "Please select a travel date";
    if (totalPax === 0) errs.pax = "At least 1 traveler required";
    localTravelers.forEach((t, i) => {
      if (!t.firstName.trim()) errs[`${i}-firstName`] = "Required";
      if (!t.lastName.trim()) errs[`${i}-lastName`] = "Required";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
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
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Select Travel Date</h2>
        </div>

        <style>{`
          .mock-cal { width: 100%; border: none !important; font-family: inherit; font-size: 13px; }
          .mock-cal .react-calendar__tile--active { background: #0071CE !important; color: white !important; border-radius: 8px; }
          .mock-cal .react-calendar__tile--now { background: #e0f0ff !important; border-radius: 8px; }
          .mock-cal .react-calendar__tile:hover { background: #b3d9ff !important; border-radius: 8px; }
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
        {errors.date && <p className="text-xs text-red-500 mt-2">{errors.date}</p>}
        {travelDate && (
          <p className="text-sm font-semibold text-[#0071CE] mt-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Selected: {travelDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Pax Mix */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Number of Travelers</h2>
        </div>

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
                >
                  −
                </button>
                <span className="w-6 text-center text-gray-900 font-bold text-base">{pax.numberOfTravelers}</span>
                <button
                  type="button"
                  onClick={() => updatePax(idx, 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 text-lg"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        {errors.pax && <p className="text-xs text-red-500 mt-2">{errors.pax}</p>}
      </div>

      {/* Traveler Names */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Traveler Details</h2>
        </div>

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

// ── Step 2: Special Requests ──────────────────────────────────────────────

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
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Additional Notes</h2>
        </div>

        <div>
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
        </div>

        <div className="mt-5 p-4 bg-green-50 rounded-xl border border-green-100">
          <p className="text-sm font-bold text-green-800 mb-1 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            How This Works
          </p>
          <p className="text-xs text-green-700 leading-relaxed">
            After confirming, your booking details will be saved and you&apos;ll be redirected to WhatsApp to complete the reservation with our team. Payment is handled via WhatsApp.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">Back</button>
        <button type="button" onClick={onNext} className="flex-[2] bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]">
          Review Booking
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Confirm & Submit ──────────────────────────────────────────────

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
  travelDate: Date | null;
  specialRequest: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPax = paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);
  const dateStr = travelDate
    ? travelDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "—";

  const buildWaMessage = () => {
    const travelerList = paxMix
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
      `Travelers:\n${travelerList}`,
      `Lead Traveler: ${contact.firstName} ${contact.lastName}`,
      `Phone: ${contact.phone}`,
      `Email: ${contact.email}`,
      ...(overridePrice ? [`Estimated Price: from ${overridePrice.toLocaleString()} ${overrideCurrency || "IDR"}`] : []),
      ...(specialRequest ? [`Notes: ${specialRequest}`] : []),
      "",
      "Please confirm my booking, thank you!",
    ];

    const cleanNumber = WA_NUMBER.replace(/\D/g, "");
    const finalNumber = cleanNumber.startsWith("0") ? `62${cleanNumber.slice(1)}` : cleanNumber;
    return `https://api.whatsapp.com/send?phone=${finalNumber}&text=${encodeURIComponent(lines.join("\n"))}`;
  };

  const handleConfirm = async () => {
    if (!termsAccepted) { toast.warning("Please accept the terms to continue."); return; }
    if (!session?.user?.id) { toast.error("Please login to continue."); return; }

    setIsSubmitting(true);
    try {
      const offset = travelDate ? travelDate.getTimezoneOffset() : 0;
      const isoDate = travelDate
        ? new Date(travelDate.getTime() - offset * 60 * 1000).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

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
          bookingQuestionAnswers: specialRequest ? [{ questionId: "specialRequest", answer: specialRequest }] : [],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save booking");
      }

      toast.success("Booking saved! Redirecting to WhatsApp...");
      setTimeout(() => {
        window.open(buildWaMessage(), "_blank");
        router.push("/profile");
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Review Your Booking</h2>
        </div>

        <div className="space-y-4">
          <div className="pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
            <p className="text-sm font-bold text-gray-900 leading-snug">{productTitle}</p>
          </div>

          <div className="pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Travel Date</p>
            <p className="text-sm font-bold text-gray-900">{dateStr}</p>
          </div>

          <div className="pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
            <div className="text-sm text-gray-700 space-y-1">
              <p>{contact.firstName} {contact.lastName}</p>
              <p>{contact.email}</p>
              <p>{contact.phone}</p>
            </div>
          </div>

          <div className="pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Travelers ({totalPax})</p>
            <div className="space-y-1.5">
              {travelers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{t.firstName} {t.lastName}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.ageBand}</span>
                </div>
              ))}
            </div>
          </div>

          {specialRequest && (
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Special Request</p>
              <p className="text-sm text-gray-700">{specialRequest}</p>
            </div>
          )}

          {overridePrice && overridePrice > 0 && (
            <div className="bg-[#F8F8F8] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Estimated from</span>
                <span className="text-xl font-black text-[#0071CE]">
                  {overridePrice.toLocaleString()} {overrideCurrency || "IDR"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Final price confirmed via WhatsApp</p>
            </div>
          )}
        </div>
      </div>

      {/* Terms */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <label className="flex items-start gap-3.5 p-4 rounded-xl bg-[#F8F8F8] border border-gray-100 cursor-pointer hover:border-[#0071CE]/30 transition">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[#0071CE] focus:ring-[#0071CE] shrink-0"
          />
          <span className="text-sm text-gray-600 leading-relaxed">
            By clicking &apos;Confirm & Contact via WhatsApp&apos;, I agree to be contacted by Voyra Bali to finalize this booking. I understand that payment will be arranged via WhatsApp.
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!termsAccepted || isSubmitting}
          className="flex-[2] bg-[#25D366] hover:bg-[#1ebe5d] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Confirm & Contact via WhatsApp
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Booking Sidebar ───────────────────────────────────────────────────────

function MockBookingSidebar({
  productTitle,
  productImage,
  overridePrice,
  overrideCurrency,
  travelDate,
  paxMix,
}: {
  productTitle: string;
  productImage?: string | null;
  overridePrice?: number | null;
  overrideCurrency?: string;
  travelDate: Date | null;
  paxMix: PaxMixItem[];
}) {
  const totalPax = paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImage} alt={productTitle} className="w-full h-32 object-cover" />
            </div>
          )}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
            <p className="text-sm font-bold text-gray-900 leading-snug">{productTitle}</p>
          </div>
          <div className="space-y-3 mb-5">
            {travelDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Date
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {travelDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            )}
            {totalPax > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Travelers
                </span>
                <span className="text-sm font-bold text-gray-900">{totalPax} pax</span>
              </div>
            )}
          </div>

          {overridePrice && overridePrice > 0 ? (
            <div className="bg-[#F8F8F8] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">From</span>
                <span className="text-xl sm:text-2xl font-black text-[#0071CE]">
                  {overridePrice.toLocaleString()} {overrideCurrency || "IDR"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Final price via WhatsApp</p>
            </div>
          ) : (
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-green-700">Reserve Now, Pay Later</p>
              <p className="text-xs text-green-600 mt-1">Price confirmed via WhatsApp</p>
            </div>
          )}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "green", label: "Secure" },
            { icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "blue", label: "Fast" },
            { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "green", label: "WhatsApp" },
          ].map((b, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full bg-${b.color}-50 flex items-center justify-center`}>
                <svg className={`w-4 h-4 text-${b.color}-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={b.icon} />
                </svg>
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-gray-600">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function MockCheckoutClient({
  initialProductCode,
  overrideTitle,
  overridePrice,
  overrideCurrency,
}: {
  initialProductCode: string;
  overrideTitle?: string | null;
  overridePrice?: number | null;
  overrideCurrency?: string | null;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [contact, setContact] = useState<ContactInfo>({
    firstName: "", lastName: "", email: "", confirmEmail: "", phone: "",
  });
  const [paxMix, setPaxMix] = useState<PaxMixItem[]>(DEFAULT_PAX);
  const [travelers, setTravelers] = useState<TravelerInfo[]>([]);
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [specialRequest, setSpecialRequest] = useState("");

  const productTitle = overrideTitle || initialProductCode;

  // Auto-fill contact from session
  useEffect(() => {
    if (!session?.user) return;
    if (contact.firstName || contact.email) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error();
        const profile = await res.json();
        setContact({
          firstName: profile.name?.split(" ")[0] || "",
          lastName: profile.name?.split(" ").slice(1).join(" ") || "",
          email: profile.email || "",
          confirmEmail: profile.email || "",
          phone: profile.phone || "",
        });
      } catch {
        const name = session.user.name || "";
        setContact((prev) => ({
          ...prev,
          firstName: name.split(" ")[0] || "",
          lastName: name.split(" ").slice(1).join(" ") || "",
          email: session.user.email || "",
          confirmEmail: session.user.email || "",
        }));
      }
    };
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Redirect to login if unauthenticated
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#0071CE]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
          <p className="text-sm text-gray-500 mb-6">Please login to complete your booking.</p>
          <button
            onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)}
            className="bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold px-6 py-3 rounded-xl transition"
          >
            Login to Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pt-4 pb-8 sm:pb-16">
      <Container>
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reserve Your Spot</h1>
              <p className="text-sm text-gray-500 hidden sm:block">Complete your details — pay via WhatsApp</p>
            </div>
          </div>
          <StepIndicator current={step} steps={STEPS} />
        </div>

        <div className="max-w-5xl mx-auto flex flex-col lg:grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Left: Steps */}
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
              <StepDetails
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
                specialRequest={specialRequest}
                setSpecialRequest={setSpecialRequest}
              />
            )}
            {step === 3 && (
              <StepConfirm
                onBack={() => setStep(2)}
                productCode={initialProductCode}
                productTitle={productTitle}
                overridePrice={overridePrice}
                overrideCurrency={overrideCurrency || "IDR"}
                contact={contact}
                travelers={travelers}
                paxMix={paxMix}
                travelDate={travelDate}
                specialRequest={specialRequest}
              />
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <MockBookingSidebar
              productTitle={productTitle}
              overridePrice={overridePrice}
              overrideCurrency={overrideCurrency || "IDR"}
              travelDate={travelDate}
              paxMix={paxMix}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
