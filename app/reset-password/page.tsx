"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthLayout, AuthInput } from "@/components/Auth";
import PasswrodIcon from "@/components/assets/login/PasswordIcon";
import EyesShowIcon from "@/components/assets/login/EyesShowIcon";
import EyesCloseIcon from "@/components/assets/login/EyesCloseIcon copy";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const clearError = () => setError("");

  if (!token) {
    return (
      <AuthLayout
        footerLink={{
          text: "Back to Login",
          href: "/login",
        }}
      >
        <div className="flex flex-col items-center text-center space-y-6 py-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
              Invalid Link
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              This password reset link is invalid or has already been used. Please request a new one.
            </p>
          </div>
          <a
            href="/forgot-password"
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm text-center hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg block"
          >
            Request New Reset Link
          </a>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout
        footerLink={{
          text: "Go to Login",
          href: "/login",
        }}
      >
        <div className="flex flex-col items-center text-center space-y-6 py-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
              Password Reset!
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
          </div>
          <a
            href="/login"
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm text-center hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg block"
          >
            Sign In Now
          </a>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBtn = (visible: boolean, onToggle: () => void) => (
    <button
      type="button"
      onClick={onToggle}
      className="text-slate-500 hover:text-slate-300 transition-colors"
      aria-label={visible ? "Hide password" : "Show password"}
    >
      {visible ? <EyesShowIcon className="w-4 h-4" /> : <EyesCloseIcon className="w-4 h-4" />}
    </button>
  );

  return (
    <AuthLayout
      footerLink={{
        text: "Back to Login",
        href: "/login",
      }}
    >
      <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
        Set New Password
      </h2>
      <p className="text-white text-sm mb-7">
        Enter your new password below.
      </p>

      {error && (
        <div className="flex items-start gap-3 bg-red-950/50 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 mb-6 text-sm">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="New Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearError(); }}
          placeholder="••••••••"
          autoComplete="new-password"
          icon={<PasswrodIcon className="w-4 h-4" />}
          rightElement={toggleBtn(showPassword, () => setShowPassword((p) => !p))}
        />

        <AuthInput
          label="Confirm New Password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
          placeholder="••••••••"
          autoComplete="new-password"
          icon={<PasswrodIcon className="w-4 h-4" />}
          rightElement={toggleBtn(showConfirmPassword, () => setShowConfirmPassword((p) => !p))}
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
              Resetting...
            </>
          ) : (
            "Reset Password"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          Loading...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
