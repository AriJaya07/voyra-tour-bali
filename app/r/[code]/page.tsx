import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import SetReferralCookie from "./SetReferralCookie";

export const metadata: Metadata = {
  title: "You've been invited to Voyra",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function ReferralLandingPage({ params }: PageProps) {
  const { code: rawCode } = await params;
  const code = (rawCode || "").trim().toUpperCase();

  let inviterFirstName = "A friend";
  let valid = false;

  if (code && code.length >= 4 && code.length <= 32) {
    const ref = await prisma.referral.findUnique({
      where: { code },
      select: { inviter: { select: { name: true } }, status: true },
    });
    if (ref) {
      valid = true;
      const fullName = ref.inviter?.name || "";
      inviterFirstName = fullName.split(/\s+/)[0] || "A friend";
    }
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pt-20 pb-16">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite link not found</h1>
          <p className="text-sm text-gray-500 mb-6">
            This referral code doesn&apos;t look right or has expired. You can still join Voyra and start booking Bali tours.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-3 bg-[#0071CE] hover:bg-[#005ba6] text-white font-bold rounded-full shadow-md transition"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const registerHref = `/register?ref=${encodeURIComponent(code)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white pt-10 pb-16 px-4">
      <SetReferralCookie code={code} />

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 mt-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#0071CE] to-[#005ba6] text-white text-3xl mb-4 shadow-lg">
            🌴
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0071CE] mb-2">
            You&apos;re invited
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 leading-tight">
            {inviterFirstName} invited you to Voyra
          </h1>
          <p className="text-base text-gray-600">
            Bali tours, planned smarter. Join with this invite and start with{" "}
            <strong className="text-[#0071CE]">50 free AI trip-credits</strong> in your wallet.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4 mb-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-1">
              Your invite code
            </p>
            <p className="font-mono text-2xl font-black text-gray-900">{code}</p>
          </div>

          <Link
            href={registerHref}
            className="block w-full text-center px-6 py-4 bg-[#0071CE] hover:bg-[#005ba6] text-white text-base font-bold rounded-xl shadow-md transition mb-3"
          >
            Claim 50 credits — sign up
          </Link>
          <p className="text-center text-xs text-gray-500">
            Already on Voyra?{" "}
            <Link href="/login" className="text-[#0071CE] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">
          <h2 className="font-bold text-gray-900 text-lg mb-4">How it works</h2>
          <ol className="space-y-4">
            <Step
              n="1"
              title="Claim your invite"
              body="Sign up with the code already applied. 50 AI credits land in your Voyra wallet right away."
            />
            <Step
              n="2"
              title="Book a Bali tour"
              body={`Browse curated experiences. Use credits to plan with AI. ${inviterFirstName} earns a small thank-you on each booking — you do too on your first.`}
            />
            <Step
              n="3"
              title="Get +50 thank-you credits"
              body="When your first tour is confirmed, we drop another 50 credits in your wallet. Real travel only — no payouts on signup alone."
            />
          </ol>
        </div>

        <p className="text-center text-xs text-gray-400">
          Credits valid 365 days · Real travel only · By joining you agree to our{" "}
          <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy</Link>.
        </p>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0071CE]/10 text-[#0071CE] font-black flex items-center justify-center text-sm">
        {n}
      </div>
      <div>
        <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
      </div>
    </li>
  );
}
