"use client";

import { useState } from "react";
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

  const clearError = () => setError("");

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

      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}&registered=true`);
        return;
      }

      router.replace(callbackUrl.startsWith("/dashboard") ? "/" : callbackUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A system error occurred");
    } finally {
      setIsLoading(false);
    }
  };

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
