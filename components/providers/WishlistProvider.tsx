"use client";

import { useSession } from "next-auth/react";
import { useWishlistSync } from "@/utils/hooks/useWishlist";

export default function WishlistProvider() {
  const { status } = useSession();
  useWishlistSync(status);
  return null;
}
