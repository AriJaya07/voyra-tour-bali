import { NextResponse } from 'next/server'
import axios from 'axios'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/utils/common/auth'
import { prisma } from '@/lib/prisma'
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS } from '@/lib/config/viator'

const USE_MOCK_DATA = !VIATOR_API_KEY

// Bali destination ID in Viator (destId=98)
const BALI_DESTINATION_ID = 98

// --------------------------------------------------
// GET REQUESTS
// --------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    console.log(`[Viator GET] action=${action}`)

    // --------------------------------------------------
    // 1. GET PRODUCTS (Bali only)
    // --------------------------------------------------

    if (action === 'products') {
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
      const count = Math.min(50, Math.max(1, parseInt(searchParams.get('count') || '50', 10)))

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
          ],
          totalCount: 1,
          page,
          count,
        })
      }

      const currency = searchParams.get('currency') || 'USD'
      const tagIdsParam = searchParams.get('tagIds')

      const filtering: Record<string, unknown> = {
        destination: BALI_DESTINATION_ID,
      }

      if (tagIdsParam) {
        try {
          filtering.tags = JSON.parse(tagIdsParam)
        } catch {
          // If parsing fails, ignore the filter
        }
      }

      const start = (page - 1) * count + 1

      const response = await axios.post(
        `${VIATOR_API_URL}/products/search`,
        {
          filtering,
          currency,
          pagination: { start, count },
          sorting: { sort: 'DEFAULT' },
        },
        {
          headers: VIATOR_HEADERS,
          timeout: 120000,
        }
      )

      const totalCount = response.data.totalCount || 0

      return NextResponse.json({
        products: response.data.products || [],
        totalCount,
        page,
        count,
        hasMore: start + count - 1 < totalCount,
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
          `${VIATOR_API_URL}/products/${productCode}`,
          {
            headers: {
              ...VIATOR_HEADERS,
              'Accept-Currency': currency,
            },
            timeout: 120000,
          }
        ),
        axios.post(
          `${VIATOR_API_URL}/products/search`,
          {
            filtering: {},
            searchTerm: productCode,
            currency,
            pagination: { start: 1, count: 5 },
          },
          { headers: VIATOR_HEADERS, timeout: 120000 }
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
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
      const count = Math.min(50, Math.max(1, parseInt(searchParams.get('count') || '20', 10)))

      if (!query.trim()) {
        return NextResponse.json({ products: [], totalCount: 0, page, count, hasMore: false })
      }

      if (USE_MOCK_DATA) {
        return NextResponse.json({ products: [], totalCount: 0, page, count, hasMore: false })
      }

      const start = (page - 1) * count + 1

      const response = await axios.post(
        `${VIATOR_API_URL}/products/search`,
        {
          filtering: { destination: BALI_DESTINATION_ID },
          searchTerm: query,
          currency,
          pagination: { start, count },
        },
        {
          headers: VIATOR_HEADERS,
          timeout: 120000,
        }
      )

      const totalCount = response.data.totalCount || 0

      return NextResponse.json({
        products: response.data.products || [],
        totalCount,
        page,
        count,
        hasMore: start + count - 1 < totalCount,
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

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON body' },
        { status: 400 }
      )
    }

    console.log(`[Viator POST] action=${action}`, Object.keys(body))

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

      // Validate required fields
      if (!body.productCode) {
        return NextResponse.json({ error: 'Missing productCode' }, { status: 400 })
      }
      if (!body.travelDate) {
        return NextResponse.json({ error: 'Missing travelDate' }, { status: 400 })
      }
      if (!body.paxMix || body.paxMix.length === 0) {
        return NextResponse.json({ error: 'Missing paxMix' }, { status: 400 })
      }

      console.log('[Viator] Availability request:', JSON.stringify(body))

      const response = await axios.post(
        `${VIATOR_API_URL}/availability/check`,
        body,
        { headers: VIATOR_HEADERS, timeout: 120000 }
      )

      console.log('[Viator] Availability response status:', response.status)

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
            `${VIATOR_API_URL}/bookings/book`,
            body,
            { headers: VIATOR_HEADERS, timeout: 120000 }
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
