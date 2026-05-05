"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CloseIcon } from "@/components/assets/Icon/shared";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  /** @deprecated Cancel button removed — use the X close button instead. */
  cancelLabel?: string;
  destructive?: boolean;
  icon?: string;
}

type Resolver = (value: boolean) => void;

interface InternalState extends ConfirmOptions {
  resolve: Resolver;
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InternalState | null>(null);
  const closingRef = useRef(false);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const close = useCallback(
    (result: boolean) => {
      if (!state || closingRef.current) return;
      closingRef.current = true;
      state.resolve(result);
      setState(null);
      setTimeout(() => {
        closingRef.current = false;
      }, 0);
    },
    [state]
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      // Enter auto-confirms only for non-destructive actions to avoid accidental deletes.
      if (e.key === "Enter" && !state.destructive) close(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, close]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby={state.description ? "confirm-desc" : undefined}
          className="fixed inset-0 z-[60] bg-slate-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => close(false)}
        >
          <div
            className="relative bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto scrollbar-hide shadow-2xl rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => close(false)}
              aria-label="Close"
              className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <CloseIcon className="w-5 h-5" />
            </button>

            <div className="p-6">
              <div className="flex items-start gap-4 pr-8">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${
                    state.destructive
                      ? "bg-red-50 text-red-600"
                      : "bg-blue-50 text-[#0071CE]"
                  }`}
                  aria-hidden
                >
                  {state.icon ?? (state.destructive ? "⚠️" : "❓")}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    id="confirm-title"
                    className="text-base font-bold text-slate-900 leading-snug"
                  >
                    {state.title}
                  </h3>
                  {state.description && (
                    <p
                      id="confirm-desc"
                      className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap"
                    >
                      {state.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => close(true)}
                  className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition shadow-sm ${
                    state.destructive
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[#0071CE] hover:bg-[#005ba6]"
                  }`}
                >
                  {state.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmDialogProvider>");
  }
  return ctx;
}
