import middleware from "@/utils/common/middleware";

export default middleware;

// Must be statically analyzable by Next.js (cannot be re-exported)
export const config = {
  matcher: ["/dashboard/:path*"],
};
