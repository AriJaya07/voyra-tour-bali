"use client";

import { useState } from "react";
import api from "@/lib/axios";
import { AuthLayout, AuthInput } from "@/components/Auth";
import TurnstileWidget from "@/components/Auth/TurnstileWidget";
import EmailIcon from "@/components/assets/login/EmailIcon";
import { MailIcon, SpinnerIcon } from "@/components/assets/Icon/shared";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaResetKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/forgot-password", {
        email: email.toLowerCase().trim(),
        captchaToken,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      resetCaptcha();
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
            <MailIcon className="w-8 h-8" />
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

        <TurnstileWidget
          onVerify={setCaptchaToken}
          onExpire={resetCaptcha}
          onError={resetCaptcha}
          resetKey={captchaResetKey}
        />

        <button
          type="submit"
          disabled={!captchaToken || isLoading}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/40 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="w-4 h-4" />
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
