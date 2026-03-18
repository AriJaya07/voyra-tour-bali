import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null; // ❗ Don't throw error here
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase().trim(),
            },
          });

          if (!user) {
            return null; // ❗ return null instead of throw
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            return null; // ❗ return null instead of throw
          }

          // ✅ Always return plain object (include image for profile display)
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name ?? "",
            role: user.role,
            image: user.image ?? undefined,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.image = (user as any).image;
        token.emailVerified = (user as any).emailVerified;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).image = token.image;
        // Fetch latest image from DB (in case user updated profile)
        (session.user as any).emailVerified = token.emailVerified;
        try {
          const user = await prisma.user.findUnique({
            where: { id: parseInt(token.id as string) },
            select: { image: true, emailVerified: true },
          });
          if (user?.image) (session.user as any).image = user.image;
          if (user) (session.user as any).emailVerified = user.emailVerified;
        } catch {
          // Keep token values on error
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};