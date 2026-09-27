"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success"
  | "accent";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 select-none " +
  "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap " +
  "focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-700 text-white shadow-xs hover:bg-brand-800 focus-visible:outline-brand-700",
  secondary:
    "bg-brand-50 text-brand-800 border border-brand-200 hover:bg-brand-100 focus-visible:outline-brand-600",
  accent:
    "bg-accent-500 text-white shadow-xs hover:bg-accent-600 focus-visible:outline-accent-600",
  outline:
    "bg-white text-ink-700 border border-line-strong shadow-xs hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-brand-600",
  ghost:
    "text-ink-600 hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-brand-600",
  destructive:
    "bg-danger-600 text-white shadow-xs hover:bg-danger-700 focus-visible:outline-danger-600",
  success:
    "bg-success-600 text-white shadow-xs hover:bg-success-700 focus-visible:outline-success-600",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-4.5 text-sm md:h-10.5",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-11 w-11 md:h-10.5 md:w-10.5",
  "icon-sm": "h-9 w-9",
};

/** Class builder so <Link> elements can share the exact button appearance. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
