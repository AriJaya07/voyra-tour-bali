import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
    }

    // Fetch the image from the external source (S3)
    // Server-side fetching is not restricted by browser CORS policies
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    // Return the binary data directly to the client
    // Set headers to force the browser to treat it as a download
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="voyra-ticket-${Date.now()}.jpg"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("[Proxy Download Error]", error.message);
    return NextResponse.json(
      { error: "Failed to proxy download" },
      { status: 500 }
    );
  }
}
