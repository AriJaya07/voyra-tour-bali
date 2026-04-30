"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function UnsubscribeInner() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email || !token) {
      setState("error");
      setError("This unsubscribe link is missing required parameters.");
    }
  }, [email, token]);

  const submit = async () => {
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setError(data.error || "Failed to unsubscribe.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📭</div>
          <h1 className="text-2xl font-bold text-gray-900">Unsubscribe</h1>
        </div>

        {state === "done" ? (
          <div className="text-center">
            <p className="text-gray-700 mb-2">
              You&apos;ve been unsubscribed from Voyra newsletter emails.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              We&apos;re sorry to see you go. You can resubscribe anytime from our site footer.
            </p>
            <Link href="/" className="inline-block px-6 py-3 bg-[#0071CE] text-white font-bold rounded-xl hover:bg-[#005ba6] transition">
              Back to Home
            </Link>
          </div>
        ) : state === "error" ? (
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-2">{error || "Something went wrong."}</p>
            <p className="text-sm text-gray-500 mb-6">
              If you keep receiving emails, contact us at <a href="mailto:support@voyra.tours" className="text-[#0071CE] underline">support@voyra.tours</a>.
            </p>
            <Link href="/" className="inline-block px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">
              Back to Home
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-700 mb-2">Confirm unsubscribe for:</p>
            <p className="font-bold text-gray-900 mb-6 break-all">{email || "(no email)"}</p>
            <button
              onClick={submit}
              disabled={state === "submitting" || !email || !token}
              className="w-full py-3 bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 text-white font-bold rounded-xl transition"
            >
              {state === "submitting" ? "Unsubscribing…" : "Yes, unsubscribe me"}
            </button>
            <Link href="/" className="block mt-3 text-center text-sm text-gray-500 hover:text-gray-700">
              Cancel — keep me subscribed
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent" /></div>}>
      <UnsubscribeInner />
    </Suspense>
  );
}
