"use client";

import React from "react";
import { Toaster } from "sonner";
import type { Session } from "next-auth";

import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import SessionProviderWrapper from "@/components/Wrapper/SessionProviderWrapper";
import ExchangeRateProvider from "@/components/providers/ExchangeRateProvider";
import WishlistProvider from "@/components/providers/WishlistProvider";
import ExitIntentModal from "@/components/common/ExitIntentModal";
import AIChatWidget from "@/components/AIChatWidget";

interface AppProvidersProps {
  children: React.ReactNode;
  session: Session | null;
}

/**
 * AppProviders: A unified client-side component to wrap all global context providers.
 * Includes Session management, React Query, Exchange Rates, and Toaster notifications.
 */
export default function AppProviders({ children, session }: AppProvidersProps) {
  return (
    <SessionProviderWrapper session={session}>
      <ReactQueryProvider>
        <ExchangeRateProvider />
        <WishlistProvider />
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "inherit",
            },
          }}
        />
        <AIChatWidget />
        <ExitIntentModal />
      </ReactQueryProvider>
    </SessionProviderWrapper>
  );
}
