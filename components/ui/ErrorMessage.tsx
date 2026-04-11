"use client";

import { AlertIcon } from "@/components/assets/Icon/shared";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <AlertIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-bold text-red-800">Error</p>
        <p className="text-xs text-red-600 mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-bold text-red-700 hover:text-red-900 underline shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}
