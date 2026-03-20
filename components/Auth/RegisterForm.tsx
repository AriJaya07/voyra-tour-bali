"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthInput from "./AuthInput";
import UserIcon from "../assets/login/UserIcon";
import EmailIcon from "../assets/login/EmailIcon";
import PasswrodIcon from "../assets/login/PasswordIcon";
import EyesShowIcon from "../assets/login/EyesShowIcon";
import EyesCloseIcon from "../assets/login/EyesCloseIcon copy";

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
      {visible ? <EyesShowIcon className={iconClass} /> : <EyesCloseIcon className={iconClass} />}
    </button>
  );
}

interface RegisterFormProps {
  callbackUrl: string;
}

export default function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const router = useRouter();
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
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const data = await response.json();
      
      if (response.status === 429) {
        // Backend actively blocked due to rate limits
        const remaining = data.remainingSeconds || 300;
        localStorage.setItem(`resendCooldown_${registeredEmail}`, (Date.now() + remaining * 1000).toString());
        setCooldownTime(remaining);
        throw new Error(data.message || "Too many requests. Please wait.");
      }

      if (!response.ok) throw new Error(data.message || "Failed to resend");
      
      setResendMessage("Verification email sent! Check your inbox.");
      
      // Start 5-min cooldown locally
      const cooldownSecs = 300;
      localStorage.setItem(`resendCooldown_${registeredEmail}`, (Date.now() + cooldownSecs * 1000).toString());
      setCooldownTime(cooldownSecs);
    } catch (err: any) {
      setResendMessage(err.message || "Something went wrong.");
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      const emailLower = email.toLowerCase().trim();
      setRegisteredEmail(emailLower);
      setIsSuccess(true);
      
      // Immediately lock the resend button for 5 minutes since an email was just dispatched
      const cooldownSecs = 300;
      localStorage.setItem(`resendCooldown_${emailLower}`, (Date.now() + cooldownSecs * 1000).toString());
      setCooldownTime(cooldownSecs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A system error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in fade-in zoom-in duration-500">
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
          <button
            onClick={handleResend}
            disabled={resending || cooldownTime > 0}
            className="w-full py-3 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 disabled:opacity-50 transition-all border border-white/10 cursor-pointer"
          >
            {resending 
              ? "Sending..." 
              : cooldownTime > 0 
                ? `Resend in ${formatTime(cooldownTime)}` 
                : "Resend Verification Email"
            }
          </button>
          
          <button
            onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-sm hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
        Welcome to Voyra!
      </h2>
      <p className="text-white text-sm mb-7"> Create your account to continue</p>

      {error && (
        <div className="flex items-start gap-3 bg-red-950/50 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 mb-6 text-sm">
          <span>{error}</span>
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
          placeholder="e.g. Ari Jaya"
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-sm hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 transition-all shadow-lg mt-4"
        >
          {isLoading ? "Registering..." : "Register Now"}
        </button>
      </form>
    </>
  );
}
