import { Suspense } from 'react';
import BookingSuccessClient from '@/components/booking/BookingSuccessClient';

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-20 flex items-center justify-center">Loading...</div>}>
      <BookingSuccessClient />
    </Suspense>
  );
}
