"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const handle = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => null);
    };

    if (document.readyState === "complete") handle();
    else window.addEventListener("load", handle);
    return () => window.removeEventListener("load", handle);
  }, []);

  return null;
}
