"use client";

import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/Navbar/MobileBottomNav";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/common/CookieConsent";
import { usePathname } from "next/navigation";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isDashboard = pathname.startsWith("/dashboard");

  return (
    <>
      {!isDashboard && <Navbar />}

      <div className={!isDashboard ? "pt-[60px]" : ""}>
        {children}
      </div>

      {!isDashboard && <Footer />}
      {!isDashboard && <MobileBottomNav />}
      {!isDashboard && <CookieConsent />}
    </>
  );
}
