"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import AuthInput from "./AuthInput";
import GoogleSignInButton from "./GoogleSignInButton";
import Button from "../ui/Button";
import WarningIcon from "../assets/login/WarningIcon";
import EmailIcon from "../assets/login/EmailIcon";
import PasswrodIcon from "../assets/login/PasswordIcon";
import { EyeOffIcon, EyeIcon, ChevronRightIcon, LockIcon } from "../assets/Icon/shared";
import TurnstileWidget from "./TurnstileWidget";

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaResetKey((k) => k + 1);
  };

  const getRedirectUrl = (role: string | undefined) => {
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

    // Pre-check: catch existing lockout before wasting a sign-in round trip
    try {
      const lockResp = await fetch(
        `/api/auth/check-lockout?email=${encodeURIComponent(email.toLowerCase().trim())}`
      );
      const lockData = await lockResp.json();
      if (lockData.locked) {
        setLockoutSeconds(lockData.remainingSeconds);
        setError("");
        setIsLoading(false);
        resetCaptcha();
        return;
      }
    } catch {
      // Network issue — continue and let signIn handle it
    }

    const result = await signIn("credentials", {
      email: email.toLowerCase().trim(),
      password,
      captchaToken: captchaToken ?? "",
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      try {
        const resp = await fetch(
          `/api/auth/check-lockout?email=${encodeURIComponent(email.toLowerCase().trim())}`
        );
        const { locked, remainingSeconds, loginAttempts } = await resp.json();

        if (locked) {
          setLockoutSeconds(remainingSeconds);
          setError("");
        } else {
          const remaining = Math.max(0, 3 - loginAttempts);
          if (loginAttempts > 0) {
            setError(
              `Incorrect email or password, \n ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining`
            );
          } else {
            setError("Incorrect email or password");
          }
        }
      } catch {
        setError("Incorrect email or password");
      }
      resetCaptcha();
      return;
    }

    const { getSession } = await import("next-auth/react");
    const freshSession = await getSession();
    const role = (freshSession?.user as { role?: string })?.role;
    const { trackLogin } = await import("@/utils/analytics");
    trackLogin("email");
    onRedirect(getRedirectUrl(role));
  };

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
        Welcome back!
      </h2>
      <p className="text-white text-sm mb-5"> Enter your email and password to continue</p>

      {/* Google Sign-In */}
      <GoogleSignInButton callbackUrl={callbackUrl || "/"} />

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {lockoutSeconds > 0 ? (
        <div className="flex items-center gap-3 bg-amber-950/50 border border-amber-700/60 text-amber-300 rounded-xl px-4 py-3 mb-6 text-sm">
          <LockIcon className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>
            Too many failed attempts. Try again in{" "}
            <strong className="text-amber-200">{lockoutSeconds}s</strong>
          </span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 bg-red-950/50 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 mb-6 text-sm">
          <WarningIcon className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span className="flex-1 text-center whitespace-pre-line">
            {error}
          </span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AuthInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (lockoutSeconds === 0) setError("");
          }}
          placeholder="admin@travel.com"
          autoComplete="email"
          disabled={lockoutSeconds > 0}
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
            if (lockoutSeconds === 0) setError("");
          }}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={lockoutSeconds > 0}
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
                <EyeOffIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
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

        <TurnstileWidget
          onVerify={setCaptchaToken}
          onExpire={resetCaptcha}
          onError={resetCaptcha}
          resetKey={captchaResetKey}
        />

        <Button
          type="submit"
          variant="auth"
          isLoading={isLoading}
          disabled={!captchaToken || isLoading || lockoutSeconds > 0}
          className="mt-2"
        >
          {lockoutSeconds > 0 ? `Wait ${lockoutSeconds}s…` : "Sign In"}
          {lockoutSeconds <= 0 && <ChevronRightIcon className="w-4 h-4 ml-1" />}
        </Button>
      </form>
    </>
  );
}
