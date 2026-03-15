"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200" },
  CONFIRMED: { label: "Confirmed", className: "bg-blue-100 text-blue-800 border-blue-200" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

import { formatPrice } from "@/utils/formatPrice";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<{
    id: number;
    email: string;
    name: string | null;
    image: string | null;
    phone: string | null;
    role: string;
  } | null>(null);
  const [bookings, setBookings] = useState<
    Array<{
      id: number;
      bookingRef: string;
      productCode: string;
      productTitle: string;
      totalPrice: number;
      travelDate: string;
      pax: number;
      status: string;
      createdAt: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/bookings"),
        ]);
        if (profileRes.ok) {
          const p = await profileRes.json();
          setProfile(p);
          setName(p.name || "");
          setPhone(p.phone || "");
        }
        if (bookingsRes.ok) {
          const b = await bookingsRes.json();
          setBookings(b);
        }
      } catch {
        setMessage({ type: "error", text: "Failed to load data" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [status]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const p = await res.json();
      setProfile(p);
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch {
      setMessage({ type: "error", text: "Failed to save profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/upload-avatar", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setProfile((p) => (p ? { ...p, image: url } : null));
      setMessage({ type: "success", text: "Profile photo updated successfully" });
      await update(); // Refresh session so navbar shows new image
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Failed to upload profile photo" });
    } finally {
      setSaving(false);
      e.target.value = "";
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
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">You are not signed in</h1>
          <p className="text-gray-600 mb-6">Please sign in to view your profile</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-full hover:bg-[#005ba6] transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl = profile?.image || (session?.user as { image?: string })?.image || "/images/people.png";

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Profile</h1>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl border ${
              message.type === "success" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="h-2 bg-gradient-to-r from-[#0071CE] to-[#005ba6]" />
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  <div className="relative group">
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover border-4 border-[#0071CE]/20"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition text-white text-xs font-medium"
                    >
                      Change Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={profile?.email || ""}
                      disabled
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 text-white font-bold rounded-xl transition shadow-sm"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Booking history */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Booking History</h2>
            <p className="text-sm text-gray-500 mt-0.5">List of bookings you have made</p>
          </div>
          <div className="p-6">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">No bookings yet</p>
                <p className="text-sm text-gray-500 mt-1">Book a tour package to see your history here</p>
                <Link
                  href="/#paket"
                  className="inline-block mt-4 px-5 py-2.5 bg-[#0071CE] text-white font-bold rounded-full text-sm hover:bg-[#005ba6] transition"
                >
                  View Packages
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Flow chart / status legend */}
                <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-xl">
                  {Object.entries(STATUS_LABELS).map(([key, { label, className }]) => (
                    <span key={key} className={`px-3 py-1 rounded-full text-xs font-semibold border ${className}`}>
                      {label}
                    </span>
                  ))}
                </div>

                {bookings.map((b) => {
                  const statusInfo = STATUS_LABELS[b.status] || { label: b.status, className: "bg-gray-100 text-gray-700" };
                  return (
                    <div
                      key={b.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-[#0071CE]/30 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900">{b.productTitle}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            Ref: {b.bookingRef} · {b.pax} guest(s) · {fmtDate(b.travelDate)}
                          </p>
                          <p className="text-sm font-semibold text-[#0071CE] mt-2">{formatPrice(b.totalPrice)}</p>
                        </div>
                        <span
                          className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-[#0071CE] font-medium hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
