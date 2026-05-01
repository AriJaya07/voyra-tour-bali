"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCurrency } from "@/utils/hooks/useCurrency";
import { isCurrencyCode } from "@/utils/formatPrice";

/**
 * Hydrates the currency store from the user's DB preference on login,
 * and persists subsequent changes back to DB. Guests use in-memory default.
 */
export default function CurrencySync() {
  const { status } = useSession();
  const writeEnabled = useRef(false);

  useEffect(() => {
    writeEnabled.current = false;
    if (status === "loading") return;
    if (status === "unauthenticated") {
      useCurrency.getState().setCurrency("IDR");
      writeEnabled.current = true;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/currency", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (isCurrencyCode(data?.currency)) {
          useCurrency.getState().setCurrency(data.currency);
        }
      } finally {
        if (!cancelled) writeEnabled.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    let prev = useCurrency.getState().currency;
    return useCurrency.subscribe((s) => {
      if (s.currency === prev) return;
      prev = s.currency;
      if (!writeEnabled.current) return;
      if (status !== "authenticated") return;
      fetch("/api/user/currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: s.currency }),
      }).catch(() => null);
    });
  }, [status]);

  return null;
}
