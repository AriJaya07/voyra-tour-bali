import { NextResponse } from "next/server";
import axios from "axios";
import { VIATOR_API_URL, VIATOR_HEADERS } from "@/lib/config/viator";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.toLowerCase() || "";
  const productCode = searchParams.get("productCode");

  let allLocations: string[] = [];

  try {
    if (productCode) {
      // 1. Fetch product logistics to get ALL possible locationRefs for this tour
      const productRes = await axios.get(`${VIATOR_API_URL}/products/${productCode}`, {
        headers: VIATOR_HEADERS,
        timeout: 10000,
      });

      const logistics = productRes.data?.logistics;
      const pickupLocations = logistics?.travelerPickup?.locations || [];
      
      const locationRefs = pickupLocations
        .map((loc: any) => loc.location?.ref)
        .filter(Boolean);

      if (locationRefs.length > 0) {
        // 2. Fetch the actual names and addresses of these locationRefs in bulk
        // Cap to 100 to avoid payload size issues with Viator
        const cappedRefs = locationRefs.slice(0, 100);

        try {
           const bulkRes = await axios.post(`${VIATOR_API_URL}/locations/bulk`, {
             locations: cappedRefs
           }, {
             headers: VIATOR_HEADERS,
             timeout: 10000,
           });

           const detailedLocations = bulkRes.data.locations || [];
           allLocations = detailedLocations.map((loc: any) => loc.name || loc.address?.street || loc.reference);
        } catch (bulkErr) {
           console.warn("Viator locations/bulk failed, attempting to use fallback.");
        }
      }
    }
  } catch (error: any) {
    console.error("Failed to fetch Viator locations:", error?.response?.data || error.message);
  }

  // Filter based on query
  let filtered = allLocations;
  if (query) {
    filtered = allLocations.filter(loc => loc && loc.toLowerCase().includes(query));
  } else {
    // If empty query, just return a top slice so we don't overwhelm the UI
    filtered = allLocations.slice(0, 50);
  }

  // Deduplicate and return
  const uniqueFiltered = Array.from(new Set(filtered));

  return NextResponse.json({
    locations: uniqueFiltered.slice(0, 50)
  });
}
