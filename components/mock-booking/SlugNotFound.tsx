"use client";

import Link from "next/link";
import { SearchIcon, LinkBrokenIcon } from "@/components/assets/Icon/shared";
import WhatsAppIcon from "@/components/assets/sosmed/WhatsAppIcon";

interface SlugNotFoundProps {
  slug?: string;
}

export default function SlugNotFound({ slug }: SlugNotFoundProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F7FF] via-white to-[#F5F0FF] flex items-center justify-center px-4 py-20">
      <div className="max-w-lg w-full text-center">

        {/* Animated illustration */}
        <div className="relative mx-auto mb-8 w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#0071CE]/20 to-[#5B4DFF]/10 animate-pulse" />
          <div className="absolute inset-3 rounded-full bg-white shadow-lg flex items-center justify-center">
            <LinkBrokenIcon className="w-14 h-14 text-[#0071CE]" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 tracking-tight">
          Link Not Found
        </h1>
        <p className="text-base text-gray-500 leading-relaxed mb-2">
          The booking link <span className="font-semibold text-gray-700">{slug ? `"/v/${slug}"` : "you visited"}</span> doesn&apos;t exist or may have expired.
        </p>
        <p className="text-sm text-gray-400 mb-10">
          This could be because the tour was removed, the link was mistyped, or this offer has ended.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <SearchIcon className="w-4 h-4" />
            Explore Our Tours
          </Link>

          <a
            href={`https://api.whatsapp.com/send?phone=${(process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890").replace(/\D/g, "")}&text=${encodeURIComponent("Hello Voyra Bali! I'm looking for a tour but the link I received seems to have expired. Can you help me find the right one? 🙏")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Chat with Us
          </a>
        </div>

        {/* Trust note */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium">
            Need help?{" "}
            <a href="/" className="text-[#0071CE] hover:underline font-semibold">
              Return to Voyra Bali
            </a>{" "}
            or contact our team via WhatsApp.
          </p>
        </div>

      </div>
    </div>
  );
}
