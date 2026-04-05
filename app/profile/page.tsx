"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TicketModal from "@/components/profile/TicketModal";
import CancelModal from "@/components/profile/CancelModal";
import { fetchProfile, updateProfile, uploadAvatar, fetchUserBookings } from "@/lib/api/profile";
import VoryaIcon from "@/components/assets/Icon/VoyraIcon";
import { BOOKING_STATUS_MAP } from "@/types/booking";
import type { Booking } from "@/types/booking";
import type { UserProfile, ProfileFormMessage } from "@/types/profile";
import { formatPrice } from "@/utils/formatPrice";

const TABS = ["Upcoming", "Completed", "Cancelled"] as const;
type Tab = (typeof TABS)[number];

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<ProfileFormMessage | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [p, b] = await Promise.all([fetchProfile(), fetchUserBookings()]);
        setProfile(p);
        setName(p.name || "");
        setPhone(p.phone || "");
        setBookings(b);
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
      const p = await updateProfile({ name: name.trim(), phone: phone.trim() || null });
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
      const { url } = await uploadAvatar(file);
      setProfile((p) => (p ? { ...p, image: url } : null));
      setMessage({ type: "success", text: "Profile photo updated successfully" });
      await update();
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Failed to upload profile photo" });
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const [activeTab, setActiveTab] = useState<Tab>("Upcoming");
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);
  const [cancellingTicket, setCancellingTicket] = useState<Booking | null>(null);

  const filteredBookings = bookings.filter((b) => {
    const isPast = new Date(b.travelDate) < new Date(new Date().setHours(0, 0, 0, 0));
    if (activeTab === "Upcoming") {
      // Show PENDING and CONFIRMED that hasn't happened yet
      return b.status !== "CANCELLED" && b.status !== "COMPLETED" && !isPast;
    }
    if (activeTab === "Completed") {
      // Show COMPLETED and CONFIRMED that has already happened
      return b.status === "COMPLETED" || (b.status === "CONFIRMED" && isPast);
    }
    if (activeTab === "Cancelled") {
      return b.status === "CANCELLED";
    }
    return true;
  });

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
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
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

        {/* My Bookings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8" id="my-bookings">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">My Bookings</h2>
          </div>
          <div className="p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-100 pb-4 overflow-x-auto hide-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                    activeTab === tab
                      ? "bg-[#0071CE] text-white shadow-md"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-900 font-bold text-lg mb-1">
                  {bookings.length === 0 ? "You have no bookings yet." : `You have no ${activeTab.toLowerCase()} bookings.`}
                </p>
                <p className="text-sm text-gray-500 mb-6">Start exploring Bali!</p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-xl text-sm hover:bg-[#005ba6] transition shadow-sm"
                >
                  Browse Tours
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredBookings.map((b) => {
                  const statusInfo = BOOKING_STATUS_MAP[b.status] || { label: b.status || "PENDING", className: "bg-gray-100 text-gray-700" };
                  const imageUrl = b.productImage
                  const totalPriceUsd = b.totalPriceUsd || b.totalPrice / 15000;
                  const currency = b.currency || "IDR";
                  const time = b.travelTime || "08:00 AM";

                  return (
                    <div key={b.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:border-[#0071CE]/40 transition bg-white shadow-sm flex flex-col md:flex-row">
                      {(() => {
                        const isPast = new Date(b.travelDate) < new Date(new Date().setHours(0, 0, 0, 0));
                        const statusInfo = BOOKING_STATUS_MAP[b.status] || { label: b.status || "PENDING", className: "bg-gray-100 text-gray-700" };
                        const imageUrl = b.productImage
                        const totalPriceUsd = b.totalPriceUsd || b.totalPrice / 15000;
                        const currency = b.currency || "IDR";
                        const time = b.travelTime || "08:00 AM";
                        return (
                          <>
                            <div className="w-full md:w-48 h-48 md:h-auto bg-gray-200 relative shrink-0">
                              {imageUrl ? (
                                <img src={imageUrl} alt={b.productTitle} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                   <VoryaIcon className="w-24 h-auto opacity-40" />
                                </div>
                              )}
                              <div className="absolute top-3 left-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm backdrop-blur-md bg-white/90 ${statusInfo.className}`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="font-bold text-lg text-gray-900 leading-tight mb-3">
                                  {b.productTitle}
                                </h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                  <div className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">📅</span>
                                    <span>{fmtDate(b.travelDate)} • {time}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">👥</span>
                                    <span>
                                      {b.pax} Guest(s)
                                      {b.travelers && b.travelers.length > 0
                                        ? ` (${b.travelers.map((t) => t.ageBand).join(", ")})`
                                        : ""}
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="shrink-0 mt-0.5">💰</span>
                                    <span className="font-semibold text-gray-900">
                                      {currency} {b.totalPrice.toLocaleString()} {totalPriceUsd ? `/ $${totalPriceUsd.toFixed(2)} USD` : ""}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                                {b.status !== "CANCELLED" && b.status !== "COMPLETED" && isPast && (
                                  <button
                                    onClick={() => setCancellingTicket(b)}
                                    className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition border border-red-100"
                                  >
                                    Cancel
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedTicket(b)}
                                  className="px-5 py-2 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-lg transition shadow-sm"
                                >
                                  View Ticket
                                </button>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-[#0071CE] font-medium hover:underline">
            Back to Home
          </Link>
        </div>
      </div>

      {selectedTicket && (
        <TicketModal booking={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {cancellingTicket && (
        <CancelModal
          booking={cancellingTicket}
          onClose={() => setCancellingTicket(null)}
          onSuccess={() => {
            setCancellingTicket(null);
            setMessage({ type: "success", text: "Your booking has been cancelled. Refund is being processed." });
            setBookings(bookings.map((b) => (b.id === cancellingTicket.id ? { ...b, status: "CANCELLED" } : b)));
          }}
        />
      )}
    </div>
  );
}
