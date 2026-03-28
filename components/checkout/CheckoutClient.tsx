"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Container from "@/components/Container";
import { useBookingStore } from "@/utils/hooks/useBookingStore";
import type { TravelerInfo, BookingQuestion } from "@/utils/hooks/useBookingStore";
import { MIDTRANS_SNAP_URL, MIDTRANS_CLIENT_KEY } from "@/lib/config/midtrans";

const STEPS = ["Contact", "Travelers", "Activity", "Review & Pay"];

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
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
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
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Emails match
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number *</label>
            <input type="tel" placeholder="+62 812 3456 7890" className={inputCls("phone")} value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
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

// ── Step 1: Travelers ───────────────────────────────────────────────
function StepTravelers({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { paxMix, travelers: savedTravelers, setTravelers, contactInfo } = useBookingStore();

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
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
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
    Object.entries(answers).forEach(([qId, ans]) => {
      store.setBookingQuestionAnswer(qId, ans);
    });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
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
                Preferred Language
              </label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition bg-white"
                value={languageGuide}
                onChange={(e) => setLanguageGuide(e.target.value)}
              >
                <option value="">Select language</option>
                {store.availableLanguageGuides.map((g, i) => (
                  <option key={i} value={g.language}>
                    {g.language.charAt(0).toUpperCase() + g.language.slice(1)}
                    {g.type === "GUIDE" ? " (Guide)" : g.type === "AUDIO" ? " (Audio)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dynamic Booking Questions */}
          {isLoadingQuestions ? (
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
          )}
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
function StepReview({
  onBack,
}: {
  onBack: () => void;
}) {
  const store = useBookingStore();
  const router = useRouter();
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const totalTravelers = store.paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);

  const handlePayment = async () => {
    if (!termsAccepted) {
      toast.warning("Please accept the Terms of Use.");
      return;
    }
    if (!session?.user?.id) {
      toast.error("Please login to continue.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create booking in DB + get Midtrans Snap token
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: store.productCode,
          productTitle: store.productTitle,
          productImage: store.productImage,
          productOptionCode: store.productOptionCode,
          tourGradeCode: store.tourGradeCode,
          startTime: store.startTime,
          travelDate: store.travelDate,
          pax: totalTravelers,
          paxMix: store.paxMix,
          totalPrice: store.totalPrice,
          currency: store.currency,
          // Lead traveler
          leadFirstName: store.contactInfo.firstName,
          leadLastName: store.contactInfo.lastName,
          leadEmail: store.contactInfo.email,
          leadPhone: store.contactInfo.phone,
          // All travelers
          travelers: store.travelers,
          // Activity details
          meetingPoint: store.meetingPoint,
          languageGuide: store.languageGuide,
          bookingQuestionAnswers: store.bookingQuestionAnswers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create payment.");
        return;
      }

      // 2. Redirect to Midtrans Snap
      if (data.snapToken) {
        // Use Snap popup if available, otherwise redirect
        if (typeof window !== "undefined" && (window as any).snap) {
          (window as any).snap.pay(data.snapToken, {
            onSuccess: () => {
              router.push(`/payment/success?order_id=${data.orderId}&transaction_status=settlement`);
            },
            onPending: () => {
              router.push(`/payment/pending?order_id=${data.orderId}`);
            },
            onError: () => {
              toast.error("Payment failed. Please try again.");
              setIsProcessing(false);
            },
            onClose: () => {
              toast.info("Payment window closed. You can retry.");
              setIsProcessing(false);
            },
          });
        } else if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        }
      } else {
        toast.error("Could not initialize payment.");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Booking Summary */}
      <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Review Your Booking</h2>
        </div>

        {/* Product */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
          <p className="text-sm font-bold text-gray-900 leading-snug">{store.productTitle}</p>
        </div>

        {/* Date & Time */}
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

        {/* Contact */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
          <div className="text-sm text-gray-700 space-y-1">
            <p>{store.contactInfo.firstName} {store.contactInfo.lastName}</p>
            <p>{store.contactInfo.email}</p>
            <p>{store.contactInfo.phone}</p>
          </div>
        </div>

        {/* Travelers */}
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

        {/* Meeting Point */}
        {store.meetingPoint && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Meeting Point</p>
            <p className="text-sm text-gray-700">{store.meetingPoint}</p>
          </div>
        )}

        {/* Cancellation Policy */}
        {store.cancellationPolicy && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cancellation Policy</p>
            <p className="text-sm text-gray-700">{store.cancellationPolicy}</p>
          </div>
        )}

        {/* Price */}
        <div className="bg-[#F8F8F8] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Total Price</span>
            <span className="text-xl font-black text-[#0071CE]">
              {store.totalPrice.toLocaleString()} {store.currency}
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
            By clicking &apos;Pay Now&apos;, you agree to the Terms of Use and Privacy Statement. Your payment will be processed securely via Midtrans. Booking will be confirmed with the supplier after successful payment.
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">
          Back
        </button>
        <button
          onClick={handlePayment}
          disabled={isProcessing || !termsAccepted}
          className="flex-[2] bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing Payment...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pay Now — {store.totalPrice.toLocaleString()} {store.currency}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Sidebar Summary ─────────────────────────────────────────────────
function BookingSidebar() {
  const store = useBookingStore();
  const totalTravelers = store.paxMix.reduce((acc, p) => acc + p.numberOfTravelers, 0);

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
          {store.productImage && (
            <div className="mb-4 rounded-xl overflow-hidden">
              <img src={store.productImage} alt={store.productTitle} className="w-full h-32 object-cover" />
            </div>
          )}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
            <p className="text-sm font-bold text-gray-900 leading-snug">{store.productTitle}</p>
          </div>
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date
              </span>
              <span className="text-sm font-bold text-gray-900">{store.travelDate}</span>
            </div>
            {store.startTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Time
                </span>
                <span className="text-sm font-bold text-gray-900">{store.startTime}</span>
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
          </div>
          <div className="bg-[#F8F8F8] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">Total</span>
              <span className="text-xl sm:text-2xl font-black text-[#0071CE]">
                {store.totalPrice.toLocaleString()} {store.currency}
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
      {/* Midtrans Snap Script */}
      <script
        src={MIDTRANS_SNAP_URL}
        data-client-key={MIDTRANS_CLIENT_KEY}
        async
      />

      <Container>
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#0071CE]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
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
