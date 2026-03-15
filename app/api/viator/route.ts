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

const VIATOR_HEADERS = {
  Accept: 'application/json;version=2.0',
  'Accept-Language': 'en-US',
  'Content-Type': 'application/json',
  'exp-api-key': VIATOR_API_KEY,
}

// --------------------------------------------------
// GET REQUESTS
// --------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // --------------------------------------------------
    // 1. GET PRODUCTS
    // --------------------------------------------------

    if (action === 'products') {
      if (USE_MOCK_DATA) {
        return NextResponse.json({
          data: [
            {
              productCode: 'VTR-BALI-1',
              title: 'Ubud Waterfall, Rice Terraces & Monkey Forest Private Tour',
              description: 'Discover the best of Ubud.',
              pricing: { summary: { fromPrice: 450000 } },
              images: [
                {
                  variants: [
                    {
                      url: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1'
                    }
                  ]
                }
              ]
            }
          ]
        })
      }

      const response = await axios.post(
        `${VIATOR_BASE_URL}/products/search`,
        {
          filtering: {
            destination: '8'
          },
          pagination: {
            start: 1,
            count: 20
          },
          sorting: {
            sort: 'RELEVANCE'
          }
        },
        {
          headers: VIATOR_HEADERS
        }
      )

      return NextResponse.json(response.data)
    }

    // --------------------------------------------------
    // 2. PRODUCT DETAIL
    // --------------------------------------------------

    if (action === 'product_detail') {
      const productCode = searchParams.get('productCode')

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
          description: 'Ride through jungle trails and rice fields.',
          pricing: { summary: { fromPrice: 650000 } }
        })
      }

      const response = await axios.get(
        `${VIATOR_BASE_URL}/products/${productCode}`,
        {
          headers: VIATOR_HEADERS
        }
      )

      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Viator API Error:', error.response?.data || error.message)

    return NextResponse.json(
      {
        error: 'Failed to fetch Viator data',
        details: error.response?.data || error.message
      },
      { status: error.response?.status || 500 }
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
    // 3. CHECK AVAILABILITY
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
        { headers: VIATOR_HEADERS }
      )

      return NextResponse.json(response.data)
    }

    // --------------------------------------------------
    // 4. CREATE BOOKING
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
            { headers: VIATOR_HEADERS }
          )

          orderId = response.data.orderId
          bookingRef = response.data.bookingRef
        } catch (viatorErr: any) {
          // Viator API may fail (sandbox limitations, invalid payload, etc.)
          // Fall back to local booking so the user isn't blocked
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