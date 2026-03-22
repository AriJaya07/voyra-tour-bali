"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Container from '@/components/Container';

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const productCode = searchParams.get('productCode') || "";
  const title = searchParams.get('title') || "";
  const date = searchParams.get('date') || "";
  const currency = searchParams.get('currency') || "USD";
  const paxMixStr = searchParams.get('paxMix') || "[]";
  const initialPrice = Number(searchParams.get('total')) || 0;
  
  const [paxMix, setPaxMix] = useState<any[]>([]);
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
    try {
      setPaxMix(JSON.parse(paxMixStr));
    } catch (e) {
      console.error(e);
    }
  }, [paxMixStr]);

  // Real-time /availability/check and price update logic
  useEffect(() => {
    if (!productCode || !date || paxMix.length === 0) return;

    const checkAvailability = async () => {
      try {
        setIsChecking(true);
        const res = await fetch('/api/viator/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productCode, travelDate: date, paxMix, currency }),
        });
        const data = await res.json();

        if (res.ok && data.available !== false) {
          const apiPrice = data.bookableItems?.[0]?.totalPrice?.price?.recommendedRetailPrice;
          
          // Price Update Logic
          if (apiPrice && apiPrice !== price) {
             alert(`Price has been updated from ${price} ${currency} to ${apiPrice} ${currency} based on live availability.`);
             setPrice(apiPrice);
          }
          setAvailabilityChecked(true);
        } else {
          setErrorMsg("This activity is no longer available for the selected date/travelers.");
        }
      } catch (error) {
        console.error(error);
        setErrorMsg("Failed to check live availability.");
      } finally {
        setIsChecking(false);
      }
    };
    checkAvailability();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paxMix]); // wait for paxMix to be parsed

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.termAccepted) return alert("Please accept the Terms of Use.");
    if (!productCode || !availabilityChecked) return;

    setIsBooking(true);
    try {
      const res = await fetch('/api/viator/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCode,
          travelDate: date,
          paxMix,
          bookerInfo: {
            firstName: form.firstName,
            lastName: form.lastName
          },
          communication: {
            email: form.email,
            phone: form.phone
          }
        }),
      });
      
      const data = await res.json();

      if (res.ok && data.bookingRef) {
        const totalTravelers = paxMix.reduce((acc: number, t: any) => acc + t.numberOfTravelers, 0);
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
        alert(`Booking Error: ${data.error || "Could not complete booking"}`);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during booking.");
    } finally {
      setIsBooking(false);
    }
  };

  const totalTravelers = paxMix.reduce((acc: number, t: any) => acc + t.numberOfTravelers, 0);

  if (!productCode) {
    return <div className="min-h-[60vh] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-12">
      <Container>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left: Form */}
          <div className="md:col-span-2">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Secure Checkout</h1>
            
            {errorMsg ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">
                {errorMsg}
              </div>
            ) : isChecking ? (
              <div className="bg-blue-50 text-blue-600 p-4 rounded-xl mb-6 animate-pulse">
                Checking live availability & confirming prices...
              </div>
            ) : (
              <form onSubmit={handleBooking} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4">Lead Traveler Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">First Name</label>
                    <input required type="text" className="w-full border rounded-lg px-4 py-2" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Name</label>
                    <input required type="text" className="w-full border rounded-lg px-4 py-2" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input required type="email" className="w-full border rounded-lg px-4 py-2" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone Number</label>
                    <input required type="tel" className="w-full border rounded-lg px-4 py-2" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                </div>

                <hr className="my-6 border-gray-100" />

                {/* Viator Legal Text */}
                <div className="bg-gray-50 p-4 rounded-xl mb-6 flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="termAccept"
                    required
                    checked={form.termAccepted}
                    onChange={e => setForm({...form, termAccepted: e.target.checked})}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-[#0071CE] focus:ring-[#0071CE]"
                  />
                  <label htmlFor="termAccept" className="text-sm text-gray-600">
                    <span className="font-bold block mb-1">Terms & Conditions</span>
                    By clicking 'Book Now', you agree to Viator's Customer Terms of Use and Privacy Statement, and you also agree to enter into a direct contract with the supplier of the experience as described on the listing page.
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={isBooking || !availabilityChecked}
                  className="w-full bg-[#0071CE] hover:bg-[#005ba6] disabled:bg-gray-300 text-white font-bold py-4 rounded-xl transition shadow-md"
                >
                  {isBooking ? "Confirming Booking..." : "Confirm Booking"}
                </button>
              </form>
            )}
          </div>

          {/* Right: Summary */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-lg font-bold mb-4">Booking Summary</h2>
              <div className="space-y-3 text-sm mb-6">
                <div>
                  <span className="text-gray-500 block">Experience</span>
                  <span className="font-bold text-gray-900">{title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-bold text-gray-900">{date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Travelers</span>
                  <span className="font-bold text-gray-900">{totalTravelers} pax</span>
                </div>
              </div>
              <hr className="my-4 border-gray-100" />
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-900 font-bold text-lg">Total</span>
                <span className="text-2xl font-black text-[#0071CE]">{price.toLocaleString()} {currency}</span>
              </div>
              <p className="text-xs text-green-600 font-medium">No hidden fees. Taxes included.</p>
            </div>
          </div>

        </div>
      </Container>
    </div>
  );
}
