import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  `${process.env.AWS_STORAGE_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`,
  "res.cloudinary.com",
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
    }

    const response = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="voyra-ticket-${Date.now()}.jpg"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[Proxy Download Error]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { error: "Failed to proxy download" },
      { status: 500 }
    );
  }
}
