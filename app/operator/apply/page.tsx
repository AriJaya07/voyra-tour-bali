"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Operator {
  id: number;
  name: string;
  slug: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  rejectReason: string | null;
}

const STATUS_BADGE: Record<Operator["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  SUSPENDED: "bg-gray-100 text-gray-600 border-gray-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

export default function OperatorApplyPage() {
  const { status } = useSession();
  const [existing, setExisting] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [insurance, setInsurance] = useState(false);
  const [yearsActive, setYearsActive] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }
    if (status !== "authenticated") return;
    (async () => {
      const res = await fetch("/api/operator", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data) setExisting(data);
      }
      setLoading(false);
    })();
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          whatsapp,
          website,
          description,
          licenseNo,
          insurance,
          yearsActive,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d?.error || "Submission failed");
        return;
      }
      const data = await res.json();
      setExisting(data);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in to apply</h1>
          <p className="text-gray-600 mb-6">Operators apply through their Voyra account.</p>
          <Link
            href="/login?callbackUrl=/operator/apply"
            className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-full hover:bg-[#005ba6] transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">List your tours on Voyra</h1>
          <p className="text-sm text-gray-500">
            We work with licensed Bali operators. Apply in 3 minutes — our team reviews each application.
          </p>
        </div>

        {existing ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${STATUS_BADGE[existing.status]}`}
              >
                {existing.status}
              </span>
            </div>
            <h2 className="font-bold text-gray-900 text-xl mb-1">{existing.name}</h2>
            <p className="text-xs text-gray-500 mb-4">Slug: {existing.slug}</p>

            {existing.status === "PENDING" && (
              <p className="text-sm text-gray-600">
                Application received. We respond within 3 business days. We may reach out for additional
                docs (license, insurance certificate, vehicle registration where applicable).
              </p>
            )}
            {existing.status === "APPROVED" && (
              <p className="text-sm text-green-700">
                You&apos;re approved! Operator dashboard coming soon — we&apos;ll email you when listings management goes live.
              </p>
            )}
            {existing.status === "REJECTED" && (
              <>
                <p className="text-sm text-red-700 mb-2">Application rejected.</p>
                {existing.rejectReason && (
                  <p className="text-xs text-gray-500">Reason: {existing.rejectReason}</p>
                )}
              </>
            )}
            {existing.status === "SUSPENDED" && (
              <p className="text-sm text-gray-700">
                Operator account suspended. Contact us via WhatsApp to discuss reinstatement.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <Field label="Operator name *">
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bali Mountain Adventures"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Contact email *">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                />
              </Field>
              <Field label="WhatsApp number">
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+62…"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                />
              </Field>
              <Field label="Website">
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                />
              </Field>
            </div>

            <Field label="Tell us about your operation">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Tour types, regions you cover, fleet/equipment, languages spoken, what makes you different…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE] resize-none"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Indonesian tour licence (TDUP) *">
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  placeholder="TDUP number"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                />
              </Field>
              <Field label="Years operating">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={yearsActive}
                  onChange={(e) => setYearsActive(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={insurance}
                onChange={(e) => setInsurance(e.target.checked)}
                className="w-4 h-4 accent-[#0071CE]"
              />
              I hold active third-party liability insurance
            </label>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3 bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 text-white font-bold rounded-xl transition shadow-sm"
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              By submitting you confirm your operation meets our{" "}
              <Link href="/trust-and-safety" className="text-[#0071CE] hover:underline">
                Trust & Safety
              </Link>{" "}
              standards. We&apos;ll email you within 3 business days.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
