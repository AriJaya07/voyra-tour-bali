import { NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/utils/common/auth';
import { prisma } from '@/lib/prisma';

// IMPORTANT: Replace the URLs below with the actual Viator API endpoints you want to integrate with.
// Make sure to add your Viator API key to your .env file (e.g., VIATOR_API_KEY=your_key_here)
const VIATOR_API_KEY = process.env.VIATOR_API_KEY || '';
const USE_MOCK_DATA = !VIATOR_API_KEY; // If no API key is set, we will use mock data for testing UI

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // ── 1. ACTION = PRODUCTS (List products) ─────────────────────────
    if (action === 'products') {
      const categoryId = searchParams.get('categoryId');
      
      // If no API key, return MOCK data so frontend can be built immediately
      if (USE_MOCK_DATA) {
        return NextResponse.json({
          data: [
            {
              productCode: 'VTR-BALI-1',
              title: 'Ubud Waterfall, Rice Terraces & Monkey Forest Private Tour',
              description: 'Discover the best of Ubud on this private full-day tour.',
              pricing: { summary: { fromPrice: 450000 } },
              images: [{ variants: [{ url: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }] }]
            },
            {
              productCode: 'VTR-BALI-2',
              title: 'Mount Batur Sunrise Trekking with Breakfast',
              description: 'Experience an unforgettable sunrise from the top of an active volcano.',
              pricing: { summary: { fromPrice: 650000 } },
              images: [{ variants: [{ url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }] }]
            },
            {
              productCode: 'VTR-BALI-3',
              title: 'Nusa Penida Full-Day Trip from Bali',
              description: 'Explore the spectacular rock formations of Nusa Penida island.',
              pricing: { summary: { fromPrice: 850000 } },
              images: [{ variants: [{ url: 'https://images.unsplash.com/photo-1574457547512-5b084ce31fce?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }] }]
            },
            {
              productCode: 'VTR-BALI-4',
              title: 'Bali ATV Ride and White Water Rafting',
              description: 'An adrenaline-pumping adventure combination.',
              pricing: { summary: { fromPrice: 750000 } },
              images: [{ variants: [{ url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }] }]
            },
            {
              productCode: 'VTR-BALI-5',
              title: 'Tanah Lot Sunset Tour',
              description: 'Visit the iconic sea temple at sunset.',
              pricing: { summary: { fromPrice: 300000 } },
              images: [{ variants: [{ url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }] }]
            }
          ]
        });
      }

      // REAL API CALL
      const response = await axios.post('https://api.viator.com/partner/products/search', 
        { 
          // Your search payload, e.g. destinations, filtering, etc.
          filtering: { destination: "8" } // 8 is usually Bali in Viator
        }, 
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Accept-Language': 'en-US',
            'exp-api-key': VIATOR_API_KEY, 
          }
        }
      );
      return NextResponse.json(response.data);
    }

    // ── 2. ACTION = PRODUCT DETAIL ──────────────────────────────────
    if (action === 'product_detail') {
      const productCode = searchParams.get('productCode');

      if (USE_MOCK_DATA) {
        return NextResponse.json({
          productCode: productCode || 'VTR-BALI-1',
          title: 'Ubud Waterfall, Rice Terraces & Monkey Forest Private Tour',
          description: 'A full detailed description of the Ubud monkey forest and rice terraces.',
          pricing: { summary: { fromPrice: 450000 } },
          images: [{ variants: [{ url: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }] }]
        });
      }

      // REAL API CALL
      const response = await axios.get(`https://api.viator.com/partner/products/${productCode}`, {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en-US',
          'exp-api-key': VIATOR_API_KEY, 
        }
      });
      return NextResponse.json(response.data);
    }

    // Default response if no valid action
    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (error: any) {
    console.error('Error fetching from Viator API:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error.response?.data || error.message },
      { status: error.response?.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    // ── 3. ACTION = AVAILABILITY ──────────────────────────────────
    if (action === 'availability') {
      if (USE_MOCK_DATA) {
        // Mock successful availability
        return NextResponse.json({
          available: true,
          bookableItems: [
            {
              itemCode: 'ITEM-1',
              totalPrice: { price: { recommendedRetailPrice: 450000 * (body.pax || 1) } }
            }
          ]
        });
      }

      const response = await axios.post('https://api.viator.com/partner/availability/schedules', body, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'exp-api-key': VIATOR_API_KEY,
        }
      });
      return NextResponse.json(response.data);
    }

    // ── 4. ACTION = BOOKING ───────────────────────────────────────
    if (action === 'book') {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized', details: 'Login required' }, { status: 401 });
      }

      const productCode = body.productCode || 'VTR-BALI-1';
      const travelDate = body.travelDate || new Date().toISOString().split('T')[0];
      const pax = body.pax || 1;
      const totalPrice = body.totalPrice || 0;
      const productTitle = body.productTitle || productCode;

      let orderId: string;
      let bookingRef: string;
      let status: string;

      if (USE_MOCK_DATA) {
        orderId = `MOCK-ORD-${Math.floor(Math.random() * 100000)}`;
        bookingRef = `VTR-REF-${Math.floor(Math.random() * 100000)}`;
        status = 'SUCCESS';
      } else {
        const response = await axios.post('https://api.viator.com/partner/bookings', body, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'exp-api-key': VIATOR_API_KEY,
          }
        });
        orderId = response.data?.orderId || response.data?.bookingRef || `ORD-${Date.now()}`;
        bookingRef = response.data?.bookingRef || response.data?.orderId || orderId;
        status = response.data?.status || 'SUCCESS';
      }

      await prisma.booking.create({
        data: {
          userId: parseInt(session.user.id),
          bookingRef,
          productCode,
          productTitle,
          totalPrice: Number(totalPrice),
          travelDate: new Date(travelDate),
          pax: Number(pax),
          status: 'PENDING',
        },
      });

      return NextResponse.json({
        orderId,
        status,
        bookingRef,
        message: USE_MOCK_DATA ? 'Booking mock successful!' : 'Booking successful!'
      });
    }

    return NextResponse.json({ error: 'Invalid POST action parameter' }, { status: 400 });

  } catch (error: any) {
    console.error('Error posting to Viator API:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.response?.data || error.message },
      { status: error.response?.status || 500 }
    );
  }
}