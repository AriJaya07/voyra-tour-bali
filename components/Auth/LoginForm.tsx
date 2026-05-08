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
import MfaChallengeForm from "./MfaChallengeForm";

interface LoginFormProps {
  callbackUrl: string | null;
  onRedirect: (url: string) => void;
}

interface MfaState {
  challengeId: number;
  methods: ("TOTP" | "BACKUP" | "EMAIL_OTP")[];
  expiresAt: string;
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
  const [mfa, setMfa] = useState<MfaState | null>(null);

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

  const completeSignIn = async (mfaToken: string | null) => {
    const result = await signIn("credentials", {
      email: email.toLowerCase().trim(),
      password,
      mfaToken: mfaToken ?? "",
      redirect: false,
    });
    if (result?.error) {
      setError("Sign-in failed. Please try again.");
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

    try {
      // Preflight: validates creds + captcha + lockout, returns MFA decision.
      const pre = await fetch("/api/auth/login/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          captchaToken: captchaToken ?? "",
        }),
      });
      const data = await pre.json().catch(() => ({}));

      if (!pre.ok) {
        if (pre.status === 423 && data.remainingSeconds) {
          setLockoutSeconds(data.remainingSeconds);
        } else {
          setError(data.error || "Incorrect email or password");
        }
        resetCaptcha();
        return;
      }

      if (data.needsMfa) {
        setMfa({
          challengeId: data.challengeId,
          methods: data.methods,
          expiresAt: data.expiresAt,
        });
        setIsLoading(false);
        return;
      }

      // No MFA required (or trusted-device shortcut)
      await completeSignIn(null);
    } catch {
      setError("Sign-in failed. Please try again.");
      resetCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const onMfaSuccess = async (mfaToken: string) => {
    setIsLoading(true);
    try {
      await completeSignIn(mfaToken);
    } finally {
      setIsLoading(false);
    }
  };

  const onMfaCancel = () => {
    setMfa(null);
    setPassword("");
    resetCaptcha();
  };

  if (mfa) {
    return (
      <MfaChallengeForm
        challengeId={mfa.challengeId}
        methods={mfa.methods}
        onSuccess={onMfaSuccess}
        onCancel={onMfaCancel}
      />
    );
  }

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
