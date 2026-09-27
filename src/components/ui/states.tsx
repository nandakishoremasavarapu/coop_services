import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "./card";

/* ---------------------------------------------------------------------------
 * Spinner / Loading
 * ------------------------------------------------------------------------ */
export function Spinner({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <Loader2
      style={{ width: size, height: size }}
      className={cn("animate-spin text-brand-600", className)}
      aria-label="Loading"
    />
  );
}

export function LoadingBlock({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-14", className)} role="status">
      <Spinner size={28} />
      <p className="text-sm font-medium text-ink-400">{label}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Empty state
 * ------------------------------------------------------------------------ */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact = false }: EmptyStateProps) {
  return (
    <Card className={cn("flex flex-col items-center text-center", compact ? "px-6 py-8" : "px-6 py-12 sm:py-16", className)}>
      {icon && (
        <div className="size-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4 [&>svg]:size-7" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-bold text-ink-900">{title}</h3>
      {description && <p className="text-sm text-ink-500 mt-1.5 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * Inline error notice
 * ------------------------------------------------------------------------ */
export function ErrorNotice({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("rounded-xl bg-danger-50 border border-danger-200 px-4 py-3 flex items-start gap-2.5", className)}>
      <svg viewBox="0 0 24 24" className="size-4.5 text-danger-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <p className="text-sm font-medium text-danger-700 flex-1">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm font-bold text-danger-700 underline underline-offset-2 shrink-0">
          Retry
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Toast (simple, self-dismissing)
 * ------------------------------------------------------------------------ */
export function Toast({ message, tone = "success", onDismiss }: { message: React.ReactNode; tone?: "success" | "info" | "error"; onDismiss?: () => void }) {
  const tones = {
    success: "bg-brand-900 text-white",
    info: "bg-ink-900 text-white",
    error: "bg-danger-700 text-white",
  } as const;
  return (
    <div
      role="status"
      className={cn(
        "fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-100 max-w-[calc(100vw-2rem)] rounded-2xl px-4.5 py-3 shadow-overlay text-sm font-semibold animate-enter-up flex items-center gap-2.5",
        tones[tone]
      )}
    >
      {message}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="ml-1 underline underline-offset-2 text-white/80 hover:text-white text-xs font-bold shrink-0">
          Dismiss
        </button>
      )}
    </div>
  );
}
