"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import AuthInput from "./AuthInput";
import GoogleSignInButton from "./GoogleSignInButton";
import WarningIcon from "../assets/login/WarningIcon";
import EmailIcon from "../assets/login/EmailIcon";
import PasswrodIcon from "../assets/login/PasswordIcon";
import EyesShowIcon from "../assets/login/EyesShowIcon";
import EyesCloseIcon from "../assets/login/EyesCloseIcon copy";

interface LoginFormProps {
  callbackUrl: string | null;
  onRedirect: (url: string) => void;
}

export default function LoginForm({ callbackUrl, onRedirect }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getRedirectUrl = (role: string | undefined) => {
    if (callbackUrl && !callbackUrl.startsWith("/dashboard")) return callbackUrl;
    if (role === "ADMIN") return "/dashboard";
    return "/";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);

    const result = await signIn("credentials", {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError(
        result.error === "CredentialsSignin"
          ? "Incorrect email or password"
          : "Login failed. Please try again."
      );
      return;
    }

    const { getSession } = await import("next-auth/react");
    const freshSession = await getSession();
    const role = (freshSession?.user as { role?: string })?.role;
    onRedirect(getRedirectUrl(role));
  };

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
        Welcome back!
      </h2>
      <p className="text-white text-sm mb-7"> Enter your email and password to continue</p>

      {error && (
        <div className="flex items-start gap-3 bg-red-950/50 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 mb-6 text-sm">
          <WarningIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
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
          placeholder="admin@travel.com"
          autoComplete="email"
          icon={
            <EmailIcon className="w-4 h-4" />
          }
        />

        <AuthInput
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="••••••••"
          autoComplete="current-password"
          icon={
            <PasswrodIcon className="w-4 h-4" />
          }
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? (
                <EyesShowIcon className="w-4 h-4" />
              ) : (
                <EyesCloseIcon className="w-4 h-4" />
              )}
            </button>
          }
        />

        <div className="text-right">
          <a
            href="/forgot-password"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Forgot Password?
          </a>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/40 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {/* Google Sign-In */}
      <GoogleSignInButton callbackUrl={callbackUrl || "/"} />
    </>
  );
}
