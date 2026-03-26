import { NextResponse } from "next/server";
import axios from "axios";

const VIATOR_API_KEY = process.env.VIATOR_API_KEY || "";

const VIATOR_BASE_URL = VIATOR_API_KEY?.startsWith("sandbox")
  ? "https://api.sandbox.viator.com/partner"
  : "https://api.viator.com/partner";

const VIATOR_HEADERS = {
  Accept: "application/json;version=2.0",
  "Accept-Language": "en-US",
  "Content-Type": "application/json",
  "exp-api-key": VIATOR_API_KEY,
};

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

    // ✅ FIX: correct payload key
    const response = await axios.post(
      `${VIATOR_BASE_URL}/locations/bulk`,
      { refs }, // ✅ correct
      { headers: VIATOR_HEADERS, timeout: 10000 }
    );
    console.log(response, "PPPP")

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