import NextAuth from "next-auth";
import { authOptions } from "@/utils/common/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
