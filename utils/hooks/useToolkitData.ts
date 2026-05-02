"use client";

import { useEffect, useState } from "react";
import { EMPTY_TOOLKIT, type ToolkitData } from "@/components/Homepage/TravelToolkit/types";

interface State {
  data: ToolkitData;
  loading: boolean;
}

export function useToolkitData(enabled: boolean) {
  const [state, setState] = useState<State>({ data: EMPTY_TOOLKIT, loading: enabled });

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ data: EMPTY_TOOLKIT, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/toolkit", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setState({ data: EMPTY_TOOLKIT, loading: false });
          return;
        }
        const data = (await res.json()) as ToolkitData;
        if (!cancelled) setState({ data, loading: false });
      } catch {
        if (!cancelled) setState({ data: EMPTY_TOOLKIT, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
