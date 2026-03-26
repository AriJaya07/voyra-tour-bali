"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Container from '@/components/Container';
import { checkAvailability, createBooking } from '@/lib/api/viator-client';

interface PaxMixItem {
  ageBand: string;
  numberOfTravelers: number;
}

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const productCode = searchParams.get('productCode') || "";
  const productOptionCode = searchParams.get('productOptionCode') || "";
  const title = searchParams.get('title') || "";
  const date = searchParams.get('date') || "";
  const currency = searchParams.get('currency') || "USD";
  const paxMixStr = searchParams.get('paxMix') || "[]";
  const initialPrice = Number(searchParams.get('total')) || 0;

  const [paxMix, setPaxMix] = useState<PaxMixItem[]>([]);
  const [price, setPrice] = useState<number>(initialPrice);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    termAccepted: false
  });

  useEffect(() => {
    if (!session?.user) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const profile = await res.json();

        setForm(prev => ({
          ...prev,
          firstName: prev.firstName || profile.name?.split(' ')[0] || '',
          lastName: prev.lastName || profile.name?.split(' ').slice(1).join(' ') || '',
          email: prev.email || profile.email || '',
          phone: prev.phone || profile.phone || '',
        }));
      } catch {
        const name = session.user.name || '';
        setForm(prev => ({
          ...prev,
          firstName: prev.firstName || name.split(' ')[0] || '',
          lastName: prev.lastName || name.split(' ').slice(1).join(' ') || '',
          email: prev.email || session.user.email || '',
        }));
      }
    };

    fetchProfile();
  }, [session]);

  useEffect(() => {
    try {
      setPaxMix(JSON.parse(paxMixStr));
    } catch (e) {
      console.error(e);
    }
  }, [paxMixStr]);

  useEffect(() => {
    if (!productCode || !date || paxMix.length === 0) return;

    const check = async () => {
      try {
        setIsChecking(true);
        const data = await checkAvailability({ productCode, ...(productOptionCode && { productOptionCode }), travelDate: date, paxMix, currency });

        if (data.available !== false) {
          const apiPrice = data.bookableItems?.[0]?.totalPrice?.price?.recommendedRetailPrice;
          if (apiPrice && apiPrice !== price) {
            toast.info(`Price updated from ${price} ${currency} to ${apiPrice} ${currency} based on live availability.`);
            setPrice(apiPrice);
          }
          setAvailabilityChecked(true);
        } else {
          setErrorMsg("This activity is no longer available for the selected date/travelers.");
        }
      } catch {
        setErrorMsg("Failed to check live availability.");
      } finally {
        setIsChecking(false);
      }
    };
    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paxMix]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.termAccepted) return toast.warning("Please accept the Terms of Use.");
    if (!productCode || !availabilityChecked) return;

    setIsBooking(true);
    try {
      const data = await createBooking({
        productCode,
        ...(productOptionCode && { productOptionCode }),
        travelDate: date,
        paxMix,
        bookerInfo: { firstName: form.firstName, lastName: form.lastName },
        communication: { email: form.email, phone: form.phone },
      });

      if (data.bookingRef) {
        const totalTravelers = paxMix.reduce((acc: number, t: PaxMixItem) => acc + t.numberOfTravelers, 0);
        const queryParams = new URLSearchParams({
          ref: data.bookingRef,
          title,
          date,
          pax: totalTravelers.toString(),
          total: price.toString(),
          currency,
          status: data.status || "PENDING",
          voucher: data.voucherInfo?.url || ""
        });
        router.push(`/booking-success?${queryParams.toString()}`);
      } else {
        toast.error(data.error || "Could not complete booking.");
      }
    } catch {
      toast.error("An error occurred during booking. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  const totalTravelers = paxMix.reduce((acc: number, t: PaxMixItem) => acc + t.numberOfTravelers, 0);

  if (!productCode) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
          <p className="text-sm text-gray-500 font-medium">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pt-10 pb-8 sm:pb-16">
      <Container>
        {/* Page Header */}
        <div className="max-w-5xl mx-auto mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#0071CE]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Secure Checkout</h1>
              <p className="text-sm text-gray-500 hidden sm:block">Complete your booking details below</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-[#0071CE]">
              <span className="w-6 h-6 rounded-full bg-[#0071CE] text-white flex items-center justify-center text-[10px] font-bold">1</span>
              <span className="hidden sm:inline">Details</span>
            </span>
            <div className="flex-1 h-px bg-gray-300 max-w-[60px]" />
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-bold">2</span>
              <span className="hidden sm:inline">Payment</span>
            </span>
            <div className="flex-1 h-px bg-gray-300 max-w-[60px]" />
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-bold">3</span>
              <span className="hidden sm:inline">Confirmation</span>
            </span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto flex flex-col lg:grid lg:grid-cols-5 gap-6 lg:gap-8">

          {/* Left: Form */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            {errorMsg ? (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 sm:p-5 rounded-2xl mb-6 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-bold text-sm mb-1">Availability Issue</p>
                  <p className="text-sm">{errorMsg}</p>
                </div>
              </div>
            ) : isChecking ? (
              <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-2xl shadow-sm">
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0071CE] border-t-transparent" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">Checking availability</p>
                    <p className="text-xs text-gray-500 mt-1">Confirming live prices & availability...</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBooking} className="space-y-5">
                {/* Traveler Details Card */}
                <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">Lead Traveler Details</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">First Name</label>
                      <input id="firstName" required type="text" placeholder="Enter first name" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Last Name</label>
                      <input id="lastName" required type="text" placeholder="Enter last name" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input id="email" required type="email" placeholder="you@example.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                      <input id="phone" required type="tel" placeholder="+62 812 3456 7890" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071CE]/30 focus:border-[#0071CE] transition" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Terms & Submit Card */}
                <div className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-[#F0F0F0]">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-[#0071CE]/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#0071CE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">Terms & Conditions</h2>
                  </div>

                  <label htmlFor="termAccept" className="flex items-start gap-3.5 p-4 rounded-xl bg-[#F8F8F8] border border-gray-100 cursor-pointer hover:border-[#0071CE]/30 transition group">
                    <input type="checkbox" id="termAccept" required checked={form.termAccepted} onChange={e => setForm({...form, termAccepted: e.target.checked})} className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[#0071CE] focus:ring-[#0071CE] shrink-0" />
                    <span className="text-sm text-gray-600 leading-relaxed">
                      By clicking &apos;Confirm Booking&apos;, you agree to Viator&apos;s Customer Terms of Use and Privacy Statement, and you also agree to enter into a direct contract with the supplier of the experience as described on the listing page.
                    </span>
                  </label>

                  <button type="submit" disabled={isBooking || !availabilityChecked} className="w-full mt-5 bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2">
                    {isBooking ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Confirming Booking...
                      </>
                    ) : (
                      <>
                        Confirm Booking
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right: Summary Sidebar */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="lg:sticky lg:top-28 space-y-4">
              {/* Booking Summary Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] overflow-hidden">
                <div className="bg-[#0071CE] px-5 sm:px-6 py-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Booking Summary
                  </h2>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
                    <p className="text-sm font-bold text-gray-900 leading-snug">{title}</p>
                  </div>
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Date
                      </span>
                      <span className="text-sm font-bold text-gray-900">{date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Travelers
                      </span>
                      <span className="text-sm font-bold text-gray-900">{totalTravelers} pax</span>
                    </div>
                  </div>
                  <div className="bg-[#F8F8F8] rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-700">Total Price</span>
                      <span className="text-xl sm:text-2xl font-black text-[#0071CE]">{price.toLocaleString()} {currency}</span>
                    </div>
                    <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      No hidden fees. Taxes included.
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-4 sm:p-5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-600">Secure</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-600">Instant</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-gray-600">Top Rated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </Container>
    </div>
  );
}
