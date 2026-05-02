"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "voyra_cookie_consent_v1";

type Choice = "accepted" | "essential";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (!v) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const save = (choice: Choice) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, ts: new Date().toISOString() })
      );
    } catch {}
    setShow(false);

    const w = window as any;
    if (typeof w.gtag === "function") {
      const state = choice === "accepted" ? "granted" : "denied";
      w.gtag("consent", "update", {
        ad_storage: state,
        ad_user_data: state,
        ad_personalization: state,
        analytics_storage: state,
      });
    }

    if (choice === "accepted") {
      window.dispatchEvent(new CustomEvent("voyra:cookie-accepted"));
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-md z-[80]">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-5">
        <p className="text-sm font-bold text-gray-900 mb-1">We use cookies</p>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          Voyra uses essential cookies to keep you signed in and remember your currency. With your
          permission, we also use analytics cookies to understand which Bali tours travelers love
          most. See our{" "}
          <Link href="/privacy" className="text-[#0071CE] font-bold underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => save("essential")}
            className="flex-1 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Essential only
          </button>
          <button
            onClick={() => save("accepted")}
            className="flex-1 px-3 py-2 text-xs font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] rounded-lg"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
