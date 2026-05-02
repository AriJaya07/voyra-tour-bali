"use client";

import { useTrackRecentlyViewed } from "@/utils/hooks/useRecentlyViewed";

interface Props {
  productCode: string;
  source: "viator" | "local" | "tourcms";
  title: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  href: string;
}

export default function RecentlyViewedTracker(props: Props) {
  useTrackRecentlyViewed(props);
  return null;
}
