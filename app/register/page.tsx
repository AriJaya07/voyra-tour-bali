"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthLayout, RegisterForm } from "@/components/Auth";

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <AuthLayout
      // title="Create New Account"
      // subtitle="Register to start booking travel packages"
      footerLink={{
        text: "Already have an account? Login here",
        href: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      }}
    >
      <RegisterForm callbackUrl={callbackUrl} />
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          Loading...
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
