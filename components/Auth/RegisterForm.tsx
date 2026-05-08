"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import api from "@/lib/axios";
import AuthInput from "./AuthInput";
import GoogleSignInButton from "./GoogleSignInButton";
import Button from "../ui/Button";
import UserIcon from "../assets/login/UserIcon";
import EmailIcon from "../assets/login/EmailIcon";
import PasswrodIcon from "../assets/login/PasswordIcon";
import { EyeOffIcon, EyeIcon, MailIcon } from "../assets/Icon/shared";
import TurnstileWidget from "./TurnstileWidget";

const iconClass = "w-4 h-4";
const toggleBtnClass = "text-slate-500 hover:text-slate-300 transition-colors";

function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className={toggleBtnClass} aria-label={visible ? "Hide password" : "Show password"}>
      {visible ? <EyeOffIcon className={iconClass} /> : <EyeIcon className={iconClass} />}
    </button>
  );
}

interface RegisterFormProps {
  callbackUrl: string;
}

export default function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [cooldownTime, setCooldownTime] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  // Referral attribution
  const [referralCode, setReferralCode] = useState("");
  const [inviterFirstName, setInviterFirstName] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);

  // On mount: read ?ref from URL OR fall back to HttpOnly cookie via /api/referrals/attribute (GET).
  useEffect(() => {
    const fromQuery = (searchParams?.get("ref") || "").trim().toUpperCase();
    if (fromQuery) {
      setReferralCode(fromQuery);
      return;
    }
    fetch("/api/referrals/attribute", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.code) setReferralCode(String(d.code).toUpperCase());
      })
      .catch(() => {});
  }, [searchParams]);

  // Validate code → get inviter first name + flip valid chip on
  useEffect(() => {
    if (!referralCode || referralCode.length < 4) {
      setInviterFirstName(null);
      return;
    }
    setCodeChecking(true);
    const ctl = new AbortController();
    fetch(`/api/referrals/lookup?code=${encodeURIComponent(referralCode)}`, {
      cache: "no-store",
      signal: ctl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.valid) setInviterFirstName(d.inviterFirstName || "A friend");
        else setInviterFirstName(null);
      })
      .catch(() => {})
      .finally(() => setCodeChecking(false));
    return () => ctl.abort();
  }, [referralCode]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaResetKey((k) => k + 1);
  };

  const clearError = () => setError("");

  // Handle countdown timer & local storage persistence
  useEffect(() => {
    if (!registeredEmail) return;
    const storageKey = `resendCooldown_${registeredEmail}`;
    
    // Check local storage on mount
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const remaining = parseInt(stored, 10) - Date.now();
      if (remaining > 0) {
        setCooldownTime(Math.ceil(remaining / 1000));
      } else {
        localStorage.removeItem(storageKey);
      }
    }

    // Tick down every second if active
    if (cooldownTime <= 0) return;
    
    const interval = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          localStorage.removeItem(storageKey);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [registeredEmail, cooldownTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage("");
    try {
      await axios.post("/api/auth/resend-verification", { email: registeredEmail, callbackUrl });
      setResendMessage("Verification email sent! Check your inbox.");
      const cooldownSecs = 300;
      localStorage.setItem(`resendCooldown_${registeredEmail}`, (Date.now() + cooldownSecs * 1000).toString());
      setCooldownTime(cooldownSecs);
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        const remaining = err.response.data?.remainingSeconds || 300;
        localStorage.setItem(`resendCooldown_${registeredEmail}`, (Date.now() + remaining * 1000).toString());
        setCooldownTime(remaining);
        setResendMessage(err.response.data?.message || "Too many requests. Please wait.");
      } else {
        setResendMessage(err.message || "Something went wrong.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Full name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
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
      await api.post("/auth/register", {
        name,
        email: email.toLowerCase().trim(),
        password,
        callbackUrl: "/",
        captchaToken,
        referralCode: referralCode || undefined,
      });

      const emailLower = email.toLowerCase().trim();
      setRegisteredEmail(emailLower);
      setIsSuccess(true);

      const { trackSignUp } = await import("@/utils/analytics");
      trackSignUp("email");

      // Immediately lock the resend button for 5 minutes since an email was just dispatched
      const cooldownSecs = 300;
      localStorage.setItem(`resendCooldown_${emailLower}`, (Date.now() + cooldownSecs * 1000).toString());
      setCooldownTime(cooldownSecs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A system error occurred");
      resetCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
          <MailIcon className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
            Check Your Email
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            We’ve sent a verification link to your email address. Please click the link to activate your account.
          </p>
        </div>

        <div className="bg-[#EFEFEF] border border-white/10 rounded-xl p-4 w-full">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email</p>
          <a href={`mailto:${registeredEmail}`} className="text-indigo-400 font-medium hover:text-indigo-300">
            {registeredEmail}
          </a>
        </div>

        <div className="text-sm text-slate-400">
          <p>Didn’t receive the email?</p>
          <p>Check your spam or promotions folder.</p>
        </div>

        <div className="w-full space-y-3 pt-2">
          {resendMessage && (
            <p className={`text-sm ${resendMessage.includes("sent") ? "text-green-400" : "text-red-400"}`}>
              {resendMessage}
            </p>
          )}
          <Button
            onClick={handleResend}
            variant="auth"
            isLoading={resending}
            disabled={cooldownTime > 0}
          >
            {cooldownTime > 0 
              ? `Resend in ${formatTime(cooldownTime)}` 
              : "Resend Verification Email"
            }
          </Button>
          
          <Button
            onClick={() => router.push("/login")}
            variant="auth"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
        Welcome to Voyra!
      </h2>
      <p className="text-white text-sm mb-5"> Create your account to continue</p>

      {/* Google Sign-Up */}
      <GoogleSignInButton callbackUrl="/" label="Sign up with Google" />

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-950/50 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 mb-6 text-sm">
          <span>{error}</span>
        </div>
      )}

      {inviterFirstName ? (
        <div className="mb-4 flex items-start gap-2 bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 rounded-xl px-3 py-2.5 text-xs">
          <span className="text-emerald-400 font-bold">✓</span>
          <span>
            Invite from <strong>{inviterFirstName}</strong> applied — you&apos;ll get{" "}
            <strong>50 AI credits</strong> after verifying your email.
          </span>
        </div>
      ) : !showCodeInput ? (
        <button
          type="button"
          onClick={() => setShowCodeInput(true)}
          className="mb-4 text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
        >
          Have an invite code?
        </button>
      ) : (
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Invite code</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.trim().toUpperCase())}
              placeholder="A1B2C3D4"
              className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-slate-900/60 border border-slate-700 rounded-lg text-white font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => {
                setShowCodeInput(false);
                setReferralCode("");
              }}
              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Skip
            </button>
          </div>
          {referralCode && referralCode.length >= 4 && !codeChecking && !inviterFirstName ? (
            <p className="mt-1 text-xs text-amber-400">Code not found — double-check or skip.</p>
          ) : null}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Full Name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError();
          }}
          placeholder="e.g. John Doe"
          icon={
            <UserIcon className="w-4 h-4" />
          }
        />

        <AuthInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearError();
          }}
          placeholder="e.g. email@yourdomain.com"
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
            clearError();
          }}
          placeholder="••••••••"
          icon={<PasswrodIcon className={iconClass} />}
          rightElement={
            <PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((p) => !p)} />
          }
        />

        <AuthInput
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            clearError();
          }}
          placeholder="••••••••"
          icon={<PasswrodIcon className={iconClass} />}
          rightElement={
            <PasswordVisibilityToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((p) => !p)} />
          }
        />
        <TurnstileWidget
          onVerify={setCaptchaToken}
          onExpire={resetCaptcha}
          onError={resetCaptcha}
          resetKey={captchaResetKey}
        />

        <div className="pt-1">
          <Button
            type="submit"
            variant="auth"
            isLoading={isLoading}
            disabled={!captchaToken || isLoading}
            className="mt-4"
          >
            Register Now
          </Button>
        </div>
      </form>
    </>
  );
}
