"use client";

import { useEffect } from "react";

interface Props {
  slug: string;
}

/**
 * Fires once per mount; the API uses a cookie to dedupe within 24h.
 * Keeps view counts honest against page refreshes / bot prefetch.
 */
export default function ViewCounterBeacon({ slug }: Props) {
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/guides/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      signal: ctrl.signal,
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
    return () => ctrl.abort();
  }, [slug]);
  return null;
}
