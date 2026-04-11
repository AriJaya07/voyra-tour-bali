"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Button from "../ui/Button";
import { GoogleIcon } from "@/components/assets/Icon/shared";

interface GoogleSignInButtonProps {
  callbackUrl?: string;
  label?: string;
}

export default function GoogleSignInButton({
  callbackUrl = "/",
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleGoogleSignIn}
      isLoading={isLoading}
      loadingText="Connecting..."
      variant="secondary"
      className="gap-3 border-gray-200"
    >
      <GoogleIcon className="w-5 h-5 flex-shrink-0" />
      {label}
    </Button>
  );
}
