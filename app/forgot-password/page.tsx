"use client";

import { useState } from "react";
import { AuthLayout, AuthInput } from "@/components/Auth";
import EmailIcon from "@/components/assets/login/EmailIcon";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (response.status === 429) {
        throw new Error(data.message || "Too many requests. Please wait.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout
        footerLink={{
          text: "Back to Login",
          href: "/login",
        }}
      >
        <div className="flex flex-col items-center text-center space-y-6 py-4">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
              Check Your Email
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              If an account exists with <strong className="text-white">{email}</strong>, we've sent a password reset link. Please check your inbox.
            </p>
          </div>

          <div className="text-sm text-slate-400">
            <p>Didn't receive the email?</p>
            <p>Check your spam folder or try again.</p>
          </div>

          <button
            onClick={() => {
              setIsSuccess(false);
              setEmail("");
            }}
            className="w-full py-3 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all border border-white/10"
          >
            Try Another Email
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      footerLink={{
        text: "Remember your password? Login here",
        href: "/login",
      }}
    >
      <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
        Forgot Password?
      </h2>
      <p className="text-white text-sm mb-7">
        Enter your email and we'll send you a link to reset your password.
      </p>

      {error && (
        <div className="flex items-start gap-3 bg-red-950/50 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 mb-6 text-sm">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AuthInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          placeholder="Enter your email address"
          autoComplete="email"
          icon={<EmailIcon className="w-4 h-4" />}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/40 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
