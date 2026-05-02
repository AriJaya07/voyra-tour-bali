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

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
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
      // Allow the next confirm cycle.
      setTimeout(() => {
        closingRef.current = false;
      }, 0);
    },
    [state]
  );

  // ESC closes (Cancel)
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
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
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => close(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`px-5 py-4 text-white ${
                state.destructive
                  ? "bg-gradient-to-r from-red-600 to-red-700"
                  : "bg-gradient-to-r from-[#0071CE] to-[#005ba6]"
              }`}
            >
              <h3 id="confirm-title" className="font-bold text-base flex items-center gap-2">
                <span aria-hidden>{state.icon ?? (state.destructive ? "⚠️" : "❓")}</span>
                {state.title}
              </h3>
            </div>

            <div className="p-5">
              {state.description && (
                <p className="text-sm text-gray-700 leading-relaxed mb-5 whitespace-pre-wrap">
                  {state.description}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                  autoFocus={!state.destructive}
                >
                  {state.cancelLabel ?? "Cancel"}
                </button>
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
