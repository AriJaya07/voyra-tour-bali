"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import BellIcon from "@/components/assets/Icon/shared/BellIcon";
import NotificationPanel from "./NotificationPanel";
import { useNotificationCount } from "@/utils/hooks/useNotifications";

interface Props {
  variant?: "desktop" | "mobile";
}

export default function NotificationBell({ variant = "desktop" }: Props) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const { unread, refresh, setUnread } = useNotificationCount();

  if (status !== "authenticated") return null;

  const isMobile = variant === "mobile";
  const dim = isMobile ? "h-9 w-9" : "h-10 w-10";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            setOpen(true);
            void refresh();
          }
        }}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className={`relative ${dim} flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 hover:text-[#0071CE] cursor-pointer`}
      >
        <BellIcon className={isMobile ? "w-5 h-5" : "w-5 h-5"} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        onUnreadCountChange={setUnread}
      />
    </div>
  );
}
