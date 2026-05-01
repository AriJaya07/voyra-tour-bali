"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface ImportedTrip {
  id: number;
  productTitle: string;
  travelDate: string | null;
  href: string | null;
}

const SECTIONS: { title: string; items: { label: string; text: string }[] }[] = [
  {
    title: "Money & Connectivity",
    items: [
      {
        label: "Currency",
        text: "Indonesian Rupiah (IDR). Carry small bills (10k–20k) for offerings, parking, small purchases.",
      },
      {
        label: "ATMs",
        text: "Use ATMs inside bank branches or big malls. Avoid street ATMs (skimmer risk). BCA, Mandiri, BNI are reliable.",
      },
      {
        label: "Mobile data",
        text: "Buy a local SIM (Telkomsel/XL) at the airport or order an eSIM (Airalo) before flying — coverage is best with Telkomsel.",
      },
      {
        label: "WiFi",
        text: "Most cafés, villas, hotels have free WiFi. Speed varies; download Netflix/Spotify offline before remote areas.",
      },
    ],
  },
  {
    title: "Transport",
    items: [
      {
        label: "Airport pickup",
        text: "Pre-book to avoid taxi mafia. Grab/Gojek work in airport pickup zones. Most tours cover Ubud, Canggu, Seminyak, Kuta, Sanur, Nusa Dua, Uluwatu.",
      },
      {
        label: "Daily ride",
        text: "Grab/Gojek for short hops in cities. Private driver (~Rp 500k-700k/day) for tour days when not booking a tour.",
      },
      {
        label: "Motorbike",
        text: "Rent at your own risk. Many travel insurance plans require an international motorbike licence. Always wear helmet.",
      },
      {
        label: "Travel time awareness",
        text: "Ubud → Uluwatu = 2-3 hours. Don't pair sunrise Mt Batur with afternoon Uluwatu cliff sunset same day.",
      },
    ],
  },
  {
    title: "Health & Safety",
    items: [
      {
        label: "Drinking water",
        text: "Sealed bottled water only. Avoid ice from street vendors; hotel/café ice is fine.",
      },
      {
        label: "Bali belly",
        text: "Pack oral rehydration salts. Eat at busy warungs (high turnover = fresh).",
      },
      {
        label: "Mosquitoes",
        text: "Dengue is present year-round. Use DEET-based repellent at dawn and dusk.",
      },
      {
        label: "Sun",
        text: "Equator-strength sun. SPF 50+, reapply after swim. Hat + sunglasses essential.",
      },
      {
        label: "Pharmacies",
        text: "Kimia Farma and Guardian are reliable chains. Common meds (paracetamol, antacids) widely available.",
      },
      {
        label: "Emergency",
        text: "Police 110 · Ambulance 118 · Fire 113. Tourist Police Kuta: +62 361 754 599.",
      },
    ],
  },
  {
    title: "Cultural Etiquette",
    items: [
      {
        label: "Temples",
        text: "Sarong + sash required (often free at entrance). Cover shoulders. Don't enter inner sanctum during ceremonies unless invited.",
      },
      {
        label: "Nyepi",
        text: "Day of Silence (March, Balinese New Year). All flights, businesses, and outdoor movement halt for 24 hours. Plan accordingly.",
      },
      {
        label: "Greetings",
        text: "Use right hand only. Slight bow + pressed palms is friendly. Don't pat heads, don't point with feet.",
      },
      {
        label: "Tipping",
        text: "10% in tourist restaurants is appreciated, not mandatory. Spa/massage: round up. Drivers: Rp 50k for half-day, Rp 100k for full-day.",
      },
    ],
  },
  {
    title: "Weather",
    items: [
      {
        label: "Dry season",
        text: "Apr–Oct: best for outdoor tours, surfing, diving. Lower humidity, less rain.",
      },
      {
        label: "Wet season",
        text: "Nov–Mar: afternoon thunderstorms common. Mornings often clear. Indoor tours, cooking classes, spas still great.",
      },
      {
        label: "If rained out",
        text: "Operators reschedule outdoor tours for safety. You'll be contacted with options.",
      },
    ],
  },
  {
    title: "Pre-trip checklist",
    items: [
      { label: "Travel insurance", text: "Cover medical, evacuation, trip cancellation, and motorbike if you'll ride." },
      { label: "Visa", text: "Most countries get Visa-on-Arrival or e-VOA (30 days, ~Rp 500k). Check requirements before flying." },
      { label: "Vaccinations", text: "Routine + consider Hep A, typhoid. Speak to a travel doctor." },
      { label: "Sarong", text: "Pack one or buy at any temple gate (~Rp 50k)." },
      { label: "Reef-safe sunscreen", text: "If snorkeling/diving — protect Bali's reefs." },
      { label: "Cash + card mix", text: "Cash for warungs, markets, parking. Card for hotels, restaurants, fuel." },
    ],
  },
];

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function SurvivalPackPage() {
  const { status } = useSession();
  const [trips, setTrips] = useState<ImportedTrip[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") return;
    fetch("/api/imported-trips", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTrips(Array.isArray(d) ? d : []))
      .catch(() => null);
  }, [status]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = trips
    .filter((t) => t.travelDate && new Date(t.travelDate) >= today)
    .sort((a, b) => new Date(a.travelDate!).getTime() - new Date(b.travelDate!).getTime());

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4 print:bg-white print:pt-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-2 print:hidden">
          <Link href="/profile" className="text-sm text-[#0071CE] hover:underline">
            ← Back to Profile
          </Link>
        </div>

        <div className="flex items-end justify-between mb-6 print:mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bali Survival Pack</h1>
            <p className="text-sm text-gray-500 mt-1">
              Pre-trip cheat sheet — money, transport, safety, etiquette. Print-friendly.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="shrink-0 px-4 py-2 text-sm font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 print:hidden"
          >
            🖨️ Print
          </button>
        </div>

        {upcoming.length > 0 && (
          <div className="bg-gradient-to-br from-[#0071CE] to-[#005ba6] rounded-2xl p-5 text-white mb-6 print:bg-white print:text-gray-900 print:border print:border-gray-200">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">Your upcoming trips</p>
            {upcoming.slice(0, 3).map((t) => (
              <div key={t.id} className="mt-2">
                <p className="font-bold">{t.productTitle}</p>
                <p className="text-xs opacity-80">{fmt(t.travelDate!)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-8 print:shadow-none print:border-0">
          {SECTIONS.map((sec) => (
            <section key={sec.title}>
              <h2 className="font-bold text-gray-900 text-lg mb-3 border-b border-gray-100 pb-2">{sec.title}</h2>
              <dl className="space-y-3">
                {sec.items.map((it) => (
                  <div key={it.label} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <dt className="text-xs font-bold uppercase tracking-wider text-gray-500 sm:col-span-1">
                      {it.label}
                    </dt>
                    <dd className="text-sm text-gray-700 leading-relaxed sm:col-span-3">{it.text}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <div className="border-t border-gray-100 pt-4 text-[11px] text-gray-400">
            Generated from Voyra Bali. For up-to-date safety info, see our{" "}
            <Link href="/trust-and-safety" className="text-[#0071CE] hover:underline">
              Trust & Safety
            </Link>{" "}
            page. WhatsApp +62 857-9213-2517 for live help.
          </div>
        </div>
      </div>
    </div>
  );
}
