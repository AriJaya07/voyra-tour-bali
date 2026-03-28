"use client";

import { useState } from "react";

export interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  travelers: Array<{
    ageBand: string;
    firstName: string;
    lastName: string;
  }>;
}

interface BookingFormProps {
  paxMix: Array<{ ageBand: string; numberOfTravelers: number }>;
  initialData?: Partial<BookingFormData>;
  onSubmit: (data: BookingFormData) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export default function BookingForm({
  paxMix,
  initialData,
  onSubmit,
  onBack,
  isLoading = false,
}: BookingFormProps) {
  const [firstName, setFirstName] = useState(initialData?.firstName || "");
  const [lastName, setLastName] = useState(initialData?.lastName || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Build travelers list from paxMix
  const buildTravelers = () => {
    const list: Array<{ ageBand: string; firstName: string; lastName: string }> = [];
    for (const pax of paxMix) {
      for (let i = 0; i < pax.numberOfTravelers; i++) {
        const existing = initialData?.travelers?.[list.length];
        list.push(
          existing || {
            ageBand: pax.ageBand,
            firstName: list.length === 0 ? firstName : "",
            lastName: list.length === 0 ? lastName : "",
          }
        );
      }
    }
    return list;
  };

  const [travelers, setTravelers] = useState(buildTravelers);

  const updateTraveler = (
    idx: number,
    field: "firstName" | "lastName",
    value: string
  ) => {
    const updated = [...travelers];
    updated[idx] = { ...updated[idx], [field]: value };
    setTravelers(updated);
    const key = `traveler-${idx}-${field}`;
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "Required";
    if (!lastName.trim()) errs.lastName = "Required";
    if (!email.trim()) errs.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email";
    if (!phone.trim()) errs.phone = "Required";
    travelers.forEach((t, i) => {
      if (!t.firstName.trim()) errs[`traveler-${i}-firstName`] = "Required";
      if (!t.lastName.trim()) errs[`traveler-${i}-lastName`] = "Required";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ firstName, lastName, email, phone, travelers });
  };

  const inputCls = (field: string) =>
    `w-full border ${
      errors[field] ? "border-red-400" : "border-gray-200"
    } rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Contact Information */}
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
            <input type="text" placeholder="First name" className={inputCls("firstName")} value={firstName} onChange={(e) => { setFirstName(e.target.value); if (errors.firstName) setErrors((p) => { const n = { ...p }; delete n.firstName; return n; }); }} />
            {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Last Name *</label>
            <input type="text" placeholder="Last name" className={inputCls("lastName")} value={lastName} onChange={(e) => { setLastName(e.target.value); if (errors.lastName) setErrors((p) => { const n = { ...p }; delete n.lastName; return n; }); }} />
            {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
            <input type="email" placeholder="you@example.com" className={inputCls("email")} value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone *</label>
            <input type="tel" placeholder="+62 812 3456 7890" className={inputCls("phone")} value={phone} onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((p) => { const n = { ...p }; delete n.phone; return n; }); }} />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>
        </div>
      </div>

      {/* Travelers */}
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
            <div key={idx} className={idx > 0 ? "pt-5 border-t border-gray-100" : ""}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-gray-800">Traveler {idx + 1}</span>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.ageBand}</span>
                {idx === 0 && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Lead</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="First name"
                    className={inputCls(`traveler-${idx}-firstName`)}
                    value={t.firstName}
                    onChange={(e) => updateTraveler(idx, "firstName", e.target.value)}
                  />
                  {errors[`traveler-${idx}-firstName`] && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Last name"
                    className={inputCls(`traveler-${idx}-lastName`)}
                    value={t.lastName}
                    onChange={(e) => updateTraveler(idx, "lastName", e.target.value)}
                  />
                  {errors[`traveler-${idx}-lastName`] && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onBack && (
          <button type="button" onClick={onBack} className="flex-1 py-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">
            Back
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className={`${onBack ? "flex-[2]" : "w-full"} bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]`}
        >
          {isLoading ? "Processing..." : "Continue"}
        </button>
      </div>
    </form>
  );
}
