"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout, LoginForm } from "@/components/Auth";
import VoryaIcon from "@/components/assets/Icon/VoyraIcon";

export default function LoginDash() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") || null;

  const getRedirectUrl = (role: string | undefined) => {
    if (callbackUrl && !callbackUrl.startsWith("/dashboard")) return callbackUrl;
    if (role === "ADMIN") return "/dashboard";
    return "/";
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = (session.user as { role?: string })?.role;
      router.replace(getRedirectUrl(role));
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <AuthLayout
      // title="Voyra Login"
      // subtitle="Sign in to continue your journey with Voyra"
      // logo={
      //   <div className="inline-flex items-center justify-center rounded-2xl bg-white-to-br from-white-600 to-indigo-700 shadow-2xl shadow-violet-900/50 mb-5">
      //     <VoryaIcon className="w-[150px] h-[150px]" />
      //   </div>
      // }
      footerLink={{
        text: "Don't have an account? Register here",
        href: `/register?callbackUrl=${encodeURIComponent(callbackUrl || "")}`,
      }}
    >
      <LoginForm callbackUrl={callbackUrl} onRedirect={(url) => router.replace(url)} showDemo />
    </AuthLayout>
  );
}
