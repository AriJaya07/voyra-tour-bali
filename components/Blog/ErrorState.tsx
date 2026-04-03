"use client";

import { HiOutlineExclamationTriangle } from "react-icons/hi2";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ 
  title = "Something went wrong", 
  message = "We couldn't load the requested resource at this time. Please try again later.",
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl bg-red-50/50 border border-red-100 ">
      <div className="bg-red-100 p-4 rounded-full mb-6 ">
        <HiOutlineExclamationTriangle className="w-10 h-10 text-red-600 " />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3 ">
        {title}
      </h3>
      <p className="text-gray-600 max-w-md mx-auto mb-8 ">
        {message}
      </p>
      
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-full shadow-sm shadow-amber-500/30 transition-all duration-300 transform hover:-translate-y-0.5"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
