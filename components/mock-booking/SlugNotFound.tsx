"use client";

import Link from "next/link";

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
            <svg
              className="w-14 h-14 text-[#0071CE]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Explore Our Tours
          </Link>

          <a
            href={`https://api.whatsapp.com/send?phone=${(process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890").replace(/\D/g, "")}&text=${encodeURIComponent("Hello Voyra Bali! I'm looking for a tour but the link I received seems to have expired. Can you help me find the right one? 🙏")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
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
