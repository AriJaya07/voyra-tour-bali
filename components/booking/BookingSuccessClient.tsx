"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Container from '@/components/Container';

export default function BookingSuccessClient() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const title = searchParams.get('title');
  const date = searchParams.get('date');
  const pax = searchParams.get('pax');
  const total = searchParams.get('total');
  const currency = searchParams.get('currency') || "USD";
  const status = searchParams.get('status') || "PENDING";
  const voucher = searchParams.get('voucher');

  if (!ref) {
    return (
      <div className="min-h-screen pt-24 text-center">
        <h2 className="text-2xl font-bold">Booking Details Not Found</h2>
        <p className="mt-4 text-gray-500">Your booking reference could not be located in the URL.</p>
        <Link href="/" className="inline-block mt-6 bg-[#0071CE] text-white px-6 py-3 rounded-lg font-bold">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4 py-12 pt-28">
      <div className="max-w-md w-full bg-white rounded-[24px] p-8 sm:p-10 shadow-lg text-center border border-gray-100">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white ring-4 ${status === 'CONFIRMED' ? 'bg-green-100 text-green-500 ring-green-50' : 'bg-yellow-100 text-yellow-500 ring-yellow-50'}`}>
          {status === 'CONFIRMED' ? (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{status === 'CONFIRMED' ? 'Booking Confirmed!' : 'Booking Pending...'}</h1>
        <p className="text-gray-500 mb-8 font-medium">Your adventure has been secured.</p>
        
        <div className="bg-[#F8F8F8] rounded-2xl p-5 text-left space-y-4 mb-8">
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <span className="text-gray-500 text-sm font-medium">Booking ID</span> 
            <strong className="text-[#0071CE] font-bold">{ref}</strong>
          </div>
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <span className="text-gray-500 text-sm font-medium">Status</span> 
            <strong className={`font-bold ${status === 'CONFIRMED' ? 'text-green-600' : 'text-yellow-600'}`}>{status}</strong>
          </div>
          <div className="border-b border-gray-200 pb-3">
            <span className="text-gray-500 text-sm font-medium block mb-1">Tour</span> 
            <strong className="block text-gray-900 leading-snug">{title}</strong>
          </div>
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <span className="text-gray-500 text-sm font-medium">Date</span> 
            <strong className="text-gray-900">{date}</strong>
          </div>
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <span className="text-gray-500 text-sm font-medium">Travelers</span> 
            <strong className="text-gray-900">{pax} pax</strong>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-gray-500 text-sm font-medium">Total Paid</span> 
            <strong className="text-xl text-gray-900 font-black">{total} {currency}</strong>
          </div>
        </div>

        {voucher && (
          <a href={voucher} target="_blank" rel="noopener noreferrer" className="block w-full bg-[#25D366] text-white font-bold py-4 rounded-xl hover:bg-[#1ebe5d] transition shadow-md mb-3">
            Open Voucher
          </a>
        )}

        <Link href="/" className="block w-full bg-[#0071CE] text-white font-bold py-4 rounded-xl hover:bg-[#005ba6] transition shadow-md">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
