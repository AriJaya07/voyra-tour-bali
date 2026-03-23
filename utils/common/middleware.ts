import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role as string | undefined;

    // Dashboard: only ADMIN can access. USER/EDITOR → redirect to homepage
    if (req.nextUrl.pathname.startsWith("/dashboard")) {
      if (role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        // Must be logged in to access dashboard
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Protect /dashboard/*, /profile/*, /checkout, and /payment/* (require login)
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/profile",
    "/checkout",
    "/payment/:path*",
  ],
};