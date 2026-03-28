import { NextResponse } from "next/server";
import axios from "axios";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS } from "@/lib/config/viator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const refs: string[] = body.refs;

    if (!refs || refs.length === 0) {
      return NextResponse.json({ locations: [] });
    }

    if (!VIATOR_API_KEY) {
      return NextResponse.json({
        locations: refs.map((ref) => ({
          ref,
          name: null,
          address: null,
          center: null,
        })),
      });
    }

    const response = await axios.post(
      `${VIATOR_API_URL}/locations/bulk`,
      { locations: refs },
      { headers: VIATOR_HEADERS, timeout: 10000 }
    );

    const raw = response.data?.locations || [];

    const locations = raw.map((loc: any) => ({
      ref: loc.ref,
      name: loc.name ?? null,
      address: loc.address
        ? [
            loc.address.street,
            loc.address.city,
            loc.address.state,
            loc.address.country,
          ]
            .filter(Boolean)
            .join(", ")
        : null,
      center: loc.center
        ? {
            latitude: loc.center.latitude,
            longitude: loc.center.longitude,
          }
        : null,
    }));

    return NextResponse.json({ locations });
  } catch (error: any) {
    console.error(
      "[Viator Locations] Error:",
      error.response?.data || error.message
    );

    return NextResponse.json({ locations: [] });
  }
}