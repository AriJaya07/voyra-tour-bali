"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white border border-[#E6E6E6] rounded-2xl p-5 sm:p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
