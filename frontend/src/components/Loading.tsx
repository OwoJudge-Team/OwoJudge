import React from "react";
import { FaSpinner } from "react-icons/fa6";

interface LoadingProps {
  message?: string;
  className?: string;
}

export default function Loading({ message = "Loading...", className = "" }: LoadingProps) {
  return (
    <div className={`flex min-h-[50vh] items-center justify-center bg-background p-8 ${className}`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <FaSpinner className="h-12 w-12 animate-spin text-indigo-500" />
        <p className="animate-pulse text-lg font-medium text-slate-300">{message}</p>
      </div>
    </div>
  );
}
