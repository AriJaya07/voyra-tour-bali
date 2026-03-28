"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "viator";
  isLoading?: boolean;
  children: React.ReactNode;
}

const VARIANTS = {
  primary:
    "bg-[#0071CE] hover:bg-[#005ba6] text-white shadow-md",
  secondary:
    "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
  viator:
    "bg-[#2D9B1B] hover:bg-[#257A15] text-white shadow-md",
};

export default function Button({
  variant = "primary",
  isLoading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl transition-all font-bold text-sm active:scale-[0.98] ${
        isDisabled ? "bg-gray-300 cursor-not-allowed text-white" : VARIANTS[variant]
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
}
