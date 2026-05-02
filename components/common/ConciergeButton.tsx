"use client";

import { buildWhatsAppUrl } from "@/lib/config";
import WhatsAppIcon from "@/components/assets/sosmed/WhatsAppIcon";

interface Props {
  productTitle: string;
  productCode?: string;
  className?: string;
}

export default function ConciergeButton({ productTitle, productCode, className = "" }: Props) {
  const ref = productCode ? ` (ref: ${productCode})` : "";
  const url = buildWhatsAppUrl(
    `Hello! I'm looking at "${productTitle}"${ref} on Voyra Bali. Can you help me with availability, pickup, or pricing?`
  );

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ask our local team"
      className={`inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl transition shadow-sm ${className}`}
    >
      <WhatsAppIcon className="w-4 h-4" />
      Ask our local team
    </a>
  );
}
