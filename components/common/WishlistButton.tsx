"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useWishlistActions, type WishlistItem } from "@/utils/hooks/useWishlist";

interface Props {
  item: WishlistItem;
  className?: string;
  size?: "sm" | "md";
}

export default function WishlistButton({ item, className = "", size = "md" }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = status === "authenticated";
  const { toggle, has } = useWishlistActions(isAuthenticated);
  const active = has(item.productCode, item.source);
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const iconDim = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === "loading") return;
    if (!isAuthenticated) {
      toast.info("Please login to save to wishlist", { duration: 1800 });
      const callback = pathname ? `?callbackUrl=${encodeURIComponent(pathname)}` : "";
      router.push(`/login${callback}`);
      return;
    }
    toggle(item);
    toast.success(active ? "Removed from wishlist" : "Added to wishlist", { duration: 1500 });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      className={`${dim} flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-md hover:scale-110 transition cursor-pointer ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`${iconDim} transition ${active ? "fill-red-500 stroke-red-500" : "fill-none stroke-gray-700"}`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
