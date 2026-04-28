"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";

import { useStartTourcmsBooking } from "@/utils/hooks/useTourcms";
import {
  TOURCMS_MIDTRANS_SNAP_URL,
  TOURCMS_MIDTRANS_CLIENT_KEY,
} from "@/components/tourcms/snapClientConfig";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: Record<string, unknown>) => void;
    };
  }
}

interface Traveler {
  firstName: string;
  lastName: string;
  ageBand: "ADULT" | "CHILD";
}

export default function TourcmsCheckoutForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { startBooking, starting } = useStartTourcmsBooking();

  const productCode = sp.get("productCode") || "";
  const componentKey = sp.get("componentKey") || "";
  const rateId = sp.get("rateId") || "";
  const productTitle = sp.get("productTitle") || "Tour";
  const productImage = sp.get("productImage") || undefined;
  const travelDate = sp.get("travelDate") || "";
  const travelTime = sp.get("travelTime") || undefined;
  const adults = Number(sp.get("adults") || 1);
  const children = Number(sp.get("children") || 0);
  const totalPriceSource = Number(sp.get("totalPriceSource") || 0);
  const currencySource = sp.get("currencySource") || "USD";

  const [leadFirstName, setLeadFirstName] = useState("");
  const [leadLastName, setLeadLastName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [edits, setEdits] = useState<
    Record<string, { firstName?: string; lastName?: string }>
  >({});

  const travelers: Traveler[] = useMemo(() => {
    const out: Traveler[] = [];
    for (let i = 0; i < adults; i++) {
      const k = `A-${i}`;
      out.push({
        firstName: edits[k]?.firstName ?? "",
        lastName: edits[k]?.lastName ?? "",
        ageBand: "ADULT",
      });
    }
    for (let i = 0; i < children; i++) {
      const k = `C-${i}`;
      out.push({
        firstName: edits[k]?.firstName ?? "",
        lastName: edits[k]?.lastName ?? "",
        ageBand: "CHILD",
      });
    }
    return out;
  }, [adults, children, edits]);

  const paxMix = useMemo(() => {
    const mix = [{ ageBand: "ADULT", numberOfTravelers: adults }];
    if (children > 0) mix.push({ ageBand: "CHILD", numberOfTravelers: children });
    return mix;
  }, [adults, children]);

  function update(idx: number, field: "firstName" | "lastName", value: string) {
    const ageBand = travelers[idx]?.ageBand;
    if (!ageBand) return;
    const localIdx =
      ageBand === "ADULT" ? idx : idx - adults;
    const key = `${ageBand === "ADULT" ? "A" : "C"}-${localIdx}`;
    setEdits((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!productCode || !travelDate || !componentKey) {
      toast.error("Missing tour details — please re-select date and rate");
      return;
    }
    if (!leadFirstName || !leadLastName || !leadEmail || !leadPhone) {
      toast.error("Please fill in lead contact details");
      return;
    }
    try {
      const res = await startBooking({
        productCode,
        componentKey,
        productOptionCode: rateId || undefined,
        productTitle,
        productImage,
        travelDate,
        travelTime,
        paxMix,
        totalPriceSource,
        currencySource,
        travelers,
        leadFirstName,
        leadLastName,
        leadEmail,
        leadPhone,
      });

      if (typeof window !== "undefined" && window.snap) {
        window.snap.pay(res.snapToken, {
          onSuccess: () =>
            router.push(`/tourcms/booking-success?orderId=${res.orderId}`),
          onPending: () =>
            router.push(`/tourcms/booking-success?orderId=${res.orderId}`),
          onError: () =>
            router.push(`/tourcms/booking-success?orderId=${res.orderId}`),
          onClose: () =>
            router.push(`/tourcms/booking-success?orderId=${res.orderId}`),
        });
      } else if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start booking";
      toast.error(msg);
    }
  }

  return (
    <>
      <Script
        src={TOURCMS_MIDTRANS_SNAP_URL}
        data-client-key={TOURCMS_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
      <form
        onSubmit={submit}
        className="max-w-2xl mx-auto py-10 space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold">Checkout — TourCMS</h1>
          <p className="text-gray-500 text-sm">{productTitle}</p>
        </div>

        <section className="border rounded-xl p-4 bg-white">
          <h2 className="font-semibold mb-3">Lead contact</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First name"
              value={leadFirstName}
              onChange={(e) => setLeadFirstName(e.target.value)}
              className="px-3 py-2 border rounded text-sm"
              required
            />
            <input
              placeholder="Last name"
              value={leadLastName}
              onChange={(e) => setLeadLastName(e.target.value)}
              className="px-3 py-2 border rounded text-sm"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              className="px-3 py-2 border rounded text-sm col-span-2"
              required
            />
            <input
              placeholder="Phone (e.g. +6281234567890)"
              value={leadPhone}
              onChange={(e) => setLeadPhone(e.target.value)}
              className="px-3 py-2 border rounded text-sm col-span-2"
              required
            />
          </div>
        </section>

        <section className="border rounded-xl p-4 bg-white">
          <h2 className="font-semibold mb-3">Travelers</h2>
          {travelers.map((t, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <input
                placeholder={`${t.ageBand} first name`}
                value={t.firstName}
                onChange={(e) => update(i, "firstName", e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
              <input
                placeholder="Last name"
                value={t.lastName}
                onChange={(e) => update(i, "lastName", e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
              <span className="px-3 py-2 text-xs text-gray-500 self-center">
                {t.ageBand}
              </span>
            </div>
          ))}
        </section>

        <section className="border rounded-xl p-4 bg-white">
          <div className="flex justify-between text-sm mb-1">
            <span>Travel date</span>
            <span>{travelDate}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span>Pax</span>
            <span>{adults} adult · {children} child</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
            <span>Total ({currencySource})</span>
            <span>{currencySource} {totalPriceSource.toLocaleString()}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Charged in IDR via Midtrans at the rate captured at this step.
          </p>
        </section>

        <button
          type="submit"
          disabled={starting}
          className="w-full py-3 bg-[#0071CE] text-white font-bold rounded-xl disabled:bg-gray-400"
        >
          {starting ? "Preparing…" : "Pay now"}
        </button>
      </form>
    </>
  );
}
