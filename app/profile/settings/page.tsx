"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h1>
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

  const exportData = () => {
    window.location.href = "/api/account/export";
  };

  const deleteAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Delete failed");
        setDeleting(false);
        return;
      }
      // Sign out + redirect home
      await signOut({ callbackUrl: "/" });
      router.replace("/");
    } catch {
      setError("Network error");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/profile" className="text-sm text-[#0071CE] hover:underline">
            ← Back to Profile
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Account Settings</h1>
        <p className="text-sm text-gray-500 mb-6">
          Export your data or close your account.
        </p>

        {/* Export */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-5">
          <h2 className="font-bold text-gray-900 mb-1">Export your data</h2>
          <p className="text-sm text-gray-500 mb-4">
            Download a JSON file with everything we have on your account: profile, preferences, bookings,
            wishlist, notes, itineraries.
          </p>
          <button
            onClick={exportData}
            className="px-5 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-xl transition shadow-sm"
          >
            ⬇ Download my data
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-5">
          <h2 className="font-bold text-gray-900 mb-1">Notifications</h2>
          <p className="text-sm text-gray-500 mb-4">
            Manage trip reminders, volcano/weather alerts, and marketing emails.
          </p>
          <Link
            href="/profile/notifications"
            className="inline-block px-5 py-2.5 bg-blue-50 text-[#0071CE] hover:bg-blue-100 text-sm font-bold rounded-xl transition border border-blue-100"
          >
            Manage notifications →
          </Link>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border-2 border-red-200 p-5 sm:p-6 shadow-sm">
          <h2 className="font-bold text-red-700 mb-1">Danger zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Closing your account removes your profile, wishlist, notes, itineraries, and preferences.
            Past bookings are anonymised and retained for legal/tax reasons.
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full sm:w-48 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
          />
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <button
            onClick={deleteAccount}
            disabled={deleting || confirmText !== "DELETE"}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition shadow-sm"
          >
            {deleting ? "Deleting…" : "Permanently delete my account"}
          </button>
        </div>
      </div>
    </div>
  );
}
