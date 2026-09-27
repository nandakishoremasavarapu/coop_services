import React from "react";
import { cn } from "@/lib/cn";
import { getStatusMeta, type StatusIntent } from "@/lib/status";

const intentStyles: Record<StatusIntent, { bg: string; dot: string }> = {
  neutral: { bg: "bg-ink-100 text-ink-600", dot: "bg-ink-400" },
  info: { bg: "bg-info-50 text-info-700", dot: "bg-info-500" },
  brand: { bg: "bg-brand-50 text-brand-800", dot: "bg-brand-500" },
  warning: { bg: "bg-warning-50 text-warning-800", dot: "bg-warning-500" },
  success: { bg: "bg-success-50 text-success-700", dot: "bg-success-500" },
  danger: { bg: "bg-danger-50 text-danger-700", dot: "bg-danger-500" },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  intent?: StatusIntent;
  dot?: boolean;
  size?: "sm" | "md";
}

/** Generic intent badge. */
export function Badge({ intent = "neutral", dot = true, size = "md", className, children, ...props }: BadgeProps) {
  const style = intentStyles[intent];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        style.bg,
        className
      )}
      {...props}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full shrink-0", style.dot)} />}
      {children}
    </span>
  );
}

/** Status pill driven by the unified status vocabulary. */
export function StatusBadge({ status, size = "md", className }: { status: string; size?: "sm" | "md"; className?: string }) {
  const meta = getStatusMeta(status);
  return (
    <Badge intent={meta.intent} size={size} className={className}>
      {meta.label}
    </Badge>
  );
}
