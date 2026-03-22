import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Optional: minimal rate limiting interface could be implemented here

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, source = "WEBSITE" } = body;

    // 1. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    // 2. Sanitize input
    const normalizedEmail = email.toLowerCase().trim();

    // 3. Prevent duplicate entries
    const existing = await (prisma as any).subscription.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      // If user was previously unsubscribed, we resubscribe them
      if (existing.status === "UNSUBSCRIBED") {
        await (prisma as any).subscription.update({
          where: { email: normalizedEmail },
          data: { status: "ACTIVE", updatedAt: new Date() }
        });
        return NextResponse.json(
          { success: true, message: "Welcome back! Your subscription was reactivated." }, 
          { status: 200 }
        );
      }
      // If already active, return 409 gracefully
      return NextResponse.json(
        { error: "This email is already subscribed!" },
        { status: 409 }
      );
    }

    // 4. Insert cleanly into postgres
    await (prisma as any).subscription.create({
      data: {
        email: normalizedEmail,
        source: source,
        status: "ACTIVE"
      }
    });

    // 5. Clean JSON Response
    return NextResponse.json(
      { success: true, message: "Successfully subscribed to Voyra inside guides!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Subscription Error:", error);
    return NextResponse.json(
      { error: "Failed to process your request. Please try again." },
      { status: 500 }
    );
  }
}
