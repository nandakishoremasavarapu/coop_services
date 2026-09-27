"use client";

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  label?: string;
}

export function LoadingSpinner({ size = 24, color = "#1a56db", label }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
      >
        <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="3" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <p className="text-sm text-slate-500 font-medium">{label}</p>}
    </div>
  );
}

export function PageLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size={40} label={label} />
    </div>
  );
}
