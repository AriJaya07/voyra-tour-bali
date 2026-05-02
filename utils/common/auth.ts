import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTurnstile } from "@/utils/verifyTurnstile";

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
        captchaToken: { label: "Captcha", type: "text" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const captchaOk = await verifyTurnstile(credentials.captchaToken ?? "");
        if (!captchaOk) {
          throw new Error("CAPTCHA verification failed. Please try again.");
        }

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase().trim() },
          });
        } catch (err) {
          console.error("[Auth] DB lookup failed:", err);
          throw new Error("An unexpected error occurred. Please try again.");
        }

        if (!user) {
          throw new Error("Invalid email or password");
        }

        // --- Lockout check ---
        const MAX_ATTEMPTS = 3;
        const LOCK_MS = 60 * 1000; // 60 seconds

        if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
          const remainingSeconds = Math.ceil(
            (user.loginLockedUntil.getTime() - Date.now()) / 1000
          );
          throw new Error(`LOCKED:${remainingSeconds}`);
        }

        // User registered via Google — no password set
        if (!user.password) {
          throw new Error("This account uses Google Sign-In. Please login with Google.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          const newAttempts = user.loginAttempts + 1;
          if (newAttempts >= MAX_ATTEMPTS) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                loginAttempts: newAttempts,
                loginLockedUntil: new Date(Date.now() + LOCK_MS),
              },
            });
            throw new Error(`LOCKED:60`);
          }
          await prisma.user.update({
            where: { id: user.id },
            data: { loginAttempts: newAttempts },
          });
          throw new Error("Invalid email or password");
        }

        if (!user.emailVerified && user.role === "USER") {
          throw new Error("Please verify your email before signing in.");
        }

        // Reset attempt counter on successful login
        if (user.loginAttempts > 0 || user.loginLockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { loginAttempts: 0, loginLockedUntil: null },
          });
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name ?? "",
          role: user.role,
          image: user.image ?? undefined,
          emailVerified: user.emailVerified,
        };
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
          const dbUser = await prisma.user.upsert({
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
            select: { id: true },
          });

          // AI welcome grant — idempotent (skipped if already granted or legacy user).
          // Lazy-import to keep this callback off the LLM cold path during route handlers.
          try {
            const { ensureWelcomeGrant } = await import("@/lib/services/aiCreditService");
            await ensureWelcomeGrant(dbUser.id);
          } catch (welcomeErr) {
            console.error("[AI] Welcome grant failed during Google signIn:", welcomeErr);
          }

          // Best-effort signup fingerprint — Google callback has no NextRequest,
          // so we capture only the userId. IP / UA hashes go in via the next
          // authenticated route (e.g. /api/profile) when needed.
          try {
            const { recordSignupFingerprint } = await import("@/lib/services/signupFingerprintService");
            await recordSignupFingerprint({ userId: dbUser.id });
          } catch (fpErr) {
            console.error("[Fingerprint] Google signIn fingerprint failed:", fpErr);
          }
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