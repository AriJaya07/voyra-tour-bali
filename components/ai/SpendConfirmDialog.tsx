"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon } from "@/components/assets/Icon/shared";

interface Props {
  open: boolean;
  cost: number;
  balance: number;
  title: string;
  body?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

/**
 * Spend confirmation modal — used before any AI action that costs > 4 credits
 * (voucher reader, plan-refine, long itinerary). Keeps users in control of
 * their balance. Skipped for cheap actions (chat, cultural).
 */
export default function SpendConfirmDialog({
  open,
  cost,
  balance,
  title,
  body,
  onConfirm,
  onCancel,
  busy = false,
}: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close"
              className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <CloseIcon className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {body ? <p className="mt-1 text-sm text-slate-600">{body}</p> : null}

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">This action</div>
                <div className="text-2xl font-bold tabular-nums text-slate-900">{cost}</div>
                <div className="text-[11px] text-slate-500">credits</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase text-slate-500">After</div>
                <div className="text-2xl font-bold tabular-nums text-slate-900">
                  {Math.max(0, balance - cost)}
                </div>
                <div className="text-[11px] text-slate-500">credits left</div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy || balance - cost < 0}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? "Working…" : `Spend ${cost} credits`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
