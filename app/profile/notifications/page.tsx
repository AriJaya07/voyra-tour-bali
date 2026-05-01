"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Prefs {
  weatherAlerts: boolean;
  volcanoAlerts: boolean;
  nyepiAlert: boolean;
  tripReminders: boolean;
  marketingEmails: boolean;
}

const DEFAULTS: Prefs = {
  weatherAlerts: false,
  volcanoAlerts: true,
  nyepiAlert: true,
  tripReminders: true,
  marketingEmails: false,
};

const TOGGLES: { id: keyof Prefs; emoji: string; label: string; help: string }[] = [
  {
    id: "tripReminders",
    emoji: "📅",
    label: "Trip reminders",
    help: "Get an email 7 days and 1 day before each imported trip with weather + tips.",
  },
  {
    id: "volcanoAlerts",
    emoji: "🌋",
    label: "Volcano alerts",
    help: "Notify if Mt Agung or Mt Batur status escalates near your travel date.",
  },
  {
    id: "weatherAlerts",
    emoji: "🌧️",
    label: "Weather alerts",
    help: "Heavy rain or storm warnings for outdoor tour days.",
  },
  {
    id: "nyepiAlert",
    emoji: "🛕",
    label: "Nyepi reminder",
    help: "Annual reminder before Bali's Day of Silence (full island shutdown).",
  },
  {
    id: "marketingEmails",
    emoji: "✉️",
    label: "Newsletter & offers",
    help: "Occasional Bali tips and tour offers. Off by default.",
  },
];

export default function NotificationsPage() {
  const { status } = useSession();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") return;
    (async () => {
      try {
        const res = await fetch("/api/user/notification-preferences", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setPrefs({
          weatherAlerts: !!data.weatherAlerts,
          volcanoAlerts: data.volcanoAlerts ?? true,
          nyepiAlert: data.nyepiAlert ?? true,
          tripReminders: data.tripReminders ?? true,
          marketingEmails: !!data.marketingEmails,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const toggle = (id: keyof Prefs) => {
    setPrefs((p) => ({ ...p, [id]: !p[id] }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to save" });
        return;
      }
      setMessage({ type: "success", text: "Notification preferences saved" });
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/profile" className="text-sm text-[#0071CE] hover:underline">
            ← Back to Profile
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Notifications</h1>
        <p className="text-sm text-gray-500 mb-6">
          Choose what alerts and reminders you want by email.
        </p>

        {message && (
          <div
            className={`mb-5 px-4 py-3 rounded-xl border text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm space-y-4">
          {TOGGLES.map((t) => (
            <label
              key={t.id}
              className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 -mx-3 px-3 py-2 rounded-lg transition"
            >
              <span className="text-xl shrink-0 mt-0.5" aria-hidden>
                {t.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t.help}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[t.id]}
                onClick={() => toggle(t.id)}
                className={`relative w-11 h-6 rounded-full transition shrink-0 ${
                  prefs[t.id] ? "bg-[#0071CE]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${
                    prefs[t.id] ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
          ))}
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-3 bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 text-white font-bold rounded-xl transition shadow-sm"
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
