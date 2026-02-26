import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Sudah authenticated — lanjut
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        // Hanya izinkan jika ada token (sudah login)
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Proteksi semua route /dashboard/*
export const config = {
  matcher: ["/dashboard/:path*"],
};