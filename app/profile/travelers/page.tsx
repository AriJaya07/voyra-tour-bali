"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";

const AGE_BANDS = ["ADULT", "CHILD", "INFANT", "SENIOR", "YOUTH"] as const;
type AgeBand = (typeof AGE_BANDS)[number];

interface Traveler {
  id: number;
  firstName: string;
  lastName: string;
  ageBand: AgeBand;
  dateOfBirth: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  nationality: string | null;
  dietaryRequirements: string | null;
  pickupHotel: string | null;
  isLead: boolean;
}

const emptyForm = (): Omit<Traveler, "id"> => ({
  firstName: "",
  lastName: "",
  ageBand: "ADULT",
  dateOfBirth: null,
  passportNumber: null,
  passportExpiry: null,
  nationality: null,
  dietaryRequirements: null,
  pickupHotel: null,
  isLead: false,
});

export default function SavedTravelersPage() {
  const { status } = useSession();
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Omit<Traveler, "id">>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saved-travelers", { cache: "no-store" });
      if (res.ok) setTravelers(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  const startEdit = (t: Traveler) => {
    setEditingId(t.id);
    setForm({
      firstName: t.firstName,
      lastName: t.lastName,
      ageBand: t.ageBand,
      dateOfBirth: t.dateOfBirth ? t.dateOfBirth.slice(0, 10) : null,
      passportNumber: t.passportNumber,
      passportExpiry: t.passportExpiry ? t.passportExpiry.slice(0, 10) : null,
      nationality: t.nationality,
      dietaryRequirements: t.dietaryRequirements,
      pickupHotel: t.pickupHotel,
      isLead: t.isLead,
    });
  };

  const startNew = () => {
    setEditingId("new");
    setForm(emptyForm());
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First name and last name required");
      return;
    }
    setSaving(true);
    try {
      const url = editingId === "new" ? "/api/saved-travelers" : `/api/saved-travelers/${editingId}`;
      const method = editingId === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Traveler saved");
      cancel();
      load();
    } catch {
      toast.error("Failed to save traveler");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this traveler?")) return;
    const res = await fetch(`/api/saved-travelers/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      load();
    } else {
      toast.error("Failed to delete");
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Sign in required</h1>
          <Link href="/login" className="px-6 py-3 bg-[#0071CE] text-white font-bold rounded-full">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Travelers</h1>
            <p className="text-sm text-gray-500 mt-1">Reuse traveler details across bookings.</p>
          </div>
          <Link href="/profile" className="text-sm text-[#0071CE] hover:underline">
            ← Back to profile
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {travelers.length === 0 && editingId !== "new" && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <p className="text-gray-900 font-bold mb-1">No saved travelers yet</p>
                  <p className="text-sm text-gray-500">Add traveler info once, autofill at every checkout.</p>
                </div>
              )}
              {travelers.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900">
                        {t.firstName} {t.lastName}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">{t.ageBand}</span>
                      {t.isLead && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">Lead</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {t.nationality && <p>Nationality: {t.nationality}</p>}
                      {t.passportNumber && <p>Passport: {t.passportNumber}</p>}
                      {t.dietaryRequirements && <p>Dietary: {t.dietaryRequirements}</p>}
                      {t.pickupHotel && <p>Pickup: {t.pickupHotel}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(t)} className="px-3 py-1.5 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg">
                      Edit
                    </button>
                    <button onClick={() => del(t.id)} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {editingId === null ? (
              <button onClick={startNew} className="w-full py-3 bg-[#0071CE] text-white font-bold rounded-xl hover:bg-[#005ba6] transition">
                + Add Traveler
              </button>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h2 className="font-bold text-lg">{editingId === "new" ? "New Traveler" : "Edit Traveler"}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="First Name" required value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
                  <Field label="Last Name" required value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Age Band</label>
                    <select
                      value={form.ageBand}
                      onChange={(e) => setForm({ ...form, ageBand: e.target.value as AgeBand })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
                    >
                      {AGE_BANDS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Field label="Date of Birth" type="date" value={form.dateOfBirth ?? ""} onChange={(v) => setForm({ ...form, dateOfBirth: v || null })} />
                  <Field label="Nationality" value={form.nationality ?? ""} onChange={(v) => setForm({ ...form, nationality: v || null })} />
                  <Field label="Passport Number" value={form.passportNumber ?? ""} onChange={(v) => setForm({ ...form, passportNumber: v || null })} />
                  <Field label="Passport Expiry" type="date" value={form.passportExpiry ?? ""} onChange={(v) => setForm({ ...form, passportExpiry: v || null })} />
                  <Field label="Pickup Hotel" value={form.pickupHotel ?? ""} onChange={(v) => setForm({ ...form, pickupHotel: v || null })} />
                  <div className="sm:col-span-2">
                    <Field
                      label="Dietary Requirements"
                      value={form.dietaryRequirements ?? ""}
                      onChange={(v) => setForm({ ...form, dietaryRequirements: v || null })}
                    />
                  </div>
                  <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isLead}
                      onChange={(e) => setForm({ ...form, isLead: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    Set as lead traveler (used as default contact at checkout)
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={cancel} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-5 py-2.5 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 rounded-xl"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]"
      />
    </div>
  );
}
