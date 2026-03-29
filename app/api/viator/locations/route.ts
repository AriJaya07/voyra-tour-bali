import { NextResponse } from "next/server";
import axios from "axios";
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS } from "@/lib/config/viator";

const MAX_BATCH = 500;

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

    // Deduplicate and cap at a sane limit
    const uniqueRefs = [...new Set(refs)].slice(0, 1000);

    // Batch into chunks of 500 (Viator API limit)
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueRefs.length; i += MAX_BATCH) {
      chunks.push(uniqueRefs.slice(i, i + MAX_BATCH));
    }

    const allLocations: any[] = [];

    for (const chunk of chunks) {
      try {
        const response = await axios.post(
          `${VIATOR_API_URL}/locations/bulk`,
          { locations: chunk },
          { headers: VIATOR_HEADERS, timeout: 120000 }
        );
        const raw = response.data?.locations || [];
        allLocations.push(...raw);
      } catch (err: any) {
        console.error(
          `[Viator Locations] Batch error (${chunk.length} refs):`,
          err.response?.data?.message || err.message
        );
      }
    }

    // Map results back using input refs order to preserve ref association
    // Viator returns locations in same order as input refs
    const locations = allLocations.map((loc: any, i: number) => {
      // Address can be a string or object depending on API version
      let address: string | null = null;
      if (typeof loc.address === "string") {
        address = loc.address;
      } else if (loc.address && typeof loc.address === "object") {
        address = [
          loc.address.street,
          loc.address.city,
          loc.address.state,
          loc.address.country,
        ]
          .filter(Boolean)
          .join(", ");
      }

      return {
        ref: loc.ref || loc.reference || uniqueRefs[i] || null,
        name: loc.name ?? null,
        address,
        center: loc.center
          ? {
              latitude: loc.center.latitude,
              longitude: loc.center.longitude,
            }
          : null,
        provider: (loc.provider as string) || null,
        providerReference: (loc.providerReference as string) || null,
      };
    });

    return NextResponse.json({ locations });
  } catch (error: any) {
    console.error(
      "[Viator Locations] Error:",
      error.response?.data || error.message
    );

    return NextResponse.json({ locations: [] });
  }
}
