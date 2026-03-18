import { NextResponse } from 'next/server'
import axios from 'axios'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/utils/common/auth'
import { prisma } from '@/lib/prisma'

const VIATOR_API_KEY = process.env.VIATOR_API_KEY || ''

// Sandbox vs Production
const VIATOR_BASE_URL = VIATOR_API_KEY?.startsWith('sandbox')
  ? 'https://api.sandbox.viator.com/partner'
  : 'https://api.viator.com/partner'

const USE_MOCK_DATA = !VIATOR_API_KEY

// Bali destination ID in Viator
const BALI_DESTINATION_ID = '684'

const VIATOR_HEADERS = {
  Accept: 'application/json;version=2.0',
  'Accept-Language': 'en-US',
  'Content-Type': 'application/json',
  'exp-api-key': VIATOR_API_KEY,
}

// Map local category names (lowercase) → Viator tag IDs for better filtering
const CATEGORY_TAG_MAP: Record<string, number[]> = {
  'adventure':      [11903, 11938],
  'culture':        [11929, 12032],
  'nature':         [11903, 12029],
  'water sports':   [11938, 12029],
  'food & drink':   [12071],
  'wellness':       [12071],
  'tours':          [11929],
  'temple':         [11929, 12032],
  'beach':          [11903, 12029],
  'nightlife':      [12071],
  'shopping':       [12071],
  'liburan':        [11929],
  'romantis':       [11929],
  'keluarga':       [11929],
  'sport':          [11938],
  'budaya':         [11929, 12032],
  'alam':           [11903, 12029],
  'kuliner':        [12071],
}

// --------------------------------------------------
// GET REQUESTS
// --------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // --------------------------------------------------
    // 1. GET PRODUCTS (Bali only)
    // --------------------------------------------------

    if (action === 'products') {
      if (USE_MOCK_DATA) {
        return NextResponse.json({
          products: [
            {
              productCode: 'VTR-BALI-1',
              title: 'Ubud Waterfall, Rice Terraces & Monkey Forest Private Tour',
              description: 'Discover the best of Ubud with a private guide.',
              pricing: { summary: { fromPrice: 450000 }, currency: 'IDR' },
              reviews: { totalReviews: 128, combinedAverageRating: 4.8 },
              duration: { fixedDurationInMinutes: 480 },
              flags: ['FREE_CANCELLATION'],
              images: [
                {
                  isCover: true,
                  variants: [
                    { height: 480, width: 720, url: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1' }
                  ]
                }
              ]
            }
          ]
        })
      }

      const currency = searchParams.get('currency') || 'USD'
      const categoryName = searchParams.get('categoryName') || ''

      // Build filtering — always Bali, optionally with tags
      const filtering: Record<string, any> = {
        destination: BALI_DESTINATION_ID,
      }

      // Map category name to Viator tags for better results per tab
      if (categoryName) {
        const tags = CATEGORY_TAG_MAP[categoryName.toLowerCase()]
        if (tags && tags.length > 0) {
          filtering.tags = tags
        }
      }

      const response = await axios.post(
        `${VIATOR_BASE_URL}/products/search`,
        {
          filtering,
          currency,
          pagination: {
            start: 1,
            count: 30
          },
          sorting: {
            sort: 'DEFAULT'
          }
        },
        {
          headers: VIATOR_HEADERS,
          timeout: 15000,
        }
      )

      return NextResponse.json({
        products: response.data.products || [],
        totalCount: response.data.totalCount || 0,
      })
    }

    // --------------------------------------------------
    // 2. PRODUCT DETAIL
    // --------------------------------------------------

    if (action === 'product_detail') {
      const productCode = searchParams.get('productCode')
      const currency = searchParams.get('currency') || 'USD'

      if (!productCode) {
        return NextResponse.json(
          { error: 'Missing productCode' },
          { status: 400 }
        )
      }

      if (USE_MOCK_DATA) {
        return NextResponse.json({
          productCode,
          title: 'Bali ATV Adventure',
          description: 'Ride through jungle trails and rice fields on a thrilling ATV adventure.',
          pricing: { summary: { fromPrice: 650000 }, currency: 'IDR' },
          reviews: { totalReviews: 256, combinedAverageRating: 4.7 },
          duration: { fixedDurationInMinutes: 240 },
          flags: ['FREE_CANCELLATION'],
          images: [
            {
              isCover: true,
              variants: [
                { height: 480, width: 720, url: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1' }
              ]
            }
          ],
          itinerary: { itineraryType: 'STANDARD' },
          inclusions: [],
          exclusions: [],
          additionalInfo: [],
          bookingConfirmationSettings: { confirmationType: 'INSTANT' },
        })
      }

      // Fetch full product detail + pricing in parallel
      const [detailRes, searchRes] = await Promise.all([
        axios.get(
          `${VIATOR_BASE_URL}/products/${productCode}`,
          {
            headers: {
              ...VIATOR_HEADERS,
              'Accept-Currency': currency,
            },
            timeout: 15000,
          }
        ),
        axios.post(
          `${VIATOR_BASE_URL}/products/search`,
          {
            filtering: {},
            searchTerm: productCode,
            currency,
            pagination: { start: 1, count: 5 },
          },
          { headers: VIATOR_HEADERS, timeout: 15000 }
        ).catch(() => null),
      ])

      const detail = detailRes.data
      const searchProduct = searchRes?.data?.products?.find(
        (p: any) => p.productCode === productCode
      )
      if (searchProduct?.pricing) {
        detail.pricing = searchProduct.pricing
      }
      if (searchProduct?.flags) {
        detail.flags = searchProduct.flags
      }
      if (searchProduct?.duration) {
        detail.duration = searchProduct.duration
      }

      return NextResponse.json(detail)
    }

    // --------------------------------------------------
    // 3. SEARCH PRODUCTS (freetext)
    // --------------------------------------------------

    if (action === 'search') {
      const query = searchParams.get('query') || ''
      const currency = searchParams.get('currency') || 'USD'

      if (!query.trim()) {
        return NextResponse.json({ products: [] })
      }

      if (USE_MOCK_DATA) {
        return NextResponse.json({ products: [] })
      }

      const response = await axios.post(
        `${VIATOR_BASE_URL}/products/search`,
        {
          filtering: {
            destination: BALI_DESTINATION_ID,
          },
          searchTerm: query,
          currency,
          pagination: {
            start: 1,
            count: 20
          }
        },
        {
          headers: VIATOR_HEADERS,
          timeout: 15000,
        }
      )

      return NextResponse.json({
        products: response.data.products || [],
        totalCount: response.data.totalCount || 0,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Viator API Error:', error.response?.data || error.message)

    // Gracefully handle auth errors — return empty data so frontend can fall back to DB
    const status = error.response?.status
    if (status === 401 || status === 403) {
      console.warn('Viator API key invalid or expired — returning empty products')
      return NextResponse.json({
        products: [],
        totalCount: 0,
        warning: 'Viator API unavailable — showing local data only',
      })
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch Viator data',
        details: error.response?.data || error.message
      },
      { status: status || 500 }
    )
  }
}

// --------------------------------------------------
// POST REQUESTS
// --------------------------------------------------

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const body = await request.json()

    // --------------------------------------------------
    // 4. CHECK AVAILABILITY
    // --------------------------------------------------

    if (action === 'availability') {
      if (USE_MOCK_DATA) {
        return NextResponse.json({
          available: true,
          bookableItems: [
            {
              itemCode: 'ITEM-1',
              totalPrice: {
                price: {
                  recommendedRetailPrice: 500000
                }
              }
            }
          ]
        })
      }

      const response = await axios.post(
        `${VIATOR_BASE_URL}/availability/schedules`,
        body,
        { headers: VIATOR_HEADERS, timeout: 15000 }
      )

      return NextResponse.json(response.data)
    }

    // --------------------------------------------------
    // 5. CREATE BOOKING (saves to local DB for Midtrans)
    // --------------------------------------------------

    if (action === 'book') {
      const session = await getServerSession(authOptions)

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const productCode = body.productCode
      const travelDate = body.travelDate
      const pax = body.pax
      const totalPrice = body.totalPrice
      const productTitle = body.productTitle

      let bookingRef = ''
      let orderId = ''

      if (USE_MOCK_DATA) {
        orderId = `ORD-${Date.now()}`
        bookingRef = `MOCK-${Math.floor(Math.random() * 100000)}`
      } else {
        try {
          const response = await axios.post(
            `${VIATOR_BASE_URL}/bookings/book`,
            body,
            { headers: VIATOR_HEADERS, timeout: 30000 }
          )

          orderId = response.data.orderId
          bookingRef = response.data.bookingRef
        } catch (viatorErr: any) {
          console.warn('Viator booking API failed, saving locally:', viatorErr.response?.data || viatorErr.message)
          orderId = `ORD-${Date.now()}`
          bookingRef = `LOCAL-${Math.floor(Math.random() * 100000)}`
        }
      }

      await prisma.booking.create({
        data: {
          userId: Number(session.user.id),
          bookingRef,
          productCode,
          productTitle,
          totalPrice: Number(totalPrice),
          travelDate: new Date(travelDate),
          pax: Number(pax),
          status: 'PENDING'
        }
      })

      return NextResponse.json({
        orderId,
        bookingRef,
        status: 'SUCCESS'
      })
    }

    return NextResponse.json(
      { error: 'Invalid POST action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Viator POST Error:', error.response?.data || error.message)

    return NextResponse.json(
      {
        error: 'Failed request',
        details: error.response?.data || error.message
      },
      { status: error.response?.status || 500 }
    )
  }
}
