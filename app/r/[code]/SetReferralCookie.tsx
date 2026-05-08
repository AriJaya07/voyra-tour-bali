"use client";

import { useEffect } from "react";

export default function SetReferralCookie({ code }: { code: string }) {
  useEffect(() => {
    if (!code) return;
    fetch("/api/referrals/attribute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      keepalive: true,
    }).catch(() => {});
  }, [code]);

  return null;
}
