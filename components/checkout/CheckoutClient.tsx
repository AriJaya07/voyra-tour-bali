"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatBookingPrice } from "@/utils/formatPrice";
import { useCurrency } from "@/utils/hooks/useCurrency";
import { toast } from "sonner";
import Container from "@/components/Container";
import { useBookingStore } from "@/utils/hooks/useBookingStore";
import type { TravelerInfo, BookingQuestion } from "@/utils/hooks/useBookingStore";
import { MIDTRANS_SNAP_URL, MIDTRANS_CLIENT_KEY } from "@/lib/config/midtrans";
import { handleMidtransBooking } from "@/lib/services/midtransService";
import { holdBooking, getPaymentMethods, confirmBooking } from "@/lib/viator-checkout";
import type { BookingInput, ViatorPaymentAccount, ViatorFlowStep } from "@/types/bookingFlow";
import PaymentSelector from "@/components/booking/PaymentSelector";
import HoldTimer from "@/components/booking/HoldTimer";
import { CheckmarkIcon, CalendarIcon, ClockIcon, PeopleIcon, UserIcon, LockIcon, ClipboardIcon, ShieldIcon, LightningIcon, StarIcon, RefreshIcon, AlertIcon, SpinnerIcon } from "@/components/assets/Icon/shared";

const STEPS = ["Contact", "Travelers", "Activity", "Review & Pay"];

/** When false, Viator “additional questions” are not shown, fetched, or validated (FE/BE treat answers as optional). */
const BOOKING_QUESTIONS_UI_ENABLED = false;

// ── Step Indicator ──────────────────────────────────────────────────
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
                <CheckmarkIcon className="w-3.5 h-3.5" />
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

// ── Step 0: Contact Info ────────────────────────────────────────────
function StepContact({
  onNext,
}: {
  onNext: () => void;
}) {
  const { contactInfo, setContactInfo } = useBookingStore();
  const [form, setForm] = useState(contactInfo);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
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
    setContactInfo(form);
    onNext();
  };

  const inputCls = (field: string) =>
    `w-full border ${errors[field] ? "border-red-400" : "border-gray-200"} rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-[#0071CE]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Contact Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">First Name *</label>
            <input type="text" placeholder="First name" className={inputCls("firstName")} value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
            {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Last Name *</label>
            <input type="text" placeholder="Last name" className={inputCls("lastName")} value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
            {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address *</label>
            <input type="email" placeholder="you@example.com" className={inputCls("email")} value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Email *</label>
            <input type="email" placeholder="Confirm email" className={inputCls("confirmEmail")} value={form.confirmEmail} onChange={(e) => updateField("confirmEmail", e.target.value)} />
            {errors.confirmEmail && <p className="text-xs text-red-500 mt-1">{errors.confirmEmail}</p>}
            {!errors.confirmEmail && form.confirmEmail && form.email !== form.confirmEmail && (
              <p className="text-xs text-red-500 mt-1">Emails don&apos;t match</p>
            )}
            {form.confirmEmail && form.email === form.confirmEmail && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckmarkIcon className="w-3 h-3" />
                Emails match
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number *</label>
            <input type="tel" inputMode="numeric" pattern="[0-9+\-\s]*" placeholder="+62 812 3456 7890" className={inputCls("phone")} value={form.phone} onChange={(e) => { const val = e.target.value.replace(/[^0-9+\-\s]/g, ""); updateField("phone", val); }} />
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

// ── Saved Travelers (API) ───────────────────────────────────────────
interface SavedTravelerRow {
  id: number;
  firstName: string;
  lastName: string;
  ageBand: string;
  isLead: boolean;
}

function SavedTravelerSelect({
  ageBand,
  options,
  onPick,
}: {
  ageBand: string;
  options: SavedTravelerRow[];
  onPick: (t: SavedTravelerRow) => void;
}) {
  const matches = options.filter((o) => o.ageBand === ageBand);
  if (matches.length === 0) return null;
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-500 mb-1">Autofill from saved travelers</label>
      <select
        defaultValue=""
        onChange={(e) => {
          const id = Number(e.target.value);
          const picked = matches.find((m) => m.id === id);
          if (picked) onPick(picked);
          e.currentTarget.value = "";
        }}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition"
      >
        <option value="">— Choose saved traveler —</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {m.firstName} {m.lastName} {m.isLead ? "(Lead)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Step 1: Travelers ───────────────────────────────────────────────
function StepTravelers({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { paxMix, travelers: savedTravelers, setTravelers, contactInfo } = useBookingStore();
  const { status: sessionStatus } = useSession();
  const [savedTravelerOptions, setSavedTravelerOptions] = useState<SavedTravelerRow[]>([]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/saved-travelers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SavedTravelerRow[]) => setSavedTravelerOptions(data ?? []))
      .catch(() => setSavedTravelerOptions([]));
  }, [sessionStatus]);

  // Build traveler list from paxMix
  const buildInitialTravelers = useCallback((): TravelerInfo[] => {
    const list: TravelerInfo[] = [];
    for (const pax of paxMix) {
      for (let i = 0; i < pax.numberOfTravelers; i++) {
        const existing = savedTravelers[list.length];
        list.push(
          existing || {
            ageBand: pax.ageBand,
            firstName: list.length === 0 ? contactInfo.firstName : "",
            lastName: list.length === 0 ? contactInfo.lastName : "",
          }
        );
      }
    }
    return list;
  }, [paxMix, savedTravelers, contactInfo]);

  const [travelers, setLocalTravelers] = useState<TravelerInfo[]>(buildInitialTravelers);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateTraveler = (idx: number, field: keyof TravelerInfo, value: string) => {
    const updated = [...travelers];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocalTravelers(updated);
    const errKey = `${idx}-${field}`;
    if (errors[errKey]) {
      setErrors((prev) => { const next = { ...prev }; delete next[errKey]; return next; });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    travelers.forEach((t, i) => {
      if (!t.firstName.trim()) errs[`${i}-firstName`] = "Required";
      if (!t.lastName.trim()) errs[`${i}-lastName`] = "Required";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setTravelers(travelers);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <PeopleIcon className="w-4 h-4 text-[#0071CE]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Traveler Details</h2>
        </div>

        <div className="space-y-6">
          {travelers.map((t, idx) => (
            <div key={idx} className={`${idx > 0 ? "pt-5 border-t border-gray-100" : ""}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-gray-800">
                  Traveler {idx + 1}
                </span>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {t.ageBand}
                </span>
                {idx === 0 && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Lead
                  </span>
                )}
              </div>
              {sessionStatus === "authenticated" && savedTravelerOptions.length > 0 && (
                <SavedTravelerSelect
                  ageBand={t.ageBand}
                  options={savedTravelerOptions}
                  onPick={(picked) => {
                    const updated = [...travelers];
                    updated[idx] = { ...updated[idx], firstName: picked.firstName, lastName: picked.lastName };
                    setLocalTravelers(updated);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next[`${idx}-firstName`];
                      delete next[`${idx}-lastName`];
                      return next;
                    });
                  }}
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="First name"
                    className={`w-full border ${errors[`${idx}-firstName`] ? "border-red-400" : "border-gray-200"} rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition`}
                    value={t.firstName}
                    onChange={(e) => updateTraveler(idx, "firstName", e.target.value)}
                  />
                  {errors[`${idx}-firstName`] && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Last name"
                    className={`w-full border ${errors[`${idx}-lastName`] ? "border-red-400" : "border-gray-200"} rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition`}
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
        <button type="button" onClick={onBack} className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">
          Back
        </button>
        <button type="submit" className="flex-[2] bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]">
          Continue to Activity Details
        </button>
      </div>
    </form>
  );
}

// ── Step 2: Activity Details ────────────────────────────────────────
function StepActivity({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const store = useBookingStore();
  const [questions, setQuestions] = useState<BookingQuestion[]>(store.bookingQuestions);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    store.bookingQuestionAnswers.forEach((a) => {
      map[a.questionId] = a.answer;
    });
    return map;
  });
  const [meetingPoint, setMeetingPoint] = useState(store.meetingPoint);
  const [languageGuide, setLanguageGuide] = useState(store.languageGuide);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Resolve pickup locations: call /api/viator/locations to get real names,
  // same approach as LogisticsSection on product detail page
  const [resolvedLocations, setResolvedLocations] = useState<Array<{ name: string; address?: string }>>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(store.availablePickupLocations.length > 0);

  useEffect(() => {
    const locations = store.availablePickupLocations;
    if (locations.length === 0) {
      setIsLoadingLocations(false);
      return;
    }

    // Collect refs that need resolving (skip special prefixes)
    const refs = locations
      .map((l) => l.ref)
      .filter((r) => r && !r.startsWith("MEET_") && !r.startsWith("CONTACT_"));

    const buildResult = (resolvedMap: Map<string, { name: string; address: string }>) => {
      const result: Array<{ name: string; address?: string }> = [];
      for (const l of locations) {
        const resolved = resolvedMap.get(l.ref);
        // Priority: resolved name > description > skip (never show raw ref)
        const name = resolved?.name || l.description || "";
        if (name) result.push({ name, address: resolved?.address });
      }
      return result;
    };

    if (refs.length === 0) {
      // No refs to resolve, use descriptions only
      setResolvedLocations(buildResult(new Map()));
      setIsLoadingLocations(false);
      return;
    }

    const limitedRefs = refs.slice(0, 20);
    const resolve = async () => {
      const resolvedMap = new Map<string, { name: string; address: string }>();
      try {
        const res = await fetch("/api/viator/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refs: limitedRefs }),
        });
        const data = await res.json();
        const apiLocations = data.locations || [];

        for (let i = 0; i < apiLocations.length; i++) {
          const loc = apiLocations[i];
          if (loc.name || loc.address) {
            // Match by ref if available, otherwise by position (same order as input)
            const key = loc.ref || limitedRefs[i] || `idx-${i}`;
            resolvedMap.set(key, {
              name: loc.name || "",
              address: loc.address || "",
            });
          }
        }
      } catch {
        // Fallback: will use description text
      }
      setResolvedLocations(buildResult(resolvedMap));
      setIsLoadingLocations(false);
    };
    resolve();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!BOOKING_QUESTIONS_UI_ENABLED) {
      setIsLoadingQuestions(false);
      return;
    }
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/viator/booking-questions?productCode=${store.productCode}`);
        const data = await res.json();
        const bqs = data.bookingQuestions || [];
        setQuestions(bqs);
        store.setBookingQuestions(bqs);
      } catch {
        // Non-critical, proceed without questions
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    if (store.productCode) fetchQuestions();
    else setIsLoadingQuestions(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.productCode]);

  const validate = () => {
    if (!BOOKING_QUESTIONS_UI_ENABLED) {
      setErrors({});
      return true;
    }
    const errs: Record<string, string> = {};
    questions.forEach((q) => {
      if (q.required && !answers[q.questionId]?.trim()) {
        errs[q.questionId] = "Required";
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    store.setMeetingPoint(meetingPoint);
    store.setLanguageGuide(languageGuide);
    if (BOOKING_QUESTIONS_UI_ENABLED) {
      Object.entries(answers).forEach(([qId, ans]) => {
        store.setBookingQuestionAnswer(qId, ans);
      });
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <ClipboardIcon className="w-4 h-4 text-[#0071CE]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Activity Details</h2>
        </div>

        <div className="space-y-4">
          {/* Meeting / Pickup Location — resolved from Viator */}
          {store.availablePickupLocations.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Meeting / Pickup Location
              </label>
              {isLoadingLocations ? (
                <div className="flex items-center gap-2 py-3 px-4 border border-gray-200 rounded-xl">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0071CE] border-t-transparent" />
                  <span className="text-sm text-gray-500">Loading pickup locations...</span>
                </div>
              ) : resolvedLocations.length > 0 ? (
                <select
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition bg-white"
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                >
                  <option value="">Select pickup location</option>
                  {resolvedLocations.map((loc, i) => (
                    <option key={i} value={loc.name}>
                      {loc.name}{loc.address ? ` — ${loc.address}` : ""}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          )}

          {/* Language Guide — dynamic from Viator */}
          {store.availableLanguageGuides.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Preferred Language *
              </label>
              <select
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition bg-white"
                value={languageGuide}
                onChange={(e) => setLanguageGuide(e.target.value)}
              >
                {store.availableLanguageGuides.map((g, i) => {
                  const label = g.language.charAt(0).toUpperCase() + g.language.slice(1);
                  const typeLabel = g.type === "GUIDE" ? "Live Guide" : g.type === "AUDIO" ? "Audio Guide" : g.type === "WRITTEN" ? "Written Guide" : g.type;
                  const value = `${label} (${typeLabel})`;
                  return (
                    <option key={i} value={value}>
                      {label} — {typeLabel}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {BOOKING_QUESTIONS_UI_ENABLED &&
            (isLoadingQuestions ? (
              <div className="flex items-center gap-2 py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0071CE] border-t-transparent" />
                <span className="text-sm text-gray-500">Loading activity questions...</span>
              </div>
            ) : (
              questions.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Additional Questions</p>
                  <div className="space-y-4">
                    {questions.map((q) => (
                      <div key={q.questionId}>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {q.question} {q.required && <span className="text-red-500">*</span>}
                        </label>
                        {q.allowedAnswers && q.allowedAnswers.length > 0 ? (
                          <select
                            className={`w-full border ${errors[q.questionId] ? "border-red-400" : "border-gray-200"} rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition bg-white`}
                            value={answers[q.questionId] || ""}
                            onChange={(e) => { setAnswers({ ...answers, [q.questionId]: e.target.value }); if (errors[q.questionId]) { setErrors((prev) => { const next = { ...prev }; delete next[q.questionId]; return next; }); } }}
                          >
                            <option value="">Select...</option>
                            {q.allowedAnswers.map((a) => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter your answer"
                            className={`w-full border ${errors[q.questionId] ? "border-red-400" : "border-gray-200"} rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition`}
                            value={answers[q.questionId] || ""}
                            onChange={(e) => { setAnswers({ ...answers, [q.questionId]: e.target.value }); if (errors[q.questionId]) { setErrors((prev) => { const next = { ...prev }; delete next[q.questionId]; return next; }); } }}
                          />
                        )}
                        {errors[q.questionId] && <p className="text-xs text-red-500 mt-1">{errors[q.questionId]}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}

        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">
          Back
        </button>
        <button type="submit" className="flex-[2] bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]">
          Review & Pay
        </button>
      </div>
    </form>
  );
}

// ── Step 3: Review & Pay ────────────────────────────────────────────
// VIATOR → hold → select payment → confirm (all on our site)
// LOCAL  → Midtrans Snap payment
function StepReview({
  onBack,
}: {
  onBack: () => void;
}) {
  const store = useBookingStore();
  const router = useRouter();
  const { data: session } = useSession();
  const { currency: displayCurrency, exchangeRates } = useCurrency();
  const [termsAccepted, setTermsAccepted] = useState(false);

  const isViator = store.source === "VIATOR";

  const totalLabel = formatBookingPrice(
    { totalPrice: store.totalPrice, currency: store.currency },
    displayCurrency,
    exchangeRates
  );

  // ── Viator step-by-step state ──────────────────────────────────────
  const [viatorStep, setViatorStep] = useState<ViatorFlowStep>("idle");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [cartRef, setCartRef] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [expiration, setExpiration] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<ViatorPaymentAccount[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [viatorError, setViatorError] = useState("");

  // ── Midtrans state ─────────────────────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);
  const [midtransError, setMidtransError] = useState("");

  const totalTravelers = store.paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);

  const buildBookingInput = (): BookingInput => ({
    productCode: store.productCode,
    productTitle: store.productTitle,
    productImage: store.productImage,
    productOptionCode: store.productOptionCode,
    travelDate: store.travelDate,
    startTime: store.startTime,
    tourGradeCode: store.tourGradeCode,
    paxMix: store.paxMix,
    travelers: store.travelers,
    leadTraveler: {
      firstName: store.contactInfo.firstName,
      lastName: store.contactInfo.lastName,
      email: store.contactInfo.email,
      phone: store.contactInfo.phone,
    },
    totalPrice: store.totalPrice,
    currency: store.currency,
    meetingPoint: store.meetingPoint,
    languageGuide: store.languageGuide,
    ...(BOOKING_QUESTIONS_UI_ENABLED && store.bookingQuestionAnswers.length > 0
      ? { bookingQuestionAnswers: store.bookingQuestionAnswers }
      : {}),
  });

  // ── Iframe Listening ────────────────────────────────────────────────
  useEffect(() => {
    if (viatorStep !== "payment_iframe") return;

    const handleMessage = async (e: MessageEvent) => {
      // Viator standard for VIATOR_FORM: when payment succeeds or completes
      // Check event name appropriately
      if (e.data && (e.data.event === "sessionAccountToken" || e.data.event === "paymentAccountToken") && (e.data.sessionAccountToken || e.data.token)) {
        const token = e.data.sessionAccountToken || e.data.token;
        setViatorStep("confirming");
        try {
          const booking = await confirmBooking({ 
            cartReference: cartRef, 
            paymentToken: token,
            items: [buildBookingInput()] 
          });
          setViatorStep("confirmed");
          toast.success("Booking confirmed!");
          router.push(`/booking-success?ref=${encodeURIComponent(booking.bookingRef || "")}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Booking confirmation failed";
          setViatorError(msg);
          setViatorStep("error");
          toast.error(msg);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viatorStep, cartRef]);

  // ── Viator: Hold booking ──────────────────────────────────────────
  const handleViatorHold = async () => {
    if (!termsAccepted) { toast.warning("Please accept the Terms of Use."); return; }
    if (!session?.user?.id) { toast.error("Please login to continue."); return; }

    setViatorStep("holding");
    setViatorError("");
    try {
      const holdRes = await holdBooking(buildBookingInput());
      setCartRef(holdRes.cartReference || "");

      if (holdRes.paymentDataSubmissionUrl) {
        setPaymentUrl(holdRes.paymentDataSubmissionUrl);
        setExpiration(holdRes.expiration || "");
        setViatorStep("payment_iframe");
      } else {
        // Fallback backward compatibility
        setSessionToken(holdRes.sessionToken || holdRes.paymentSessionToken || "");
        setExpiration(holdRes.expiration || "");
        setViatorStep("selecting_payment" as any); // fallback mapping
        const methods = await getPaymentMethods(holdRes.sessionToken || "");
        setPaymentMethods(methods);
        if (methods.length > 0) setSelectedPaymentId(methods[0].id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to hold booking";
      setViatorError(msg);
      setViatorStep("error");
      toast.error(msg);
    }
  };

  // ── Viator: Confirm booking (Legacy Fallback) ─────────────────────
  const handleViatorConfirm = async () => {
    if (!selectedPaymentId) { toast.warning("Please select a payment method."); return; }

    setViatorStep("confirming");
    try {
      const booking = await confirmBooking({ 
        cartReference: cartRef || "", 
        paymentToken: selectedPaymentId,
        items: [buildBookingInput()] 
      });
      setViatorStep("confirmed");
      toast.success("Booking confirmed!");
      router.push(`/booking-success?ref=${encodeURIComponent(booking.bookingRef || "")}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Booking confirmation failed";
      setViatorError(msg);
      setViatorStep("error");
      toast.error(msg);
    }
  };

  const handleExpired = useCallback(() => {
    setViatorStep("expired");
    toast.error("Your booking hold has expired. Please try again.");
  }, []);

  const handleViatorReset = () => {
    setViatorStep("idle");
    setSessionToken("");
    setExpiration("");
    setPaymentMethods([]);
    setSelectedPaymentId("");
    setViatorError("");
  };

  // ── Midtrans: Pay now ─────────────────────────────────────────────
  const handleMidtransPayment = async () => {
    if (!termsAccepted) { toast.warning("Please accept the Terms of Use."); return; }
    if (!session?.user?.id) { toast.error("Please login to continue."); return; }

    setIsProcessing(true);
    setMidtransError("");
    try {
      const result = await handleMidtransBooking(buildBookingInput());
      if (!result.success) {
        const msg = result.error || "Failed to create payment.";
        setMidtransError(msg);
        toast.error(msg);
        return;
      }
      // Midtrans gateway: open Snap popup or fallback to redirect
      if (result.snapToken) {
        const win = window as unknown as Record<string, unknown>;
        if (typeof window !== "undefined" && win.snap) {
          const snap = win.snap as { pay: (token: string, callbacks: Record<string, () => void>) => void };
          snap.pay(result.snapToken, {
            onSuccess: () => router.push(`/payment/success?order_id=${result.orderId}&transaction_status=settlement`),
            onPending: () => router.push(`/payment/pending?order_id=${result.orderId}`),
            onError: () => { toast.error("Payment failed."); setIsProcessing(false); },
            onClose: () => { toast.info("Payment window closed."); setIsProcessing(false); },
          });
          return;
        } else if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
          return;
        }
      }
      toast.error("Could not initialize payment.");
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isViatorBusy = viatorStep === "holding" || viatorStep === "confirming";
  const currentError = isViator ? viatorError : midtransError;

  return (
    <div className="space-y-5">
      {/* Hold Timer — Viator flow only */}
      {isViator && expiration && viatorStep !== "confirmed" && viatorStep !== "idle" && viatorStep !== "error" && (
        <HoldTimer expiration={expiration} onExpired={handleExpired} />
      )}

      {/* Booking Summary */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <ClipboardIcon className="w-4 h-4 text-[#0071CE]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Review Your Booking</h2>
        </div>

        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
          <p className="text-sm font-bold text-gray-900 leading-snug">{store.productTitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
            <p className="text-sm font-bold text-gray-900">{store.travelDate}</p>
          </div>
          {store.startTime && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Time</p>
              <p className="text-sm font-bold text-gray-900">{store.startTime}</p>
            </div>
          )}
        </div>

        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
          <div className="text-sm text-gray-700 space-y-1">
            <p>{store.contactInfo.firstName} {store.contactInfo.lastName}</p>
            <p>{store.contactInfo.email}</p>
            <p>{store.contactInfo.phone}</p>
          </div>
        </div>

        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Travelers ({totalTravelers})</p>
          <div className="space-y-1.5">
            {store.travelers.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">{t.firstName} {t.lastName}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.ageBand}</span>
              </div>
            ))}
          </div>
        </div>

        {store.meetingPoint && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Meeting Point</p>
            <p className="text-sm text-gray-700">{store.meetingPoint}</p>
          </div>
        )}

        {store.cancellationPolicy && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cancellation Policy</p>
            <p className="text-sm text-gray-700">{store.cancellationPolicy}</p>
          </div>
        )}

        <div className="bg-[#F8F8F8] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Total Price</span>
            <span className="text-xl font-black text-[#0071CE]">
              {totalLabel}
            </span>
          </div>
          <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
            <CheckmarkIcon className="w-3.5 h-3.5" />
            No hidden fees. Taxes included.
          </p>
        </div>
      </div>

      {/* Payment Selector — Viator flow, shown after hold */}
      {isViator && (viatorStep as any) === "selecting_payment" && paymentMethods.length > 0 && (
        <PaymentSelector
          methods={paymentMethods}
          selectedId={selectedPaymentId}
          onSelect={setSelectedPaymentId}
          disabled={isViatorBusy}
        />
      )}

      {/* Payment Iframe — Viator v2.0 Form */}
      {isViator && viatorStep === "payment_iframe" && paymentUrl && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-hidden min-h-[500px] mb-4">
          <iframe 
            src={paymentUrl} 
            className="w-full h-[450px] sm:h-[550px] md:h-[600px] border-none bg-[#F8F8F8]" 
            title="Secure Payment"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation-by-user-activation"
          />
        </div>
      )}

      {/* Error banner */}
      {currentError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Booking Error</p>
            <p className="text-xs text-red-600 mt-0.5">{currentError}</p>
          </div>
        </div>
      )}

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
            {isViator
              ? "By proceeding, you agree to the Terms of Use and Privacy Statement. Your booking will be processed securely through our platform."
              : "By clicking 'Pay Now', you agree to the Terms of Use and Privacy Statement. Your payment will be processed securely via Midtrans."}
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isViatorBusy || isProcessing}
          className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {isViator ? (
          /* ── Viator flow: hold → select payment → confirm ── */
          viatorStep === "expired" || viatorStep === "error" ? (
            <button
              onClick={handleViatorReset}
              className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RefreshIcon className="w-5 h-5" />
              Try Again
            </button>
          ) : (viatorStep as any) === "selecting_payment" ? (
            <button
              onClick={handleViatorConfirm}
              disabled={!selectedPaymentId || viatorStep === "confirming"}
              className="flex-[2] bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <CheckmarkIcon className="w-5 h-5" />
              Confirm Booking — {totalLabel}
            </button>
          ) : viatorStep === "payment_iframe" ? (
             <div className="flex-[2] flex items-center justify-center py-4 bg-blue-50 text-[#0071CE] font-bold rounded-xl">
               Please complete payment above
             </div>
          ) : viatorStep === "confirming" ? (
             <button
               disabled={true}
               className="flex-[2] bg-[#0071CE] disabled:bg-[#0071CE]/70 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
             >
               <SpinnerIcon className="animate-spin w-5 h-5" />
               Confirming Booking...
             </button>
          ) : (
            <button
              onClick={handleViatorHold}
              disabled={!termsAccepted || isViatorBusy}
              className="flex-[2] bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isViatorBusy ? (
                <>
                  <SpinnerIcon className="animate-spin w-5 h-5" />
                  Reserving your spot...
                </>
              ) : (
                <>
                  <LockIcon className="w-5 h-5" />
                  Proceed to Payment
                </>
              )}
            </button>
          )
        ) : (
          /* ── LOCAL flow: Midtrans Snap ── */
          <button
            onClick={handleMidtransPayment}
            disabled={isProcessing || !termsAccepted}
            className="flex-[2] bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <SpinnerIcon className="animate-spin w-5 h-5" />
                Processing Payment...
              </>
            ) : (
              <>
                <LockIcon className="w-5 h-5" />
                Pay Now — {totalLabel}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sidebar Summary ─────────────────────────────────────────────────
function BookingSidebar() {
  const store = useBookingStore();
  const { currency: displayCurrency, exchangeRates } = useCurrency();
  const totalTravelers = store.paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);
  const totalLabel = formatBookingPrice(
    { totalPrice: store.totalPrice, currency: store.currency },
    displayCurrency,
    exchangeRates
  );

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
          {store.productImage && (
            <div className="relative mb-4 rounded-xl overflow-hidden h-32">
              <Image
                src={store.productImage}
                alt={store.productTitle}
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover"
              />
            </div>
          )}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
            <p className="text-sm font-bold text-gray-900 leading-snug">{store.productTitle}</p>
          </div>
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Date
              </span>
              <span className="text-sm font-bold text-gray-900">{store.travelDate}</span>
            </div>
            {store.startTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Time
                </span>
                <span className="text-sm font-bold text-gray-900">{store.startTime}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <PeopleIcon className="w-4 h-4" />
                Travelers
              </span>
              <span className="text-sm font-bold text-gray-900">{totalTravelers} pax</span>
            </div>
          </div>
          <div className="bg-[#F8F8F8] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">Total</span>
              <span className="text-xl sm:text-2xl font-black text-[#0071CE]">
                {totalLabel}
              </span>
            </div>
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

// ── Main Checkout ───────────────────────────────────────────────────
export default function CheckoutClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const store = useBookingStore();

  // Auto-fill contact from session
  useEffect(() => {
    if (!session?.user) return;
    const ci = store.contactInfo;
    if (!ci.firstName && !ci.email) {
      const fetchProfile = async () => {
        try {
          const res = await fetch("/api/profile");
          if (!res.ok) throw new Error();
          const profile = await res.json();
          store.setContactInfo({
            ...ci,
            firstName: profile.name?.split(" ")[0] || "",
            lastName: profile.name?.split(" ").slice(1).join(" ") || "",
            email: profile.email || "",
            confirmEmail: profile.email || "",
            phone: profile.phone || "",
          });
        } catch {
          const name = session.user.name || "";
          store.setContactInfo({
            ...ci,
            firstName: name.split(" ")[0] || "",
            lastName: name.split(" ").slice(1).join(" ") || "",
            email: session.user.email || "",
            confirmEmail: session.user.email || "",
          });
        }
      };
      fetchProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Redirect if no product selected
  if (!store.productCode) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No booking in progress.</p>
          <button onClick={() => router.push("/")} className="bg-[#0071CE] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#005ba6] transition">
            Browse Tours
          </button>
        </div>
      </div>
    );
  }

  const goNext = () => store.setCurrentStep(Math.min(store.currentStep + 1, STEPS.length - 1));
  const goBack = () => store.setCurrentStep(Math.max(store.currentStep - 1, 0));

  return (
    <div className="min-h-screen bg-[#F8F8F8] pt-10 pb-8 sm:pb-16">
      {/* Midtrans Snap Script — only needed for LOCAL products */}
      {store.source === "LOCAL" && MIDTRANS_SNAP_URL && (
        <script
          src={MIDTRANS_SNAP_URL}
          data-client-key={MIDTRANS_CLIENT_KEY}
          async
        />
      )}

      <Container>
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#0071CE]/10 flex items-center justify-center">
              <ShieldIcon className="w-5 h-5 text-[#0071CE]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Secure Checkout</h1>
              <p className="text-sm text-gray-500 hidden sm:block">Complete your booking details below</p>
            </div>
          </div>
          <StepIndicator current={store.currentStep} steps={STEPS} />
        </div>

        <div className="max-w-5xl mx-auto flex flex-col lg:grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Left: Steps */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            {store.currentStep === 0 && <StepContact onNext={goNext} />}
            {store.currentStep === 1 && <StepTravelers onNext={goNext} onBack={goBack} />}
            {store.currentStep === 2 && <StepActivity onNext={goNext} onBack={goBack} />}
            {store.currentStep === 3 && <StepReview onBack={goBack} />}
          </div>

          {/* Right: Sidebar */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <BookingSidebar />
          </div>
        </div>
      </Container>
    </div>
  );
}
