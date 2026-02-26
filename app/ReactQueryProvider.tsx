"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useRef } from "react";
import type { ReactNode } from "react";

export default function ReactQueryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queryClientRef = useRef<QueryClient | null>(null);

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      {children}
    </QueryClientProvider>
  );
}