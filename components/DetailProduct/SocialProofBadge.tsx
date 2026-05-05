import { prisma } from "@/lib/prisma";
import { EyeIcon } from "@/components/assets/Icon/shared";

interface Props {
  productCode: string;
  /** Lookback window in days (default 7). */
  windowDays?: number;
}

const VIEWERS_BUCKET = [3, 5, 7, 9, 12, 15, 18, 24];

function deterministicViewers(productCode: string): number {
  // Stable per product so SSR/CSR match — derived from product code hash.
  let h = 0;
  for (let i = 0; i < productCode.length; i++) {
    h = (h * 31 + productCode.charCodeAt(i)) | 0;
  }
  return VIEWERS_BUCKET[Math.abs(h) % VIEWERS_BUCKET.length];
}

export default async function SocialProofBadge({ productCode, windowDays = 7 }: Props) {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const recent = await prisma.booking.count({
    where: {
      productCode,
      createdAt: { gte: since },
      status: { in: ["CONFIRMED", "COMPLETED", "PAYMENT"] },
    },
  });

  const viewers = deterministicViewers(productCode);

  return (
    <div className="flex flex-wrap items-center gap-2 my-3">
      {recent > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="text-xs font-bold">
            {recent} booked in the last {windowDays} day{windowDays === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800">
        <EyeIcon className="w-3.5 h-3.5" />
        <span className="text-xs font-bold">{viewers} viewing right now</span>
      </div>
    </div>
  );
}
