import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase().trim(),
            },
          });

          if (!user) {
            return null;
          }

          // If user registered via Google, they don't have a password
          if (!user.password) {
            throw new Error("This account uses Google Sign-In. Please login with Google.");
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            throw new Error("Invalid email or password");
          }

          if (!user.emailVerified && user.role === 'USER') {
             throw new Error("Please verify your email first");
          }

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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;

        try {
          // Upsert: create user if not exists, otherwise update Google profile data
          await prisma.user.upsert({
            where: { email },
            update: {
              name: user.name ?? undefined,
              image: user.image ?? undefined,
              provider: "google",
              emailVerified: true,
            },
            create: {
              email,
              name: user.name ?? null,
              image: user.image ?? null,
              provider: "google",
              emailVerified: true,
              // password is null for Google users
            },
          });
        } catch (error) {
          console.error("Google signIn callback error:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // On initial sign-in, populate token from DB
      if (account && user) {
        const email = (user.email ?? token.email)?.toLowerCase().trim();
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, image: true, emailVerified: true },
          });
          if (dbUser) {
            token.id = dbUser.id.toString();
            token.role = dbUser.role;
            token.image = dbUser.image ?? undefined;
            token.emailVerified = dbUser.emailVerified;
            return token;
          }
        }
      }

      // For credentials provider (existing flow)
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